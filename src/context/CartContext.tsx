'use client'

import { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import type { CartItem, Product } from '@/types'

const CartContext = createContext<CartValue | null>(null)
const STORAGE_KEY = 'nanorev.cart.v1'

interface CartValue {
  items: CartItem[]
  count: number
  subtotal: number
  drawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  add: (product: Product, qty?: number, opts?: { quiet?: boolean }) => void
  remove: (id: string) => void
  setQty: (id: string, qty: number) => void
  clear: () => void
}

type Action =
  | { type: 'add'; product: Product; qty?: number }
  | { type: 'remove'; id: string }
  | { type: 'setQty'; id: string; qty: number }
  | { type: 'clear' }
  | { type: 'hydrate'; items: CartItem[] }

function reducer(state: CartItem[], action: Action): CartItem[] {
  switch (action.type) {
    case 'hydrate':
      return action.items
    case 'add': {
      const found = state.find((i) => i.id === action.product.id)
      if (found) {
        return state.map((i) =>
          i.id === action.product.id ? { ...i, qty: i.qty + (action.qty || 1) } : i,
        )
      }
      return [...state, { ...action.product, qty: action.qty || 1 }]
    }
    case 'remove':
      return state.filter((i) => i.id !== action.id)
    case 'setQty':
      return state
        .map((i) => (i.id === action.id ? { ...i, qty: Math.max(0, action.qty) } : i))
        .filter((i) => i.qty > 0)
    case 'clear':
      return []
    default:
      return state
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Starts empty and hydrates from localStorage in an effect: reading storage
  // during render would make the server and client markup disagree.
  const [items, dispatch] = useReducer(reducer, [] as CartItem[])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) dispatch({ type: 'hydrate', items: JSON.parse(raw) as CartItem[] })
    } catch {
      /* corrupt or unavailable storage — start with an empty cart */
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    // don't persist the empty initial state over a real saved cart
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items, loaded])

  const value = useMemo<CartValue>(() => {
    const count = items.reduce((n, i) => n + i.qty, 0)
    const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0)
    return {
      items,
      count,
      subtotal,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      add: (product, qty, opts) => {
        dispatch({ type: 'add', product, qty })
        if (!opts?.quiet) setDrawerOpen(true)
      },
      remove: (id) => dispatch({ type: 'remove', id }),
      setQty: (id, qty) => dispatch({ type: 'setQty', id, qty }),
      clear: () => dispatch({ type: 'clear' }),
    }
  }, [items, drawerOpen])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
