// Prerenders SEO-critical routes to static HTML after `vite build`:
//   /l/<slug>            landing pages (all affiliate variants)
//   /                    home (Organization + WebSite schema, crawlable links)
//   /shop, /shop/<cat>   catalogue pages (ItemList schema)
//   /product/<id>        product pages (Product + BreadcrumbList schema)
// and generates dist/sitemap.xml from the same data.
//
// AI search crawlers (GPTBot, PerplexityBot, Gemini, ClaudeBot) do not run
// JavaScript — without this they see an empty <div id="root">. The static
// snapshots carry full head tags + semantic content; when the JS bundle
// loads, React replaces the content for real users.

import { build } from 'esbuild'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// ── load the data layer (extensionless ESM imports need a bundler) ──
const bundlePath = resolve(root, 'node_modules/.prerender/landing-data.mjs')
mkdirSync(dirname(bundlePath), { recursive: true })
await build({
  stdin: {
    contents: `
      export * from './src/data/landingPages.js'
      export { products, productById, productsByCat } from './src/data/products.js'
      export { categories, categoryById } from './src/data/categories.js'
      export { SITE_URL, company, locations, dealerNote } from './src/data/company.js'
    `,
    resolveDir: root,
  },
  bundle: true,
  format: 'esm',
  outfile: bundlePath,
  logLevel: 'silent',
})
const seed = await import(pathToFileURL(bundlePath).href + `?t=${Date.now()}`)
const { SITE_URL, company, locations } = seed

// Prefer the LIVE backend so builder/admin edits reach the crawler
// snapshots; fall back to the static seed when the API is offline.
async function loadData() {
  const base = process.env.API_URL || 'http://localhost:4000'
  const key = process.env.ADMIN_KEY || 'nanorev-admin'
  try {
    const get = async (path, admin = false) => {
      const res = await fetch(`${base}/api${path}`, admin ? { headers: { 'x-admin-key': key } } : undefined)
      if (!res.ok) throw new Error(`${path} → ${res.status}`)
      return res.json()
    }
    const [products, categories, pages, links] = await Promise.all([
      get('/products'), get('/categories'), get('/admin/pages', true), get('/admin/links', true),
    ])
    console.log('prerender data source: live API')
    return {
      products,
      categories,
      landingPages: pages.filter((p) => p.status === 'published'),
      affiliateLinks: links.filter((l) => l.active),
    }
  } catch {
    console.log('prerender data source: static seed (API offline)')
    return {
      products: seed.products,
      categories: seed.categories,
      landingPages: seed.landingPages,
      affiliateLinks: seed.affiliateLinks,
    }
  }
}

const { products, categories, landingPages, affiliateLinks } = await loadData()
const productById = (id) => products.find((p) => p.id === id)
const productsByCat = (cat) => products.filter((p) => p.cat === cat)
const categoryById = (id) => categories.find((c) => c.id === id)

const esc = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const rm = (n) => 'RM ' + n.toFixed(2)
const ldScript = (nodes) =>
  `<script type="application/ld+json">${JSON.stringify(
    nodes.map((n) => ({ '@context': 'https://schema.org', ...n })),
  ).replaceAll('</', '<\\/')}</script>`

const GEO_META = `
    <meta name="geo.region" content="MY-10" />
    <meta name="geo.placename" content="Shah Alam, Selangor, Malaysia" />
    <meta name="geo.position" content="3.0733;101.5185" />
    <meta name="ICBM" content="3.0733, 101.5185" />
    <meta name="robots" content="index, follow" />`

const ORG_LD = {
  '@type': 'Organization',
  name: company.name,
  legalName: company.legal,
  url: SITE_URL,
  logo: `${SITE_URL}/nanorev-logo.png`,
  address: { '@type': 'PostalAddress', addressLocality: 'Shah Alam', addressRegion: 'Selangor', addressCountry: 'MY' },
}

// shared shell — read ONCE before the home page overwrites dist/index.html
const shell = readFileSync(resolve(root, 'dist/index.html'), 'utf8')

