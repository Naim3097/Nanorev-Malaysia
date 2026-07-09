// NanoRev backend — catalog, dynamic landing pages, affiliate links,
// orders with attribution + commission, inventory.
//
//   npm run server          → http://localhost:4000  (Vite proxies /api to it)
//   ADMIN_KEY=<secret>      → admin auth (default: nanorev-admin — DEV ONLY)
//
// Persistence: server/store.mjs (JSON file, seeded from src/data on first boot).

import express from 'express'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { openStore, DATA_DIR } from './store.mjs'
import { TEMPLATES, applyTemplate } from './templates.mjs'

const SERVER_DIR = dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = resolve(DATA_DIR, 'uploads')
const DIST_DIR = resolve(SERVER_DIR, '..', 'dist')
mkdirSync(UPLOAD_DIR, { recursive: true })

const PORT = process.env.PORT || 4000
const ADMIN_KEY = process.env.ADMIN_KEY || 'nanorev-admin'
const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000 // 30-day last click

const { data, save, pricing } = await openStore()
const app = express()
app.use(express.json({ limit: '1mb' }))

const now = () => new Date().toISOString()
const findProduct = (id) => data.products.find((p) => p.id === id)
const findPage = (id) => data.pages.find((p) => p.id === id)
const findWorkshop = (id) => data.workshops.find((w) => w.id === id)

// simple fixed-window rate limiter per IP — abuse guard on write endpoints
const buckets = new Map()
const rateLimit = (limit, windowMs = 60_000) => (req, res, next) => {
  const ip = req.ip || 'unknown'
  const k = `${ip}:${req.path.split('/')[2] || ''}`
  const nowMs = Date.now()
  let b = buckets.get(k)
  if (!b || nowMs > b.reset) { b = { count: 0, reset: nowMs + windowMs }; buckets.set(k, b) }
  b.count += 1
  if (b.count > limit) return res.status(429).json({ error: 'Too many requests — try again shortly' })
  next()
}

// ── public: catalog ──────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ ok: true, time: now() }))

app.get('/api/products', (req, res) => res.json(data.products.filter((p) => p.active)))

app.get('/api/products/:id', (req, res) => {
  const p = findProduct(req.params.id)
  if (!p || !p.active) return res.status(404).json({ error: 'Product not found' })
  res.json(p)
})

app.get('/api/categories', (req, res) => res.json(data.categories))

// storefront navigation — one entry per published page that has an active
// HQ (non-workshop) link, so pages created in admin appear in the menu
app.get('/api/nav', (req, res) => {
  const seen = new Set()
  const nav = []
  for (const l of data.links) {
    if (!l.active || l.workshopId || seen.has(l.pageId)) continue
    const page = findPage(l.pageId)
    if (!page || page.status !== 'published') continue
    const product = findProduct(page.productId)
    if (!product || !product.active) continue
    seen.add(l.pageId)
    nav.push({ slug: l.slug, label: product.name })
  }
  res.json(nav)
})

// ── public: landing pages / affiliate links ──────────────────────
function resolveSlug(slug) {
  const link = data.links.find((l) => l.slug === slug && l.active)
  if (!link) return null
  const page = findPage(link.pageId)
  if (!page || page.status !== 'published') return null
  const product = findProduct(page.productId)
  if (!product || !product.active) return null
  const workshop = link.workshopId ? findWorkshop(link.workshopId) : null
  if (link.workshopId && (!workshop || !workshop.active)) return null
  const canonicalSlug =
    data.links.find((l) => l.pageId === link.pageId && !l.workshopId && l.active)?.slug || slug
  return { link, page, workshop, product, canonicalSlug }
}

app.get('/api/landing/:slug', (req, res) => {
  const resolved = resolveSlug(req.params.slug)
  if (!resolved) return res.status(404).json({ error: 'Link not found' })
  const { page, workshop, product, canonicalSlug } = resolved
  res.json({ page, workshop, product, canonicalSlug })
})

app.post('/api/landing/:slug/click', rateLimit(600), (req, res) => {
  const link = data.links.find((l) => l.slug === req.params.slug)
  if (link) {
    link.clicks += 1
    save()
  }
  res.json({ ok: true })
})

