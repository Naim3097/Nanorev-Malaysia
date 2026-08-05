'use client'

import {
  BadgeCheck, ChevronRight, Droplets, Flame, Gauge, Lock, MessageCircle,
  ShieldCheck, ShoppingCart, Star, ThermometerSun, Truck, Volume2, Zap,
} from 'lucide-react'
import ProductImage from '@/components/ProductImage'
import { rm } from '@/utils/format'
import type {
  AnnounceProps, BenefitsProps, CtaProps, FaqProps, GuaranteeProps, HeroProps, IconName,
  LandingPage, PacksProps, PainsProps, Product, Section, SectionType, SpecsProps, StepsProps,
  TestimonialsProps, TrustProps, Workshop,
} from '@/types'

// Icon names usable from page configs — configs stay pure data.
const ICONS: Record<IconName, typeof BadgeCheck> = {
  badge: BadgeCheck, drops: Droplets, flame: Flame, gauge: Gauge, heat: ThermometerSun,
  lock: Lock, noise: Volume2, shield: ShieldCheck, star: Star, truck: Truck, zap: Zap,
}
const Icon = ({ name, ...rest }: { name: IconName; size?: number; strokeWidth?: number }) => {
  const C = ICONS[name] || BadgeCheck
  return <C {...rest} />
}

/** One quantity option in the packs section, priced from the live catalogue. */
export interface Pack {
  qty: number
  note?: string
  highlight?: boolean
  total: number
  freeDelivery: boolean
}

/** Shared page state every section can read. */
export interface LandingCtx {
  product: Product
  page: LandingPage
  workshop: Workshop | null
  qty: number
  setQty: (n: number) => void
  packs: Pack[]
  selected: Pack
  buyNow: () => void
  waHref: string | null
  buyLabel: string
}

type SectionComponent<P> = (args: { props: P; ctx: LandingCtx }) => React.ReactNode

const Announce: SectionComponent<AnnounceProps> = ({ props }) => (
  <div className="lp-announce">{props.text}</div>
)

const Hero: SectionComponent<HeroProps> = ({ props, ctx }) => {
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

const Trust: SectionComponent<TrustProps> = ({ props }) => (
  <div className="lp-trust">
    <div className="wrap lp-trust-inner">
      {props.items.map((t) => (
        <span key={t.text}><Icon name={t.icon} size={17} /> {t.text}</span>
      ))}
    </div>
  </div>
)

const Pains: SectionComponent<PainsProps> = ({ props }) => (
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

const Benefits: SectionComponent<BenefitsProps> = ({ props }) => (
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

const Packs: SectionComponent<PacksProps> = ({ props, ctx }) => {
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

const Steps: SectionComponent<StepsProps> = ({ props }) => (
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

const Testimonials: SectionComponent<TestimonialsProps> = ({ props }) => (
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

const Guarantee: SectionComponent<GuaranteeProps> = ({ props }) => (
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

const Specs: SectionComponent<SpecsProps> = ({ props, ctx }) => {
  const { product } = ctx
  // Rows come from the page config; the legacy `labels` shape is still supported.
  const L = props.labels
  const rows: [string, string][] =
    props.rows ??
    (L
      ? [
          [L.product, `${product.name} ${product.grade}`],
          [L.grade, product.grade],
          [L.volume, product.volume],
          [L.base, product.base],
          [L.spec, product.spec],
          [L.application, props.application ?? ''],
        ]
      : [])
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

const Faq: SectionComponent<FaqProps> = ({ props }) => (
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

const Cta: SectionComponent<CtaProps> = ({ props, ctx }) => {
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

const SECTIONS = {
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
} satisfies { [K in SectionType]: SectionComponent<never> }

/**
 * Render one section of a page document. Unknown types return null, so a page
 * authored against a newer schema never breaks an older storefront.
 *
 * The cast is the single point where the Section union collapses: the lookup
 * has already matched `s.type` to its component, but TypeScript can't correlate
 * the two sides of an index like that.
 */
export function renderSection(s: Section, ctx: LandingCtx): React.ReactNode {
  const Component = SECTIONS[s.type] as SectionComponent<unknown> | undefined
  if (!Component) return null
  return <Component props={s.props} ctx={ctx} />
}