function renderPage({ path, lang = 'en', title, description, keywords, canonical, ogType = 'website', locale = 'en_MY', image, jsonLd, body }) {
  const url = `${SITE_URL}${canonical || path}`
  const head = `
    ${keywords ? `<meta name="keywords" content="${esc(keywords)}" />` : ''}${GEO_META}
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:locale" content="${locale}" />
    <meta property="og:site_name" content="NanoRev Malaysia" />
    ${image ? `<meta property="og:image" content="${esc(image)}" />` : ''}
    <link rel="canonical" href="${esc(url)}" />
    ${ldScript(jsonLd)}`

  let html = shell
    .replace('<html lang="en">', `<html lang="${lang}">`)
    .replace(/<title>.*?<\/title>/s, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=").*?(" \/>)/s, `$1${esc(description)}$2`)
    .replace('</head>', `${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">\n${body}\n</div>`)

  const dir = path === '/' ? resolve(root, 'dist') : resolve(root, 'dist', path.slice(1))
  mkdirSync(dir, { recursive: true })
  writeFileSync(resolve(dir, 'index.html'), html)
}

const footer = `<footer><p>${esc(company.legal)} · Shah Alam, Selangor · Penghantaran ke seluruh Malaysia 🇲🇾</p></footer>`
const header = `<header><p><strong>NANOREV</strong> — ${esc(company.tagline)}</p></header>`

// ── landing pages (all affiliate variants; canonical → plain slug) ──
let counts = { landing: 0, store: 0 }
for (const link of affiliateLinks) {
  const page = landingPages.find((p) => p.id === link.pageId)
  if (!page || !page.seo) continue
  const product = productById(page.productId)
  const plainSlug = affiliateLinks.find((l) => l.pageId === link.pageId && !l.workshopId)?.slug || link.slug
  const faq = page.sections.find((s) => s.type === 'faq')?.props.items || []
  const image = product.image ? `${SITE_URL}${product.image}` : undefined

  const sec = (type) => page.sections.find((s) => s.type === type)?.props
  const hero = sec('hero'); const pains = sec('pains'); const benefits = sec('benefits')
  const steps = sec('steps'); const quotes = sec('testimonials'); const specs = sec('specs'); const cta = sec('cta')
  const body = [
    header,
    `<main><article><h1>${esc(hero.headline)}</h1><p>${esc(hero.sub)}</p>`,
    `<p><strong>${esc(product.name)}</strong> · ${esc(product.volume)} · ${rm(product.price)}</p>`,
    `<ul>${hero.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`,
    pains ? `<section><h2>${esc(pains.title)}</h2><p>${esc(pains.intro)}</p>${pains.items.map((p) => `<h3>${esc(p.title)}</h3><p>${esc(p.text)}</p>`).join('')}<p><em>${esc(pains.outro)}</em></p></section>` : '',
    benefits ? `<section><h2>${esc(benefits.title)}</h2>${benefits.items.map((b) => `<h3>${esc(b.title)}</h3><p>${esc(b.text)}</p>`).join('')}</section>` : '',
    steps ? `<section><h2>${esc(steps.title)}</h2><ol>${steps.items.map((s) => `<li><strong>${esc(s.title)}</strong> — ${esc(s.text)}</li>`).join('')}</ol></section>` : '',
    quotes ? `<section><h2>${esc(quotes.title)}</h2>${quotes.quotes.map((q) => `<blockquote><p>${esc(q.text)}</p><cite>${esc(q.name)} — ${esc(q.role)}</cite></blockquote>`).join('')}</section>` : '',
    specs ? `<section><h2>${esc(specs.title)}</h2><dl>${specs.rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></section>` : '',
    faq.length ? `<section><h2>Soalan Lazim</h2>${faq.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}</section>` : '',
    cta ? `<section><h2>${esc(cta.title)}</h2><p>${esc(cta.text)}</p></section>` : '',
    `</article></main>`,
    footer,
  ].join('\n')

  renderPage({
    path: `/l/${link.slug}`,
    canonical: `/l/${plainSlug}`,
    lang: page.lang || 'ms',
    title: page.seo.title,
    description: page.seo.description,
    keywords: page.seo.keywords,
    ogType: 'product',
    locale: 'ms_MY',
    image,
    jsonLd: [
      {
        '@type': 'Product',
        name: product.name,
        description: page.seo.description,
        ...(image ? { image } : {}),
        brand: { '@type': 'Brand', name: 'NanoRev' },
        offers: {
          '@type': 'Offer', url: `${SITE_URL}/l/${plainSlug}`, priceCurrency: 'MYR',
          price: product.price.toFixed(2), availability: 'https://schema.org/InStock',
          seller: { '@type': 'Organization', name: company.legal },
        },
      },
      ORG_LD,
      ...(faq.length ? [{
        '@type': 'FAQPage',
        mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      }] : []),
    ],
    body,
  })
  counts.landing++
}

