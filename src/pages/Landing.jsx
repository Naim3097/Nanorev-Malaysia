import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  ShieldCheck, Truck, Zap, Droplets, ThermometerSun, BadgeCheck,
  Star, ShoppingCart, ChevronRight, Store, Lock,
} from 'lucide-react'
import { productById } from '../data/products'
import { categoryById } from '../data/categories'
import { useCart } from '../context/CartContext'
import { rm } from '../utils/format'
import { FREE_DELIVERY_THRESHOLD } from '../utils/pricing'
import ProductImage from '../components/ProductImage'

const DEFAULT_ID = 'eo-01'

// Sales copy for the template. Product-specific lines can be added per id;
// anything missing falls back to the generic lubricant pitch.
const COPY = {
  headline: (p) => `Protect your engine with ${p.name} ${p.grade}`,
  sub: (p) =>
    `${p.base} ${p.spec} formula engineered for Malaysian heat, stop-start traffic and long highway runs. Trusted by workshops and fleets nationwide.`,
  bullets: (p) => [
    `${p.base} — stable protection from cold start to full operating temperature`,
    `Meets ${p.spec} — safe for modern engines and warranties`,
    `${p.volume} pack · same-day dispatch from Shah Alam`,
  ],
}

const BENEFITS = [
  {
    icon: Zap,
    title: 'Nano friction technology',
    text: 'Nano-scale friction modifiers coat metal surfaces to cut wear during cold starts — when up to 75% of engine wear happens.',
  },
  {
    icon: ThermometerSun,
    title: 'Built for Malaysian heat',
    text: 'Holds viscosity in 35°C traffic crawls and long balik kampung runs. No breakdown, no sludge, full protection to the next service.',
  },
  {
    icon: Droplets,
    title: 'Cleaner engine, longer life',
    text: 'Advanced detergent package keeps piston rings and oil galleries clean, so your engine stays smooth and efficient as it ages.',
  },
]

const TESTIMONIALS = [
  {
    name: 'Ah Seng',
    role: 'Workshop owner · Klang',
    text: 'We switched our service bay to NanoRev two years ago. Customers come back saying the engine feels smoother. Zero complaints.',
  },
  {
    name: 'Faizal',
    role: 'Grab driver · Shah Alam',
    text: 'I clock 4,000 km a month. With NanoRev the engine stays quiet all the way to the next oil change. Good price for full synthetic.',
  },
  {
    name: 'Kumar',
    role: 'Fleet supervisor · Penang',
    text: 'Consistent quality every drum. Delivery is fast and dealer pricing makes sense for our lorries. Recommended.',
  },
]

const FAQS = [
  {
    q: 'Is this suitable for my car?',
    a: 'Check your owner’s manual for the recommended viscosity grade and API specification. If the grade matches, the oil is suitable. Not sure? WhatsApp us your car model and we’ll confirm.',
  },
  {
    q: 'How fast is delivery?',
    a: 'Orders placed before 3 PM ship the same day from our Shah Alam distribution centre. Klang Valley usually arrives next working day; East Malaysia 2–4 working days.',
  },
  {
    q: 'Is this genuine NanoRev product?',
    a: 'Yes — you are buying directly from Nano Revolution Autolube Sdn Bhd, the official distributor. Every bottle is factory-sealed with a batch number.',
  },
  {
    q: 'Do you offer workshop or bulk pricing?',
    a: 'Yes. Dealer and workshop pricing is available on bulk orders — choose "Become a dealer" or request a trade account at checkout.',
  },
]

function packOptions(p) {
  return [1, 2, 4].map((qty) => {
    const total = p.price * qty
    return {
      qty,
      total,
      freeDelivery: total >= FREE_DELIVERY_THRESHOLD,
      label: qty === 1 ? '1 unit' : `${qty} units`,
      note: qty === 1 ? 'Try it out' : qty === 2 ? 'Most popular' : 'Workshop pack',
    }
  })
}

