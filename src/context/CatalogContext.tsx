'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '@/api/client'
import { categories as staticCategories } from '@/data/categories'
import { promoNav as staticNav } from '@/data/landingPages'
import { products as staticProducts } from '@/data/products'
import type { Category, NavEntry, Product } from '@/types'

// Catalog source of truth: starts from the bundled static data (instant
// paint, works with the API down), then refreshes from the backend so
// admin edits — prices, stock, new products — reach the storefront live.
interface CatalogValue {
  products: Product[]
  categories: Category[]
  nav: NavEntry[]
  productById: (id: string) => Product | undefined
  productsByCat: (cat: string) => Product[]
  categoryById: (id: string) => Category | undefined
}

const CatalogContext = createContext<CatalogValue | null>(null)

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>(staticProducts)
  const [categories, setCategories] = useState<Category[]>(staticCategories)
  // Promosi menu — pages created in admin appear here
  const [nav, setNav] = useState<NavEntry[]>(staticNav)

  useEffect(() => {
    api<Product[]>('/products').then((d) => Array.isArray(d) && d.length && setProducts(d)).catch(() => {})
    api<Category[]>('/categories').then((d) => Array.isArray(d) && d.length && setCategories(d)).catch(() => {})
    api<NavEntry[]>('/nav').then((d) => Array.isArray(d) && d.length && setNav(d)).catch(() => {})
  }, [])

  const value = useMemo<CatalogValue>(
    () => ({
      products,
      categories,
      nav,
      productById: (id) => products.find((p) => p.id === id),
      productsByCat: (cat) => products.filter((p) => p.cat === cat),
      categoryById: (id) => categories.find((c) => c.id === id),
    }),
    [products, categories, nav],
  )

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider')
  return ctx
}