// ── public: orders ───────────────────────────────────────────────
app.post('/api/orders', rateLimit(200), (req, res) => {
  const { ref, items, details, payment, attribution } = req.body || {}
  if (!ref || typeof ref !== 'string' || ref.length > 40) {
    return res.status(400).json({ error: 'Valid ref is required' })
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return res.status(400).json({ error: 'items must contain 1–50 lines' })
  }
  if (!details || !String(details.name || '').trim() || !String(details.phone || '').trim()) {
    return res.status(400).json({ error: 'details.name and details.phone are required' })
  }
  if (data.orders.some((o) => o.ref === ref)) {
    return res.status(409).json({ error: 'Order ref already exists' })
  }

  // server-side prices — never trust the client's
  const lines = []
  let oversold = false
  for (const it of items) {
    const p = findProduct(it.id)
    if (!p || !p.active) return res.status(400).json({ error: `Unknown product: ${it.id}` })
    const qty = Math.min(999, Math.max(1, Math.floor(Number(it.qty) || 1)))
    if ((p.stock ?? 0) < qty) oversold = true
    lines.push({ id: p.id, name: `${p.name} ${p.grade}`.trim(), volume: p.volume, price: p.price, qty })
  }
  const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0)
  const totals = pricing.computeTotals(subtotal, details.mode)

  // affiliate attribution — last click within the window wins.
  // The link is ALWAYS recorded (marketing data); commission only when an
  // active workshop owns the link.
  let linkSlug = null
  let workshopId = null
  let commission = 0
  const ts = Number(attribution?.ts)
  if (attribution?.slug && Number.isFinite(ts) && Date.now() - ts < ATTRIBUTION_WINDOW_MS) {
    const link = data.links.find((l) => l.slug === attribution.slug)
    if (link) {
      linkSlug = link.slug
      const workshop = link.workshopId ? findWorkshop(link.workshopId) : null
      if (workshop && workshop.active) {
        workshopId = workshop.id
        commission = +(subtotal * workshop.commissionRate).toFixed(2)
      }
    }
  }

  // inventory
  for (const l of lines) {
    const p = findProduct(l.id)
    p.stock = Math.max(0, (p.stock ?? 0) - l.qty)
  }

  const order = {
    ref,
    createdAt: now(),
    status: 'paid',
    customer: details,
    items: lines,
    totals,
    payment: payment || null,
    linkSlug,
    workshopId,
    commission,
    ...(oversold ? { oversold: true } : {}), // fulfil manually — stock was short
  }
  data.orders.unshift(order)
  if (commission > 0) {
    data.commissions.unshift({
      id: `cm-${ref}`,
      orderRef: ref,
      workshopId,
      amount: commission,
      status: 'pending',
      createdAt: now(),
    })
  }
  save()
  res.status(201).json(order)
})

// ── admin ────────────────────────────────────────────────────────
app.use('/api/admin', (req, res, next) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(401).json({ error: 'Invalid admin key' })
  next()
})

app.get('/api/admin/summary', (req, res) => {
  const revenue = data.orders.reduce((n, o) => n + (o.totals?.total || 0), 0)
  const pendingCommissions = data.commissions
    .filter((c) => c.status === 'pending')
    .reduce((n, c) => n + c.amount, 0)
  const topLinks = [...data.links].sort((a, b) => b.clicks - a.clicks).slice(0, 5)
  const lowStock = data.products.filter((p) => p.active && p.stock <= 10)
  res.json({
    orders: data.orders.length,
    revenue: +revenue.toFixed(2),
    clicks: data.links.reduce((n, l) => n + l.clicks, 0),
    pendingCommissions: +pendingCommissions.toFixed(2),
    workshops: data.workshops.filter((w) => w.active).length,
    pages: data.pages.length,
    topLinks,
    lowStock: lowStock.map((p) => ({ id: p.id, name: `${p.name} ${p.grade}`.trim(), stock: p.stock })),
  })
})