export default function Landing() {
  const { id } = useParams()
  const navigate = useNavigate()
  const product = productById(id || DEFAULT_ID) || productById(DEFAULT_ID)
  const { add } = useCart()
  const [qty, setQty] = useState(1)
  const [showBar, setShowBar] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowBar(window.scrollY > 480)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const cat = categoryById(product.cat)
  const packs = packOptions(product)
  const selected = packs.find((o) => o.qty === qty) || packs[0]

  const buyNow = () => {
    add(product, qty)
    navigate('/checkout')
  }

  return (
    <div className="landing">
      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="wrap lp-hero-inner">
          <div>
            <div className="lp-flag">
              <span className="slashes"><i /><i /></span>
              {product.badge === 'bestseller' ? 'Bestseller' : cat.name} · {product.spec} · {product.base}
            </div>
            <h1>{COPY.headline(product)}</h1>
            <p className="lp-sub">{COPY.sub(product)}</p>
            <ul className="lp-bullets">
              {COPY.bullets(product).map((b) => (
                <li key={b}><BadgeCheck size={18} /> {b}</li>
              ))}
            </ul>
            <div className="lp-price-row">
              <span className="lp-price">{rm(product.price)}</span>
              <span className="lp-price-unit">/ {product.volume} · SST included at checkout</span>
            </div>
            <div className="lp-cta">
              <button className="btn btn-red btn-lg" onClick={buyNow}>
                Buy now · {rm(product.price * qty)} <ChevronRight size={18} />
              </button>
              <button className="btn btn-ghost-light btn-lg" onClick={() => add(product, qty)}>
                <ShoppingCart size={18} /> Add to cart
              </button>
            </div>
            <div className="lp-hero-meta">
              <span><Truck size={15} /> Same-day dispatch</span>
              <span><Lock size={15} /> FPX / card / COD</span>
              <span><Star size={15} /> 4.9 workshop rating</span>
            </div>
          </div>

          <div className="lp-visual">
            <div className="lp-visual-tile">
              <ProductImage product={product} sizes="(max-width: 900px) 90vw, 480px" />
            </div>
            <div className="lp-chip lp-chip-1">{product.spec}</div>
            <div className="lp-chip lp-chip-2">{product.grade} · {product.volume}</div>
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <div className="lp-trust">
        <div className="wrap lp-trust-inner">
          <span><ShieldCheck size={17} /> Official distributor</span>
          <span><Truck size={17} /> Free delivery over {rm(FREE_DELIVERY_THRESHOLD)}</span>
          <span><BadgeCheck size={17} /> {product.spec} certified</span>
          <span><Store size={17} /> Warehouse pickup available</span>
        </div>
      </div>

      {/* ── Benefits ── */}
      <section className="section">
        <div className="wrap">
          <div className="lp-center">
            <span className="eyebrow">Why {product.name}</span>
            <h2 className="lp-h2">Engineered to outlast every drive</h2>
          </div>
          <div className="lp-benefit-grid">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <div className="lp-benefit" key={title}>
                <div className="ic"><Icon size={22} /></div>
                <h4>{title}</h4>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pack offer ── */}
      <section className="section lp-offer">
        <div className="wrap">
          <div className="lp-center">
            <span className="eyebrow">Choose your pack</span>
            <h2 className="lp-h2">Stock up and ship free</h2>
            <p className="lp-note-sub">Orders over {rm(FREE_DELIVERY_THRESHOLD)} qualify for free delivery across Malaysia.</p>
          </div>
          <div className="lp-pack-grid">
            {packs.map((o) => (
              <button
                key={o.qty}
                className={`lp-pack ${qty === o.qty ? 'active' : ''}`}
                onClick={() => setQty(o.qty)}
              >
                {o.note !== 'Try it out' && <span className="lp-pack-tag">{o.note}</span>}
                <span className="lp-pack-qty">{o.label}</span>
                <span className="lp-pack-sub">{product.volume} × {o.qty}</span>
                <span className="lp-pack-price">{rm(o.total)}</span>
                <span className={`lp-pack-ship ${o.freeDelivery ? 'ok' : ''}`}>
                  {o.freeDelivery ? 'Free delivery' : 'Delivery calculated at checkout'}
                </span>
              </button>
            ))}
          </div>
          <div className="lp-pack-cta">
            <button className="btn btn-primary btn-lg" onClick={buyNow}>
              Checkout {selected.label} · {rm(selected.total)}
            </button>
          </div>
        </div>
      </section>

      {/* ── Specs ── */}
      <section className="section">
        <div className="wrap lp-spec-wrap">
          <div>
            <span className="eyebrow">Technical data</span>
            <h2 className="lp-h2" style={{ textAlign: 'left' }}>Specifications</h2>
            <p className="lp-note-sub" style={{ textAlign: 'left', margin: '0 0 18px' }}>
              Always match the grade recommended in your owner&apos;s manual.
            </p>
            <Link to={`/product/${product.id}`} className="btn btn-ghost">Full product page</Link>
          </div>
          <div className="spec-table">
            {[
              ['Product', `${product.name} ${product.grade}`],
              ['Viscosity grade', product.grade],
              ['Volume', product.volume],
              ['Base oil', product.base],
              ['Specification', product.spec],
              ['Application', cat.name],
            ].map(([k, v]) => (
              <div key={k}><span className="k">{k}</span><span className="v">{v}</span></div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="section lp-quotes">
        <div className="wrap">
          <div className="lp-center">
            <span className="eyebrow">Word of mouth</span>
            <h2 className="lp-h2">Workshops run on NanoRev</h2>
          </div>
          <div className="lp-quote-grid">
            {TESTIMONIALS.map((t) => (
              <figure className="lp-quote" key={t.name}>
                <div className="stars">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                </div>
                <blockquote>&ldquo;{t.text}&rdquo;</blockquote>
                <figcaption><b>{t.name}</b> · {t.role}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section">
        <div className="wrap lp-faq-wrap">
          <div className="lp-center">
            <span className="eyebrow">Questions</span>
            <h2 className="lp-h2">Before you order</h2>
          </div>
          {FAQS.map((f) => (
            <details className="lp-faq" key={f.q}>
              <summary>{f.q}<ChevronRight size={17} className="chev" /></summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="dealer">
            <div>
              <h3>Ready when your engine is</h3>
              <p>
                {product.name} {product.grade} · {rm(product.price)} / {product.volume}. Same-day dispatch,
                secure payment, official distributor stock.
              </p>
            </div>
            <button className="btn btn-red btn-lg" onClick={buyNow}>
              Buy now <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Sticky buy bar ── */}
      <div className={`lp-buybar ${showBar ? 'show' : ''}`}>
        <div className="wrap lp-buybar-inner">
          <div className="lp-buybar-info">
            <b>{product.name} {product.grade}</b>
            <span>{selected.label} · {rm(selected.total)}{selected.freeDelivery ? ' · Free delivery' : ''}</span>
          </div>
          <button className="btn btn-primary" onClick={buyNow}>Buy now</button>
        </div>
      </div>
    </div>
  )
}
