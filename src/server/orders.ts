import 'server-only'
import { randomBytes } from 'node:crypto'
import { computeTotals } from '@/utils/pricing'
import { ApiError, bad } from './request'
import type { Store } from './store'
import type { Attribution, CheckoutDetails, OrderLine, OrderStatus, StoreData, Totals } from '@/types'

// Everything both payment paths must agree on: what was bought, what it costs,
// and who gets credited. Extracted so the mock gateway and LeanX can never
// drift apart on price — the number a buyer is charged is derived here, once.

const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000 // 30-day last click

export interface OrderRequestBody {
  items?: { id: string; qty?: number }[]
  details?: CheckoutDetails
  attribution?: Attribution | null
}

export interface OrderDraft {
  lines: OrderLine[]
  subtotal: number
  totals: Totals
  linkSlug: string | null
  workshopId: string | null
  commission: number
  /** Stock was short at pricing time — fulfil manually rather than refuse the sale. */
  oversold: boolean
}

/** `NR-` + time + random, so an invoice_ref can never collide. */
export function serverOrderRef(): string {
  const t = Date.now().toString(36).toUpperCase().slice(-6)
  return `NR-${t}${randomBytes(2).toString('hex').toUpperCase()}`
}

/** Unguessable token gating receipt access for redirect-gateway orders. */
export function accessToken(): string {
  return randomBytes(16).toString('hex')
}

/**
 * Price an order from the catalogue and resolve affiliate credit.
 *
 * Throws ApiError on any invalid input, so callers can let it propagate to the
 * JSON error contract. Performs NO mutation: stock and commission rows are the
 * caller's business, because the mock path applies them immediately while the
 * LeanX path defers them to the verified webhook.
 */
export function buildOrderDraft(data: StoreData, payload: OrderRequestBody): OrderDraft {
  const { items, details, attribution } = payload

  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    throw bad('items must contain 1–50 lines')
  }
  if (!details || !String(details.name || '').trim() || !String(details.phone || '').trim()) {
    throw bad('details.name and details.phone are required')
  }

  // server-side prices — never trust the client's
  const lines: OrderLine[] = []
  let oversold = false
  for (const it of items) {
    const p = data.products.find((x) => x.id === it.id)
    if (!p || !p.active) throw bad(`Unknown product: ${it.id}`)
    const qty = Math.min(999, Math.max(1, Math.floor(Number(it.qty) || 1)))
    if ((p.stock ?? 0) < qty) oversold = true
    lines.push({ id: p.id, name: `${p.name} ${p.grade}`.trim(), volume: p.volume, price: p.price, qty })
  }

  const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0)
  const totals = computeTotals(subtotal, details.mode)

  // affiliate attribution — last click within the window wins.
  // The link is ALWAYS recorded (marketing data); commission only when an
  // active workshop owns the link.
  let linkSlug: string | null = null
  let workshopId: string | null = null
  let commission = 0
  const ts = Number(attribution?.ts)
  if (attribution?.slug && Number.isFinite(ts) && Date.now() - ts < ATTRIBUTION_WINDOW_MS) {
    const link = data.links.find((l) => l.slug === attribution.slug)
    if (link) {
      linkSlug = link.slug
      const workshop = link.workshopId ? data.workshops.find((w) => w.id === link.workshopId) : null
      if (workshop && workshop.active) {
        workshopId = workshop.id
        commission = +(subtotal * workshop.commissionRate).toFixed(2)
      }
    }
  }

  return { lines, subtotal, totals, linkSlug, workshopId, commission, oversold }
}

/**
 * Apply the consequences of a paid order: decrement stock and record the
 * workshop's commission. Called by the mock path immediately, and by the LeanX
 * webhook only after it has exclusively claimed the order — so it runs once.
 */
export function applyFulfilment(
  data: StoreData,
  order: { ref: string; items: OrderLine[]; workshopId: string | null; commission: number },
) {
  for (const l of order.items) {
    const p = data.products.find((x) => x.id === l.id)
    if (p) p.stock = Math.max(0, (p.stock ?? 0) - l.qty)
  }
  if (order.commission > 0 && order.workshopId && !data.commissions.some((c) => c.orderRef === order.ref)) {
    data.commissions.unshift({
      id: `cm-${order.ref}`,
      orderRef: order.ref,
      workshopId: order.workshopId,
      amount: order.commission,
      status: 'pending',
      createdAt: new Date().toISOString(),
    })
  }
}

export type SettleOutcome = 'settled' | 'already' | 'unknown' | 'mismatch'

export interface SettleInput {
  status: OrderStatus
  billNo?: string
  amount?: number
  method?: string
  raw?: Record<string, unknown>
}

/**
 * Move a pending order to its final state and, if paid, fulfil it exactly once.
 *
 * Shared by the webhook and the reconciliation poll, so a payment confirmed by
 * either route takes an identical path. The exclusivity comes from
 * store.claimPendingOrder: whoever loses the race gets 'already' and must not
 * repeat the side effects.
 */
export async function settleOrder(
  store: Store,
  ref: string,
  incoming: SettleInput,
): Promise<SettleOutcome> {
  const { data } = store
  const existing = data.orders.find((o) => o.ref === ref)
  if (!existing) return 'unknown'

  if (incoming.status === 'paid') {
    // Never take the gateway's number as the price. A mismatch means something
    // is wrong (tampering, wrong bill) — refuse to fulfil and leave it pending
    // for a human to look at.
    if (
      typeof incoming.amount === 'number' &&
      Number.isFinite(incoming.amount) &&
      Math.abs(incoming.amount - existing.totals.total) > 0.01
    ) {
      return 'mismatch'
    }

    const now = new Date().toISOString()
    const claimed = await store.claimPendingOrder(ref, (o) => {
      o.status = 'paid'
      o.fulfilledAt = now
      o.payment = {
        gateway: 'leanx',
        status: 'paid',
        billNo: incoming.billNo ?? (o.payment as { billNo?: string } | null)?.billNo,
        method: incoming.method,
        paidAt: now,
        raw: incoming.raw,
      }
    })
    if (!claimed) return 'already'

    applyFulfilment(data, claimed)
    store.save()
    return 'settled'
  }

  if (incoming.status === 'failed' || incoming.status === 'cancelled') {
    const claimed = await store.claimPendingOrder(ref, (o) => {
      o.status = incoming.status
      o.payment = {
        gateway: 'leanx',
        status: incoming.status,
        billNo: incoming.billNo ?? (o.payment as { billNo?: string } | null)?.billNo,
        raw: incoming.raw,
      }
    })
    if (!claimed) return 'already'
    store.save()
    return 'settled'
  }

  return 'already' // still pending upstream — nothing to do yet
}

export { ApiError }
