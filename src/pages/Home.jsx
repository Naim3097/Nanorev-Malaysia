import { Link } from 'react-router-dom'
import { Truck, ShieldCheck, FlaskConical, BadgeCheck, MapPin, Clock, ArrowRight } from 'lucide-react'
import { locations, dealerNote, company, SITE_URL } from '../data/company'
import { useCatalog } from '../context/CatalogContext'
import ProductCard from '../components/ProductCard'
import { rm } from '../utils/format'
import { useSeo } from '../utils/useSeo'

export default function Home() {
  const { products, productsByCat, categories } = useCatalog()
  useSeo({
    title: 'NanoRev Malaysia — Engine Oil, Lubricants & Nano Additives | Nano Revolution Autolube',
    description:
      'Official NanoRev store — fully synthetic engine oil, motorcycle & diesel lubricants, gear oil, coolant and nano additives. Dealer & workshop pricing. Same-day dispatch from Shah Alam across Malaysia.',
    keywords:
      'minyak enjin, engine oil Malaysia, lubricant distributor Malaysia, minyak hitam, aditif enjin, workshop supplier, dealer minyak enjin, NanoRev',
    canonicalPath: '/',
    image: `${SITE_URL}/nanorev-logo.png`,
    jsonLd: [
      {
        '@type': 'Organization',
        name: company.name,
        legalName: company.legal,
        url: SITE_URL,
        logo: `${SITE_URL}/nanorev-logo.png`,
        address: { '@type': 'PostalAddress', addressLocality: 'Shah Alam', addressRegion: 'Selangor', addressCountry: 'MY' },
      },
      {
        '@type': 'WebSite',
        name: company.name,
        url: SITE_URL,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/shop?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  }, [])

  const bestsellers = products.filter((p) => p.badge === 'bestseller').slice(0, 5)
  const engine = productsByCat('engine-oil').slice(0, 5)
  const featured = bestsellers.slice(0, 3)

  return (
    <div>
      {/* Hero */}
      <section className="hero">
        <div className="wrap hero-inner">
          <div>
            <span className="slashes lg"><i /><i /></span>
            <h1>Engineered<br />to <span className="hl">outlast</span></h1>
            <p>
              Nano Revolution Autolube — fully synthetic engine oils and precision lubricants for cars, bikes,
              trucks and industry. Trusted by workshops and fleets across Malaysia.
            </p>
            <div className="hero-cta">
              <Link to="/shop" className="btn btn-primary btn-lg">Shop lubricants <ArrowRight size={18} /></Link>
              <a href="#dealer" className="btn btn-ghost-light btn-lg">Become a dealer</a>
            </div>
            <div className="hero-meta">
              <span>Fully synthetic range</span><span className="dot" />
              <span>API / JASO certified</span><span className="dot" />
              <span>Same-day dispatch</span>
            </div>
          </div>

          <div className="hero-panel">
            <div className="hero-panel-head">
              <span className="t">Top sellers</span>
              <span className="slashes"><i /><i /></span>
            </div>
            {featured.map((p) => (
              <Link to={`/product/${p.id}`} className="hero-row" key={p.id}>
                <span className="r-grade">{p.grade}</span>
                <div style={{ flex: 1, marginLeft: 12 }}>
                  <div className="r-name">{p.name}</div>
                  <div className="r-sub">{p.volume} · {p.base}</div>
                </div>
                <div className="r-price">{rm(p.price)}</div>
              </Link>
            ))}
            <Link to="/shop" className="btn btn-primary">Shop all products</Link>
          </div>
        </div>
      </section>

      {/* Applications / categories */}
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">Shop by application</span>
              <h2>Find the right lubricant</h2>
            </div>
            <Link to="/shop" className="link">View all →</Link>
          </div>
          <div className="cat-grid">
            {categories.map((c) => (
              <Link to={`/shop/${c.id}`} className="cat-card" key={c.id}>
                <span className="tag">{c.tag}</span>
                <h4>{c.name}</h4>
                <p>{c.blurb}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Bestsellers */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">Workshop favourites</span>
              <h2>Bestsellers</h2>
            </div>
            <Link to="/shop" className="link">See more →</Link>
          </div>
          <div className="prod-grid">
            {bestsellers.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="value-grid">
            <div className="value-card">
              <div className="ic"><FlaskConical size={22} strokeWidth={1.7} /></div>
              <h4>Nano-tech formula</h4>
              <p>Advanced additives that reduce friction, heat and wear.</p>
            </div>
            <div className="value-card">
              <div className="ic"><BadgeCheck size={22} strokeWidth={1.7} /></div>
              <h4>Certified specs</h4>
              <p>Meets API, ACEA and JASO standards across the range.</p>
            </div>
            <div className="value-card">
              <div className="ic"><Truck size={22} strokeWidth={1.7} /></div>
              <h4>Fast dispatch</h4>
              <p>Same-day dispatch on stocked items nationwide.</p>
            </div>
            <div className="value-card">
              <div className="ic"><ShieldCheck size={22} strokeWidth={1.7} /></div>
              <h4>Genuine product</h4>
              <p>Sealed, batch-coded and warranty-backed lubricants.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Engine oil range */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">Passenger car</span>
              <h2>Engine oil range</h2>
            </div>
            <Link to="/shop/engine-oil" className="link">See more →</Link>
          </div>
          <div className="prod-grid">
            {engine.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      {/* Dealer band */}
      <section className="section" id="dealer" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="dealer">
            <div>
              <h3>Run a workshop or fleet?</h3>
              <p>{dealerNote} Volume tiers, technical support and consignment stock for verified trade partners.</p>
            </div>
            <Link to="/shop" className="btn btn-red btn-lg">Open a trade account</Link>
          </div>
        </div>
      </section>

      {/* Locations */}
      <section className="section" id="locations" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">Stock & pickup</span>
              <h2>Our locations</h2>
            </div>
          </div>
          <div className="loc-grid">
            {locations.map((l) => (
              <div className="loc-card" key={l.id}>
                <div className="pin"><MapPin size={20} strokeWidth={1.7} /></div>
                <div>
                  <h4>{l.name}</h4>
                  <div className="addr">{l.address}</div>
                  <div className="meta">
                    <span><Clock size={14} strokeWidth={1.7} /> {l.hours}</span>
                    <span><Truck size={14} strokeWidth={1.7} /> {l.eta}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
