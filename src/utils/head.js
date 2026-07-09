import { SITE_URL } from '../data/company'

// Generic document-head manager for SPA SEO. Sets title, meta, Open Graph,
// geo tags, canonical and JSON-LD; returns a cleanup that restores the head.
// Used by landing pages (src/landing/seo.js) and storefront pages (useSeo).

const GEO_TAGS = {
  'geo.region': 'MY-10',
  'geo.placename': 'Shah Alam, Selangor, Malaysia',
  'geo.position': '3.0733;101.5185',
  ICBM: '3.0733, 101.5185',
}

export function applyHead({
  title,
  description,
  keywords,
  canonicalPath,
  image,
  ogType = 'website',
  locale = 'en_MY',
  lang,
  robots,
  jsonLd,
}) {
  const restore = []

  if (title) {
    const prev = document.title
    document.title = title
    restore.push(() => { document.title = prev })
  }

  if (lang) {
    const prev = document.documentElement.lang
    document.documentElement.lang = lang
    restore.push(() => { document.documentElement.lang = prev })
  }

  const upsert = (attr, key, content) => {
    let el = document.head.querySelector(`meta[${attr}="${key}"]`)
    if (el) {
      const prev = el.getAttribute('content')
      restore.push(() => el.setAttribute('content', prev))
    } else {
      el = document.createElement('meta')
      el.setAttribute(attr, key)
      document.head.appendChild(el)
      restore.push(() => el.remove())
    }
    el.setAttribute('content', content)
  }

  if (description) upsert('name', 'description', description)
  if (keywords) upsert('name', 'keywords', keywords)
  if (robots) upsert('name', 'robots', robots)
  for (const [k, v] of Object.entries(GEO_TAGS)) upsert('name', k, v)

  if (title) upsert('property', 'og:title', title)
  if (description) upsert('property', 'og:description', description)
  upsert('property', 'og:type', ogType)
  upsert('property', 'og:locale', locale)
  upsert('property', 'og:site_name', 'NanoRev Malaysia')
  if (image) upsert('property', 'og:image', image)

  if (canonicalPath) {
    const url = `${SITE_URL}${canonicalPath}`
    upsert('property', 'og:url', url)
    let link = document.head.querySelector('link[rel="canonical"]')
    if (link) {
      const prev = link.getAttribute('href')
      restore.push(() => link.setAttribute('href', prev))
    } else {
      link = document.createElement('link')
      link.setAttribute('rel', 'canonical')
      document.head.appendChild(link)
      restore.push(() => link.remove())
    }
    link.setAttribute('href', url)
  }

  if (jsonLd && jsonLd.length) {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(
      jsonLd.map((n) => ({ '@context': 'https://schema.org', ...n })),
    )
    document.head.appendChild(script)
    restore.push(() => script.remove())
  }

  return () => { for (const undo of restore.reverse()) undo() }
}
