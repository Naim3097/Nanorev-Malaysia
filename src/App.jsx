import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import CartDrawer from './components/CartDrawer.jsx'
import Home from './pages/Home.jsx'
import Shop from './pages/Shop.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import Landing from './pages/Landing.jsx'
import SalesLanding from './pages/SalesLanding.jsx'
import Admin from './pages/Admin.jsx'
import Builder from './pages/Builder.jsx'
import Cart from './pages/Cart.jsx'
import Checkout from './pages/Checkout.jsx'
import Payment from './pages/Payment.jsx'
import OrderSuccess from './pages/OrderSuccess.jsx'

function ScrollToTop() {
  const { pathname } = useLocation()
  // block body (not an implicit return): an effect's return value is used as
  // its cleanup, and window.scrollTo can return a non-function (e.g. a Promise
  // when an extension patches it), which crashes React with "destroy is not a
  // function". Returning nothing keeps ScrollToTop safe in any environment.
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  // /l/* landing pages are closed funnels: no navbar, drawer or footer —
  // the only exits are checkout and WhatsApp. /admin is chrome-less too.
  const { pathname } = useLocation()
  const isFunnel = pathname.startsWith('/l/') || pathname.startsWith('/admin')
  return (
    <div className="app">
      <ScrollToTop />
      {!isFunnel && <Navbar />}
      {!isFunnel && <CartDrawer />}
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/shop/:catId" element={<Shop />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/landing/:id" element={<Landing />} />
          <Route path="/l/:slug" element={<SalesLanding />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/builder/:id" element={<Builder />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/order/success" element={<OrderSuccess />} />
        </Routes>
      </main>
      {!isFunnel && <Footer />}
    </div>
  )
}
