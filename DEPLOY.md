# Deploying NanoRev (one Node host + Supabase)

One process serves everything: API + admin + storefront + prerendered SEO pages.
Data (Postgres) and product photos (Storage) live in **Supabase**, so the Node
host no longer needs a persistent disk — any container/VM host works, and even
ephemeral hosts are fine for the backend.

**Prerequisite:** create the Supabase project and run [server/schema.sql](server/schema.sql)
once (see README → *Supabase setup*). Then set the env vars below.

Environment variables:

| Var | Required | Example | Purpose |
|---|---|---|---|
| `ADMIN_KEY` | **yes** | a long random string | Admin panel / admin API auth. The default `nanorev-admin` is public in this repo — never ship it. |
| `SUPABASE_URL` | **yes** | `https://xxxx.supabase.co` | Supabase project URL (Settings → Data API). |
| `SUPABASE_SERVICE_ROLE_KEY` | **yes** | `eyJ…` | Service-role key (Settings → API Keys). **Secret** — server-side only, bypasses RLS. |
| `SUPABASE_STORAGE_BUCKET` | no | `product-images` | Image bucket (default `product-images`). |
| `PORT` | no | set by host | Server port (defaults 4000). |
| `DATA_DIR` | no | `/data` | JSON-file fallback only (unused when Supabase vars are set). |

Seed an **empty** Supabase database once with `npm run seed` (loads the full
catalogue, landing pages, links and workshops from `src/data/*`). It's
idempotent — a no-op once data exists. After that, Supabase is the source of
truth — enable Point-in-Time Recovery or scheduled backups in the dashboard.

> **Stateless-per-request:** the backend reloads its working set from Supabase
> before each `/api` request and flushes changes back before responding, so it
> runs equally as a long-lived process **or** as ephemeral serverless functions
> (Vercel). Reads are briefly TTL-cached; concurrent edits to the *same* row are
> last-writer-wins, which is fine at launch scale. (Stock decrements on
> simultaneous orders share that window — move to a Postgres atomic update if
> that ever matters.)

## Vercel

The app runs fully on Vercel — the built storefront is served statically and
`/api/*` runs as a serverless function (`api/index.mjs` wraps the Express app;
`vercel.json` rewrites all `/api/*` to it). No separate backend host needed.

1. Create the Supabase project and apply [server/schema.sql](server/schema.sql),
   then seed it once from your machine:
   `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run seed`.
2. vercel.com → **Add New Project** → import `Naim3097/Nanorev-Malaysia`.
   Framework auto-detects as Vite; `vercel.json` handles build + API routing.
3. Project → **Settings → Environment Variables**, add (Production):
   `ADMIN_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   (and optionally `SUPABASE_STORAGE_BUCKET`). **Redeploy** after adding them —
   env vars are baked in at deploy time.
4. Open `https://<project>.vercel.app/api/health` → `{"ok":true}`.
   Storefront at `/`, admin at `/admin` (use your `ADMIN_KEY`).

> Note: the serverless function reloads from Supabase each request, so it needs
> the Supabase env vars — without them it falls back to a local JSON file that
> doesn't exist on Vercel's read-only filesystem. Always set the three vars.

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

1. Update `SITE_URL` in [src/data/company.js](src/data/company.js) and the
   `Sitemap:` line in [public/robots.txt](public/robots.txt) to the real domain,
   commit, redeploy — canonical URLs, OG tags, JSON-LD and the sitemap all
   derive from it.
2. Rebuild so prerendered pages pick up live data: during a host build the API
   isn't running, so prerender falls back to the seed. To refresh crawler
   snapshots from the live DB, run the build with `API_URL` pointing at the
   deployed API (e.g. from your machine:
   `API_URL=https://<domain> ADMIN_KEY=<secret> npm run build` and redeploy),
   or just accept seed snapshots until the next release — humans always get
   live data either way.
3. Submit `https://<domain>/sitemap.xml` in Google Search Console and Bing
   Webmaster Tools (Bing feeds ChatGPT search).
4. Enable backups in Supabase (Database → Backups / Point-in-Time Recovery).

## Still open before real customers

- **LeanX payment integration** (orders currently confirm against a mock gateway)
- Real prices for the three new products, real testimonials, real WhatsApp numbers
- The Vercel deployment (if kept) is a static demo only — no backend, orders are
  not recorded there. Take it down or clearly treat it as a preview.
