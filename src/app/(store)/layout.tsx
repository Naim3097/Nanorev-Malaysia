import CartDrawer from '@/components/CartDrawer'
import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'

// The storefront chrome. /l/* funnels and /admin live in the (funnel) group
// and deliberately render none of this.
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <Navbar />
      <CartDrawer />
      <main className="app-main">{children}</main>
      <Footer />
    </div>
  )
}
