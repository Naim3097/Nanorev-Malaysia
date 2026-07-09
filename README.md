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

- **Frontend:** React 18 + Vite, React Router, Context API, hand-rolled CSS design system
- **Backend:** Node + Express 5, JSON file store (repository layer — swap
  [server/store.mjs](server/store.mjs) for Postgres later), seeded from `src/data/*`
- **Builder:** dnd-kit drag-drop, schema-driven section forms ([src/builder](src/builder))
- **SEO/GEO:** per-route heads + JSON-LD; build-time prerender of ~50 routes to static
  HTML (AI crawlers don't run JS) sourced from the **live API**; generated sitemap;
  AI-crawler-friendly robots.txt

## Run

```bash
npm install

# development (two processes)
npm run server        # API on :4000 (auto-seeds server/data/nanorev.json)
npm run dev           # storefront on :5174, proxies /api → :4000

# production (one process serves API + built storefront)
npm run build         # dist/ + prerendered SEO pages + sitemap (uses live API if up)
ADMIN_KEY=change-me DATA_DIR=/data npm start
```

**Deploying:** see [DEPLOY.md](DEPLOY.md) — Railway/Render/VPS with a persistent
volume. Vercel only hosts the static frontend (no backend — demo only).

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
- **Static data files** (`src/data/*`) are the DB seed + offline fallback only.
- Uploaded product photos live in `server/data/uploads/` (gitignored — back it up
  together with `server/data/nanorev.json`).

## Pre-launch checklist (still open)

- [ ] Real **LeanX** integration — replace `processPayment()` mock; verify callbacks
      server-side and mark orders paid there
- [ ] Set production `ADMIN_KEY`; plan real auth before workshop portal logins
- [ ] Replace placeholder domain `https://nanorev.my` — `SITE_URL` in
      [src/data/company.js](src/data/company.js), `public/robots.txt`
- [ ] Real prices for pns-01 / prb-01 / ntp-01 (placeholders)
- [ ] Real testimonials (samples are marked in copy) & real WhatsApp numbers
- [ ] Racing Booster product photo
- [ ] Schedule backups of `server/data/`
- [ ] After launch: submit sitemap to Google Search Console + Bing Webmaster
      (Bing feeds ChatGPT search)
