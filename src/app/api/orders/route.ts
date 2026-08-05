import { bad, body, json, rateLimit, withStoreWrite } from '@/server/request'
import { applyFulfilment, buildOrderDraft, type OrderRequestBody } from '@/server/orders'
import type { Order, PaymentResult } from '@/types'

// Mock-gateway order recording. The buyer has already "paid" against the
// simulated gateway in src/utils/payment.ts, so the order is written `paid` and
// fulfilled immediately.
//
// Real money does NOT come through here — LeanX orders are created pending by
// /api/payments/leanx/create and only fulfilled by the verified webhook.

interface MockOrderBody extends OrderRequestBody {
  ref?: string
  payment?: PaymentResult | null
}

export function POST(req: Request) {
  return withStoreWrite(async (store) => {
    rateLimit(req, 'orders', 200)
    const { data } = store
    const payload = await body<MockOrderBody>(req)
    const { ref, payment } = payload

    if (!ref || typeof ref !== 'string' || ref.length > 40) throw bad('Valid ref is required')
    if (data.orders.some((o) => o.ref === ref)) throw bad('Order ref already exists', 409)

    const draft = buildOrderDraft(data, payload)

    const order: Order = {
      ref,
      createdAt: new Date().toISOString(),
      status: 'paid',
      customer: payload.details!,
      items: draft.lines,
      totals: draft.totals,
      payment: payment || null,
      linkSlug: draft.linkSlug,
      workshopId: draft.workshopId,
      commission: draft.commission,
      ...(draft.oversold ? { oversold: true } : {}), // fulfil manually — stock was short
      fulfilledAt: new Date().toISOString(),
    }
    data.orders.unshift(order)
    applyFulfilment(data, order)

    store.save()
    return json(order, 201)
  })
}
