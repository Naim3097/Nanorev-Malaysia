import type { Metadata } from 'next'
import CartView from './CartView'

export const metadata: Metadata = {
  title: 'Your Cart | NanoRev Malaysia',
  robots: { index: false, follow: false },
}

export default function CartPage() {
  return <CartView />
}
