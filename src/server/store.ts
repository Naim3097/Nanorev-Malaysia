// Persistence layer for the NanoRev backend.
//
// Two interchangeable backends, chosen by environment:
//   • Supabase Postgres  — when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
//   • JSON file          — fallback for local dev without Supabase
//
// The handle is:
//
//   { data, save, reload, flush, uploads }
//
//   data      in-memory working set (arrays the routes mutate directly)
//   reload()  refresh `data` from the source of truth. TTL-cached for reads;
//             pass { force:true } before a write so it starts from fresh state.
//   save()    mark the working set dirty (a write happened)
//   flush()   await-persist dirty changes (diff vs last load → upsert/delete)
//   uploads   { dir, save(buf, base, ext, contentType) } image sink
//
// Route handlers never touch this directly — they go through withStore() in
// ./request.ts, which reloads before the handler and flushes before responding.
// That keeps the same code correct whether the process is a long-lived server
// or a Fluid Compute instance shared by concurrent invocations.
//
// Seeding an empty database imports the frontend data modules directly (they
// are TypeScript now, compiled by Next), so there is no bundler on any path.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { categories as seedCategories } from '@/data/categories'
import { affiliateLinks, landingPages, workshops as seedWorkshops } from '@/data/landingPages'
import { products as seedProducts } from '@/data/products'
import type { Order, StoreData } from '@/types'

// DATA_DIR: local JSON db + uploads (JSON-file mode only). In Supabase mode the
// database and images live in Supabase and no persistent disk is needed.
export const DATA_DIR = process.env.DATA_DIR
  ? resolve(process.env.DATA_DIR)
  : resolve(process.cwd(), 'server', 'data')
const DB_FILE = resolve(DATA_DIR, 'nanorev.json')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'product-images'

// reads may be up to this stale within a warm instance; writes always force a
// fresh reload first. Keeps per-request Supabase round-trips down under load.
const RELOAD_TTL_MS = Number(process.env.STORE_RELOAD_TTL_MS ?? 3000)

interface Collection {
  key: keyof StoreData
  table: string
  pk: string
  desc: boolean
}

/** A stored record addressed generically by its primary-key field name. */
type Row = Record<string, unknown>

// key = the field on the in-memory object, table = Postgres table,
// pk = the object property used as the row id, desc = load newest-first
// (orders/commissions are unshifted newest-first in memory).
const COLLECTIONS: Collection[] = [
  { key: 'products', table: 'products', pk: 'id', desc: false },
  { key: 'categories', table: 'categories', pk: 'id', desc: false },
  { key: 'workshops', table: 'workshops', pk: 'id', desc: false },
  { key: 'pages', table: 'pages', pk: 'id', desc: false },
  { key: 'links', table: 'links', pk: 'slug', desc: false },
  { key: 'orders', table: 'orders', pk: 'ref', desc: true },
  { key: 'commissions', table: 'commissions', pk: 'id', desc: true },
]

const emptyData = (): StoreData => ({
  products: [], categories: [], workshops: [],
  pages: [], links: [], orders: [], commissions: [],
})

export interface Uploads {
  /** Directory the files live in, or null when a CDN serves them. */
  dir: string | null
  save(buf: Buffer, base: string, ext: string, contentType: string): Promise<string>
}

export interface Store {
  data: StoreData
  save(): void
  reload(opts?: { force?: boolean }): Promise<void>
  flush(): Promise<void>
  uploads: Uploads
  /**
   * Atomically take ownership of a `pending` order so its side effects run once.
   *
   * Payment webhooks are redelivered, and on Vercel two instances can handle the
   * same delivery concurrently — our write serialisation is only per-instance,
   * so a plain read-modify-write could let both decrement stock. This is a
   * compare-and-set on the order's status that only one caller can win.
   *
   * `apply` mutates the order in place. Returns the updated order, or null when
   * the order is missing or was already claimed (the caller should then do
   * nothing and answer 200 so the gateway stops retrying).
   */
  claimPendingOrder(ref: string, apply: (order: Order) => void): Promise<Order | null>
}

