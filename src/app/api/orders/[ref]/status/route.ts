import { json, withStoreWrite } from '@/server/request'
import { transactionStatus } from '@/server/leanx'
import { settleOrder } from '@/server/orders'

// Receipt data for the success page, plus the reconciliation path for when a
// webhook never arrives.
//
// Order refs are derived from a timestamp and are therefore guessable, so this
// requires the per-order accessToken minted at bill creation. Without it we
// answer 401 whether or not the order exists — a bare ref must never confirm
// that someone bought something, let alone return their address.

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params
  const token = new URL(req.url).searchParams.get('t') || ''

  return withStoreWrite(async (store) => {
    const order = store.data.orders.find((o) => o.ref === ref)
    if (!order || !order.accessToken || order.accessToken !== token) {
      return json({ error: 'Not found' }, 401)
    }

    // Still pending? The webhook may have been missed or delayed — ask LeanX
    // directly. A null answer means "unknown" (their status endpoint 404s live
    // bills), so the order simply stays pending; only an explicit verdict moves it.
    const billNo = (order.payment as { billNo?: string } | null)?.billNo
    if (order.status === 'pending' && billNo) {
      const remote = await transactionStatus(billNo)
      if (remote && remote.status !== 'pending') {
        await settleOrder(store, ref, {
          status: remote.status,
          billNo,
          amount: remote.amount,
          method: remote.paymentMethod,
        })
      }
    }

    const fresh = store.data.orders.find((o) => o.ref === ref) ?? order
    return json({
      ref: fresh.ref,
      status: fresh.status,
      createdAt: fresh.createdAt,
      items: fresh.items,
      totals: fresh.totals,
      customer: fresh.customer,
      payment: {
        gateway: (fresh.payment as { gateway?: string } | null)?.gateway ?? null,
        method: (fresh.payment as { method?: string } | null)?.method ?? null,
        receiptId: (fresh.payment as { billNo?: string } | null)?.billNo ?? null,
      },
    })
  })
}
