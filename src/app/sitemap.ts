import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/data/company'
import { readStore } from '@/server/read'
import { resolveSlug } from '@/server/resolve'

// Replaces the sitemap the old build-time prerender script emitted. Generated
// from live store data, so pages created in the admin appear without a deploy.
// Transactional routes (cart/checkout/payment/order) are deliberately absent —
// they carry no content value and public/robots.txt disallows them.

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/shop`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
  ]

  try {
    const data = await readStore()

    for (const c of data.categories) {
      entries.push({
        url: `${SITE_URL}/shop/${c.id}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }

    for (const p of data.products.filter((x) => x.active)) {
      entries.push({
        url: `${SITE_URL}/product/${p.id}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }

    // Only canonical (non-workshop) links: co-branded slugs are duplicates that
    // canonicalise back to these, so listing them would split ranking signals.
    for (const l of data.links) {
      if (!l.active || l.workshopId) continue
      const resolved = resolveSlug(data, l.slug)
      if (!resolved || resolved.canonicalSlug !== l.slug) continue
      entries.push({
        url: `${SITE_URL}/l/${l.slug}`,
        lastModified: new Date(resolved.page.updatedAt || now),
        changeFrequency: 'weekly',
        priority: 0.9,
      })
    }
  } catch {
    // an unreachable store still yields a valid, if minimal, sitemap
  }

  return entries
}
