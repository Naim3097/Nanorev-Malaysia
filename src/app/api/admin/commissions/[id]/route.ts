import { bad, body, json, requireAdmin, withStoreWrite } from '@/server/request'
import type { CommissionStatus } from '@/types'

const STATUSES: CommissionStatus[] = ['pending', 'approved', 'paid', 'void']

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withStoreWrite(async (store) => {
    requireAdmin(req)
    const c = store.data.commissions.find((x) => x.id === id)
    if (!c) throw bad('Commission not found', 404)
    const b = await body<{ status?: CommissionStatus }>(req)
    if (b.status && STATUSES.includes(b.status)) c.status = b.status
    store.save()
    return json(c)
  })
}
