import { bad, body, json, requireAdmin, withStoreWrite } from '@/server/request'
import { assignFields, clampRate } from '@/server/validate'
import type { Workshop } from '@/types'

const EDITABLE = ['name', 'city', 'whatsapp', 'tier', 'commissionRate', 'active'] as const

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withStoreWrite(async (store) => {
    requireAdmin(req)
    const w = store.data.workshops.find((x) => x.id === id)
    if (!w) throw bad('Workshop not found', 404)
    const b = await body<Partial<Workshop>>(req)
    assignFields(w, b, EDITABLE)
    w.commissionRate = clampRate(w.commissionRate)
    store.save()
    return json(w)
  })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withStoreWrite((store) => {
    requireAdmin(req)
    const { data } = store
    const i = data.workshops.findIndex((w) => w.id === id)
    if (i === -1) throw bad('Workshop not found', 404)
    if (data.links.some((l) => l.workshopId === id)) throw bad('Workshop has links — delete those first', 409)
    if (data.orders.some((o) => o.workshopId === id)) {
      throw bad('Workshop has orders — deactivate it instead', 409)
    }
    data.workshops.splice(i, 1)
    store.save()
    return json({ ok: true })
  })
}
