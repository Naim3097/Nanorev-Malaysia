'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import ProductCard from '@/components/ProductCard'
import { useCatalog } from '@/context/CatalogContext'
import { dealerNote } from '@/data/company'
import type { Product } from '@/types'

const matches = (p: Product, q: string) =>
  [p.name, p.grade, p.base, p.spec, p.volume].join(' ').toLowerCase().includes(q)

type Sort = 'featured' | 'low' | 'high' | 'name'

export default function ShopView({ catId, q = '' }: { catId?: string; q?: string }) {
  const { products, categories, categoryById } = useCatalog()
  const [sort, setSort] = useState<Sort>('featured')
  const query = q.toLowerCase()

  const activeCat = catId ? categoryById(catId) : null

  const list = useMemo(() => {
    let l = products
    if (catId) l = l.filter((p) => p.cat === catId)
    if (query) l = l.filter((p) => matches(p, query))
    if (sort === 'low') l = [...l].sort((a, b) => a.price - b.price)
    if (sort === 'high') l = [...l].sort((a, b) => b.price - a.price)
    if (sort === 'name') l = [...l].sort((a, b) => a.name.localeCompare(b.name))
    return l
  }, [products, catId, query, sort])

  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of categories) m[c.id] = products.filter((p) => p.cat === c.id).length
    return m
  }, [products, categories])

  return (
    <div className="wrap page">
      <div className="breadcrumb">
        <Link href="/">Home</Link> <span>/</span>
        <Link href="/shop">Shop</Link>
        {activeCat && <><span>/</span> <span style={{ color: 'var(--ink)' }}>{activeCat.name}</span></>}
      </div>

      <h1 className="page-title">{activeCat ? activeCat.name : query ? `Results for “${q}”` : 'All products'}</h1>
      <p className="page-sub">{activeCat ? activeCat.blurb : 'Lubricants, additives and consumables — ready to ship.'}</p>

      <div className="shop-layout">
        <aside>
          <div className="filter-card">
            <h4>Categories</h4>
            <div className="filter-list">
              <Link href="/shop" className={!catId ? 'active' : ''}>
                <span>All products</span><span className="n">{products.length}</span>
              </Link>
              {categories.map((c) => (
                <Link key={c.id} href={`/shop/${c.id}`} className={catId === c.id ? 'active' : ''}>
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
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
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
              <Link href="/shop" className="btn btn-primary">Browse all</Link>
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
