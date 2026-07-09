import {
  BadgeCheck, ChevronRight, Droplets, Flame, Gauge, Lock, MessageCircle,
  ShieldCheck, ShoppingCart, Star, ThermometerSun, Truck, Volume2, Zap,
} from 'lucide-react'
import ProductImage from '../components/ProductImage'
import { rm } from '../utils/format'

// Icon names usable from page configs — configs stay pure data.
const ICONS = {
  badge: BadgeCheck, drops: Droplets, flame: Flame, gauge: Gauge, heat: ThermometerSun,
  lock: Lock, noise: Volume2, shield: ShieldCheck, star: Star, truck: Truck, zap: Zap,
}
const Icon = ({ name, ...rest }) => {
  const C = ICONS[name] || BadgeCheck
  return <C {...rest} />
}

// Every section receives (props, ctx): props is its config block,
// ctx is shared page state — product, workshop, qty, packs, buyNow, waHref.

function Announce({ props }) {
  return <div className="lp-announce">{props.text}</div>
}

function Hero({ props, ctx }) {
  const { product, buyNow, waHref, buyLabel } = ctx
  return (
    <section className="lp-hero">
      <div className="wrap lp-hero-inner">
        <div>
          <div className="lp-flag">
            <span className="slashes"><i /><i /></span>
            {props.flag}
          </div>
          <h1>{props.headline}</h1>
          <p className="lp-sub">{props.sub}</p>
          <ul className="lp-bullets">
            {props.bullets.map((b) => (
              <li key={b}><BadgeCheck size={18} /> {b}</li>
            ))}
          </ul>
          <div className="lp-price-row">
            <span className="lp-price">{rm(product.price)}</span>
            <span className="lp-price-unit">/ {product.volume} · {props.priceNote}</span>
          </div>
          <div className="lp-cta">
            <button className="btn btn-red btn-lg" onClick={buyNow}>
              {buyLabel} <ChevronRight size={18} />
            </button>
            {waHref && props.waLabel && (
              <a className="btn btn-wa btn-lg" href={waHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={18} /> {props.waLabel}
              </a>
            )}
          </div>
          <div className="lp-hero-meta">
            {props.meta.map((m) => (
              <span key={m.text}><Icon name={m.icon} size={15} /> {m.text}</span>
            ))}
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
  )
}

function Trust({ props }) {
  return (
    <div className="lp-trust">
      <div className="wrap lp-trust-inner">
        {props.items.map((t) => (
          <span key={t.text}><Icon name={t.icon} size={17} /> {t.text}</span>
        ))}
      </div>
    </div>
  )
}

function Pains({ props }) {
  return (
    <section className="section">
      <div className="wrap">
        <div className="lp-center">
          <span className="eyebrow">{props.eyebrow}</span>
          <h2 className="lp-h2">{props.title}</h2>
          {props.intro && <p className="lp-note-sub">{props.intro}</p>}
        </div>
        <div className="lp-pain-grid">
          {props.items.map((p) => (
            <div className="lp-pain" key={p.title}>
              <div className="ic"><Icon name={p.icon} size={22} /></div>
              <h4>{p.title}</h4>
              <p>{p.text}</p>
            </div>
          ))}
        </div>
        {props.outro && <p className="lp-pain-outro">{props.outro}</p>}
      </div>
    </section>
  )
}

function Benefits({ props }) {
  return (
    <section className="section">
      <div className="wrap">
        <div className="lp-center">
          <span className="eyebrow">{props.eyebrow}</span>
          <h2 className="lp-h2">{props.title}</h2>
        </div>
        <div className="lp-benefit-grid">
          {props.items.map((b) => (
            <div className="lp-benefit" key={b.title}>
              <div className="ic"><Icon name={b.icon} size={22} /></div>
              <h4>{b.title}</h4>
              <p>{b.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Packs({ props, ctx }) {
  const { product, qty, setQty, packs, selected, buyNow } = ctx
  return (
    <section className="section lp-offer">
      <div className="wrap">
        <div className="lp-center">
          <span className="eyebrow">{props.eyebrow}</span>
          <h2 className="lp-h2">{props.title}</h2>
          <p className="lp-note-sub">{props.sub}</p>
        </div>
        <div className="lp-pack-grid">
          {packs.map((o) => (
            <button
              key={o.qty}
              className={`lp-pack ${qty === o.qty ? 'active' : ''}`}
              onClick={() => setQty(o.qty)}
            >
              {o.highlight && <span className="lp-pack-tag">{o.note}</span>}
              <span className="lp-pack-qty">{o.qty} {props.unitLabel}</span>
              <span className="lp-pack-sub">{product.volume} × {o.qty}</span>
              <span className="lp-pack-price">{rm(o.total)}</span>
              <span className={`lp-pack-ship ${o.freeDelivery ? 'ok' : ''}`}>
                {o.freeDelivery ? props.freeShip : props.paidShip}
              </span>
            </button>
          ))}
        </div>
        <div className="lp-pack-cta">
          <button className="btn btn-primary btn-lg" onClick={buyNow}>
            <ShoppingCart size={18} /> {props.ctaPrefix} {selected.qty} {props.unitLabel} · {rm(selected.total)}
          </button>
        </div>
      </div>
    </section>
  )
}

function Steps({ props }) {
  return (
    <section className="section lp-steps-sec">
      <div className="wrap">
        <div className="lp-center">
          <span className="eyebrow">{props.eyebrow}</span>
          <h2 className="lp-h2">{props.title}</h2>
        </div>
        <div className="lp-step-grid">
          {props.items.map((s, i) => (
            <div className="lp-step" key={s.title}>
              <span className="n">{i + 1}</span>
              <h4>{s.title}</h4>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Testimonials({ props }) {
  return (
    <section className="section lp-quotes">
      <div className="wrap">
        <div className="lp-center">
          <span className="eyebrow">{props.eyebrow}</span>
          <h2 className="lp-h2">{props.title}</h2>
        </div>
        <div className="lp-quote-grid">
          {props.quotes.map((t) => (
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
  )
}

function Guarantee({ props }) {
  return (
    <section className="section">
      <div className="wrap">
        <div className="lp-center">
          <span className="eyebrow">{props.eyebrow}</span>
          <h2 className="lp-h2">{props.title}</h2>
        </div>
        <div className="value-grid lp-guarantee-grid">
          {props.items.map((g) => (
            <div className="value-card" key={g.title}>
              <div className="ic"><Icon name={g.icon} size={22} strokeWidth={1.7} /></div>
              <h4>{g.title}</h4>
              <p>{g.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Specs({ props, ctx }) {
  const { product } = ctx
  // Rows come from the page config; legacy labels shape still supported.
  const L = props.labels
  const rows = props.rows || [
    [L.product, `${product.name} ${product.grade}`],
    [L.grade, product.grade],
    [L.volume, product.volume],
    [L.base, product.base],
    [L.spec, product.spec],
    [L.application, props.application],
  ]
  return (
    <section className="section">
      <div className="wrap lp-spec-wrap">
        <div>
          <span className="eyebrow">{props.eyebrow}</span>
          <h2 className="lp-h2" style={{ textAlign: 'left' }}>{props.title}</h2>
          <p className="lp-note-sub" style={{ textAlign: 'left', margin: '8px 0 0' }}>{props.note}</p>
        </div>
        <div className="spec-table">
          {rows.map(([k, v]) => (
            <div key={k}><span className="k">{k}</span><span className="v">{v}</span></div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Faq({ props }) {
  return (
    <section className="section">
      <div className="wrap lp-faq-wrap">
        <div className="lp-center">
          <span className="eyebrow">{props.eyebrow}</span>
          <h2 className="lp-h2">{props.title}</h2>
        </div>
        {props.items.map((f) => (
          <details className="lp-faq" key={f.q}>
            <summary>{f.q}<ChevronRight size={17} className="chev" /></summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

function Cta({ props, ctx }) {
  const { product, buyNow, buyLabel } = ctx
  return (
    <section className="section lp-final">
      <div className="wrap">
        <div className="dealer">
          <div>
            <h3>{props.title}</h3>
            <p>
              {product.name} {product.grade} · {rm(product.price)} / {product.volume}. {props.text}
            </p>
          </div>
          <button className="btn btn-red btn-lg" onClick={buyNow}>
            {buyLabel} <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  )
}

export const SECTIONS = {
  announce: Announce,
  hero: Hero,
  trust: Trust,
  pains: Pains,
  benefits: Benefits,
  steps: Steps,
  packs: Packs,
  testimonials: Testimonials,
  guarantee: Guarantee,
  specs: Specs,
  faq: Faq,
  cta: Cta,
}
