// Persistence layer for the NanoRev backend.
//
// Two interchangeable backends, chosen by environment:
//   • Supabase Postgres  — when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
//   • JSON file          — fallback for local dev without Supabase
//
// Either way openStore() returns the same contract so server/index.mjs is
// backend-agnostic:  { data, save, flush, pricing, uploads }
//
//   data     in-memory working set (arrays the routes mutate directly)
//   save()   debounced persist — flushes at most every 300ms
//   flush()  force a synchronous-ish persist (awaited on shutdown)
//   pricing  pricing rules, always loaded from src/utils/pricing.js
//   uploads  { dir, save(buf, base, ext, contentType) } image sink
//
// On first boot against an EMPTY database it seeds itself from the frontend's
// data modules (src/data/*.js) so backend and storefront start in sync.

import { build } from 'esbuild'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// DATA_DIR: local JSON db + uploads (JSON-file mode only). In Supabase mode the
// database and images live in Supabase and no persistent disk is needed.
export const DATA_DIR = process.env.DATA_DIR
  ? resolve(process.env.DATA_DIR)
  : resolve(root, 'server', 'data')
const DB_FILE = resolve(DATA_DIR, 'nanorev.json')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'product-images'

// key = the field on the in-memory object, table = Postgres table,
// pk = the object property used as the row id, desc = load newest-first
// (orders/commissions are unshifted newest-first in memory).
const COLLECTIONS = [
  { key: 'products', table: 'products', pk: 'id', desc: false },
  { key: 'categories', table: 'categories', pk: 'id', desc: false },
  { key: 'workshops', table: 'workshops', pk: 'id', desc: false },
  { key: 'pages', table: 'pages', pk: 'id', desc: false },
  { key: 'links', table: 'links', pk: 'slug', desc: false },
  { key: 'orders', table: 'orders', pk: 'ref', desc: true },
  { key: 'commissions', table: 'commissions', pk: 'id', desc: true },
]

const emptyData = () => ({
  products: [], categories: [], workshops: [],
  pages: [], links: [], orders: [], commissions: [],
})

async function loadSeedModules() {
  const bundlePath = resolve(root, 'node_modules/.prerender/server-seed.mjs')
  mkdirSync(dirname(bundlePath), { recursive: true })
  await build({
    stdin: {
      contents: `
        export { products } from './src/data/products.js'
        export { categories } from './src/data/categories.js'
        export { workshops, landingPages, affiliateLinks } from './src/data/landingPages.js'
        export * as pricing from './src/utils/pricing.js'
      `,
      resolveDir: root,
    },
    bundle: true,
    format: 'esm',
    outfile: bundlePath,
    logLevel: 'silent',
  })
  return import(pathToFileURL(bundlePath).href + `?t=${Date.now()}`)
}

function seedFrom(mods) {
  const now = new Date().toISOString()
  return {
    products: mods.products.map((p) => ({ ...p, stock: 100, active: true })),
    categories: [...mods.categories],
    workshops: mods.workshops.map((w) => ({ ...w, tier: 'dealer', commissionRate: 0.1, active: true })),
    pages: mods.landingPages.map((p) => ({ ...p, status: 'published', updatedAt: now })),
    links: mods.affiliateLinks.map((l) => ({
      slug: l.slug,
      pageId: l.pageId,
      workshopId: l.workshopId || null,
      active: true,
      clicks: 0,
      createdAt: now,
    })),
    orders: [],
    commissions: [],
  }
}

export async function openStore() {
  const mods = await loadSeedModules() // pricing rules always come from source
  if (SUPABASE_URL && SUPABASE_KEY) return openSupabaseStore(mods)
  return openFileStore(mods)
}