// ── product pages ──
const productLi = (p) =>
  `<li><a href="/product/${p.id}">${esc(p.name)} ${esc(p.grade)}</a> — ${esc(p.volume)} · ${esc(p.base)} · ${rm(p.price)}</li>`

for (const p of products) {
  const cat = categoryById(p.cat)
  const image = p.image ? `${SITE_URL}${p.image}` : undefined
  const related = productsByCat(p.cat).filter((x) => x.id !== p.id).slice(0, 5)
  renderPage({
    path: `/product/${p.id}`,
    title: `${p.name} ${p.grade} · ${p.volume} — ${cat.name} | NanoRev Malaysia`,
    description: `${p.name} ${p.grade} (${p.volume} · ${p.base} · ${p.spec}). Genuine NanoRev stock at ${rm(p.price)}. Same-day dispatch from Shah Alam, delivery across Malaysia.`,
    keywords: `${p.name}, ${p.grade}, ${cat.name}, ${p.base}, NanoRev, minyak enjin Malaysia, lubricant`,
    ogType: 'product',
    image,
    jsonLd: [
      {
        '@type': 'Product',
        name: `${p.name} ${p.grade}`,
        description: `${p.volume} · ${p.base} · ${p.spec}`,
        ...(image ? { image } : {}),
        brand: { '@type': 'Brand', name: 'NanoRev' },
        offers: { '@type': 'Offer', url: `${SITE_URL}/product/${p.id}`, priceCurrency: 'MYR', price: p.price.toFixed(2), availability: 'https://schema.org/InStock' },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE_URL}/shop` },
          { '@type': 'ListItem', position: 3, name: cat.name, item: `${SITE_URL}/shop/${cat.id}` },
          { '@type': 'ListItem', position: 4, name: `${p.name} ${p.grade}` },
        ],
      },
    ],
    body: [
      header,
      `<main><article><h1>${esc(p.name)} ${esc(p.grade)}</h1>`,
      `<p><a href="/shop/${cat.id}">${esc(cat.name)}</a> · ${esc(p.spec)}</p>`,
      `<p><strong>${rm(p.price)}</strong> / ${esc(p.volume)}</p>`,
      `<dl><dt>Viscosity grade</dt><dd>${esc(p.grade)}</dd><dt>Volume</dt><dd>${esc(p.volume)}</dd><dt>Base oil</dt><dd>${esc(p.base)}</dd><dt>Specification</dt><dd>${esc(p.spec)}</dd><dt>Application</dt><dd>${esc(cat.name)}</dd></dl>`,
      related.length ? `<section><h2>More in ${esc(cat.name)}</h2><ul>${related.map(productLi).join('')}</ul></section>` : '',
      `</article></main>`,
      footer,
    ].join('\n'),
  })
  counts.store++
}

// ── shop + category pages ──
const shopPage = (cat) => {
  const list = cat ? productsByCat(cat.id) : products
  renderPage({
    path: cat ? `/shop/${cat.id}` : '/shop',
    title: cat
      ? `${cat.name} — Genuine NanoRev Stock | NanoRev Malaysia`
      : 'Shop All Products — Lubricants & Additives | NanoRev Malaysia',
    description: cat
      ? `${cat.name} for ${cat.blurb.toLowerCase()} — genuine NanoRev stock, dealer pricing on bulk orders, same-day dispatch from Shah Alam across Malaysia.`
      : 'Browse the full NanoRev range — engine oil, motorcycle & diesel lubricants, transmission fluid, grease, coolant and nano additives. Ships across Malaysia.',
    jsonLd: [
      {
        '@type': 'ItemList',
        name: cat ? cat.name : 'All products',
        itemListElement: list.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: `${p.name} ${p.grade}`, url: `${SITE_URL}/product/${p.id}` })),
      },
      ORG_LD,
    ],
    body: [
      header,
      `<main><h1>${cat ? esc(cat.name) : 'All products'}</h1>`,
      cat ? `<p>${esc(cat.blurb)}</p>` : '<p>Lubricants, additives and consumables — ready to ship across Malaysia.</p>',
      `<ul>${list.map(productLi).join('')}</ul>`,
      `<nav><h2>Categories</h2><ul>${categories.map((c) => `<li><a href="/shop/${c.id}">${esc(c.name)}</a> — ${esc(c.blurb)}</li>`).join('')}</ul></nav>`,
      `</main>`,
      footer,
    ].join('\n'),
  })
  counts.store++
}
shopPage(null)
for (const c of categories) shopPage(c)

// ── home ── (written LAST — it overwrites dist/index.html, the shell source)
const bestsellers = products.filter((p) => p.badge === 'bestseller')
renderPage({
  path: '/',
  title: 'NanoRev Malaysia — Engine Oil, Lubricants & Nano Additives | Nano Revolution Autolube',
  description:
    'Official NanoRev store — fully synthetic engine oil, motorcycle & diesel lubricants, gear oil, coolant and nano additives. Dealer & workshop pricing. Same-day dispatch from Shah Alam across Malaysia.',
  keywords:
    'minyak enjin, engine oil Malaysia, lubricant distributor Malaysia, minyak hitam, aditif enjin, workshop supplier, dealer minyak enjin, NanoRev',
  image: `${SITE_URL}/nanorev-logo.png`,
  jsonLd: [
    ORG_LD,
    {
      '@type': 'WebSite',
      name: company.name,
      url: SITE_URL,
      potentialAction: { '@type': 'SearchAction', target: `${SITE_URL}/shop?q={search_term_string}`, 'query-input': 'required name=search_term_string' },
    },
  ],
  body: [
    header,
    `<main><h1>NanoRev Malaysia — Nano Revolution Autolube</h1>`,
    `<p>Fully synthetic engine oils and precision lubricants for cars, bikes, trucks and industry. Trusted by workshops and fleets across Malaysia. Dealer and workshop pricing available on bulk orders.</p>`,
    `<nav><h2>Shop by application</h2><ul>${categories.map((c) => `<li><a href="/shop/${c.id}">${esc(c.name)}</a> — ${esc(c.blurb)}</li>`).join('')}</ul></nav>`,
    `<section><h2>Bestsellers</h2><ul>${bestsellers.map(productLi).join('')}</ul></section>`,
    `<section><h2>Locations</h2>${locations.map((l) => `<h3>${esc(l.name)}</h3><p>${esc(l.address)} · ${esc(l.hours)} · ${esc(l.eta)}</p>`).join('')}</section>`,
    `</main>`,
    footer,
  ].join('\n'),
})
counts.store++

// ── sitemap ──
const urls = [
  { loc: '/', priority: '1.0' },
  { loc: '/shop', priority: '0.8' },
  ...categories.map((c) => ({ loc: `/shop/${c.id}`, priority: '0.7' })),
  ...products.map((p) => ({ loc: `/product/${p.id}`, priority: '0.6' })),
  // only links whose page is actually published — never index a draft
  ...affiliateLinks
    .filter((l) => !l.workshopId && landingPages.some((p) => p.id === l.pageId))
    .map((l) => ({ loc: `/l/${l.slug}`, priority: '0.9' })),
]
writeFileSync(
  resolve(root, 'dist/sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${SITE_URL}${u.loc}</loc><priority>${u.priority}</priority></url>`)
    .join('\n')}\n</urlset>\n`,
)

console.log(`prerendered ${counts.landing} landing + ${counts.store} store page(s); sitemap has ${urls.length} URLs`)
