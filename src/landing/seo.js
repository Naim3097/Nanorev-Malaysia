import { SITE_URL, company } from '../data/company'
import { applyHead } from '../utils/head'

// SEO / GEO head management for landing pages — thin wrapper over the
// shared head manager (src/utils/head.js) that builds the landing-specific
// JSON-LD (Product offer + FAQPage) from the page config.

export function applySeo({ page, product, canonicalSlug }) {
  if (!page.seo) return () => {}

  const canonicalPath = `/l/${canonicalSlug}`
  const image = product.image ? `${SITE_URL}${product.image}` : undefined
  const faq = page.sections.find((s) => s.type === 'faq')?.props.items || []

  const jsonLd = [
    {
      '@type': 'Product',
      name: product.name,
      description: page.seo.description,
      ...(image ? { image } : {}),
      brand: { '@type': 'Brand', name: 'NanoRev' },
      offers: {
        '@type': 'Offer',
        url: `${SITE_URL}${canonicalPath}`,
        priceCurrency: 'MYR',
        price: product.price.toFixed(2),
        availability: 'https://schema.org/InStock',
        seller: { '@type': 'Organization', name: company.legal },
      },
    },
    ...(faq.length
      ? [{
          '@type': 'FAQPage',
          mainEntity: faq.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }]
      : []),
  ]

  return applyHead({
    title: page.seo.title,
    description: page.seo.description,
    keywords: page.seo.keywords,
    canonicalPath,
    image,
    ogType: 'product',
    locale: 'ms_MY',
    lang: page.lang || 'ms',
    jsonLd,
  })
}
