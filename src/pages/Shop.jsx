import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { dealerNote, SITE_URL } from '../data/company'
import { useCatalog } from '../context/CatalogContext'
import ProductCard from '../components/ProductCard'
import { useSeo } from '../utils/useSeo'

const matches = (p, q) =>
  [p.name, p.grade, p.base, p.spec, p.volume].join(' ').toLowerCase().includes(q)

export default function Shop() {
  const { catId } = useParams()
  const { products, categories, categoryById } = useCatalog()
  const [searchParams] = useSearchParams()
  const q = (searchParams.get('q') || '').toLowerCase()
  const [sort, setSort] = useState('featured')

  const activeCat = catId ? categoryById(catId) : null

  const list = useMemo(() => {
    let l = products
    if (catId) l = l.filter((p) => p.cat === catId)
    if (q) l = l.filter((p) => matches(p, q))
    if (sort === 'low') l = [...l].sort((a, b) => a.price - b.price)
    if (sort === 'high') l = [...l].sort((a, b) => b.price - a.price)
    if (sort === 'name') l = [...l].sort((a, b) => a.name.localeCompare(b.name))
    return l
  }, [products, catId, q, sort])

  const counts = useMemo(() => {
    const m = {}
    for (const c of categories) m[c.id] = products.filter((p) => p.cat === c.id).length
    return m
  }, [products, categories])

  useSeo({
    title: activeCat
      ? `${activeCat.name} — Genuine NanoRev Stock | NanoRev Malaysia`
      : q
        ? `Search: ${q} | NanoRev Malaysia`
        : 'Shop All Products — Lubricants & Additives | NanoRev Malaysia',
    description: activeCat
      ? `${activeCat.name} for ${activeCat.blurb.toLowerCase()} — genuine NanoRev stock, dealer pricing on bulk orders, same-day dispatch from Shah Alam across Malaysia.`
      : 'Browse the full NanoRev range — engine oil, motorcycle & diesel lubricants, transmission fluid, grease, coolant and nano additives. Ships across Malaysia.',
    canonicalPath: activeCat ? `/shop/${activeCat.id}` : '/shop',
    // search-result views are thin/duplicate — keep them out of the index
    robots: q ? 'noindex, follow' : undefined,
    jsonLd: [{
      '@type': 'ItemList',
      name: activeCat ? activeCat.name : 'All products',
      itemListElement: list.slice(0, 20).map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: `${p.name} ${p.grade}`,
        url: `${SITE_URL}/product/${p.id}`,
      })),
    }],
  }, [catId, q, sort])

  return (
    <div className="wrap page">
      <div className="breadcrumb">
        <Link to="/">Home</Link> <span>/</span>
        <Link to="/shop">Shop</Link>
        {activeCat && <><span>/</span> <span style={{ color: 'var(--ink)' }}>{activeCat.name}</span></>}
      </div>

      <h1 className="page-title">{activeCat ? activeCat.name : q ? `Results for “${q}”` : 'All products'}</h1>
      <p className="page-sub">{activeCat ? activeCat.blurb : 'Lubricants, additives and consumables — ready to ship.'}</p>

      <div className="shop-layout">
        <aside>
          <div className="filter-card">
            <h4>Categories</h4>
            <div className="filter-list">
              <Link to="/shop" className={!catId ? 'active' : ''}>
                <span>All products</span><span className="n">{products.length}</span>
              </Link>
              {categories.map((c) => (
                <Link key={c.id} to={`/shop/${c.id}`} className={catId === c.id ? 'active' : ''}>
                  <span>{c.name}</span><span className="n">{counts[c.id]}</span>
                </Link>
              ))}
            </div>
          </div>
          <div className="note brand">{dealerNote}</div>
        </aside>

        <div>
          <div className="shop-toolbar">
            <span className="count">{list.length} item{list.length !== 1 ? 's' : ''}</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
              <option value="featured">Featured</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
              <option value="name">Name: A–Z</option>
            </select>
          </div>

          {list.length === 0 ? (
            <div className="empty-state">
              <div className="big"><Search size={44} strokeWidth={1.4} /></div>
              <h2>No products found</h2>
              <p>Try another category or search term.</p>
              <Link to="/shop" className="btn btn-primary">Browse all</Link>
            </div>
          ) : (
            <div className="shop-grid">
              {list.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
