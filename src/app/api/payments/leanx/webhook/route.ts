import { json, withStoreWrite } from '@/server/request'
import { parseWebhook, verifyWebhook, webhookSecret } from '@/server/leanx'
import { settleOrder } from '@/server/orders'

// LeanX's payment result. THE authoritative "paid" signal — the customer
// returning to our redirect_url proves nothing, since anyone can navigate there.
//
// Contract, in order:
//   1. read the RAW body before parsing — the HMAC is over the exact bytes
//   2. verify the signature, failing closed if anything is missing
//   3. settle exactly once (see settleOrder → store.claimPendingOrder)
//   4. answer 200 for anything we don't recognise, so LeanX stops retrying

export async function POST(req: Request) {
  const raw = await req.text() // (1) raw first — parsing and re-stringifying breaks the HMAC
  const signature = req.headers.get('x-leanx-signature') || ''
  const secret = webhookSecret()

  // (2) fail closed
  if (!secret) {
    console.error('[leanx] webhook received but LEANX_WEBHOOK_SECRET is unset')
    return json({ error: 'unconfigured' }, 503)
  }
  if (!verifyWebhook(raw, signature, secret)) {
    return json({ error: 'bad signature' }, 401)
  }

  const payload = parseWebhook(raw)
  if (!payload) return json({ error: 'invalid payload' }, 400)

  const ref = payload.invoiceRef
  if (!ref) return json({ ok: true, ignored: 'no invoice_ref' })

  return withStoreWrite(async (store) => {
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

    // (4) unknown refs and repeat deliveries both answer 200 and change nothing
    return json({ ok: true, outcome })
  })
}
