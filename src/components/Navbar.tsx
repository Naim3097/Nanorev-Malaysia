'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, Flame, Search, ShoppingCart } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useCart } from '@/context/CartContext'
import { useCatalog } from '@/context/CatalogContext'

function Wordmark() {
  return (
    <span className="logo" aria-label="NanoRev">
      <span className="word">NANOREV</span>
      <span className="slashes"><i /><i /></span>
    </span>
  )
}

export default function Navbar() {
  const { count, openDrawer } = useCart()
  const { categories, nav: promoNav } = useCatalog()
  const [q, setQ] = useState('')
  const [promoOpen, setPromoOpen] = useState(false)
  // grace period so the menu survives the pointer crossing the gap below the button
  const promoCloseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const promoRef = useRef<HTMLDivElement>(null)
  // remembers whether hover (not a tap) opened the menu — a click while
  // hover-opened must keep it open, otherwise it flashes shut for mouse users
  const promoHoverOpened = useRef(false)
  const openPromo = () => {
    clearTimeout(promoCloseTimer.current)
    setPromoOpen(true)
  }
  const closePromo = () => {
    clearTimeout(promoCloseTimer.current)
    promoCloseTimer.current = setTimeout(() => setPromoOpen(false), 250)
  }
  const promoEnter = () => {
    promoHoverOpened.current = true
    openPromo()
  }
  const promoLeave = () => {
    promoHoverOpened.current = false
    closePromo()
  }
  const promoClick = () => {
    if (promoOpen && !promoHoverOpened.current) setPromoOpen(false) // tap toggle (touch)
    else openPromo()
  }
  useEffect(() => {
    if (!promoOpen) return undefined
    const onDocClick = (e: MouseEvent) => {
      if (promoRef.current && !promoRef.current.contains(e.target as Node)) setPromoOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [promoOpen])

  const router = useRouter()
  const pathname = usePathname()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/shop?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <header className="nav">
      <div className="promo-strip">Free delivery over <b>RM 150</b> · Dealer &amp; workshop pricing on bulk orders · Ships across Malaysia 🇲🇾</div>
      <div className="wrap nav-inner">
        <Link href="/"><Wordmark /></Link>

        <form className="nav-search" onSubmit={submit}>
          <Search size={18} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search grade, oil, part…"
            aria-label="Search products"
          />
        </form>

        <nav className="nav-actions">
          <div
            ref={promoRef}
            className={`nav-promo ${promoOpen ? 'open' : ''}`}
            onMouseEnter={promoEnter}
            onMouseLeave={promoLeave}
          >
            <button
              className="nav-link nav-promo-btn"
              onClick={promoClick}
              aria-expanded={promoOpen}
              aria-haspopup="true"
            >
              <Flame size={17} />
              <span>Promosi</span>
              <ChevronDown size={14} className="chev" />
            </button>
            <div className="nav-promo-menu" role="menu">
              {promoNav.map((l) => (
                <Link key={l.slug} href={`/l/${l.slug}`} onClick={() => setPromoOpen(false)} role="menuitem">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
          <Link href="/shop" className="nav-link"><span>Shop</span></Link>
          <button className="nav-link cart-btn" onClick={openDrawer} aria-label="Open cart">
            <ShoppingCart size={20} />
            {count > 0 && <span className="cart-badge">{count}</span>}
            <span>Cart</span>
          </button>
        </nav>
      </div>

      <div className="nav-cats">
        <div className="wrap nav-cats-inner">
          <Link href="/shop" className={pathname === '/shop' ? 'active' : ''}>All Products</Link>
          {categories.map((c) => (
            <Link key={c.id} href={`/shop/${c.id}`} className={pathname === `/shop/${c.id}` ? 'active' : ''}>
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    </header>
  )
}
