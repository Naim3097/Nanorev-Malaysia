'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import ProductImage from '@/components/ProductImage'
import { useCart } from '@/context/CartContext'
import { rm } from '@/utils/format'
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD } from '@/utils/pricing'

export default function CartView() {
  const { items, subtotal, setQty, remove } = useCart()
  const router = useRouter()

  if (items.length === 0) {
    return (
      <div className="wrap page">
        <div className="empty-state">
          <div className="big"><ShoppingCart size={44} strokeWidth={1.4} /></div>
          <h2>Your cart is empty</h2>
          <p>Browse the range and add some lubricants.</p>
          <Link href="/shop" className="btn btn-primary btn-lg">Start shopping</Link>
        </div>
      </div>
    )
  }

  const delivery = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE
  const total = subtotal + delivery

  return (
    <div className="wrap page">
      <Link href="/shop" className="breadcrumb" style={{ display: 'inline-flex' }}>
        <ArrowLeft size={16} /> Continue shopping
      </Link>
      <h1 className="page-title">Your cart</h1>
      <p className="page-sub">{items.length} item{items.length !== 1 ? 's' : ''} in your basket</p>

      <div className="checkout-layout">
        <div>
          <div className="panel" style={{ padding: 0 }}>
            {items.map((i, idx) => (
              <div
                className="line-item"
                key={i.id}
                style={{ padding: '18px 24px', borderBottom: idx === items.length - 1 ? 'none' : '1px solid var(--line)' }}
              >
                <div className="line-thumb" style={{ width: 64, height: 64 }}><ProductImage product={i} variant="mini" /></div>
                <div className="line-info">
                  <h5 style={{ fontSize: '1rem' }}>{i.name} {i.grade}</h5>
                  <span className="u">{i.volume} · {i.base} · {i.spec}</span>
                  <div className="p">{rm(i.price)} each</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, justifyContent: 'space-between' }}>
                  <div className="qty-mini">
                    <button onClick={() => setQty(i.id, i.qty - 1)} aria-label="Decrease"><Minus size={15} /></button>
                    <span>{i.qty}</span>
                    <button onClick={() => setQty(i.id, i.qty + 1)} aria-label="Increase"><Plus size={15} /></button>
                  </div>
                  <div style={{ fontWeight: 800 }}>{rm(i.price * i.qty)}</div>
                  <button className="icon-btn" onClick={() => remove(i.id)} aria-label="Remove" style={{ color: 'var(--danger)' }}>
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="summary-card panel">
          <h3>Order summary</h3>
          <div style={{ margin: '18px 0' }}>
            <div className="summary-row"><span>Subtotal</span><span>{rm(subtotal)}</span></div>
            <div className="summary-row">
              <span>Delivery</span>
              <span>{delivery === 0 ? <b style={{ color: 'var(--green)' }}>FREE</b> : rm(delivery)}</span>
            </div>
            <div className="summary-row total"><span>Total</span><span>{rm(total)}</span></div>
          </div>
          {delivery > 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: -4 }}>
              Add {rm(FREE_DELIVERY_THRESHOLD - subtotal)} more to get free delivery.
            </p>
          )}
          <button className="btn btn-primary btn-block btn-lg" onClick={() => router.push('/checkout')}>Proceed to checkout</button>
        </div>
      </div>
    </div>
  )
}
