import { bad, body, json, requireAdmin, withStore, withStoreWrite } from '@/server/request'
import { clampRate, slugify } from '@/server/validate'
import type { Workshop } from '@/types'

export const dynamic = 'force-dynamic'

export function GET(req: Request) {
  return withStore((store) => {
    requireAdmin(req)
    const { data } = store
    return json(
      data.workshops.map((w) => {
        const orders = data.orders.filter((o) => o.workshopId === w.id)
        return {
          ...w,
          links: data.links.filter((l) => l.workshopId === w.id).length,
          orders: orders.length,
          earned: +orders.reduce((n, o) => n + o.commission, 0).toFixed(2),
        }
      }),
    )
  })
}

export function POST(req: Request) {
  return withStoreWrite(async (store) => {
    requireAdmin(req)
    const { data } = store
    const b = await body<Partial<Workshop>>(req)
    if (!b.id || !b.name) throw bad('id and name are required')
    const cleanId = slugify(b.id)
    if (!cleanId) throw bad('id must contain letters or numbers')
    if (data.workshops.some((w) => w.id === cleanId)) throw bad('Workshop id already exists', 409)

    const w: Workshop = {
      id: cleanId,
      name: b.name,
      city: b.city || '',
      whatsapp: b.whatsapp || '',
      tier: b.tier || 'dealer',
      commissionRate: clampRate(b.commissionRate ?? 0.1),
      active: true,
    }
    data.workshops.push(w)
    store.save()
    return json(w, 201)
  })
}
