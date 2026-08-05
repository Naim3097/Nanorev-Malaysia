import { bad, body, json, requireAdmin, withStore, withStoreWrite } from '@/server/request'
import { TEMPLATES, applyTemplate } from '@/server/templates'
import { slugify } from '@/server/validate'
import type { AffiliateLink, LandingPage } from '@/types'

export const dynamic = 'force-dynamic'

export function GET(req: Request) {
  return withStore((store) => {
    requireAdmin(req)
    return json(store.data.pages)
  })
}

// Create from zero (empty canvas) or from a template — templates are
// product-agnostic blueprints filled with the chosen product's data here.
// Optionally creates an HQ link at the same time so the page has a URL.
export function POST(req: Request) {
  return withStoreWrite(async (store) => {
    requireAdmin(req)
    const { data } = store
    const { name, productId, slug, templateId } =
      await body<{ name?: string; productId?: string; slug?: string; templateId?: string }>(req)
    if (!name || !productId) throw bad('name and productId are required')
    const product = data.products.find((p) => p.id === productId)
    if (!product) throw bad('Unknown productId')
    const template = templateId ? TEMPLATES.find((t) => t.id === templateId) : null
    if (templateId && !template) throw bad('Unknown templateId')

    const base = 'lp-' + (name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'page')
    let id = base
    let n = 2
    while (data.pages.some((p) => p.id === id)) id = `${base}-${n++}`

    // validate the slug BEFORE creating anything — no partial writes
    let clean: string | null = null
    if (slug) {
      clean = slugify(slug)
      if (!clean) throw bad('Slug must contain letters or numbers')
      if (data.links.some((l) => l.slug === clean)) throw bad('Slug already exists — choose another', 409)
    }

    const category = data.categories.find((c) => c.id === product.cat)
    const applied = template ? applyTemplate(template, product, category) : null
    const now = new Date().toISOString()
    const page: LandingPage = {
      id,
      name,
      productId,
      lang: 'ms',
      whatsapp: data.pages.find((p) => p.whatsapp)?.whatsapp || '',
      waText: `Hai NanoRev! Saya berminat dengan ${product.name} (${product.volume}). Boleh bantu saya?`,
      buyLabel: 'Beli Sekarang',
      status: 'draft',
      seo: applied?.seo || { title: `${product.name} | NanoRev Malaysia`, description: '', keywords: '' },
      sections: applied?.sections || [],
      updatedAt: now,
    }
    data.pages.push(page)

    let link: AffiliateLink | null = null
    if (clean) {
      link = { slug: clean, pageId: id, workshopId: null, active: true, clicks: 0, createdAt: now }
      data.links.push(link)
    }
    store.save()
    return json({ page, link }, 201)
  })
}
