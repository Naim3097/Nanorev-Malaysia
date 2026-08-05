import { bad, body, json, requireAdmin, withStoreWrite } from '@/server/request'
import { assignFields } from '@/server/validate'
import type { AffiliateLink } from '@/types'

const EDITABLE = ['pageId', 'workshopId', 'active'] as const

export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return withStoreWrite(async (store) => {
    requireAdmin(req)
    const l = store.data.links.find((x) => x.slug === slug)
    if (!l) throw bad('Link not found', 404)
    const b = await body<Partial<AffiliateLink>>(req)
    assignFields(l, b, EDITABLE)
    store.save()
    return json(l)
  })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return withStoreWrite((store) => {
    requireAdmin(req)
    const { data } = store
    const i = data.links.findIndex((x) => x.slug === slug)
    if (i === -1) throw bad('Link not found', 404)
    data.links.splice(i, 1)
    store.save()
    return json({ ok: true })
  })
}
