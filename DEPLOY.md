# Deploying NanoRev (one Next.js app + Supabase)

One Next.js app serves everything: API + admin + storefront + prerendered SEO pages.
Data (Postgres) and product photos (Storage) live in **Supabase**, so the Node
host no longer needs a persistent disk — any container/VM host works, and even
ephemeral hosts are fine for the backend.

**Prerequisites:** **Node 20.9+**, and a Supabase project with
[server/schema.sql](server/schema.sql) applied once (see README → *Supabase setup*).
Then set the env vars below.

Environment variables:

| Var | Required | Example | Purpose |
|---|---|---|---|
| `ADMIN_KEY` | **yes** | a long random string | Admin panel / admin API auth. The default `nanorev-admin` is public in this repo — never ship it. |
| `SUPABASE_URL` | **yes** | `https://xxxx.supabase.co` | Supabase project URL (Settings → Data API). |
| `SUPABASE_SERVICE_ROLE_KEY` | **yes** | `eyJ…` | Service-role key (Settings → API Keys). **Secret** — server-side only, bypasses RLS. |
| `SUPABASE_STORAGE_BUCKET` | no | `product-images` | Image bucket (default `product-images`). |
| `PORT` | no | set by host | Server port (defaults 3000). |
| `DATA_DIR` | no | `/data` | JSON-file fallback only (unused when Supabase vars are set). |
| `LEANX_AUTH_TOKEN` | for live payments | `LP-…` | LeanX Auth Token — sent as the `auth-token` header. |
| `LEANX_COLLECTION_UUID` | for live payments | `Dc-…` | Which LeanX collection bills belong to. |
| `LEANX_WEBHOOK_SECRET` | for live payments | `whsec_…` | The collection's **Hash Key** — HMAC secret verifying webhooks. |
| `LEANX_API_HOST` | no | `https://api.leanx.io` | Defaults correctly; `.dev` is legacy, don't use it. |
| `PUBLIC_BASE_URL` | no | `https://nanorev.my` | Externally reachable origin used to build LeanX's `redirect_url` and `callback_url`. Defaults to the Vercel deployment URL. |

### Enabling real payments on a page

Payments are **per landing page**, so the rollout is deliberate:

1. Set the four `LEANX_*` vars and redeploy.
2. Admin → Pages → **Builder** → click empty canvas → *Tetapan halaman* →
   **Gerbang pembayaran** → `LeanX — bayaran sebenar` → **Save**.

Every other page keeps using the simulated gateway. A page switched to LeanX
with credentials missing refuses the payment outright rather than silently
falling back to the simulator.

> **The webhook is the only proof of payment.** The buyer returning to
> `/order/success` confirms nothing — orders are written `pending`, and stock,
> commission and `paid` are applied solely by the signature-verified webhook at
> `/api/payments/leanx/webhook`. That URL must be publicly reachable, which is
> why `PUBLIC_BASE_URL` has to match the deployment actually taking payments.

Seed an **empty** Supabase database once: start the app, then run `npm run seed`
(it calls `POST /api/admin/seed` with your `ADMIN_KEY`, loading the full catalogue,
landing pages, links and workshops from `src/data/*`). Idempotent — a no-op once
data exists. After that Supabase is the source of truth — enable Point-in-Time
Recovery or scheduled backups in the dashboard.

> **Two persistence modes.** On Vercel (`VERCEL` is set) the working set is
> reloaded from Supabase before each request and flushed before responding, since
> an instance may be frozen or discarded between invocations. On a long-lived host
> it is primed once, reads are served from memory and writes flush on a debounce —
> far cheaper for high-frequency writes like affiliate click counters. Writes are
> serialised in both modes, because Fluid Compute reuses one instance across
> concurrent invocations. Concurrent edits to the *same* row are last-writer-wins,
> which is fine at launch scale. (Stock decrements on simultaneous orders share
> that window — move to a Postgres atomic update if that ever matters.)

## Vercel

The whole app runs on Vercel: static/ISR pages plus API Route Handlers. There is no
`vercel.json` and no separate backend — Vercel detects Next.js and does the rest.

1. Create the Supabase project and apply [server/schema.sql](server/schema.sql).
2. vercel.com → **Add New Project** → import `Naim3097/Nanorev-Malaysia`.
   Framework auto-detects as **Next.js**.
3. Project → **Settings → Environment Variables**, add (Production):
   `ADMIN_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   (and optionally `SUPABASE_STORAGE_BUCKET`). **Redeploy** after adding them —
   the build reads them to prerender the funnel pages.
4. Seed once: `API_URL=https://<project>.vercel.app ADMIN_KEY=<secret> npm run seed`.
5. Open `https://<project>.vercel.app/api/health` → `{"ok":true}`.
   Storefront at `/`, admin at `/admin` (use your `ADMIN_KEY`).

> Note: the Supabase env vars must be set. Without them the app falls back to a
> local JSON file store, which cannot persist on Vercel's read-only filesystem.

## Railway (alternative)

1. railway.app → New Project → **Deploy from GitHub repo** → `Naim3097/Nanorev-Malaysia`.
   Railway auto-detects Node, runs `npm install`, `npm run build`, `npm start`.
2. Service → **Variables**: add `ADMIN_KEY=<strong secret>`, `SUPABASE_URL=…`,
   `SUPABASE_SERVICE_ROLE_KEY=…`. No volume needed.
3. Settings → **Networking → Generate Domain** (or attach your custom domain).
4. Open `https://<domain>/api/health` → `{"ok":true}`. Storefront at `/`,
   admin at `/admin` (use your `ADMIN_KEY`).

## Render (alternative)

1. New → **Web Service** → connect the repo.
2. Build command `npm install && npm run build`, start command `npm start`.
3. Env vars as above (`ADMIN_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
   No disk required — the free/instance tier is fine since state lives in Supabase.

## VPS (alternative)

```bash
git clone https://github.com/Naim3097/Nanorev-Malaysia.git && cd Nanorev-Malaysia
npm install && npm run build
ADMIN_KEY=<secret> SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm start   # behind nginx/caddy + TLS
```
Use a process manager (pm2/systemd) to keep it alive. Run a single instance.

## After the domain is live

1. Update `SITE_URL` in [src/data/company.ts](src/data/company.ts) and the
   `Sitemap:` line in [public/robots.txt](public/robots.txt) to the real domain,
   commit, redeploy — canonical URLs, OG tags, JSON-LD and the sitemap all
   derive from it.
2. Nothing to re-run for content: funnel pages and the sitemap are built from
   Supabase at build time and revalidate hourly, so admin edits go live on their
   own — no redeploy needed.
3. Submit `https://<domain>/sitemap.xml` in Google Search Console and Bing
   Webmaster Tools (Bing feeds ChatGPT search).
4. Enable backups in Supabase (Database → Backups / Point-in-Time Recovery).

## Still open before real customers

- **LeanX payment integration** (orders currently confirm against a mock gateway)
- Real prices for the three new products, real testimonials, real WhatsApp numbers
