import { bad, body, json, rateLimit, withStoreWrite } from '@/server/request'
import { baseUrl, createBillSilent, leanxConfigured, LeanXError } from '@/server/leanx'
import { accessToken, buildOrderDraft, serverOrderRef, type OrderRequestBody } from '@/server/orders'
import { resolveSlug } from '@/server/resolve'
import type { Order } from '@/types'

// Start a real payment: price the order on the server, write it `pending`, then
// ask LeanX for a hosted payment page.
//
// Nothing is fulfilled here. Stock and commission are applied only by the
// webhook, because the customer reaching LeanX proves nothing about payment.

interface CreateBody extends OrderRequestBody {
  slug?: string
  paymentServiceId?: string
}

export function POST(req: Request) {
  return withStoreWrite(async (store) => {
    rateLimit(req, 'payments', 60)
    const { data } = store
    const payload = await body<CreateBody>(req)

    if (!payload.paymentServiceId) throw bad('Please choose a bank or e-wallet')

    // The page decides the gateway — a client cannot opt itself into LeanX.
    const resolved = payload.slug ? resolveSlug(data, payload.slug) : null
    if (resolved?.page.paymentGateway !== 'leanx') {
      throw bad('This page does not accept online payment')
    }
    if (!leanxConfigured()) throw bad('Payment is not configured', 503)

    const draft = buildOrderDraft(data, payload)
    const details = payload.details!
    const ref = serverOrderRef()
    const token = accessToken()

    const order: Order = {
      ref,
      createdAt: new Date().toISOString(),
      status: 'pending',
      customer: details,
      items: draft.lines,
      totals: draft.totals,
      payment: { gateway: 'leanx', status: 'pending' },
      linkSlug: draft.linkSlug,
      workshopId: draft.workshopId,
      commission: draft.commission,
      ...(draft.oversold ? { oversold: true } : {}),
      accessToken: token,
    }

    const base = baseUrl()
    let bill
    try {
      bill = await createBillSilent({
        amount: draft.totals.total,
        invoiceRef: ref,
        fullName: details.name,
        email: details.email,
        phone: details.phone,
        paymentServiceId: payload.paymentServiceId,
        // Both URLs are built from a server-side base, never a request header.
        redirectUrl: `${base}/order/success?ref=${encodeURIComponent(ref)}&t=${token}`,
        callbackUrl: `${base}/api/payments/leanx/webhook`,
      })
    } catch (e) {
      console.error('[leanx] create-bill-silent failed:', (e as Error).message)
      // Nothing was persisted, so the buyer can simply try again.
      throw bad(
        e instanceof LeanXError ? 'Could not start the payment. Please try again.' : 'Payment error',
        502,
      )
    }

    // Persist only once LeanX has accepted the bill, so a failed call leaves no
    // orphan pending order behind.
    order.payment = { gateway: 'leanx', status: 'pending', billNo: bill.billNo }
    data.orders.unshift(order)
    store.save()

    return json({ ref, redirectUrl: bill.redirectUrl }, 201)
  })
}
