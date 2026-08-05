// End-to-end backend test suite — functional correctness, cross-entity
// integrity (cascades), money math at boundaries, attribution rules,
// template interpolation, concurrency races, rate limiting, auth and the
// error contract. Self-cleaning: fixtures use the qa- prefix and entity
// counts are compared before/after — zero residue allowed.
//
//   node scripts/e2e-test.mjs        (server must be running)

const BASE = process.env.API_URL || 'http://localhost:3000'
const KEY = process.env.ADMIN_KEY || 'nanorev-admin'

const req = async (path, method = 'GET', body, headers = {}) => {
  try {
    const res = await fetch(`${BASE}/api${path}`, {
      method,
      headers: { 'content-type': 'application/json', 'x-admin-key': KEY, ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    })
    let json = null
    try { json = await res.json() } catch { /* non-json */ }
    return { status: res.status, body: json }
  } catch {
    // network-level failure (socket exhaustion etc.) — fail the assertion,
    // never crash the suite
    return { status: 0, body: null }
  }
}

// idempotency: remove residue from any previously crashed run BEFORE testing
async function preClean() {
  const orders = (await req('/admin/orders')).body || []
  for (const o of orders.filter((x) => x.ref.startsWith('QA-'))) await req(`/admin/orders/${o.ref}`, 'DELETE')
  for (const l of ((await req('/admin/links')).body || []).filter((x) => x.slug.startsWith('qa-'))) {
    await req(`/admin/links/${l.slug}`, 'DELETE')
  }
  for (const p of ((await req('/admin/pages')).body || []).filter((x) => x.name.startsWith('QA') || x.id.startsWith('lp-qa-'))) {
    await req(`/admin/pages/${p.id}`, 'DELETE')
  }
  for (const w of ((await req('/admin/workshops')).body || []).filter((x) => x.id.startsWith('qa-'))) {
    await req(`/admin/workshops/${w.id}`, 'DELETE')
  }
  for (const p of ((await req('/admin/products')).body || []).filter((x) => x.id.startsWith('qa-'))) {
    await req(`/admin/products/${p.id}`, 'DELETE')
  }
}

let pass = 0
let fail = 0
const failures = []
const t = (cond, label) => {
  if (cond) { pass++ } else { fail++; failures.push(label); console.log(`  ✗ FAIL: ${label}`) }
}
const group = (name) => console.log(`\n■ ${name}`)

const snapshot = async () => {
  const [products, pages, links, workshops, orders, commissions] = await Promise.all([
    req('/admin/products'), req('/admin/pages'), req('/admin/links'),
    req('/admin/workshops'), req('/admin/orders'), req('/admin/commissions'),
  ])
  return {
    products: products.body.length, pages: pages.body.length, links: links.body.length,
    workshops: workshops.body.length, orders: orders.body.length, commissions: commissions.body.length,
  }
}

console.log(`\nNanoRev E2E suite → ${BASE}`)
await preClean()
const before = await snapshot()

// ════ G1 · Auth & error contract ════
group('Auth & error contract')
{
  const noKey = await req('/admin/summary', 'GET', undefined, { 'x-admin-key': '' })
  t(noKey.status === 401, 'admin without key → 401')
  const badKey = await req('/admin/summary', 'GET', undefined, { 'x-admin-key': 'wrong' })
  t(badKey.status === 401, 'admin with wrong key → 401')
  const unknown = await req('/nope-nope')
  t(unknown.status === 404 && unknown.body?.error, 'unknown API route → JSON 404')
  const badJson = await req('/orders', 'POST', '{broken json')
  t(badJson.status === 400 && badJson.body?.error, 'malformed JSON body → JSON 400')
  const health = await req('/health')
  t(health.status === 200 && health.body.ok, 'health endpoint ok')
}

// ════ G2 · Products: validation, visibility, delete guards ════
group('Products')
{
  t((await req('/admin/products', 'POST', { id: 'qa-prod', name: 'QA Product', cat: 'coolant-care', price: 10, volume: '333ml', base: 'Additive', spec: 'QA spec', stock: 100 })).status === 201, 'create valid product → 201')
  t((await req('/admin/products', 'POST', { id: 'qa-prod', name: 'Dupe', cat: 'coolant-care' })).status === 409, 'duplicate id → 409')
  t((await req('/admin/products', 'POST', { id: 'qa-x', cat: 'coolant-care' })).status === 400, 'missing name → 400')
  t((await req('/admin/products', 'POST', { id: 'qa-x', name: 'X', cat: 'no-such-cat' })).status === 400, 'invalid category → 400')
  t((await req('/admin/products', 'POST', { id: 'qa-x', name: 'X', cat: 'coolant-care', price: -5 })).status === 400, 'negative price on create → 400')
  t((await req('/admin/products/qa-prod', 'PUT', { price: -1 })).status === 400, 'negative price on update → 400')
  t((await req('/admin/products/qa-prod', 'PUT', { stock: -3 })).status === 400, 'negative stock → 400')
  t((await req('/admin/products/qa-prod', 'PUT', { cat: 'bogus' })).status === 400, 'invalid category on update → 400')
  t((await req('/admin/products/qa-prod', 'PUT', { name: '  ' })).status === 400, 'blank name → 400')
  const after400 = (await req('/admin/products')).body.find((p) => p.id === 'qa-prod')
  t(after400.price === 10 && after400.stock === 100 && after400.cat === 'coolant-care', 'rejected updates left NO trace (validate-before-mutate)')
  await req('/admin/products/qa-prod', 'PUT', { active: false })
  const pub = await req('/products')
  t(!pub.body.some((p) => p.id === 'qa-prod'), 'inactive product hidden from public list')
  t((await req('/products/qa-prod')).status === 404, 'inactive product detail → 404')
  await req('/admin/products/qa-prod', 'PUT', { active: true })
  t((await req('/products/qa-prod')).status === 200, 'reactivated product visible again')
}

// ════ G3 · Pages & templates ════
group('Pages & templates')
{
  t((await req('/admin/pages', 'POST', { name: 'QA Page' })).status === 400, 'create without productId → 400')
  t((await req('/admin/pages', 'POST', { name: 'QA Page', productId: 'qa-prod', templateId: 'tpl-nope' })).status === 400, 'unknown template → 400')

  const pagesBefore = (await req('/admin/pages')).body.length
  const conflict = await req('/admin/pages', 'POST', { name: 'QA Conflict', productId: 'qa-prod', slug: 'premium-nano-synthetic' })
  t(conflict.status === 409, 'slug conflict → 409')
  t((await req('/admin/pages')).body.length === pagesBefore, 'conflicting create left NO page behind (atomicity)')
  t((await req('/admin/pages', 'POST', { name: 'QA Bad Slug', productId: 'qa-prod', slug: '###' })).status === 400, 'symbol-only slug → 400')

  const created = await req('/admin/pages', 'POST', { name: 'QA Funnel', productId: 'qa-prod', templateId: 'tpl-promosi-kilat', slug: 'qa-funnel' })
  t(created.status === 201 && created.body?.page?.sections.length === 5, 'template create → 201 with 5 sections')
  if (!created.body?.page) { console.log('  aborting suite — fixture creation failed'); process.exit(1) }
  const pid = created.body.page.id
  t(!JSON.stringify(created.body.page).includes('{{'), 'no unfilled {{tokens}}')
  t(JSON.stringify(created.body.page).includes('QA Product'), 'product name interpolated')

  t((await req(`/admin/pages/${pid}`, 'PUT', { sections: 'not-an-array' })).status === 400, 'non-array sections → 400')
  t((await req(`/admin/pages/${pid}`, 'PUT', { status: 'bananas' })).status === 400, 'invalid status → 400')
  t((await req(`/admin/pages/${pid}`, 'PUT', { productId: 'ghost' })).status === 400, 'unknown productId → 400')
  const intact = (await req(`/admin/pages/${pid}`)).body
  t(Array.isArray(intact.sections) && intact.sections.length === 5 && intact.status === 'draft', 'page unchanged after rejected updates')

  const dup = await req(`/admin/pages/${pid}/duplicate`, 'POST')
  t(dup.status === 201 && dup.body.id !== pid && dup.body.status === 'draft', 'duplicate → new id, draft')
  await req(`/admin/pages/${dup.body.id}`, 'DELETE')
  t((await req(`/admin/pages/${pid}`, 'DELETE')).status === 409, 'delete page with link → 409 (guard)')

  // all 5 templates: section order + specs generated from product record
  const templates = (await req('/admin/templates')).body
  t(templates.length === 5, 'exactly 5 templates on server')
  for (const tpl of templates) {
    const { body } = await req('/admin/pages', 'POST', { name: `QA T ${tpl.id}`, productId: 'qa-prod', templateId: tpl.id })
    const types = body.page.sections.map((s) => s.type)
    const specs = body.page.sections.find((s) => s.type === 'specs')
    t(JSON.stringify(types) === JSON.stringify(tpl.sections), `${tpl.id}: section order matches listing`)
    t(!JSON.stringify(body.page).includes('{{'), `${tpl.id}: fully interpolated`)
    if (specs) t(JSON.stringify(specs.props.rows).includes('333ml'), `${tpl.id}: specs rows from product record`)
    await req(`/admin/pages/${body.page.id}`, 'DELETE')
  }
}

// ════ G4 · Links & landing cascades ════
group('Links & landing resolution cascades')
{
  t((await req('/admin/links', 'POST', { slug: 'qa-l' })).status === 400, 'link without pageId → 400')
  t((await req('/admin/links', 'POST', { slug: 'qa-l', pageId: 'ghost' })).status === 400, 'unknown page → 400')
  t((await req('/admin/links', 'POST', { slug: '###', pageId: 'lp-pns' })).status === 400, 'symbol-only slug → 400')
  t((await req('/admin/links', 'POST', { slug: 'qa-funnel', pageId: 'lp-pns' })).status === 409, 'duplicate slug → 409')

  const page = (await req('/admin/pages')).body.find((p) => p.name === 'QA Funnel')
  t((await req('/landing/qa-funnel')).status === 404, 'DRAFT page not publicly resolvable')
  await req(`/admin/pages/${page.id}`, 'PUT', { status: 'published' })
  const live = await req('/landing/qa-funnel')
  t(live.status === 200 && live.body.product.id === 'qa-prod', 'published page resolves with its product')

  await req('/admin/links/qa-funnel', 'PUT', { active: false })
  t((await req('/landing/qa-funnel')).status === 404, 'deactivated link → 404')
  await req('/admin/links/qa-funnel', 'PUT', { active: true })

  await req('/admin/products/qa-prod', 'PUT', { active: false })
  t((await req('/landing/qa-funnel')).status === 404, 'inactive PRODUCT kills the landing (cascade)')
  await req('/admin/products/qa-prod', 'PUT', { active: true })

  await req('/admin/workshops', 'POST', { id: 'qa-shop', name: 'QA Workshop', commissionRate: 0.2 })
  await req('/admin/links', 'POST', { slug: 'qa-shop-funnel', pageId: page.id, workshopId: 'qa-shop' })
  t((await req('/landing/qa-shop-funnel')).status === 200, 'workshop link resolves')
  await req('/admin/workshops/qa-shop', 'PUT', { active: false })
  t((await req('/landing/qa-shop-funnel')).status === 404, 'inactive WORKSHOP kills its link (cascade)')
  await req('/admin/workshops/qa-shop', 'PUT', { active: true })
  const canonical = (await req('/landing/qa-shop-funnel')).body.canonicalSlug
  t(canonical === 'qa-funnel', 'workshop link canonicalizes to HQ slug')
}

// ════ G5 · Nav derivation ════
group('Navigation (menu) derivation')
{
  const nav = (await req('/nav')).body
  const entry = nav.filter((n) => n.slug === 'qa-funnel' || n.slug === 'qa-shop-funnel')
  t(entry.length === 1 && entry[0].slug === 'qa-funnel', 'published page in nav ONCE, via HQ link only')
  t(entry[0].label === 'QA Product', 'nav label = product name')
  const page = (await req('/admin/pages')).body.find((p) => p.name === 'QA Funnel')
  await req(`/admin/pages/${page.id}`, 'PUT', { status: 'draft' })
  t(!(await req('/nav')).body.some((n) => n.slug === 'qa-funnel'), 'unpublished page drops out of nav')
  await req(`/admin/pages/${page.id}`, 'PUT', { status: 'published' })
}

// ════ G6 · Orders: validation, money math, attribution, stock ════
group('Orders — money & attribution')
{
  const order = (ref, extra = {}) => ({
    ref, items: [{ id: 'qa-prod', qty: 1 }],
    details: { name: 'QA Buyer', phone: '0123456789', mode: 'delivery' }, ...extra,
  })
  t((await req('/orders', 'POST', { ...order('QA-1'), details: { phone: '1' } })).status === 400, 'missing customer name → 400')
  t((await req('/orders', 'POST', order('QA-1', { items: [{ id: 'ghost', qty: 1 }] }))).status === 400, 'unknown product → 400')
  t((await req('/orders', 'POST', order('QA-1', { items: [] }))).status === 400, 'empty items → 400')

  // delivery-fee boundary: threshold is RM150, product is RM10
  const o14 = (await req('/orders', 'POST', order('QA-D14', { items: [{ id: 'qa-prod', qty: 14 }] }))).body
  t(o14.totals.subtotal === 140 && o14.totals.delivery === 12 && o14.totals.sst === 8.4 && o14.totals.total === 160.4, 'RM140 → +RM12 delivery, SST 8.40, total 160.40')
  const o15 = (await req('/orders', 'POST', order('QA-D15', { items: [{ id: 'qa-prod', qty: 15 }] }))).body
  t(o15.totals.delivery === 0 && o15.totals.total === 159, 'RM150 boundary → FREE delivery, total 159.00')
  const oPick = (await req('/orders', 'POST', { ...order('QA-PICK'), details: { name: 'QA', phone: '1', mode: 'pickup' } })).body
  t(oPick.totals.delivery === 0, 'pickup → no delivery fee')
  t((await req('/orders', 'POST', order('QA-D15'))).status === 409, 'duplicate ref → 409')

  // float-money check
  await req('/admin/products', 'POST', { id: 'qa-float', name: 'QA Float', cat: 'coolant-care', price: 19.99, stock: 50 })
  const oF = (await req('/orders', 'POST', order('QA-FLOAT', { items: [{ id: 'qa-float', qty: 3 }] }))).body
  t(oF.totals.subtotal === 59.97 && oF.totals.sst === 3.6 && oF.totals.total === 75.57, 'float money exact: 3×19.99 → SST 3.60, total 75.57')

  // attribution
  const fresh = { slug: 'qa-funnel', ts: Date.now() }
  const oHQ = (await req('/orders', 'POST', order('QA-HQ', { attribution: fresh }))).body
  t(oHQ.linkSlug === 'qa-funnel' && !oHQ.workshopId && oHQ.commission === 0, 'HQ link: slug RECORDED, no commission')
  const oWS = (await req('/orders', 'POST', order('QA-WS', { items: [{ id: 'qa-prod', qty: 10 }], attribution: { slug: 'qa-shop-funnel', ts: Date.now() } }))).body
  t(oWS.workshopId === 'qa-shop' && oWS.commission === 20, 'workshop link: commission = 20% × RM100 = RM20')
  t((await req('/admin/commissions')).body.some((c) => c.orderRef === 'QA-WS' && c.status === 'pending'), 'commission ledger row created (pending)')
  const oOld = (await req('/orders', 'POST', order('QA-OLD', { attribution: { slug: 'qa-shop-funnel', ts: Date.now() - 31 * 864e5 } }))).body
  t(!oOld.linkSlug && oOld.commission === 0, 'attribution older than 30 days ignored')
  await req('/admin/workshops/qa-shop', 'PUT', { active: false })
  const oInact = (await req('/orders', 'POST', order('QA-INACT', { attribution: { slug: 'qa-shop-funnel', ts: Date.now() } }))).body
  t(oInact.linkSlug === 'qa-shop-funnel' && oInact.commission === 0, 'inactive workshop: link recorded, NO commission')
  await req('/admin/workshops/qa-shop', 'PUT', { active: true })

  // stock & clamps
  await req('/admin/products', 'POST', { id: 'qa-low', name: 'QA Low', cat: 'coolant-care', price: 5, stock: 1 })
  const oOver = (await req('/orders', 'POST', order('QA-OVER', { items: [{ id: 'qa-low', qty: 3 }] }))).body
  t(oOver.oversold === true, 'insufficient stock → order flagged oversold')
  t((await req('/admin/products')).body.find((p) => p.id === 'qa-low').stock === 0, 'stock floors at 0')
  const oClamp = (await req('/orders', 'POST', order('QA-CLAMP', { items: [{ id: 'qa-float', qty: 5000 }] }))).body
  t(oClamp.items[0].qty === 999, 'quantity clamped at 999')

  // status transitions
  const bad = await req('/admin/orders/QA-D14', 'PUT', { status: 'teleported' })
  t(bad.body.status === 'paid', 'invalid status ignored (stays paid)')
  await req('/admin/orders/QA-D14', 'PUT', { status: 'dispatched' })
  t((await req('/admin/orders')).body.find((o) => o.ref === 'QA-D14').status === 'dispatched', 'valid status transition applied')

  // deleting an order removes its commission
  await req('/admin/orders/QA-WS', 'DELETE')
  t(!(await req('/admin/commissions')).body.some((c) => c.orderRef === 'QA-WS'), 'order delete removes its commission row')
}

// ════ G7 · Workshops ════
group('Workshops')
{
  t((await req('/admin/workshops', 'POST', { id: '###', name: 'X' })).status === 400, 'symbol-only id → 400')
  const w = (await req('/admin/workshops', 'POST', { id: 'qa-greedy', name: 'QA Greedy', commissionRate: 5 })).body
  t(w.commissionRate <= 0.9, `commission rate clamped (${w.commissionRate})`)
  const stats = (await req('/admin/workshops')).body.find((x) => x.id === 'qa-shop')
  t(typeof stats.links === 'number' && typeof stats.earned === 'number', 'workshop stats computed (links/orders/earned)')
  t((await req('/admin/workshops/qa-shop', 'DELETE')).status === 409, 'delete workshop with links → 409 (guard)')
  t((await req('/admin/workshops/qa-greedy', 'DELETE')).status === 200, 'delete unreferenced workshop → ok')
}

// ════ G8 · Concurrency races ════
group('Concurrency')
{
  const page = (await req('/admin/pages')).body.find((p) => p.name === 'QA Funnel')
  const puts = await Promise.all(Array.from({ length: 40 }, (_, i) =>
    req(`/admin/pages/${page.id}`, 'PUT', { name: `QA Race ${i}` })))
  t(puts.every((r) => r.status === 200), '40 concurrent page saves all succeed')
  const afterRace = (await req(`/admin/pages/${page.id}`)).body
  t(/^QA Race \d+$/.test(afterRace.name) && Array.isArray(afterRace.sections) && afterRace.sections.length === 5, 'page consistent after write race (one winner, sections intact)')
  await req(`/admin/pages/${page.id}`, 'PUT', { name: 'QA Funnel' })

  const dups = await Promise.all(Array.from({ length: 25 }, () => req(`/admin/pages/${page.id}/duplicate`, 'POST')))
  const ids = dups.map((d) => d.body.id)
  t(new Set(ids).size === 25, '25 concurrent duplicates → 25 unique ids')
  for (const id of ids) await req(`/admin/pages/${id}`, 'DELETE')

  await req('/admin/products/qa-float', 'PUT', { stock: 100 })
  await Promise.all(Array.from({ length: 30 }, (_, i) =>
    req('/orders', 'POST', { ref: `QA-C${i}`, items: [{ id: 'qa-float', qty: 2 }], details: { name: 'QA', phone: '1', mode: 'pickup' } })))
  t((await req('/admin/products')).body.find((p) => p.id === 'qa-float').stock === 40, '30 concurrent orders ×2 units → stock exactly 100−60=40')

  const races = await Promise.all(Array.from({ length: 10 }, () =>
    req('/admin/links', 'POST', { slug: 'qa-race-slug', pageId: page.id })))
  t(races.filter((r) => r.status === 201).length === 1 && races.filter((r) => r.status === 409).length === 9, '10 concurrent same-slug link creates → exactly 1 winner')
  await req('/admin/links/qa-race-slug', 'DELETE')
}

// ════ G9 · Rate limiting ════
group('Rate limiting')
{
  // batched concurrency (7 × 100) — enough to trip the 600/min limit
  // without exhausting the client's own sockets
  const burst = []
  for (let b = 0; b < 7; b++) {
    burst.push(...await Promise.all(Array.from({ length: 100 }, () => req('/landing/qa-funnel/click', 'POST'))))
  }
  const ok = burst.filter((r) => r.status === 200).length
  const limited = burst.filter((r) => r.status === 429).length
  t(limited > 0, `click burst rate-limited (${ok} ok, ${limited} × 429)`)
  t(ok + limited === 700, 'every burst request got a clean JSON verdict (no 500s / network drops)')
}

// ════ G10 · Payment gateway gating & webhook security ════
// Real money only flows for pages explicitly switched to LeanX, and only a
// signature-verified webhook may confirm a payment. These assertions need no
// LeanX credentials — they prove the gates hold, which is what protects money.
group('Payments — gating & webhook security')
{
  // the QA funnel page is left on the default gateway
  const methods = await req('/payments/methods?slug=qa-funnel')
  t(methods.status === 200 && methods.body?.gateway === 'mock',
    `page without an explicit gateway defaults to mock (${methods.body?.gateway})`)

  const unknownSlug = await req('/payments/methods?slug=definitely-not-a-page')
  t(unknownSlug.body?.gateway === 'mock', 'unknown slug never resolves to a live gateway')

  // a client cannot opt itself into real payment against a mock page
  const forced = await req('/payments/leanx/create', 'POST', {
    slug: 'qa-funnel',
    paymentServiceId: 'FAKE_BANK',
    items: [{ id: 'qa-prod', qty: 1 }],
    details: { name: 'QA', phone: '0123456789', email: 'qa@example.com', mode: 'pickup' },
  })
  t(forced.status === 400 && /does not accept/i.test(forced.body?.error || ''),
    'create-bill refused for a page that is not on LeanX')

  const noBank = await req('/payments/leanx/create', 'POST', { slug: 'qa-funnel', items: [], details: {} })
  t(noBank.status === 400, 'create-bill without a chosen bank → 400')

  // webhook must fail closed on a missing / wrong signature
  const payload = JSON.stringify({ bill_no: 'QA-BILL', invoice_ref: 'QA-NOPE', status: 'success', amount: '1.00' })
  const unsigned = await req('/payments/leanx/webhook', 'POST', payload)
  t(unsigned.status === 401 || unsigned.status === 503,
    `unsigned webhook rejected (${unsigned.status})`)
  const badSig = await req('/payments/leanx/webhook', 'POST', payload, { 'x-leanx-signature': 'deadbeef' })
  t(badSig.status === 401 || badSig.status === 503,
    `bad-signature webhook rejected (${badSig.status})`)
  t(unsigned.body?.error !== undefined, 'rejected webhook still answers JSON')

  // receipts are token-gated — a guessable ref alone must reveal nothing
  const noToken = await req('/orders/QA-NOPE/status')
  t(noToken.status === 401, 'order status without a token → 401')
  const wrongToken = await req('/orders/QA-NOPE/status?t=wrong')
  t(wrongToken.status === 401, 'order status with a wrong token → 401 (no existence leak)')
}

// ════ Cleanup & residue check ════
group('Cleanup & residue')
{
  const orders = (await req('/admin/orders')).body.filter((o) => o.ref.startsWith('QA-'))
  for (const o of orders) await req(`/admin/orders/${o.ref}`, 'DELETE')
  await req('/admin/links/qa-shop-funnel', 'DELETE')
  await req('/admin/links/qa-funnel', 'DELETE')
  const page = (await req('/admin/pages')).body.find((p) => p.name === 'QA Funnel')
  if (page) await req(`/admin/pages/${page.id}`, 'DELETE')
  await req('/admin/workshops/qa-shop', 'DELETE')
  for (const id of ['qa-prod', 'qa-float', 'qa-low']) await req(`/admin/products/${id}`, 'DELETE')

  const after = await snapshot()
  t(JSON.stringify(after) === JSON.stringify(before), `zero residue — entity counts restored ${JSON.stringify(after)}`)
}

console.log(`\n${'═'.repeat(60)}\n${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`)
if (failures.length) { console.log('Failures:'); failures.forEach((f) => console.log(' - ' + f)) }
process.exit(fail ? 1 : 0)
