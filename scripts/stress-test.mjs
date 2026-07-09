// Backend stress test — throughput, latency and DATA INTEGRITY under
// concurrency. Creates its own fixtures (temp product + temp link), fires
// mixed load, then asserts exact counters: every click counted, every
// order stored once, stock decremented to the unit. Cleans up after itself.
//
//   node scripts/stress-test.mjs          (server must be running)

const BASE = process.env.API_URL || 'http://localhost:4000'
const KEY = process.env.ADMIN_KEY || 'nanorev-admin'
const H = { 'content-type': 'application/json', 'x-admin-key': KEY }

const api = async (path, method = 'GET', body) => {
  const res = await fetch(`${BASE}/api${path}`, { method, headers: H, body: body ? JSON.stringify(body) : undefined })
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`)
  return res.json()
}

async function bench(name, n, concurrency, fn) {
  const lat = []
  let errors = 0
  let next = 0
  const worker = async () => {
    while (true) {
      const i = next++
      if (i >= n) return
      const t = performance.now()
      try { await fn(i) } catch { errors++ }
      lat.push(performance.now() - t)
    }
  }
  const t0 = performance.now()
  await Promise.all(Array.from({ length: concurrency }, worker))
  const secs = (performance.now() - t0) / 1000
  lat.sort((a, b) => a - b)
  const pct = (q) => (lat[Math.min(lat.length - 1, Math.floor(q * lat.length))] || 0).toFixed(1)
  const avg = (lat.reduce((a, b) => a + b, 0) / lat.length).toFixed(1)
  console.log(
    `${name.padEnd(34)} ${String(n).padStart(5)} reqs @c${concurrency}  ` +
    `${(n / secs).toFixed(0).padStart(5)} req/s | avg ${avg}ms p50 ${pct(0.5)}ms p95 ${pct(0.95)}ms p99 ${pct(0.99)}ms | errors ${errors}`,
  )
  return errors
}

const assert = (cond, label) => {
  console.log(`${cond ? '  ✓' : '  ✗ FAIL:'} ${label}`)
  if (!cond) process.exitCode = 1
}

console.log(`\nNanoRev backend stress test → ${BASE}\n`)

// ── fixtures ──
const STOCK = 500
const ORDERS = 100
const CLICKS = 250
await api('/admin/products', 'POST', {
  id: 'stress-prod', name: 'Stress Product', cat: 'coolant-care', price: 10, volume: '200ml', stock: STOCK,
})
await api('/admin/links', 'POST', { slug: 'stress-click-test', pageId: 'lp-pns' })
const ordersBefore = (await api('/admin/summary')).orders

let totalErrors = 0

// 1 ▸ read-heavy: catalogue + landing resolution (the storefront's hot path)
totalErrors += await bench('reads: /products + /landing/:slug', 2000, 50, (i) =>
  i % 2 === 0
    ? api('/products')
    : api('/landing/nano-engine-flush'),
)

// 2 ▸ click tracking (concurrent counter increments — lost-update check)
totalErrors += await bench('writes: affiliate clicks', CLICKS, 25, () =>
  api('/landing/stress-click-test/click', 'POST'),
)

// 3 ▸ orders (stock decrement + ledger writes under concurrency)
totalErrors += await bench('writes: orders', ORDERS, 20, (i) =>
  api('/orders', 'POST', {
    ref: `STRESS-${i}`,
    items: [{ id: 'stress-prod', qty: 1 }],
    details: { name: `Load Tester ${i}`, phone: '0123456789', mode: 'pickup' },
    payment: { method: 'fpx' },
  }),
)

// 4 ▸ mixed read/write burst
totalErrors += await bench('mixed: reads + admin summary', 600, 30, (i) =>
  i % 3 === 0 ? api('/admin/summary') : api('/landing/premium-nano-synthetic'),
)

// ── integrity ──
console.log('\nIntegrity after load:')
// give the debounced store a moment to flush
await new Promise((r) => setTimeout(r, 600))
const [prod, links, summary, orders] = await Promise.all([
  api('/admin/products').then((ps) => ps.find((p) => p.id === 'stress-prod')),
  api('/admin/links'),
  api('/admin/summary'),
  api('/admin/orders'),
])
const link = links.find((l) => l.slug === 'stress-click-test')
const stressOrders = orders.filter((o) => o.ref.startsWith('STRESS-'))

assert(link.clicks === CLICKS, `clicks counted exactly: ${link.clicks}/${CLICKS} (no lost updates)`)
assert(stressOrders.length === ORDERS, `orders stored exactly: ${stressOrders.length}/${ORDERS}`)
assert(prod.stock === STOCK - ORDERS, `stock decremented exactly: ${prod.stock} (expected ${STOCK - ORDERS})`)
assert(summary.orders === ordersBefore + ORDERS, `summary order count consistent: ${summary.orders}`)
assert(new Set(stressOrders.map((o) => o.ref)).size === ORDERS, 'no duplicate order refs')
const health = await api('/health')
assert(health.ok === true, 'server healthy after load')

// ── cleanup ──
console.log('\nCleanup:')
for (const o of stressOrders) await api(`/admin/orders/${o.ref}`, 'DELETE')
await api('/admin/links/stress-click-test', 'DELETE')
await api('/admin/products/stress-prod', 'DELETE')
const after = await api('/admin/summary')
assert(after.orders === ordersBefore, `orders restored to pre-test count: ${after.orders}`)
console.log(`\n${totalErrors === 0 && process.exitCode !== 1 ? 'PASS' : 'FAIL'} — total request errors: ${totalErrors}\n`)