// ── Supabase Postgres backend ─────────────────────────────────────
async function openSupabaseStore(mods) {
  // supabase-js eagerly constructs a Realtime (WebSocket) client even though we
  // only use Postgres + Storage. Node < 22 has no native WebSocket, so polyfill
  // it with `ws` to let the client initialize. (Realtime is never connected.)
  if (!globalThis.WebSocket) {
    const { default: WS } = await import('ws')
    globalThis.WebSocket = WS
  }
  const { createClient } = await import('@supabase/supabase-js')
  const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // load every collection into memory (the routes read/write this working set)
  const data = emptyData()
  let total = 0
  for (const c of COLLECTIONS) {
    const { data: rows, error } = await client
      .from(c.table)
      .select('doc, seq')
      .order('seq', { ascending: !c.desc })
    if (error) throw new Error(`Supabase load "${c.table}" failed: ${error.message}`)
    data[c.key] = rows.map((r) => r.doc)
    total += rows.length
  }

  // snapshot of what's persisted, keyed by pk → JSON, for change detection
  const mapOf = (c) => {
    const m = new Map()
    for (const o of data[c.key]) m.set(String(o[c.pk]), JSON.stringify(o))
    return m
  }
  const snapshot = {}
  for (const c of COLLECTIONS) snapshot[c.key] = mapOf(c)

  let dirty = false
  let timer = null
  let inFlight = false

  async function flush() {
    if (inFlight || !dirty) return
    inFlight = true
    dirty = false

    // Diff each collection synchronously (single-threaded → consistent),
    // then apply the network writes. Mutations during the await mark dirty
    // again and are caught by the next flush.
    const plan = []
    for (const c of COLLECTIONS) {
      const cur = mapOf(c)
      const prev = snapshot[c.key]
      const upserts = []
      const deletes = []
      for (const [id, json] of cur) if (prev.get(id) !== json) upserts.push({ id, doc: JSON.parse(json) })
      for (const id of prev.keys()) if (!cur.has(id)) deletes.push(id)
      plan.push({ c, cur, upserts, deletes })
    }

    try {
      for (const { c, upserts, deletes } of plan) {
        if (upserts.length) {
          const { error } = await client.from(c.table).upsert(upserts, { onConflict: 'id' })
          if (error) throw new Error(`upsert "${c.table}": ${error.message}`)
        }
        if (deletes.length) {
          const { error } = await client.from(c.table).delete().in('id', deletes)
          if (error) throw new Error(`delete "${c.table}": ${error.message}`)
        }
      }
      for (const { c, cur } of plan) snapshot[c.key] = cur
    } catch (e) {
      dirty = true // retry on the next tick — nothing is lost from memory
      console.error('[store] Supabase flush failed, will retry:', e.message)
    } finally {
      inFlight = false
      if (dirty) schedule()
    }
  }

  const schedule = () => {
    if (timer) return
    timer = setTimeout(() => { timer = null; flush() }, 300)
  }
  const save = () => { dirty = true; schedule() }

  // Graceful shutdown: exit handlers can't await, so flush on the signals a
  // host sends (Railway/Render send SIGTERM). A hard crash loses ≤300ms of writes.
  const shutdown = async () => { try { await flush() } catch { /* logged */ } process.exit(0) }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  // seed an empty database from the frontend data modules
  if (total === 0) {
    Object.assign(data, seedFrom(mods))
    dirty = true
    await flush()
    console.log('[store] Seeded empty Supabase database from src/data')
  }

  const uploads = {
    dir: null, // images are served by Supabase Storage's CDN, not Express
    async save(buf, base, ext, contentType) {
      const file = `${base}-${Date.now().toString(36)}.${ext}`
      const { error } = await client.storage
        .from(STORAGE_BUCKET)
        .upload(file, buf, { contentType, upsert: false })
      if (error) throw new Error(`Storage upload failed: ${error.message}`)
      const { data: pub } = client.storage.from(STORAGE_BUCKET).getPublicUrl(file)
      return pub.publicUrl
    },
  }

  console.log(`[store] Supabase backend — ${total} rows loaded (${new URL(SUPABASE_URL).host})`)
  return { data, save, flush, pricing: mods.pricing, uploads }
}

// ── JSON file backend (fallback / offline dev) ────────────────────
async function openFileStore(mods) {
  mkdirSync(DATA_DIR, { recursive: true })
  const uploadDir = resolve(DATA_DIR, 'uploads')
  mkdirSync(uploadDir, { recursive: true })

  const fresh = !existsSync(DB_FILE)
  const data = fresh ? seedFrom(mods) : JSON.parse(readFileSync(DB_FILE, 'utf8'))

  let dirty = false
  let timer = null
  const flush = () => {
    if (!dirty) return
    dirty = false
    const tmp = DB_FILE + '.tmp'
    writeFileSync(tmp, JSON.stringify(data, null, 2))
    renameSync(tmp, DB_FILE)
  }
  const save = () => {
    dirty = true
    if (timer) return
    timer = setTimeout(() => { timer = null; flush() }, 300)
  }
  process.on('exit', flush)
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(0))

  if (fresh) { dirty = true; flush() }

  const uploads = {
    dir: uploadDir, // Express serves these via express.static
    async save(buf, base, ext) {
      const file = `${base}-${Date.now().toString(36)}.${ext}`
      writeFileSync(resolve(uploadDir, file), buf)
      return `/api/uploads/${file}`
    },
  }

  console.log(`[store] JSON file backend — ${DB_FILE}`)
  return { data, save, flush, pricing: mods.pricing, uploads }
}
