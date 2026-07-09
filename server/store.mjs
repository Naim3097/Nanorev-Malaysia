// JSON file store — the backend's persistence layer.
// Deliberately a thin repository: swap this file for SQLite/Postgres later
// without touching routes. Writes are atomic (tmp file + rename).
//
// On first boot it seeds itself from the frontend's data modules
// (src/data/*.js) via esbuild, so backend and storefront start in sync.

import { build } from 'esbuild'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = resolve(root, 'server', 'data')
const DB_FILE = resolve(DATA_DIR, 'nanorev.json')

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
  mkdirSync(DATA_DIR, { recursive: true })
  const mods = await loadSeedModules() // pricing rules always come from source
  const fresh = !existsSync(DB_FILE)
  const data = fresh ? seedFrom(mods) : JSON.parse(readFileSync(DB_FILE, 'utf8'))

  // Debounced persistence: mutations mark the store dirty and flush at most
  // every 300ms (atomic tmp+rename). In-memory state is the source of truth
  // between flushes — Node's single thread keeps mutations consistent.
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
  // never lose the tail of writes on shutdown (exit handlers must be sync)
  process.on('exit', flush)
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(0))

  if (fresh) { dirty = true; flush() }

  return { data, save, flush, pricing: mods.pricing }
}
