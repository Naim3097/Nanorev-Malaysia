import type { ResolvedLanding, StoreData } from '@/types'

// Resolve an affiliate slug to the page, product and (optional) workshop that
// should render for it.
//
// preview: an authenticated admin can view a page before it is live — draft
// status, an inactive link, or an inactive product/workshop don't 404.
export function resolveSlug(
  data: StoreData,
  slug: string,
  { preview = false }: { preview?: boolean } = {},
): ResolvedLanding | null {
  const link = data.links.find((l) => l.slug === slug && (l.active || preview))
  if (!link) return null

  const page = data.pages.find((p) => p.id === link.pageId)
  if (!page || (page.status !== 'published' && !preview)) return null

  const product = data.products.find((p) => p.id === page.productId)
  if (!product || (!product.active && !preview)) return null

  const workshop = link.workshopId ? data.workshops.find((w) => w.id === link.workshopId) : null
  if (link.workshopId && (!workshop || (!workshop.active && !preview))) return null

  // canonical = the plain (non-workshop) slug for this page, for SEO dedupe
  const canonicalSlug =
    data.links.find((l) => l.pageId === link.pageId && !l.workshopId && l.active)?.slug || slug

  return { page, workshop: workshop ?? null, product, canonicalSlug }
}

/** Storefront navigation — one entry per published page with an active HQ link. */
export function navEntries(data: StoreData) {
  const seen = new Set<string>()
  const nav: { slug: string; label: string }[] = []
  for (const l of data.links) {
    if (!l.active || l.workshopId || seen.has(l.pageId)) continue
    const page = data.pages.find((p) => p.id === l.pageId)
    if (!page || page.status !== 'published') continue
    const product = data.products.find((p) => p.id === page.productId)
    if (!product || !product.active) continue
    seen.add(l.pageId)
    nav.push({ slug: l.slug, label: product.name })
  }
  return nav
}
