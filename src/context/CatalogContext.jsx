import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { products as staticProducts } from '../data/products'
import { categories as staticCategories } from '../data/categories'
import { promoNav as staticNav } from '../data/landingPages'
import { api } from '../api/client'

// Catalog source of truth: starts from the bundled static data (instant
// paint, works with the API down), then refreshes from the backend so
// admin edits — prices, stock, new products — reach the storefront live.
const CatalogContext = createContext(null)

export function CatalogProvider({ children }) {
  const [products, setProducts] = useState(staticProducts)
  const [categories, setCategories] = useState(staticCategories)
  const [nav, setNav] = useState(staticNav) // Promosi menu — pages created in admin appear here

  useEffect(() => {
    api('/products').then((d) => Array.isArray(d) && d.length && setProducts(d)).catch(() => {})
    api('/categories').then((d) => Array.isArray(d) && d.length && setCategories(d)).catch(() => {})
    api('/nav').then((d) => Array.isArray(d) && d.length && setNav(d)).catch(() => {})
  }, [])

  const value = useMemo(
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
