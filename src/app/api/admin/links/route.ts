import { bad, body, json, requireAdmin, withStore, withStoreWrite } from '@/server/request'
import { slugify } from '@/server/validate'
import type { AffiliateLink } from '@/types'

export const dynamic = 'force-dynamic'

export function GET(req: Request) {
  return withStore((store) => {
    requireAdmin(req)
    return json(store.data.links)
  })
}

export function POST(req: Request) {
  return withStoreWrite(async (store) => {
    requireAdmin(req)
    const { data } = store
    const { slug, pageId, workshopId } =
      await body<{ slug?: string; pageId?: string; workshopId?: string | null }>(req)
    if (!slug || !pageId) throw bad('slug and pageId are required')
    const clean = slugify(slug)
    if (!clean) throw bad('Slug must contain letters or numbers')
    if (data.links.some((l) => l.slug === clean)) throw bad('Slug already exists', 409)
    if (!data.pages.some((p) => p.id === pageId)) throw bad('Unknown pageId')
    if (workshopId && !data.workshops.some((w) => w.id === workshopId)) throw bad('Unknown workshopId')

    const link: AffiliateLink = {
      slug: clean,
      pageId,
      workshopId: workshopId || null,
      active: true,
      clicks: 0,
      createdAt: new Date().toISOString(),
    }
    data.links.push(link)
    store.save()
    return json(link, 201)
  })
}
