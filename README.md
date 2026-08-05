# NanoRev Malaysia — Storefront, Sales Funnels & Backend

E-commerce platform for **Nano Revolution Autolube Sdn Bhd** (NanoRev), a Malaysian
automotive lubricant & additive brand. One codebase, three surfaces:

1. **Storefront** — catalogue, cart, two-step checkout (personal/trade accounts,
   delivery/pickup, MY validation, SST), mock LeanX payment (FPX/card/e-wallet/DuitNow).
2. **Sales funnels** (`/l/<slug>`) — chrome-free BM landing pages built for conversion,
   co-brandable per workshop (affiliate), with WhatsApp escape hatches.
3. **Admin backend** (`/admin`) — mini-WooCommerce: dashboard, orders, inventory
   (with photo uploads), dynamic landing pages + **visual drag-drop page builder**,
   5 page templates, affiliate links, workshop/salesman partners with commissions.

## Stack

- **Framework:** Next.js 16 (App Router) + React 19 + **TypeScript**. One app serves
  the storefront, the funnels and the API — no separate backend process.
- **Styling:** hand-rolled CSS design system ([src/index.css](src/index.css)) with
  **Tailwind v4** layered on top. The palette lives once in the `@theme` block in
  [src/app/globals.css](src/app/globals.css); `index.css` aliases those tokens to its
  original `--blue` / `--ink` names, so every existing rule keeps working *and*
  `bg-blue`, `text-ink`, `rounded-card` exist for new markup. Tailwind's preflight is
  deliberately not imported — the design system ships its own reset.
- **API:** Route Handlers under [src/app/api](src/app/api) over **Supabase**
  (Postgres + Storage). The repository layer ([src/server/store.ts](src/server/store.ts))
  keeps an in-memory working set and syncs changed rows back. Falls back to a local
  JSON file when Supabase env vars are absent (offline dev).
- **Builder:** dnd-kit drag-drop, schema-driven section forms ([src/builder](src/builder))
- **SEO/GEO:** real `generateMetadata` + server-rendered JSON-LD. The 12 funnel pages
  at `/l/<slug>` are **statically generated** from live store data (`generateStaticParams`,
  revalidated hourly), so crawlers that don't run JS get complete HTML. Sitemap is
  generated from the store at [src/app/sitemap.ts](src/app/sitemap.ts);
  AI-crawler-friendly robots.txt.

## Run

```bash
npm install
cp .env.example .env   # then fill in ADMIN_KEY + Supabase creds (see below)

npm run dev            # everything on :3000 (Supabase, or JSON file if creds absent)

npm run build          # .next/ — prerenders funnels + sitemap from the store
npm start              # production server, reads .env.local / .env (or host env vars)

npm run typecheck      # tsc --noEmit
```

> Requires **Node 20.9+** (Next.js 16's floor). The old `ws` dependency was only ever
> a `globalThis.WebSocket` polyfill: `@supabase/supabase-js` builds a Realtime client
> on construction even though this app only uses Postgres + Storage and never opens a
> socket. Inside Next that global already exists (Next provides it on Node 20; Node 22+
> has it natively), so the dependency was dropped.
>
> Caveat if you write a **standalone** script that imports `@supabase/supabase-js`
> directly: outside Next, Node 20 has no global `WebSocket` and the client throws on
> construction. Use Node 22+, or go through the app's API as `scripts/seed.mjs` does.

### Supabase setup (one-time)

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query** → paste [server/schema.sql](server/schema.sql) → **Run**
   (creates the 7 tables + the `product-images` Storage bucket).
3. Copy `.env.example` → `.env` and set:
   - `SUPABASE_URL` — Settings → Data API
   - `SUPABASE_SERVICE_ROLE_KEY` — Settings → API Keys → `service_role` (**secret,
     server-side only** — never ship it to the browser)
   - `ADMIN_KEY` — a long random string
4. Start the app (`npm run dev`), then `npm run seed` once — it drives
   `POST /api/admin/seed`, which populates an empty database from `src/data/*`.
   Idempotent: a no-op once any row exists.

Leave the Supabase vars blank to use the local JSON file store instead (offline dev) —
it seeds itself from `src/data/*` on first boot. Because images live in Supabase
Storage, the app needs no persistent disk and runs on any Node host.

**Deploying:** see [DEPLOY.md](DEPLOY.md) — Vercel runs the whole app (pages + API);
any Node host works too.

Admin panel: `/admin` — key is `ADMIN_KEY` (env), default `nanorev-admin` (**dev only —
always set a real key in production**). Pages tab & page builder are desktop-only;
everything else is mobile-optimised.

## Testing

```bash
npm run test:e2e      # 91-assertion functional/integrity suite (self-cleaning)
npm run test:stress   # load + data-integrity stress test
```

Wait ~60s between runs (per-IP rate limiter). See [BACKEND_AUDIT.md](BACKEND_AUDIT.md)
and [SEO_AUDIT.md](SEO_AUDIT.md) for audit history and results.

## Architecture notes

- **No hardcoded product data in pages** — prices/specs always render live from the
  catalogue; templates interpolate `{{tokens}}` at creation time.
- **Attribution:** landing visits stamp a 30-day last-click attribution; paid orders
  record the link, credit the workshop's commission (rate set per workshop), and
  decrement stock server-side (prices are server-authoritative).
- **Payments are per landing page.** `paymentGateway` on the page document selects
  the simulated gateway (default) or **LeanX** (real FPX / e-wallet). LeanX is a
  redirect + webhook gateway, so its orders are written `pending` before the buyer
  leaves, and stock, commission and `paid` are applied *only* by the
  signature-verified webhook — never by the buyer's return. Redelivered webhooks
  are inert: `store.claimPendingOrder()` is a compare-and-set on the order's
  status, so the side effects can only run once. See [DEPLOY.md](DEPLOY.md) to
  enable it and `LEANX_SAAS_INTEGRATION_GUIDE.md` for the provider's contract.
- **Static data files** (`src/data/*`) are the DB seed + offline fallback only.
- **Section documents are typed:** `SectionPropsMap` in [src/types.ts](src/types.ts)
  declares each section's props once, and `Section` derives a discriminated union
  from it — so adding a section type surfaces every place that must handle it.
- **Persistence has two modes.** On Vercel the working set is reloaded before each
  request and flushed before responding (an instance may be frozen between
  invocations). On a long-lived host it is primed once, reads come from memory and
  writes flush on a debounce — which is what keeps click-counter writes cheap.
  Writes are serialised either way, since Fluid Compute shares one instance across
  concurrent invocations.
- Uploaded product photos live in Supabase Storage; in JSON-file mode they go to
  `server/data/uploads/` (gitignored — back it up with `server/data/nanorev.json`).

## Pre-launch checklist (still open)

- [x] Real **LeanX** integration — live on pages flagged `paymentGateway: leanx`;
      orders are confirmed by the HMAC-verified webhook, not the browser redirect
- [ ] Roll LeanX out to the remaining landing pages and the `/shop` checkout once
      the first page is proven in production
- [ ] Set production `ADMIN_KEY`; plan real auth before workshop portal logins
- [ ] Replace placeholder domain `https://nanorev.my` — `SITE_URL` in
      [src/data/company.ts](src/data/company.ts), `public/robots.txt`
- [ ] Real prices for pns-01 / prb-01 / ntp-01 (placeholders)
- [ ] Real testimonials (samples are marked in copy) & real WhatsApp numbers
- [ ] Racing Booster product photo
- [ ] Schedule backups of `server/data/`
- [ ] After launch: submit sitemap to Google Search Console + Bing Webmaster
      (Bing feeds ChatGPT search)
