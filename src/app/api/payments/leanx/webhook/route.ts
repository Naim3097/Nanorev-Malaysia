import { json, withStoreDurable } from '@/server/request'
import { parseWebhook, webhookSecret } from '@/server/leanx'
import { settleOrder } from '@/server/orders'

// LeanX's payment result. THE authoritative "paid" signal — the customer
// returning to our redirect_url proves nothing, since anyone can navigate there.
//
// Contract, in order:
//   1. read the RAW body before parsing — a header HMAC is over the exact bytes
//   2. verify, failing closed if anything is missing or doesn't check out
//   3. settle exactly once (see settleOrder → store.claimPendingOrder)
//   4. answer 200 for anything we don't recognise, so LeanX stops retrying
//
// LeanX documents two mutually incompatible callback formats (a signed JWT
// envelope, and plain JSON with an x-leanx-signature header). parseWebhook
// accepts either, each on its own proof — see that function.

export async function POST(req: Request) {
  const raw = await req.text() // (1) raw first — parsing and re-stringifying breaks the HMAC
  const signature = req.headers.get('x-leanx-signature') || ''
  const secret = webhookSecret()

  // (2) fail closed
  if (!secret) {
    console.error('[leanx] webhook received but LEANX_WEBHOOK_SECRET is unset')
    return json({ error: 'unconfigured' }, 503)
  }

  const payload = parseWebhook(raw, signature, secret)
  if (!payload) {
    console.error('[leanx] webhook rejected: unverified or unreadable body')
    return json({ error: 'bad signature' }, 401)
  }

  return withStoreDurable(async (store) => {
    // The JWT format carries LeanX's own bill number rather than our invoice_ref,
    // so fall back to the bill number recorded when the bill was created. That
    // mapping is ours, and a payload cannot redirect it at another order.
    const ref =
      payload.invoiceRef ??
      (payload.billNo
        ? store.data.orders.find(
            (o) => (o.payment as { billNo?: string } | null)?.billNo === payload.billNo,
          )?.ref
        : undefined)

    if (!ref) {
      console.error(`[leanx] webhook matched no order (bill ${payload.billNo ?? '?'})`)
      return json({ ok: true, ignored: 'unmatched' })
    }

    const outcome = await settleOrder(store, ref, {
      status: payload.status,
      billNo: payload.billNo,
      amount: payload.amount,
      method: payload.paymentMethod,
      raw: payload.raw,
    })

    if (outcome === 'mismatch') {
      // Paid amount disagrees with the order total — do not fulfil. Answer 200
      // so LeanX stops retrying; this needs a human, not a redelivery.
      console.error(`[leanx] amount mismatch on ${ref} — left pending for review`)
      return json({ ok: true, review: true })
    }

    console.log(`[leanx] webhook ${ref}: ${payload.status} → ${outcome}`)
    // (4) unknown refs and repeat deliveries both answer 200 and change nothing
    return json({ ok: true, outcome })
  })
}
