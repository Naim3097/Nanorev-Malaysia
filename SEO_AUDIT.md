# NanoRev — SEO / GEO / UX Audit

Audited: 9 July 2026 · Scope: the 5 product landing pages under `/l/*` (+ legacy `5w40`)
**and the storefront** (home, shop, categories, product pages, transactional pages).

## 0. Storefront SEO / AI-GEO (same patch as landing pages)

| Check | Status | Notes |
|---|---|---|
| Per-route title/description/keywords/canonical | ✅ | Home, `/shop`, `/shop/<cat>` (6), `/product/<id>` (32) via the shared head manager (`src/utils/head.js` + `useSeo` hook); switches correctly on client-side navigation. |
| JSON-LD: Organization + WebSite w/ SearchAction | ✅ | Home — enables sitelinks search box; Organization carries the Shah Alam address (local signal). |
| JSON-LD: ItemList on shop/category pages | ✅ | Products with names + URLs. |
| JSON-LD: Product + Offer + BreadcrumbList | ✅ | Every product page, price in MYR pulled live. |
| Transactional pages noindexed | ✅ | `/cart`, `/checkout`, `/payment`, `/order/success` → `noindex, nofollow` + robots.txt `Disallow` in **every** bot block (per-bot blocks override `*`, so each needs its own). |
| Search-result views (`/shop?q=`) | ✅ | `noindex, follow`, canonical to `/shop` — thin/duplicate content stays out. |
| Prerendered static HTML for AI crawlers | ✅ | 40 store pages: home, shop, 6 categories, 32 products — full head tags + semantic content (specs as `<dl>`, crawlable internal links between home → categories → products). |
| All affiliate landing variants prerendered | ✅ | Workshop links (`/l/speedworks-*`) now render correct product previews when shared on WhatsApp; canonical folds to the plain slug. |
| sitemap.xml generated from data at build | ✅ | 46 URLs (home, shop, categories, products, landing pages) — stays in sync with the catalogue automatically; static copy removed. |

## 1. Design & UX checklist

| Check | Status | Notes |
|---|---|---|
| No content touching viewport edges | ✅ | Found & fixed: `.lp-hero-inner`, `.lp-trust-inner` etc. zeroed the wrap's side padding via `padding: X 0`. A horizontal-padding guard (`.landing .wrap`) now enforces 22px desktop / 16px mobile everywhere. |
| No zero top/bottom padding on sections | ✅ | Inline `paddingTop: 0` removed from Benefits/Specs/CTA; all landing sections now 52px desktop / 38px mobile. |
| No borders/lines inside grids | ✅ | Pain, benefit, guarantee, FAQ, spec-table, step and testimonial cards are borderless — depth via soft shadow + background contrast. Pack cards keep a border **only** as the active-selection state (functional, not decorative). |
| Decorative stripe patterns removed | ✅ | The diagonal-stripe overlay on the final CTA band is off on landing pages. |
| Mobile responsiveness (375px) | ✅ | Zero horizontal overflow on all pages; grids stack single-column; sticky buy bar + WhatsApp float never collide; chips stay inside the hero visual. |
| Sticky buy bar clearance | ✅ | `.landing` reserves 76px bottom padding so the last section is never hidden. |
| Funnel integrity | ✅ | No navbar/footer/drawer on `/l/*`; only exits are checkout and WhatsApp. |

## 2. Technical SEO checklist

| Check | Status | Notes |
|---|---|---|
| Unique `<title>` per page | ✅ | BM, keyword-led, brand-suffixed. |
| Unique meta description per page | ✅ | Pain-question hook + benefit + geo signal, ≤160 chars. |
| `<html lang="ms">` | ✅ | Set per landing page (SPA + prerendered HTML). |
| Canonical URLs | ✅ | Workshop/affiliate variants canonicalize to the plain slug — no duplicate-content dilution from affiliate links. |
| Open Graph (title/desc/type/url/image/locale) | ✅ | `og:locale ms_MY`; product photo as `og:image` where available. |
| Geo tags (`geo.region MY-10`, placename, ICBM) | ✅ | Shah Alam, Selangor coordinates. |
| JSON-LD: Product + Offer (MYR, InStock, seller) | ✅ | Price pulled live from the catalogue. |
| JSON-LD: FAQPage | ✅ | Built from each page's FAQ — powers rich results & AI answers. |
| JSON-LD: Organization (local address) | ✅ | In prerendered HTML. |
| robots.txt | ✅ | Explicit allow for GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, Google-Extended, GoogleOther, ClaudeBot, CCBot, Bytespider, Amazonbot + wildcard. |
| sitemap.xml | ✅ | Homepage, shop, all 5 landing URLs. |
| SPA rewrite doesn't shadow static files | ✅ | Vercel serves `dist/l/<slug>/index.html` before the SPA rewrite. |

## 3. AI / GEO (Generative Engine Optimisation)

**The critical fix:** AI crawlers (GPTBot, PerplexityBot, Gemini) do **not** execute
JavaScript — a plain SPA shows them an empty page. `npm run build` now runs
`scripts/prerender-landing.mjs`, which writes static HTML for every plain landing slug:
full head tags **plus the entire sales copy as semantic HTML** (h1 → sections → FAQ as
h3/p pairs → specs as a definition list). Verified in `dist/l/*/index.html`. Humans
still get the React app — the bundle replaces the static content on load.

Why this ranks in AI answers:
- FAQ copy is literally Q&A-shaped — the format answer engines quote.
- Concrete facts (price in RM, volume, usage steps, delivery from Shah Alam) are in
  plain text, not locked in JS.
- Organization + Product schema tie the answers to a Malaysian seller.

## 4. Keyword strategy (Malaysian search behaviour)

Mixed BM/EN the way Malaysians actually type, colloquial terms included:

| Page | Primary intent keywords |
|---|---|
| Premium Nano Synthetic | rawatan minyak enjin, engine oil treatment Malaysia, aditif minyak hitam, enjin bising/bergetar, elak overhaul |
| Nano Engine Flush | engine flush Malaysia, cuci enjin, buang sludge, minyak hitam cepat hitam |
| Premium Racing Booster | tambah power kereta, pickup lemah, octane booster Malaysia, balik kampung |
| Nano Fuel Injector | kereta boros minyak, jimat petrol, cuci injector, idle kasar, turbo GDI |
| Nano Transmission Protector | gearbox jerk, gear sentak, ATF treatment, kos repair gearbox, auto manual CVT |

Descriptions lead with the pain as a question (matches voice/AI queries like
"kenapa kereta saya boros minyak"), then the mechanism, then the geo promise.

## 5. Remaining gaps (pre-launch)

1. **Domain is a placeholder** — `https://nanorev.my` in `src/data/company.js` (SITE_URL),
   `public/robots.txt`, `public/sitemap.xml`. One search-and-replace before launch.
2. **Placeholder prices** on the 3 new products (`src/data/products.js`).
3. **Sample testimonials & "dipercayai bengkel" claims** — replace with real ones
   (consumer-protection risk).
4. **WhatsApp numbers are placeholders** (`src/data/landingPages.js`).
5. **Racing Booster has no bottle photo** — spec-tile fallback in use.
6. After launch: submit sitemap in Google Search Console + Bing Webmaster Tools
   (Bing feeds ChatGPT search), and verify rich results with the Rich Results Test.
7. Checkout flow is still in English — the funnel switches language after the CTA.
