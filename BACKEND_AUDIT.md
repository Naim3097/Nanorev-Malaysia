# NanoRev Backend — Architecture Audit & Stress Test

Audited: 9 July 2026 · Scope: data flows admin ⇄ backend ⇄ storefront/landing/SEO,
persistence, and behaviour under concurrent load.

## 1. Data-flow audit — "is everything connected, nothing hardcoded?"

| Flow | Verdict | Notes |
|---|---|---|
| Products/prices/stock → storefront | ✅ Dynamic | Admin edit visible on next storefront load (verified live). Static bundle is a fallback only, used when the API is unreachable. |
| Landing page content → `/l/<slug>` | ✅ Dynamic | Builder/JSON edits served by API; verified end-to-end. |
| New pages & links → Promosi menu | ✅ **Fixed this audit** | Menu was hardcoded (`promoNav`). Now `GET /api/nav` derives it from published pages with active HQ links — created a page+link in admin, appeared in the menu with zero code changes. |
| Deactivated/deleted links | ✅ **Fixed this audit** | Frontend silently fell back to the static config, keeping dead links alive. Now an API 404 is final ("Halaman tidak dijumpai"); only *network* failure falls back. Verified. |
| SEO prerender/sitemap ← data | ✅ **Fixed this audit** | Was building from seed files (drift after admin edits). Now pulls from the live API at build time, seed fallback when offline. |
| Orders → inventory/commissions | ✅ Dynamic | Server-side pricing, 30-day attribution, exact stock decrement, commission ledger. |
| Categories | ⚠️ Semi-static | Served from DB but no admin CRUD (6 categories rarely change). Acceptable; add CRUD when needed. |
| Static data files (`src/data/*`) | ⚠️ By design | Retained as instant-paint fallback + DB seed. They *drift* from the DB over time — that is the accepted cost of offline resilience. Refresh them periodically or accept fallback staleness. |

## 2. Hardening added this audit

- **Debounced atomic persistence** — the store wrote the full JSON file synchronously on
  *every* mutation; now marks dirty and flushes at most every 300ms (atomic tmp+rename),
  with a synchronous flush on process exit so no tail writes are lost.
- **Rate limiting** — per-IP fixed window on write endpoints (orders 200/min, clicks 600/min).
- **Order validation** — ref format, 1–50 item lines, qty cap 999, required name/phone;
  orders that outrun stock are accepted but flagged `oversold` for manual fulfilment.
- **JSON error contract** — unknown API routes return JSON 404; thrown/parse errors return
  JSON 500/400, never an HTML error page.
- **Lifecycle endpoints** — DELETE for orders, links, products (blocked if referenced by
  orders) and pages (blocked while links point at them) — no orphaned references possible.

## 3. Stress test (scripts/stress-test.mjs — repeatable, self-cleaning)

2,950 requests, all passed, zero errors, on the dev machine:

| Load | Throughput | p50 | p95 | p99 | Errors |
|---|---|---|---|---|---|
| Reads: products + landing (c=50, n=2000) | ~1,990 req/s | 22ms | 38ms | 87ms | 0 |
| Writes: affiliate clicks (c=25, n=250) | ~3,500 req/s | 7ms | 9ms | 9ms | 0 |
| Writes: orders (c=20, n=100) | ~2,250 req/s | 9ms | 12ms | 13ms | 0 |
| Mixed reads + admin (c=30, n=600) | ~3,000 req/s | 10ms | 14ms | 17ms | 0 |

**Integrity after load (the part that matters):** 250/250 clicks counted (no lost
updates), 100/100 orders stored with unique refs, stock decremented to the exact unit
(500 → 400), summary counters consistent, server healthy. Cleanup restored the exact
pre-test state.

Context: this traffic level is far beyond a lubricant e-commerce launch. The JSON store
is not the bottleneck today; Node's single-threaded event loop guarantees the counter
integrity observed.

## 3b. Full E2E QA round (scripts/e2e-test.mjs — 91 assertions, PASS)

Second testing round covering functional correctness, cascades, money math,
attribution, templates, concurrency and rate limiting. **Eight defects found
by code review and fixed, then locked in by the suite:**

1. Page updates mutated state BEFORE validating — a rejected `sections`
   payload corrupted the in-memory page. Now validate-before-mutate.
2. Page `status` accepted any string; `productId` accepted ghosts → silently
   dead landing pages. Both whitelisted/validated.
3. Product price could go negative; `cat` unvalidated (an invalid category
   would crash the prerenderer). Both rejected with 400.
4. Slugs/workshop ids could sanitize to symbol-only/empty → unreachable
   links. Now require at least one alphanumeric.
5. Commission rate unbounded (500% possible) → clamped to 0–90%.
6. **HQ-link attribution was dropped** — orders from non-workshop landing
   pages lost their `linkSlug`. Now the link is always recorded; commission
   still requires an active workshop.
7. Deleting a product ignored landing pages referencing it → orphans.
   Guarded (409 with count).
8. No workshop delete → added, guarded against links/orders references.

Suite coverage highlights: delivery-fee boundary at exactly RM150, float
money (3 × RM19.99 → SST 3.60), 30-day attribution expiry, inactive-workshop
commission suppression, oversold flagging, qty clamps, 40 concurrent saves to
one page, 25 concurrent duplicates (unique ids), 30 concurrent orders (stock
exact), 10 same-slug races (1 winner), 700-click burst (429s, zero 500s), and
a zero-residue check — entity counts identical before/after the whole run.

Note for operators: back-to-back test runs within one minute can trip the
per-IP click rate limit (by design). Wait 60s between runs.

## 4. Remaining risks — ranked (CTO view)

1. **Payments are mock** (launch blocker) — LeanX server-side integration + callback
   verification is the next build. The order pipeline is ready to receive it.
2. **Auth is a shared admin key** (launch blocker for multi-user) — fine solo; add real
   auth before workshops get portal logins. Set `ADMIN_KEY` in production regardless.
3. **JSON file store** (scale risk, not launch risk) — single-process only; no
   concurrent server instances. Swap `server/store.mjs` for Postgres/SQLite when
   deploying beyond one node. The repository layer isolates this to one file.
4. **No backups/versioning** — the DB is one JSON file; snapshot `server/data/` on a
   schedule. Page edit history (Nexova-style versions) is a nice-to-have.
5. **Attribution timestamp is client-supplied** — a technically savvy user could extend
   their own attribution window. Low impact; fix by stamping server-side click sessions.
6. **Placeholder domain / prices / testimonials / WhatsApp numbers** — unchanged from
   the SEO audit; still pre-launch tasks.