// products / inventory
app.get('/api/admin/products', (req, res) => res.json(data.products))
const validCat = (cat) => data.categories.some((c) => c.id === cat)
app.put('/api/admin/products/:id', (req, res) => {
  const p = findProduct(req.params.id)
  if (!p) return res.status(404).json({ error: 'Product not found' })
  // validate BEFORE mutating — a rejected request must leave no trace
  const b = req.body
  if ('price' in b && (!Number.isFinite(Number(b.price)) || Number(b.price) < 0)) {
    return res.status(400).json({ error: 'price must be a non-negative number' })
  }
  if ('stock' in b && (!Number.isFinite(Number(b.stock)) || Number(b.stock) < 0)) {
    return res.status(400).json({ error: 'stock must be a non-negative number' })
  }
  if ('cat' in b && !validCat(b.cat)) return res.status(400).json({ error: 'Unknown category' })
  if ('name' in b && !String(b.name).trim()) return res.status(400).json({ error: 'name cannot be empty' })
  const allowed = ['name', 'cat', 'price', 'grade', 'tile', 'volume', 'base', 'spec', 'badge', 'image', 'stock', 'active']
  for (const k of allowed) if (k in b) p[k] = b[k]
  p.price = Number(p.price)
  p.stock = Math.floor(Number(p.stock))
  save()
  res.json(p)
})
app.delete('/api/admin/products/:id', (req, res) => {
  const i = data.products.findIndex((p) => p.id === req.params.id)
  if (i === -1) return res.status(404).json({ error: 'Product not found' })
  if (data.orders.some((o) => o.items.some((it) => it.id === req.params.id))) {
    return res.status(409).json({ error: 'Product has orders — deactivate it instead' })
  }
  const usedBy = data.pages.filter((p) => p.productId === req.params.id)
  if (usedBy.length) {
    return res.status(409).json({ error: `Product is used by ${usedBy.length} landing page(s) — repoint or delete those first` })
  }
  data.products.splice(i, 1)
  save()
  res.json({ ok: true })
})
app.post('/api/admin/products', (req, res) => {
  const { id, name, cat, price } = req.body || {}
  if (!id || !name || !cat) return res.status(400).json({ error: 'id, name and cat are required' })
  if (!validCat(cat)) return res.status(400).json({ error: 'Unknown category' })
  if (price !== undefined && (!Number.isFinite(Number(price)) || Number(price) < 0)) {
    return res.status(400).json({ error: 'price must be a non-negative number' })
  }
  if (findProduct(id)) return res.status(409).json({ error: 'Product id already exists' })
  const p = {
    id, name, cat, price: Number(price) || 0,
    grade: req.body.grade || '', tile: req.body.tile || req.body.grade || '',
    volume: req.body.volume || '', base: req.body.base || '', spec: req.body.spec || '',
    badge: req.body.badge || undefined, image: req.body.image || undefined,
    stock: Math.max(0, Math.floor(Number(req.body.stock) || 0)), active: true,
  }
  data.products.push(p)
  save()
  res.status(201).json(p)
})

// orders
app.get('/api/admin/orders', (req, res) => res.json(data.orders))
app.delete('/api/admin/orders/:ref', (req, res) => {
  const i = data.orders.findIndex((o) => o.ref === req.params.ref)
  if (i === -1) return res.status(404).json({ error: 'Order not found' })
  data.orders.splice(i, 1)
  data.commissions = data.commissions.filter((c) => c.orderRef !== req.params.ref)
  save()
  res.json({ ok: true })
})
app.put('/api/admin/orders/:ref', (req, res) => {
  const o = data.orders.find((x) => x.ref === req.params.ref)
  if (!o) return res.status(404).json({ error: 'Order not found' })
  const allowed = ['paid', 'packing', 'dispatched', 'completed', 'cancelled']
  if (req.body.status && allowed.includes(req.body.status)) o.status = req.body.status
  save()
  res.json(o)
})

// workshops (affiliates / salesmen)
app.get('/api/admin/workshops', (req, res) => {
  const withStats = data.workshops.map((w) => {
    const orders = data.orders.filter((o) => o.workshopId === w.id)
    return {
      ...w,
      links: data.links.filter((l) => l.workshopId === w.id).length,
      orders: orders.length,
      earned: +orders.reduce((n, o) => n + o.commission, 0).toFixed(2),
    }
  })
  res.json(withStats)
})
const clampRate = (v) => Math.min(0.9, Math.max(0, Number(v) || 0))
app.post('/api/admin/workshops', (req, res) => {
  const { id, name } = req.body || {}
  if (!id || !name) return res.status(400).json({ error: 'id and name are required' })
  const cleanId = String(id).toLowerCase().replace(/[^a-z0-9-]/g, '-')
  if (!/[a-z0-9]/.test(cleanId)) return res.status(400).json({ error: 'id must contain letters or numbers' })
  if (findWorkshop(cleanId)) return res.status(409).json({ error: 'Workshop id already exists' })
  const w = {
    id: cleanId,
    name,
    city: req.body.city || '',
    whatsapp: req.body.whatsapp || '',
    tier: req.body.tier || 'dealer',
    commissionRate: clampRate(req.body.commissionRate ?? 0.1),
    active: true,
  }
  data.workshops.push(w)
  save()
  res.status(201).json(w)
})
app.put('/api/admin/workshops/:id', (req, res) => {
  const w = findWorkshop(req.params.id)
  if (!w) return res.status(404).json({ error: 'Workshop not found' })
  for (const k of ['name', 'city', 'whatsapp', 'tier', 'commissionRate', 'active']) {
    if (k in req.body) w[k] = req.body[k]
  }
  w.commissionRate = clampRate(w.commissionRate)
  save()
  res.json(w)
})
app.delete('/api/admin/workshops/:id', (req, res) => {
  const i = data.workshops.findIndex((w) => w.id === req.params.id)
  if (i === -1) return res.status(404).json({ error: 'Workshop not found' })
  if (data.links.some((l) => l.workshopId === req.params.id)) {
    return res.status(409).json({ error: 'Workshop has links — delete those first' })
  }
  if (data.orders.some((o) => o.workshopId === req.params.id)) {
    return res.status(409).json({ error: 'Workshop has orders — deactivate it instead' })
  }
  data.workshops.splice(i, 1)
  save()
  res.json({ ok: true })
})

