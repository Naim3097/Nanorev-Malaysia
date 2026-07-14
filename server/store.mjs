// Persistence layer for the NanoRev backend.
//
// Two interchangeable backends, chosen by environment:
//   • Supabase Postgres  — when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
//   • JSON file          — fallback for local dev without Supabase
//
// STATELESS-PER-REQUEST contract (so the same code runs as a long-lived
// `npm start` process AND as ephemeral Vercel serverless functions):
//
//   { data, save, reload, flush, pricing, uploads }
//
//   data      in-memory working set (arrays the routes mutate directly)
//   reload()  refresh `data` from the source of truth. TTL-cached for reads;
//             pass { force:true } before a write so it starts from fresh state.
//   save()    mark the working set dirty (a write happened)
//   flush()   await-persist dirty changes (diff vs last load → upsert/delete)
//   pricing   pricing rules (imported directly from src/utils/pricing.js)
//   uploads   { dir, save(buf, base, ext, contentType) } image sink
//
// server/index.mjs calls reload() before each /api request and flush() before
// sending the response, so no state has to survive between invocations.
// Seeding an empty database is a one-off (scripts/seed.mjs), never in the hot
// path — so the runtime never needs esbuild.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import * as pricing from '../src/utils/pricing.js'

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

// reads may be up to this stale within a warm instance; writes always force a
// fresh reload first. Keeps per-request Supabase round-trips down under load.
const RELOAD_TTL_MS = Number(process.env.STORE_RELOAD_TTL_MS ?? 3000)

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

// Seed data comes from the frontend's data modules. landingPages.js uses
// extensionless imports (Vite-style), so bundle with esbuild — but ONLY here,
// off the request path (fresh file store, or scripts/seed.mjs). The runtime
// never imports this.
async function loadSeedModules() {
  const { build } = await import('esbuild')
  const bundlePath = resolve(root, 'node_modules/.prerender/server-seed.mjs')
  mkdirSync(dirname(bundlePath), { recursive: true })
  await build({
    stdin: {
      contents: `
        export { products } from './src/data/products.js'
        export { categories } from './src/data/categories.js'
        export { workshops, landingPages, affiliateLinks } from './src/data/landingPages.js'
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

export function seedFrom(mods) {
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
  if (SUPABASE_URL && SUPABASE_KEY) return openSupabaseStore()
  return openFileStore()
}

// Build a Supabase client. supabase-js eagerly constructs a Realtime (WebSocket)
// client even though we only use Postgres + Storage; Node < 22 has no native
// WebSocket, so polyfill it with `ws`. (Realtime is never connected.)
export async function makeSupabaseClient() {
  if (!globalThis.WebSocket) {
    const { default: WS } = await import('ws')
    globalThis.WebSocket = WS
  }
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// One-time seeding for a fresh deploy: if the Supabase tables are empty, load
// the frontend data modules and populate them. Idempotent (upsert by id) and
// safe to run repeatedly — a no-op once data exists. Used by scripts/seed.mjs,
// never on the request path.
export async function seedSupabaseIfEmpty() {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  const client = await makeSupabaseClient()
  let total = 0
  for (const c of COLLECTIONS) {
    const { count, error } = await client.from(c.table).select('*', { count: 'exact', head: true })
    if (error) throw new Error(`count "${c.table}" failed: ${error.message}`)
    total += count || 0
  }
  if (total > 0) return { seeded: false, existingRows: total }

  const seed = seedFrom(await loadSeedModules())
  const counts = {}
  for (const c of COLLECTIONS) {
    const rows = seed[c.key].map((o) => ({ id: String(o[c.pk]), doc: o }))
    counts[c.key] = rows.length
    if (rows.length) {
      const { error } = await client.from(c.table).upsert(rows, { onConflict: 'id' })
      if (error) throw new Error(`seed "${c.table}" failed: ${error.message}`)
    }
  }
  return { seeded: true, counts }
}

// ── Supabase Postgres backend ─────────────────────────────────────
async function openSupabaseStore() {
  const client = await makeSupabaseClient()

  const data = emptyData()
  const snapshot = {} // pk → JSON of last-loaded row, for change detection
  let dirty = false
  let loadedAt = 0

  const mapOf = (c) => {
    const m = new Map()
    for (const o of data[c.key]) m.set(String(o[c.pk]), JSON.stringify(o))
    return m
  }

  async function reload({ force = false } = {}) {
    if (!force && loadedAt && Date.now() - loadedAt < RELOAD_TTL_MS) return
    // Fetch every collection concurrently — the tables are independent, so the
    // cost is one round-trip's latency, not the sum of seven (big win against
    // Supabase network latency, especially on serverless cold starts).
    const results = await Promise.all(
      COLLECTIONS.map((c) =>
        client
          .from(c.table)
          .select('doc, seq')
          .order('seq', { ascending: !c.desc })
          .then(({ data: rows, error }) => {
            if (error) throw new Error(`Supabase load "${c.table}" failed: ${error.message}`)
            return rows
          }),
      ),
    )
    COLLECTIONS.forEach((c, i) => { data[c.key] = results[i].map((r) => r.doc) })
    for (const c of COLLECTIONS) snapshot[c.key] = mapOf(c)
    dirty = false
    loadedAt = Date.now()
  }

  async function flush() {
    if (!dirty) return
    dirty = false

    // Diff each collection synchronously (single-threaded → consistent), then
    // apply network writes. Only rows that changed since the last load move.
    const plan = []
    for (const c of COLLECTIONS) {
      const cur = mapOf(c)
      const prev = snapshot[c.key] || new Map()
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
      dirty = true // caller surfaces the failure; nothing is lost from memory
      throw e
    }
  }

  const save = () => { dirty = true }

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

  return { data, save, reload, flush, pricing, uploads }
}

// ── JSON file backend (fallback / offline dev) ────────────────────
async function openFileStore() {
  mkdirSync(DATA_DIR, { recursive: true })
  const uploadDir = resolve(DATA_DIR, 'uploads')
  mkdirSync(uploadDir, { recursive: true })

  // seed a fresh file store from the frontend data modules on first run
  if (!existsSync(DB_FILE)) {
    const mods = await loadSeedModules()
    const tmp = DB_FILE + '.tmp'
    writeFileSync(tmp, JSON.stringify(seedFrom(mods), null, 2))
    renameSync(tmp, DB_FILE)
    console.log('[store] Seeded fresh JSON file store from src/data')
  }

  const data = emptyData()
  let dirty = false

  async function reload() {
    Object.assign(data, JSON.parse(readFileSync(DB_FILE, 'utf8')))
    dirty = false
  }

  async function flush() {
    if (!dirty) return
    dirty = false
    const tmp = DB_FILE + '.tmp'
    writeFileSync(tmp, JSON.stringify(data, null, 2))
    renameSync(tmp, DB_FILE)
  }

  const save = () => { dirty = true }

  const uploads = {
    dir: uploadDir, // Express serves these via express.static
    async save(buf, base, ext) {
      const file = `${base}-${Date.now().toString(36)}.${ext}`
      writeFileSync(resolve(uploadDir, file), buf)
      return `/api/uploads/${file}`
    },
  }

  await reload()
  console.log(`[store] JSON file backend — ${DB_FILE}`)
  return { data, save, reload, flush, pricing, uploads }
}
