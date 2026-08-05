import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { SITE_URL } from '@/data/company'
import type { OrderStatus } from '@/types'

// LeanX (leanx.io) — Malaysian FPX + e-wallet gateway. This module is the only
// place that knows the provider's wire format; everything else speaks our types.
//
// Provider facts that are easy to get wrong (see LEANX_SAAS_INTEGRATION_GUIDE.md):
//   • host is api.leanx.io — `.dev` is legacy and unstable
//   • auth is a plain `auth-token` header, NOT `Authorization: Bearer`
//   • every success carries `response_code === 2000`
//   • `amount` must be a 2-decimal STRING; a float is rejected
//   • `email` and `phone_number` must be non-empty or the bill silently fails
//   • `payment_service_id` is mandatory for the silent-bill flow

const API_HOST = process.env.LEANX_API_HOST || 'https://api.leanx.io'
const AUTH_TOKEN = process.env.LEANX_AUTH_TOKEN || ''
const COLLECTION_UUID = process.env.LEANX_COLLECTION_UUID || ''
const WEBHOOK_SECRET = process.env.LEANX_WEBHOOK_SECRET || ''

const OK = 2000

/** True when every credential needed to create a bill is present. */
export const leanxConfigured = () => !!(AUTH_TOKEN && COLLECTION_UUID)

/** The webhook secret, or '' when unset. Callers must fail closed on ''. */
export const webhookSecret = () => WEBHOOK_SECRET

export class LeanXError extends Error {}

/**
 * Public base URL for redirect_url / callback_url.
 *
 * Deliberately never derived from a request header: an attacker who could set
 * Origin/Referer would otherwise redirect our payment callbacks to their own
 * server. PUBLIC_BASE_URL wins so a Vercel preview can be pointed at explicitly.
 */
export function baseUrl(): string {
  const explicit = process.env.PUBLIC_BASE_URL
  if (explicit) return explicit.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return SITE_URL.replace(/\/$/, '')
}

