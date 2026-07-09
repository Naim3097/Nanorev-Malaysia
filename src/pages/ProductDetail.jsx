import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Plus, Minus, ShoppingCart, Truck, Store } from 'lucide-react'
import { SITE_URL } from '../data/company'
import { useCatalog } from '../context/CatalogContext'
import { useCart } from '../context/CartContext'
import { rm } from '../utils/format'
import ProductCard from '../components/ProductCard'
import ProductImage from '../components/ProductImage'
import { useSeo } from '../utils/useSeo'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { productById, productsByCat, categoryById } = useCatalog()
  const product = productById(id)
  const { add } = useCart()
  const [qty, setQty] = useState(1)

  const seoCat = product ? categoryById(product.cat) : null
  useSeo(product ? {
    title: `${product.name} ${product.grade} · ${product.volume} — ${seoCat.name} | NanoRev Malaysia`,
    description: `${product.name} ${product.grade} (${product.volume} · ${product.base} · ${product.spec}). Genuine NanoRev stock at ${rm(product.price)}. Same-day dispatch from Shah Alam, delivery across Malaysia.`,
    keywords: `${product.name}, ${product.grade}, ${seoCat.name}, ${product.base}, NanoRev, minyak enjin Malaysia, lubricant`,
    canonicalPath: `/product/${product.id}`,
    ogType: 'product',
    image: product.image ? `${SITE_URL}${product.image}` : undefined,
    jsonLd: [
      {
        '@type': 'Product',
        name: `${product.name} ${product.grade}`,
        description: `${product.volume} · ${product.base} · ${product.spec}`,
        ...(product.image ? { image: `${SITE_URL}${product.image}` } : {}),
        brand: { '@type': 'Brand', name: 'NanoRev' },
        offers: {
          '@type': 'Offer',
          url: `${SITE_URL}/product/${product.id}`,
          priceCurrency: 'MYR',
          price: product.price.toFixed(2),
          availability: 'https://schema.org/InStock',
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE_URL}/shop` },
          { '@type': 'ListItem', position: 3, name: seoCat.name, item: `${SITE_URL}/shop/${seoCat.id}` },
          { '@type': 'ListItem', position: 4, name: `${product.name} ${product.grade}` },
        ],
      },
    ],
  } : null, [id])

  if (!product) {
    return (
      <div className="wrap page">
        <div className="empty-state">
          <div className="big"><Store size={44} strokeWidth={1.4} /></div>
          <h2>Product not found</h2>
          <Link to="/shop" className="btn btn-primary">Back to shop</Link>
        </div>
      </div>
    )
  }

  const cat = categoryById(product.cat)
  const related = productsByCat(product.cat).filter((p) => p.id !== product.id).slice(0, 5)
  const outOfStock = product.stock !== undefined && product.stock <= 0

  const specs = [
    ['Viscosity grade', product.grade],
    ['Volume', product.volume],
    ['Base oil', product.base],
    ['Specification', product.spec],
    ['Application', cat.name],
  ]

  return (
    <div className="wrap page">
      <div className="breadcrumb">
        <Link to="/">Home</Link> <span>/</span>
        <Link to="/shop">Shop</Link> <span>/</span>
        <Link to={`/shop/${cat.id}`}>{cat.name}</Link> <span>/</span>
        <span style={{ color: 'var(--ink)' }}>{product.name} {product.grade}</span>
      </div>

      <div className="pd">
        <div className="pd-image"><ProductImage product={product} sizes="(max-width: 900px) 360px, 540px" /></div>
        <div className="pd-info">
          <span className="eyebrow">{cat.name} · {product.spec}</span>
          <h1>{product.name} {product.grade}</h1>
          <div className="pd-price">{rm(product.price)}</div>

          <div className="pd-meta">
            <span className="chip"><b>Grade</b> {product.grade}</span>
            <span className="chip"><b>Volume</b> {product.volume}</span>
            <span className="chip"><b>Base</b> {product.base}</span>
          </div>

          <div className="pd-actions">
            <div className="qty-stepper">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease"><Minus size={18} /></button>
              <span>{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} aria-label="Increase"><Plus size={18} /></button>
            </div>
            <button className="btn btn-primary btn-lg" disabled={outOfStock} onClick={() => add(product, qty)}>
              <ShoppingCart size={18} /> {outOfStock ? 'Out of stock' : <>Add to cart · {rm(product.price * qty)}</>}
            </button>
          </div>
          <button className="btn btn-dark btn-lg btn-block" disabled={outOfStock} onClick={() => { add(product, qty); navigate('/checkout') }}>
            {outOfStock ? 'Restocking soon' : 'Buy now'}
          </button>

          <div style={{ display: 'flex', gap: 18, marginTop: 22, color: 'var(--muted)', fontSize: '0.86rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Truck size={16} /> Same-day dispatch</span>
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Store size={16} /> Warehouse pickup available</span>
          </div>

          <h3 style={{ margin: '26px 0 0', fontSize: '1rem' }}>Specifications</h3>
          <div className="spec-table">
            {specs.map(([k, v]) => (
              <div key={k}><span className="k">{k}</span><span className="v">{v}</span></div>
            ))}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section" style={{ paddingBottom: 0 }}>
          <div className="section-head"><h2>More in {cat.name}</h2></div>
          <div className="prod-grid">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  )
}