// landing pages (dynamic, section-based documents)
app.get('/api/admin/pages', (req, res) => res.json(data.pages))
app.get('/api/admin/templates', (req, res) =>
  res.json(TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    sections: t.sections.map((s) => s.type),
  }))),
)
// create from zero (empty canvas) or from a template — templates are
// product-agnostic blueprints filled with the chosen product's data here.
// Optionally creates an HQ link at the same time so the page has a URL.
app.post('/api/admin/pages', (req, res) => {
  const { name, productId, slug, templateId } = req.body || {}
  if (!name || !productId) return res.status(400).json({ error: 'name and productId are required' })
  const product = findProduct(productId)
  if (!product) return res.status(400).json({ error: 'Unknown productId' })
  const template = templateId ? TEMPLATES.find((t) => t.id === templateId) : null
  if (templateId && !template) return res.status(400).json({ error: 'Unknown templateId' })

  const base = 'lp-' + (String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'page')
  let id = base
  let n = 2
  while (findPage(id)) id = `${base}-${n++}`

  // validate the slug BEFORE creating anything — no partial writes
  const clean = slug ? String(slug).toLowerCase().replace(/[^a-z0-9-]/g, '-') : null
  if (clean && !/[a-z0-9]/.test(clean)) {
    return res.status(400).json({ error: 'Slug must contain letters or numbers' })
  }
  if (clean && data.links.some((l) => l.slug === clean)) {
    return res.status(409).json({ error: 'Slug already exists — choose another' })
  }

  const category = data.categories.find((c) => c.id === product.cat)
  const applied = template ? applyTemplate(template, product, category) : null
  const page = {
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
    updatedAt: now(),
  }
  data.pages.push(page)

  let link = null
  if (clean) {
    link = { slug: clean, pageId: id, workshopId: null, active: true, clicks: 0, createdAt: now() }
    data.links.push(link)
  }
  save()
  res.status(201).json({ page, link })
})
app.get('/api/admin/pages/:id', (req, res) => {
  const p = findPage(req.params.id)
  if (!p) return res.status(404).json({ error: 'Page not found' })
  res.json(p)
})
app.put('/api/admin/pages/:id', (req, res) => {
  const p = findPage(req.params.id)
  if (!p) return res.status(404).json({ error: 'Page not found' })
  // validate BEFORE mutating — a rejected request must leave no trace
  const b = req.body
  if ('sections' in b && !Array.isArray(b.sections)) {
    return res.status(400).json({ error: 'sections must be an array' })
  }
  if ('status' in b && !['draft', 'published'].includes(b.status)) {
    return res.status(400).json({ error: 'status must be draft or published' })
  }
  if ('productId' in b && !findProduct(b.productId)) {
    return res.status(400).json({ error: 'Unknown productId' })
  }
  if ('name' in b && !String(b.name).trim()) return res.status(400).json({ error: 'name cannot be empty' })
  for (const k of ['name', 'productId', 'lang', 'whatsapp', 'waText', 'buyLabel', 'status', 'seo', 'sections']) {
    if (k in b) p[k] = b[k]
  }
  p.updatedAt = now()
  save()
  res.json(p)
})
app.delete('/api/admin/pages/:id', (req, res) => {
  const i = data.pages.findIndex((p) => p.id === req.params.id)
  if (i === -1) return res.status(404).json({ error: 'Page not found' })
  const linked = data.links.filter((l) => l.pageId === req.params.id)
  if (linked.length) {
    return res.status(409).json({ error: `Page has ${linked.length} link(s) — delete those first` })
  }
  data.pages.splice(i, 1)
  save()
  res.json({ ok: true })
})
app.post('/api/admin/pages/:id/duplicate', (req, res) => {
  const src = findPage(req.params.id)
  if (!src) return res.status(404).json({ error: 'Page not found' })
  let id = `${src.id}-copy`
  let n = 2
  while (findPage(id)) id = `${src.id}-copy-${n++}`
  const copy = JSON.parse(JSON.stringify(src))
  copy.id = id
  copy.name = `${src.name} (copy)`
  copy.status = 'draft'
  copy.updatedAt = now()
  data.pages.push(copy)
  save()
  res.status(201).json(copy)
})

