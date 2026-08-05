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

async function call<T>(
  path: string,
  body: Record<string, unknown>,
  query?: Record<string, string>,
): Promise<T> {
  if (!AUTH_TOKEN) throw new LeanXError('LEANX_AUTH_TOKEN is not set')

  const qs = query ? `?${new URLSearchParams(query)}` : ''
  let res: Response
  try {
    res = await fetch(`${API_HOST}${path}${qs}`, {
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
    // LeanX's undocumented codes (e.g. 4566 "FAILED") say nothing on their own,
    // and `breakdown_errors` is where the actual field-level reason lives. Log
    // the whole envelope server-side — it is the only way to diagnose a refusal.
    // Safe to log: the response echoes bill fields, never our credentials.
    console.error(`[leanx] ${path} rejected:`, JSON.stringify(payload))
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

  // docs.leanx.io types payment_service_id as a NUMBER (`"payment_service_id": 33`).
  // The list endpoint returns it as a number too; we stringify it for React keys
  // and transport, so it has to be converted back here or LeanX refuses the bill.
  const serviceId = Number(input.paymentServiceId)
  if (!Number.isFinite(serviceId)) {
    throw new LeanXError(`payment_service_id is not numeric: ${input.paymentServiceId}`)
  }

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
      payment_service_id: serviceId,
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
/**
 * Pull a bill's outcome from LeanX.
 *
 * This is the ONLY way to learn about a payment that did not succeed: the
 * callback fires on success alone, so a cancelled or failed bill is silent and
 * the order would otherwise sit `pending` forever.
 *
 * The endpoint is `manual-checking-transaction` with `invoice_no` as a QUERY
 * parameter — not `transaction-status` with a JSON body, which is what
 * LEANX_SAAS_INTEGRATION_GUIDE.md says. The wrong path answers "Requested
 * endpoint is forbidden", which reads like a permissions problem and is not.
 *
 * Returns null on any error — "unknown", never "failed". Only an explicit
 * verdict from LeanX is allowed to move an order.
 */
export async function transactionStatus(billNo: string): Promise<TransactionStatus | null> {
  try {
    const data = await call<{
      transaction_details?: {
        invoice_no?: string
        amount?: number | string
        invoice_status?: string
        bank_provider?: string
        providerTypeReference?: string
      }
    }>('/api/v1/merchant/manual-checking-transaction', {}, { invoice_no: billNo })

    const td = data?.transaction_details
    if (!td) return null
    return {
      billNo: td.invoice_no,
      amount: td.amount == null ? undefined : Number(td.amount),
      status: mapStatus(td.invoice_status),
      paymentMethod: td.bank_provider || td.providerTypeReference,
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
/**
 * Verify a compact HS256 JWT and return its claims, or null.
 *
 * LeanX's documented callback is `{data: "<JWT>", response_code: 2100}` signed
 * with the collection's Hash Key — the JWT *is* the authentication, so this
 * must fail closed on anything it cannot fully verify.
 */
function verifyJwtHS256(token: string, secret: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, payload, signature] = parts

  const expected = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')
  const a = Buffer.from(signature, 'utf-8')
  const b = Buffer.from(expected, 'utf-8')
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const alg = (JSON.parse(Buffer.from(header, 'base64url').toString('utf-8')) as { alg?: string }).alg
    // Reject "none" and any asymmetric alg — otherwise an attacker picks the
    // algorithm and our HMAC check becomes meaningless.
    if (alg !== 'HS256') return null
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as unknown
    return claims && typeof claims === 'object' ? (claims as Record<string, unknown>) : null
  } catch {
    return null
  }
}

const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined)

/**
 * Read a webhook body in EITHER documented shape, verifying it as we go.
 *
 * • docs.leanx.io: `{data: <JWT signed with the Hash Key>}` — no header.
 * • LEANX_SAAS_INTEGRATION_GUIDE.md: plain JSON + `x-leanx-signature` over the
 *   raw bytes.
 *
 * The two disagree and we cannot tell from the outside which a given account
 * sends, so both are accepted — each on its own proof, neither weakening the
 * other. Returns null when the body is unreadable OR unverified; the caller
 * must treat null as "reject", never as "ignore".
 */
export function parseWebhook(
  rawBody: string,
  signature: string,
  secret: string,
): WebhookPayload | null {
  if (!secret) return null // fail closed

  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return null
  }

  // ── Shape 1: JWT envelope, self-authenticating ──
  const jwt = str(body.data)
  if (jwt) {
    const claims = verifyJwtHS256(jwt, secret)
    if (!claims) return null
    const client = (claims.client_data ?? {}) as Record<string, unknown>
    const amount = claims.amount
    return {
      billNo: str(claims.invoice_no) ?? str(claims.transaction_invoice_no),
      // `order_id` is literally the string "None" when unset — treat that as absent.
      invoiceRef:
        str(claims.invoice_ref) ??
        (str(client.order_id) === 'None' ? undefined : str(client.order_id)),
      status: mapStatus(str(claims.invoice_status)),
      amount: amount == null ? undefined : Number(amount),
      paymentMethod: str(claims.fpx_debit_status) ? 'fpx' : undefined,
      raw: claims,
    }
  }

  // ── Shape 2: plain JSON authenticated by the header signature ──
  if (!verifyWebhook(rawBody, signature, secret)) return null
  const amount = body.amount
  return {
    billNo: str(body.bill_no) ?? str(body.transaction_id),
    invoiceRef: str(body.invoice_ref) ?? str(body.order_id),
    status: mapStatus(str(body.status)),
    amount: amount == null ? undefined : Number(amount),
    paymentMethod: str(body.payment_method),
    raw: body,
  }
}