/** Build the initial dataset from the bundled frontend data modules. */
export function seedData(): StoreData {
  const now = new Date().toISOString()
  return {
    products: seedProducts.map((p) => ({ ...p, stock: 100, active: true })),
    categories: [...seedCategories],
    workshops: seedWorkshops.map((w) => ({ ...w, tier: 'dealer', commissionRate: 0.1, active: true })),
    pages: landingPages.map((p) => ({ ...p, status: 'published' as const, updatedAt: now })),
    links: affiliateLinks.map((l) => ({
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

export function makeSupabaseClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// One-time seeding for a fresh deploy: if the Supabase tables are empty,
// populate them. Idempotent (upsert by id) and safe to run repeatedly — a
// no-op once data exists. Driven by POST /api/admin/seed, never a request path.
export async function seedSupabaseIfEmpty() {
  const client = makeSupabaseClient()
  let total = 0
  for (const c of COLLECTIONS) {
    const { count, error } = await client.from(c.table).select('*', { count: 'exact', head: true })
    if (error) throw new Error(`count "${c.table}" failed: ${error.message}`)
    total += count || 0
  }
  if (total > 0) return { seeded: false, existingRows: total }

  const seed = seedData()
  const counts: Record<string, number> = {}
  for (const c of COLLECTIONS) {
    const rows = (seed[c.key] as unknown as Row[]).map((o) => ({ id: String(o[c.pk]), doc: o }))
    counts[c.key] = rows.length
    if (rows.length) {
      const { error } = await client.from(c.table).upsert(rows, { onConflict: 'id' })
      if (error) throw new Error(`seed "${c.table}" failed: ${error.message}`)
    }
  }
  return { seeded: true, counts }
}

// ── Supabase Postgres backend ─────────────────────────────────────
function openSupabaseStore(): Store {
  const client = makeSupabaseClient()

  const data = emptyData()
  const snapshot: Partial<Record<keyof StoreData, Map<string, string>>> = {}
  let dirty = false
  let loadedAt = 0

  const mapOf = (c: Collection) => {
    const m = new Map<string, string>()
    for (const o of data[c.key] as unknown as Row[]) m.set(String(o[c.pk]), JSON.stringify(o))
    return m
  }

  async function reload({ force = false }: { force?: boolean } = {}) {
    // Never discard work that hasn't reached the database. On a long-lived host
    // the flush is debounced, so a read arriving inside that window would
    // otherwise overwrite the working set with older rows and clear the dirty
    // flag — losing the write entirely.
    if (dirty) await flush()
    if (!force && loadedAt && Date.now() - loadedAt < RELOAD_TTL_MS) return
    // Fetch every collection concurrently — the tables are independent, so the
    // cost is one round-trip's latency, not the sum of seven (big win against
    // Supabase network latency, especially on cold starts).
    const results = await Promise.all(
      COLLECTIONS.map((c) =>
        client
          .from(c.table)
          .select('doc, seq')
          .order('seq', { ascending: !c.desc })
          .then(({ data: rows, error }) => {
            if (error) throw new Error(`Supabase load "${c.table}" failed: ${error.message}`)
            return rows ?? []
          }),
      ),
    )
    COLLECTIONS.forEach((c, i) => {
      ;(data[c.key] as unknown[]) = results[i].map((r) => r.doc)
    })
    for (const c of COLLECTIONS) snapshot[c.key] = mapOf(c)
    dirty = false
    loadedAt = Date.now()
  }

  async function flush() {
    if (!dirty) return
    dirty = false

    // Diff each collection synchronously (single-threaded → consistent), then
    // apply network writes. Only rows that changed since the last load move.
    const plan = COLLECTIONS.map((c) => {
      const cur = mapOf(c)
      const prev = snapshot[c.key] ?? new Map<string, string>()
      const upserts: { id: string; doc: unknown }[] = []
      const deletes: string[] = []
      for (const [id, json] of cur) if (prev.get(id) !== json) upserts.push({ id, doc: JSON.parse(json) })
      for (const id of prev.keys()) if (!cur.has(id)) deletes.push(id)
      return { c, cur, upserts, deletes }
    })

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

  const uploads: Uploads = {
    dir: null, // images are served by Supabase Storage's CDN
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

  // Compare-and-set on doc->>status. PostgREST applies the filter inside the
  // UPDATE, so the read and the write are one atomic statement — the loser of a
  // race matches zero rows and gets null.
  async function claimPendingOrder(ref: string, apply: (order: Order) => void) {
    // Settle our own writes first. On a long-lived host the flush is debounced,
    // so an order this process accepted moments ago may not be in Postgres yet —
    // and the CAS below reads Postgres, not the working set. Without this, a
    // webhook arriving inside the debounce window would find nothing to claim
    // and silently drop the payment confirmation.
    await flush()

    const { data: rows, error } = await client.from('orders').select('doc').eq('id', ref).limit(1)
    if (error) throw new Error(`claim load "${ref}" failed: ${error.message}`)
    const current = rows?.[0]?.doc as Order | undefined
    if (!current || current.status !== 'pending') return null

    const next = structuredClone(current)
    apply(next)

    const { data: updated, error: upErr } = await client
      .from('orders')
      .update({ doc: next, updated_at: new Date().toISOString() })
      .eq('id', ref)
      .eq('doc->>status', 'pending')
      .select('doc')
    if (upErr) throw new Error(`claim "${ref}" failed: ${upErr.message}`)
    if (!updated?.length) return null // another delivery won the race

    // Mirror into the working set so the flush that follows agrees with the row
    // we just wrote rather than reverting it.
    const i = data.orders.findIndex((o) => o.ref === ref)
    if (i !== -1) data.orders[i] = next
    snapshot.orders?.set(ref, JSON.stringify(next))
    return next
  }

  return { data, save: () => { dirty = true }, reload, flush, uploads, claimPendingOrder }
}

// ── JSON file backend (fallback / offline dev) ────────────────────
function openFileStore(): Store {
  mkdirSync(DATA_DIR, { recursive: true })
  const uploadDir = resolve(DATA_DIR, 'uploads')
  mkdirSync(uploadDir, { recursive: true })

  if (!existsSync(DB_FILE)) {
    const tmp = DB_FILE + '.tmp'
    writeFileSync(tmp, JSON.stringify(seedData(), null, 2))
    renameSync(tmp, DB_FILE)
    console.log('[store] Seeded fresh JSON file store from src/data')
  }

  const data = emptyData()
  let dirty = false

  // `force` is accepted for signature parity with the Supabase backend; the
  // file store has no TTL to skip, so it is simply ignored.
  async function reload(_opts: { force?: boolean } = {}) {
    // Same rule as the Supabase backend: persist before re-reading, so a read
    // can never roll back an un-flushed write.
    if (dirty) await flush()
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

  const uploads: Uploads = {
    dir: uploadDir, // served by app/api/uploads/[file]/route.ts
    async save(buf, base, ext) {
      const file = `${base}-${Date.now().toString(36)}.${ext}`
      writeFileSync(resolve(uploadDir, file), buf)
      return `/api/uploads/${file}`
    },
  }

  // Single process, and writes are already serialised through one promise
  // chain, so an in-memory check-then-act is atomic here.
  async function claimPendingOrder(ref: string, apply: (order: Order) => void) {
    const order = data.orders.find((o) => o.ref === ref)
    if (!order || order.status !== 'pending') return null
    apply(order)
    dirty = true
    return order
  }

  console.log(`[store] JSON file backend — ${DB_FILE}`)
  return { data, save: () => { dirty = true }, reload, flush, uploads, claimPendingOrder }
}

export const usingSupabase = !!(SUPABASE_URL && SUPABASE_KEY)

// Memoised per process. Route handlers get the same handle, so the TTL cache
// and dirty flag are shared across invocations on a warm instance.
let storePromise: Promise<Store> | null = null

export function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = (async () => (usingSupabase ? openSupabaseStore() : openFileStore()))().catch((e) => {
      storePromise = null // let the next request retry a failed open
      throw e
    })
  }
  return storePromise
}