// affiliate links (workshop × page)
app.get('/api/admin/links', (req, res) => res.json(data.links))
app.post('/api/admin/links', (req, res) => {
  const { slug, pageId, workshopId } = req.body || {}
  if (!slug || !pageId) return res.status(400).json({ error: 'slug and pageId are required' })
  const clean = String(slug).toLowerCase().replace(/[^a-z0-9-]/g, '-')
  if (!/[a-z0-9]/.test(clean)) return res.status(400).json({ error: 'Slug must contain letters or numbers' })
  if (data.links.some((l) => l.slug === clean)) return res.status(409).json({ error: 'Slug already exists' })
  if (!findPage(pageId)) return res.status(400).json({ error: 'Unknown pageId' })
  if (workshopId && !findWorkshop(workshopId)) return res.status(400).json({ error: 'Unknown workshopId' })
  const link = { slug: clean, pageId, workshopId: workshopId || null, active: true, clicks: 0, createdAt: now() }
  data.links.push(link)
  save()
  res.status(201).json(link)
})
app.put('/api/admin/links/:slug', (req, res) => {
  const l = data.links.find((x) => x.slug === req.params.slug)
  if (!l) return res.status(404).json({ error: 'Link not found' })
  for (const k of ['pageId', 'workshopId', 'active']) if (k in req.body) l[k] = req.body[k]
  save()
  res.json(l)
})
app.delete('/api/admin/links/:slug', (req, res) => {
  const i = data.links.findIndex((x) => x.slug === req.params.slug)
  if (i === -1) return res.status(404).json({ error: 'Link not found' })
  data.links.splice(i, 1)
  save()
  res.json({ ok: true })
})

// product image uploads — stored under server/data/uploads, served below.
// Base64 payload keeps it dependency-free; 6mb body cap ≈ 4mb image.
app.use('/api/uploads', express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true }))
app.post('/api/admin/upload', express.json({ limit: '6mb' }), (req, res) => {
  const { name, dataBase64 } = req.body || {}
  if (!name || !dataBase64) return res.status(400).json({ error: 'name and dataBase64 are required' })
  const ext = String(name).toLowerCase().match(/\.(jpe?g|png|webp)$/)?.[1]
  if (!ext) return res.status(400).json({ error: 'Only .jpg, .png and .webp images are allowed' })
  const buf = Buffer.from(String(dataBase64).replace(/^data:[^,]+,/, ''), 'base64')
  if (!buf.length || buf.length > 4 * 1024 * 1024) {
    return res.status(400).json({ error: 'Image must be between 1 byte and 4MB' })
  }
  const base = String(name).toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9-]/g, '-').slice(0, 50) || 'image'
  const file = `${base}-${Date.now().toString(36)}.${ext}`
  writeFileSync(resolve(UPLOAD_DIR, file), buf)
  res.status(201).json({ url: `/api/uploads/${file}` })
})

// commissions
app.get('/api/admin/commissions', (req, res) => res.json(data.commissions))
app.put('/api/admin/commissions/:id', (req, res) => {
  const c = data.commissions.find((x) => x.id === req.params.id)
  if (!c) return res.status(404).json({ error: 'Commission not found' })
  if (['pending', 'approved', 'paid', 'void'].includes(req.body.status)) c.status = req.body.status
  save()
  res.json(c)
})

// unknown API routes → JSON 404; thrown errors → JSON 500 (never an HTML page)
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }))

// production: one process serves everything — the built storefront
// (prerendered pages win via static lookup) with an SPA fallback.
// In dev, Vite serves the frontend and proxies /api here instead.
if (existsSync(resolve(DIST_DIR, 'index.html'))) {
  app.use(express.static(DIST_DIR))
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next()
    res.sendFile(resolve(DIST_DIR, 'index.html'))
  })
}
app.use((err, req, res, _next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.type === 'entity.parse.failed' ? 'Invalid JSON body' : 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`NanoRev API on http://localhost:${PORT} (admin key: ${ADMIN_KEY === 'nanorev-admin' ? 'default — set ADMIN_KEY in production' : 'custom'})`)
})
