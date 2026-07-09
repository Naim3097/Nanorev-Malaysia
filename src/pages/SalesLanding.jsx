import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Lock, MessageCircle, Store, Wrench } from 'lucide-react'
import { resolveLink } from '../data/landingPages'
import { useCatalog } from '../context/CatalogContext'
import { api, apiQuiet } from '../api/client'
import { useCart } from '../context/CartContext'
import { rm } from '../utils/format'
import { FREE_DELIVERY_THRESHOLD } from '../utils/pricing'
import { SECTIONS } from '../landing/sections'
import { applySeo } from '../landing/seo'

const AFF_KEY = 'nanorev.aff.v1'

// Renders a landing page document (see src/data/landingPages.js):
// resolves the affiliate slug, stamps attribution, then maps each
// section config to its component. Unknown section types are skipped,
// so older pages never break a newer storefront.
export default function SalesLanding() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { add } = useCart()
  const { productById } = useCatalog()
  const [qty, setQty] = useState(1)
  const [showBar, setShowBar] = useState(false)

  // static config renders instantly; the backend's version (admin edits,
  // new pages, new workshop links) replaces it as soon as it arrives.
  // A 404 from the API means the link was deactivated/removed in admin —
  // that verdict is final; only NETWORK failure falls back to static.
  const staticResolved = useMemo(() => resolveLink(slug), [slug])
  const [remote, setRemote] = useState(null)
  const [gone, setGone] = useState(false)
  useEffect(() => {
    let alive = true
    setRemote(null)
    setGone(false)
    api(`/landing/${slug}`)
      .then((d) => { if (alive && d?.page) setRemote(d) })
      .catch((e) => { if (alive && e.status === 404) setGone(true) })
    apiQuiet(`/landing/${slug}/click`, { method: 'POST' })
    return () => { alive = false }
  }, [slug])

  const resolved = gone ? null : remote || staticResolved
  const page = resolved?.page
  const workshop = resolved?.workshop
  const product = remote?.product || (page ? productById(page.productId) : null)

  // Affiliate attribution — last click wins; the backend will read this
  // at order time to credit the workshop.
  useEffect(() => {
    if (!resolved || !product) return
    try {
      localStorage.setItem(AFF_KEY, JSON.stringify({
        slug,
        pageId: page.id,
        workshopId: workshop?.id || null,
        productId: product.id,
        ts: Date.now(),
      }))
    } catch { /* private mode — attribution is best-effort */ }
  }, [resolved, slug]) // eslint-disable-line react-hooks/exhaustive-deps

  // SEO / GEO head tags + JSON-LD, restored on unmount
  useEffect(() => {
    if (!resolved || !product) return undefined
    return applySeo({ page, product, canonicalSlug: resolved.canonicalSlug })
  }, [resolved]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onScroll = () => setShowBar(window.scrollY > 480)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!resolved || !product) {
    return (
      <div className="wrap page">
        <div className="empty-state">
          <div className="big"><Store size={44} strokeWidth={1.4} /></div>
          <h2>Halaman tidak dijumpai</h2>
          <p>Pautan ini tidak sah atau telah tamat tempoh.</p>
          <Link to="/shop" className="btn btn-primary">Lihat semua produk</Link>
        </div>
      </div>
    )
  }

  // Pack offers come from the packs section config; [1,2,4] as fallback.
  const packsProps = page.sections.find((s) => s.type === 'packs')?.props
  const packs = (packsProps?.quantities || [{ qty: 1 }, { qty: 2 }, { qty: 4 }]).map(
    ({ qty: q, note, highlight }) => ({
      qty: q,
      note,
      highlight,
      total: product.price * q,
      freeDelivery: product.price * q >= FREE_DELIVERY_THRESHOLD,
    }),
  )
  const selected = packs.find((o) => o.qty === qty) || packs[0]

  const buyNow = () => {
    add(product, qty, { quiet: true }) // straight to checkout, no drawer
    navigate('/checkout')
  }

  const waNumber = workshop?.whatsapp || page.whatsapp
  const waHref = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(page.waText || '')}` : null

  const ctx = { product, page, workshop, qty, setQty, packs, selected, buyNow, waHref, buyLabel: page.buyLabel }

  return (
    <div className="landing">
      {/* funnel-safe brand bar: wordmark only, deliberately not a link */}
      <div className="lp-topbar">
        <div className="wrap lp-topbar-inner">
          <span className="logo" aria-label="NanoRev">
            <span className="word">NANOREV</span>
            <span className="slashes"><i /><i /></span>
          </span>
          <span className="lp-topbar-trust"><Lock size={13} /> Bayaran Selamat</span>
        </div>
      </div>

      {page.sections.map((s, i) => {
        const Section = SECTIONS[s.type]
        if (!Section) return null
        return (
          <Fragment key={`${s.type}-${i}`}>
            {/* workshop co-brand strip rides just above the hero */}
            {workshop && s.type === 'hero' && (
              <div className="lp-cobrand">
                <div className="wrap lp-cobrand-inner">
                  <Wrench size={15} />
                  <span>Disyorkan oleh <b>{workshop.name}, {workshop.city}</b> — Bengkel Panel Rasmi NanoRev</span>
                </div>
              </div>
            )}
            <Section props={s.props || {}} ctx={ctx} />
          </Fragment>
        )
      })}

      {/* floating WhatsApp — the second CTA for buyers who prefer to ask first */}
      {waHref && (
        <a
          className={`wa-float ${showBar ? 'lift' : ''}`}
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Hubungi kami di WhatsApp"
        >
          <MessageCircle size={26} strokeWidth={2} />
        </a>
      )}

      {/* sticky buy bar */}
      <div className={`lp-buybar ${showBar ? 'show' : ''}`}>
        <div className="wrap lp-buybar-inner">
          <div className="lp-buybar-info">
            <b>{product.name} {product.grade}</b>
            <span>
              {selected.qty} unit · {rm(selected.total)}
              {selected.freeDelivery ? ' · Penghantaran PERCUMA' : ''}
            </span>
          </div>
          <button className="btn btn-red" onClick={buyNow}>{page.buyLabel}</button>
        </div>
      </div>
    </div>
  )
}
