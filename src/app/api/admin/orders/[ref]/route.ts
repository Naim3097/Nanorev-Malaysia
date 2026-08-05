import { bad, body, json, requireAdmin, withStoreWrite } from '@/server/request'
import type { OrderStatus } from '@/types'

const STATUSES: OrderStatus[] = ['paid', 'packing', 'dispatched', 'completed', 'cancelled']

export async function PUT(req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params
  return withStoreWrite(async (store) => {
    requireAdmin(req)
    const o = store.data.orders.find((x) => x.ref === ref)
    if (!o) throw bad('Order not found', 404)
    const b = await body<{ status?: OrderStatus }>(req)
    if (b.status && STATUSES.includes(b.status)) o.status = b.status
    store.save()
    return json(o)
  })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params
  return withStoreWrite((store) => {
    requireAdmin(req)
    const { data } = store
    const i = data.orders.findIndex((o) => o.ref === ref)
    if (i === -1) throw bad('Order not found', 404)
    data.orders.splice(i, 1)
    data.commissions = data.commissions.filter((c) => c.orderRef !== ref)
    store.save()
    return json({ ok: true })
  })
}
