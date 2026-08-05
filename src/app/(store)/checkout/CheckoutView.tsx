'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Building2, Store, Truck, User } from 'lucide-react'
import OrderSummary from '@/components/OrderSummary'
import { useCart } from '@/context/CartContext'
import { useCheckout } from '@/context/CheckoutContext'
import { locations } from '@/data/company'
import type { CheckoutDetails } from '@/types'

type Errors = Partial<Record<keyof CheckoutDetails, string>>

export default function CheckoutView() {
  const { items } = useCart()
  const { details, update } = useCheckout()
  const router = useRouter()
  const [errors, setErrors] = useState<Errors>({})

  if (items.length === 0) {
    return (
      <div className="wrap page">
        <div className="empty-state">
          <div className="big"><Store size={44} strokeWidth={1.4} /></div>
          <h2>Nothing to check out</h2>
          <Link href="/shop" className="btn btn-primary">Browse products</Link>
        </div>
      </div>
    )
  }

  const validate = () => {
    const e: Errors = {}
    if (!details.name.trim()) e.name = 'Please enter your name'
    if (details.account === 'trade' && !details.company.trim()) e.company = 'Business name required for trade account'
    if (!/^(\+?6?0)\d{8,10}$/.test(details.phone.replace(/[\s-]/g, ''))) e.phone = 'Enter a valid MY phone number'
    if (!/^\S+@\S+\.\S+$/.test(details.email)) e.email = 'Enter a valid email'
    if (details.mode === 'delivery') {
      if (!details.address.trim()) e.address = 'Delivery address required'
      if (!/^\d{5}$/.test(details.postcode)) e.postcode = 'Enter a 5-digit postcode'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => { if (validate()) router.push('/payment') }
  const set =
    (k: keyof CheckoutDetails) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      update({ [k]: e.target.value } as Partial<CheckoutDetails>)

  return (
    <div className="wrap page">
      <Link href="/cart" className="breadcrumb" style={{ display: 'inline-flex' }}>
        <ArrowLeft size={16} /> Back to cart
      </Link>
      <h1 className="page-title">Checkout</h1>
      <p className="page-sub">Step 1 of 2 · Delivery details</p>

      <div className="checkout-layout">
        <div>
          {/* account type */}
          <div className="panel">
            <h3>Account type</h3>
            <p className="hint">Trade accounts unlock dealer &amp; workshop pricing on bulk orders.</p>
            <div className="toggle-row">
              <div className={`toggle ${details.account === 'personal' ? 'active' : ''}`} onClick={() => update({ account: 'personal' })}>
                <div className="t"><User size={18} /> Personal</div>
                <div className="d">Retail order</div>
              </div>
              <div className={`toggle ${details.account === 'trade' ? 'active' : ''}`} onClick={() => update({ account: 'trade' })}>
                <div className="t"><Building2 size={18} /> Trade / Workshop</div>
                <div className="d">Dealer pricing</div>
              </div>
            </div>
            {details.account === 'trade' && (
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Business name</label>
                <input className={errors.company ? 'err' : ''} value={details.company} onChange={set('company')} placeholder="e.g. Speedworks Auto Sdn Bhd" />
                {errors.company && <div className="msg">{errors.company}</div>}
              </div>
            )}
          </div>

          {/* fulfilment */}
          <div className="panel">
            <h3>Fulfilment</h3>
            <p className="hint">Delivery to your address, or collect from a NanoRev location.</p>
            <div className="toggle-row">
              <div className={`toggle ${details.mode === 'delivery' ? 'active' : ''}`} onClick={() => update({ mode: 'delivery' })}>
                <div className="t"><Truck size={18} /> Delivery</div>
                <div className="d">Ships nationwide</div>
              </div>
              <div className={`toggle ${details.mode === 'pickup' ? 'active' : ''}`} onClick={() => update({ mode: 'pickup' })}>
                <div className="t"><Store size={18} /> Pickup</div>
                <div className="d">Collect in-store · free</div>
              </div>
            </div>
            <div className="field">
              <label>{details.mode === 'pickup' ? 'Pickup location' : 'Dispatch from'}</label>
              <select value={details.locationId} onChange={set('locationId')}>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>

          {/* contact */}
          <div className="panel">
            <h3>Contact</h3>
            <p className="hint">We&apos;ll send order updates here.</p>
            <div className="field">
              <label>Full name</label>
              <input className={errors.name ? 'err' : ''} value={details.name} onChange={set('name')} placeholder="e.g. Imran Hakimi" />
              {errors.name && <div className="msg">{errors.name}</div>}
            </div>
            <div className="grid-2">
              <div className="field">
                <label>Phone</label>
                <input className={errors.phone ? 'err' : ''} value={details.phone} onChange={set('phone')} placeholder="012-345 6789" />
                {errors.phone && <div className="msg">{errors.phone}</div>}
              </div>
              <div className="field">
                <label>Email</label>
                <input className={errors.email ? 'err' : ''} value={details.email} onChange={set('email')} placeholder="you@email.com" />
                {errors.email && <div className="msg">{errors.email}</div>}
              </div>
            </div>
          </div>

          {/* address */}
          {details.mode === 'delivery' && (
            <div className="panel">
              <h3>Delivery address</h3>
              <div className="field">
                <label>Street address</label>
                <input className={errors.address ? 'err' : ''} value={details.address} onChange={set('address')} placeholder="No. 12, Jalan Industri 3" />
                {errors.address && <div className="msg">{errors.address}</div>}
              </div>
              <div className="grid-2">
                <div className="field">
                  <label>Unit / Floor <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input value={details.unit} onChange={set('unit')} placeholder="Lot 4, Block B" />
                </div>
                <div className="field">
                  <label>Postcode</label>
                  <input className={errors.postcode ? 'err' : ''} value={details.postcode} onChange={set('postcode')} placeholder="40000" maxLength={5} />
                  {errors.postcode && <div className="msg">{errors.postcode}</div>}
                </div>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Order note <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
                <textarea value={details.note} onChange={set('note')} placeholder="Delivery instructions, PO number…" />
              </div>
            </div>
          )}
        </div>

        <OrderSummary
          mode={details.mode}
          cta={
            <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 8 }} onClick={next}>
              Continue to payment <ArrowRight size={18} />
            </button>
          }
        />
      </div>
    </div>
  )
}
