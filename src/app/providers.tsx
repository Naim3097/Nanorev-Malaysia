'use client'

import { CartProvider } from '@/context/CartContext'
import { CatalogProvider } from '@/context/CatalogContext'
import { CheckoutProvider } from '@/context/CheckoutContext'

// Client state shared by the whole app. Kept in one component so the root
// layout stays a Server Component.
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CatalogProvider>
      <CartProvider>
        <CheckoutProvider>{children}</CheckoutProvider>
      </CartProvider>
    </CatalogProvider>
  )
}