async function call<T>(path: string, body: Record<string, unknown>): Promise<T> {
  if (!AUTH_TOKEN) throw new LeanXError('LEANX_AUTH_TOKEN is not set')

  let res: Response
  try {
    res = await fetch(`${API_HOST}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'auth-token': AUTH_TOKEN },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
  } catch (e) {
    throw new LeanXError(`LeanX unreachable: ${(e as Error).message}`)
  }

  const payload = (await res.json().catch(() => null)) as
    | { response_code?: number; description?: string; breakdown_errors?: unknown; data?: T }
    | null

  if (!payload) throw new LeanXError(`LeanX returned a non-JSON response (${res.status})`)
  if (payload.response_code !== OK) {
    const detail = payload.description || JSON.stringify(payload.breakdown_errors ?? {})
    throw new LeanXError(`LeanX ${path} failed (${payload.response_code ?? res.status}): ${detail}`)
  }
  return payload.data as T
}

// ── Payment services (banks / e-wallets) ─────────────────────────
export type PaymentType = 'WEB_PAYMENT' | 'DIGITAL_PAYMENT'

export interface PaymentService {
  payment_service_id: string
  payment_service_name: string
  status?: string
}

/**
 * The silent-bill flow needs the customer's chosen bank up front.
 *
 * LeanX returns this list in three different shapes depending on account type,
 * so the parsing is deliberately defensive — a shape we don't recognise yields
 * an empty list rather than a crash.
 */
export async function listPaymentServices(paymentType: PaymentType): Promise<PaymentService[]> {
  const data = await call<unknown>('/api/v1/merchant/list-payment-services', {
    payment_type: paymentType,
    payment_status: 'active',
    payment_model_reference_id: 1, // 1 = B2C (individual)
  })

  let services: RawService[] = []
  const d = data as {
    payment_services?: RawService[]
    list?: { data?: Record<string, RawService[]>[] }
  }
  if (Array.isArray(data)) {
    services = data as RawService[] // CASE A — flat array
  } else if (Array.isArray(d?.payment_services)) {
    services = d.payment_services // CASE B — object wrapper
  } else if (Array.isArray(d?.list?.data)) {
    services = d.list.data[0]?.[paymentType] ?? [] // CASE C — deep nested
  }

  return services.map(normalise).filter((s): s is PaymentService => s !== null)
}

/**
 * A live LeanX account returns `{payment_service_id: 65, name: 'Affin Bank',
 * record_status: 'Active'}` — NOT the `payment_service_name` / `status` the
 * docs show. Both spellings are normalised here so the rest of the app (and the
 * bank buttons the customer clicks) sees one stable shape. Getting this wrong
 * renders a grid of blank, unlabelled buttons.
 */
interface RawService {
  payment_service_id?: string | number
  payment_service_name?: string
  name?: string
  status?: string
  record_status?: string
  record_status_id?: number
}

function normalise(s: RawService): PaymentService | null {
  if (s?.payment_service_id == null) return null

  const name = s.payment_service_name || s.name
  if (!name) return null // an unlabelled button is worse than no button

  // Only one of these fields is present in practice; absent means "not filtered".
  const state = (s.status || s.record_status || '').toLowerCase()
  if (state && state !== 'active') return null
  if (s.record_status_id != null && s.record_status_id !== 1) return null

  return { payment_service_id: String(s.payment_service_id), payment_service_name: name }
}

// ── Bill creation ────────────────────────────────────────────────
export interface CreateBillInput {
  amount: number
  invoiceRef: string
  fullName: string
  email: string
  phone: string
  paymentServiceId: string
  redirectUrl: string
  callbackUrl: string
}

export interface CreatedBill {
  redirectUrl: string
  billNo: string
}

/** Malaysian MSISDN digits, no '+' or separators. */
export function normalisePhone(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '')
  return digits || '60123456789' // placeholder — never send empty
}

export async function createBillSilent(input: CreateBillInput): Promise<CreatedBill> {
  if (!COLLECTION_UUID) throw new LeanXError('LEANX_COLLECTION_UUID is not set')

  const data = await call<{ redirect_url?: string; bill_no?: string }>(
    '/api/v1/merchant/create-bill-silent',
    {
      collection_uuid: COLLECTION_UUID,
      amount: input.amount.toFixed(2), // STRING, exactly 2dp
      invoice_ref: input.invoiceRef,
      full_name: input.fullName.trim() || 'Customer',
      // A blank email or phone makes the bill fail on LeanX's side, so both
      // fall back to placeholders. The checkout form validates real ones.
      email: input.email.trim() || 'noreply@nanorev.my',
      phone_number: normalisePhone(input.phone),
      redirect_url: input.redirectUrl,
      callback_url: input.callbackUrl,
      payment_service_id: input.paymentServiceId,
    },
  )

  if (!data?.redirect_url || !data?.bill_no) {
    throw new LeanXError('LeanX accepted the bill but returned no redirect_url/bill_no')
  }
  return { redirectUrl: data.redirect_url, billNo: data.bill_no }
}

// ── Status & webhooks ────────────────────────────────────────────
/** Map LeanX's vocabulary onto ours. Unknown values stay pending — never paid. */
export function mapStatus(status: string | undefined): OrderStatus {
  switch ((status || '').toLowerCase()) {
    case 'success':
    case 'paid':
      return 'paid'
    case 'failed':
    case 'declined':
      return 'failed'
    case 'cancelled':
    case 'canceled':
      return 'cancelled'
    default:
      return 'pending'
  }
}

export interface TransactionStatus {
  billNo?: string
  invoiceRef?: string
  amount?: number
  status: OrderStatus
  paymentMethod?: string
}

/**
 * Reconciliation poll. Returns null when LeanX has nothing to say — including
 * its documented habit of 404-ing live bills. A null here means "unknown",
 * never "failed"; only an explicit failed/cancelled may fail an order.
 */
export async function transactionStatus(billNo: string): Promise<TransactionStatus | null> {
  try {
    const data = await call<{
      bill_no?: string
      invoice_ref?: string
      amount?: number | string
      status?: string
      payment_method?: string
    }>('/api/v1/merchant/transaction-status', { bill_no: billNo })
    if (!data) return null
    return {
      billNo: data.bill_no,
      invoiceRef: data.invoice_ref,
      amount: data.amount === undefined ? undefined : Number(data.amount),
      status: mapStatus(data.status),
      paymentMethod: data.payment_method,
    }
  } catch {
    return null
  }
}

/**
 * HMAC-SHA256 over the EXACT raw body bytes.
 *
 * The secret is a required parameter rather than read from the environment in
 * here: the guide's headline failure is a route gating on one env var while the
 * HMAC reads another, so every webhook 401s while customers are charged.
 * Passing it explicitly makes that mismatch impossible.
 */
export function verifyWebhook(rawBody: string, signature: string, secret: string): boolean {
  if (!secret || !signature) return false // fail closed
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(signature, 'utf-8')
  const b = Buffer.from(expected, 'utf-8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export interface WebhookPayload {
  billNo?: string
  invoiceRef?: string
  status: OrderStatus
  amount?: number
  paymentMethod?: string
  raw: Record<string, unknown>
}

/** Some deliveries use generic key names — accept both spellings. */
export function parseWebhook(rawBody: string): WebhookPayload | null {
  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return null
  }
  const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined)
  const amount = body.amount
  return {
    billNo: str(body.bill_no) ?? str(body.transaction_id),
    invoiceRef: str(body.invoice_ref) ?? str(body.order_id),
    status: mapStatus(str(body.status)),
    amount: amount === undefined || amount === null ? undefined : Number(amount),
    paymentMethod: str(body.payment_method),
    raw: body,
  }
}
