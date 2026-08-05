'use client'

import { useRouter } from 'next/navigation'
import { Minus, Plus, ShoppingCart, X } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { rm } from '@/utils/format'
import { FREE_DELIVERY_THRESHOLD } from '@/utils/pricing'
import ProductImage from './ProductImage'

export default function CartDrawer() {
  const { items, subtotal, count, drawerOpen, closeDrawer, setQty, remove } = useCart()
  const router = useRouter()

  const go = (path: string) => {
    closeDrawer()
    router.push(path)
  }

  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal)

  return (
    <>
      <div className={`drawer-overlay ${drawerOpen ? 'open' : ''}`} onClick={closeDrawer} />
      <aside className={`drawer ${drawerOpen ? 'open' : ''}`} aria-hidden={!drawerOpen}>
        <div className="drawer-head">
          <h3>Your Cart {count > 0 && `· ${count}`}</h3>
          <button className="icon-btn" onClick={closeDrawer} aria-label="Close cart"><X size={20} /></button>
        </div>

        {items.length === 0 ? (
          <div className="drawer-body">
            <div className="drawer-empty">
              <div className="big"><ShoppingCart size={40} strokeWidth={1.4} /></div>
              <h4>Your cart is empty</h4>
              <p style={{ fontSize: '0.86rem' }}>Add lubricants to get started.</p>
              <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => go('/shop')}>Browse products</button>
            </div>
          </div>
        ) : (
          <>
            <div className="drawer-body">
              {remaining > 0 ? (
                <div className="note brand">Add {rm(remaining)} more for free delivery</div>
              ) : (
                <div className="note ok">You&apos;ve unlocked free delivery</div>
              )}

              {items.map((i) => (
                <div className="line-item" key={i.id}>
                  <div className="line-thumb"><ProductImage product={i} variant="mini" /></div>
                  <div className="line-info">
                    <h5>{i.name} {i.grade}</h5>
                    <span className="u">{i.volume} · {i.base}</span>
                    <div className="p">{rm(i.price * i.qty)}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <div className="qty-mini">
                      <button onClick={() => setQty(i.id, i.qty - 1)} aria-label="Decrease"><Minus size={14} /></button>
                      <span>{i.qty}</span>
                      <button onClick={() => setQty(i.id, i.qty + 1)} aria-label="Increase"><Plus size={14} /></button>
                    </div>
                    <button className="link-remove" onClick={() => remove(i.id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="drawer-foot">
              <div className="summary-row total" style={{ border: 'none', paddingTop: 0, marginBottom: 14 }}>
                <span>Subtotal</span>
                <span>{rm(subtotal)}</span>
              </div>
              <button className="btn btn-primary btn-block btn-lg" onClick={() => go('/checkout')}>
                <ShoppingCart size={18} /> Checkout · {rm(subtotal)}
              </button>
              <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={() => go('/cart')}>View full cart</button>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
