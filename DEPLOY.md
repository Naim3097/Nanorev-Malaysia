# Deploying NanoRev (Option A — one Node host)

One process serves everything: API + admin + storefront + prerendered SEO pages.
The host must provide a **persistent disk** — the database is a JSON file and
product photos are uploaded files. Serverless/ephemeral hosts (Vercel, Netlify)
will silently lose data; do not use them for this backend.

Environment variables:

| Var | Required | Example | Purpose |
|---|---|---|---|
| `ADMIN_KEY` | **yes** | a long random string | Admin panel / admin API auth. The default `nanorev-admin` is public in this repo — never ship it. |
| `DATA_DIR` | **yes in prod** | `/data` | Where the DB file + uploads live. Point it at the mounted volume. |
| `PORT` | no | set by host | Server port (defaults 4000). |

On first boot with an empty `DATA_DIR`, the store self-seeds from `src/data/*`
(full catalogue, 6 landing pages, links, workshops). After that, the volume is
the source of truth — **back it up**.

## Railway (recommended)

1. railway.app → New Project → **Deploy from GitHub repo** → `Naim3097/Nanorev-Malaysia`.
   Railway auto-detects Node, runs `npm install`, `npm run build`, `npm start`.
2. Service → **Variables**: add `ADMIN_KEY=<strong secret>`, `DATA_DIR=/data`.
3. Service → **Volumes** (or right-click service → Attach volume): mount path `/data`.
4. Settings → **Networking → Generate Domain** (or attach your custom domain).
5. Open `https://<domain>/api/health` → `{"ok":true}`. Storefront at `/`,
   admin at `/admin` (use your `ADMIN_KEY`).

## Render (alternative)

1. New → **Web Service** → connect the repo.
2. Build command `npm install && npm run build`, start command `npm start`.
3. Add a **Disk**: mount path `/data`, 1GB is plenty. Env vars as above.
   (Disks require a paid instance — the free tier is ephemeral.)

## VPS (alternative)

```bash
git clone https://github.com/Naim3097/Nanorev-Malaysia.git && cd Nanorev-Malaysia
npm install && npm run build
ADMIN_KEY=<secret> DATA_DIR=/var/lib/nanorev npm start   # behind nginx/caddy + TLS
```
Use a process manager (pm2/systemd) to keep it alive.

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
4. Schedule volume backups (`nanorev.json` + `uploads/`).

## Still open before real customers

- **LeanX payment integration** (orders currently confirm against a mock gateway)
- Real prices for the three new products, real testimonials, real WhatsApp numbers
- The Vercel deployment (if kept) is a static demo only — no backend, orders are
  not recorded there. Take it down or clearly treat it as a preview.
