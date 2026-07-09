import { Link } from 'react-router-dom'
import { company, locations } from '../data/company'
import { useCatalog } from '../context/CatalogContext'

export default function Footer() {
  const { categories, nav: promoNav } = useCatalog()
  return (
    <footer className="footer">
      <div className="wrap footer-top">
        <div>
          <div className="logo">
            <span className="word">NANOREV</span>
            <span className="slashes"><i /><i /></span>
          </div>
          <p className="desc">
            {company.legal}. Nano-technology engine oils, motorcycle &amp; diesel lubricants, gear oils, grease and
            additives — supplied to workshops, fleets and dealers across Malaysia.
          </p>
        </div>

        <div>
          <h5>Products</h5>
          <ul>
            {categories.map((c) => (
              <li key={c.id}><Link to={`/shop/${c.id}`}>{c.name}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h5>Promosi</h5>
          <ul>
            {promoNav.map((l) => (
              <li key={l.slug}><Link to={`/l/${l.slug}`}>{l.label}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h5>Company</h5>
          <ul>
            <li><a href="#about">About NanoRev</a></li>
            <li><a href="#dealer">Become a Dealer</a></li>
            <li><a href="#tech">Technical Data Sheets</a></li>
            <li><a href="#warranty">Warranty</a></li>
            <li><a href="#contact">Contact & Support</a></li>
          </ul>
        </div>

        <div>
          <h5>Locations</h5>
          {locations.map((l) => (
            <div className="loc-mini" key={l.id}>
              <div className="bn">{l.name}</div>
              <div className="ba">{l.address}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="wrap footer-bot">
        <span>© 2026 {company.legal}. All rights reserved.</span>
        <span>{company.tagline} · Made in Malaysia 🇲🇾</span>
      </div>
    </footer>
  )
}
