'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Fragment, useEffect, useState } from 'react'
import { Lock, MessageCircle, Store, Wrench } from 'lucide-react'
import { apiQuiet } from '@/api/client'
import { useCart } from '@/context/CartContext'
import { renderSection, type Pack } from '@/landing/sections'
import { rm } from '@/utils/format'
import { FREE_DELIVERY_THRESHOLD } from '@/utils/pricing'
import type { PacksProps, ResolvedLanding } from '@/types'

const AFF_KEY = 'nanorev.aff.v1'

/**
 * Renders a landing page document. The document itself is resolved on the
 * server (see page.tsx), so the markup ships complete in the first response —
 * this component only adds the interactive layer: quantity selection,
 * attribution, click tracking and the sticky buy bar.
 */
export default function LandingView({
  slug,
  resolved,
  preview = false,
}: {
  slug: string
  resolved: ResolvedLanding | null
  preview?: boolean
}) {
  const router = useRouter()
  const { add } = useCart()
  const [qty, setQty] = useState(1)
  const [showBar, setShowBar] = useState(false)

  const page = resolved?.page
  const product = resolved?.product
  const workshop = resolved?.workshop ?? null

  // Affiliate attribution — last click wins; the order endpoint reads this to
  // credit the workshop. Previews must not skew link analytics, so they neither
  // stamp attribution nor record a click.
  useEffect(() => {
    if (preview || !page || !product) return
    try {
      localStorage.setItem(
        AFF_KEY,
        JSON.stringify({
          slug,
          pageId: page.id,
          workshopId: workshop?.id || null,
          productId: product.id,
          ts: Date.now(),
        }),
      )
    } catch { /* private mode — attribution is best-effort */ }
    apiQuiet(`/landing/${slug}/click`, { method: 'POST' })
  }, [slug, preview, page, product, workshop])

  useEffect(() => {
    const onScroll = () => setShowBar(window.scrollY > 480)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!page || !product) {
    return (
      <div className="wrap page">
        <div className="empty-state">
          <div className="big"><Store size={44} strokeWidth={1.4} /></div>
          <h2>Halaman tidak dijumpai</h2>
          <p>Pautan ini tidak sah atau telah tamat tempoh.</p>
          <Link href="/shop" className="btn btn-primary">Lihat semua produk</Link>
        </div>
      </div>
    )
  }

  // Pack offers come from the packs section config; [1,2,4] as fallback.
  const packsSection = page.sections.find((s) => s.type === 'packs')
  const quantities = (packsSection?.props as PacksProps | undefined)?.quantities ?? [
    { qty: 1 }, { qty: 2 }, { qty: 4 },
  ]
  const packs: Pack[] = quantities.map(({ qty: q, note, highlight }) => ({
    qty: q,
    note,
    highlight,
    total: product.price * q,
    freeDelivery: product.price * q >= FREE_DELIVERY_THRESHOLD,
  }))
  const selected = packs.find((o) => o.qty === qty) || packs[0]

  const buyNow = () => {
    add(product, qty, { quiet: true }) // straight to checkout, no drawer
    router.push('/checkout')
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

      {page.sections.map((s, i) => (
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
          {renderSection(s, ctx)}
        </Fragment>
      ))}

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
