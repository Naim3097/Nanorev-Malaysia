import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock, Loader2, Landmark, CreditCard, Smartphone, QrCode, Store } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useCheckout } from '../context/CheckoutContext'
import { paymentMethods, processPayment, GATEWAY } from '../utils/payment'
import { computeTotals } from '../utils/pricing'
import { rm, orderRef } from '../utils/format'
import { locations } from '../data/company'
import OrderSummary from '../components/OrderSummary'
import { useSeo } from '../utils/useSeo'
import { apiQuiet } from '../api/client'

const methodIcon = { fpx: Landmark, card: CreditCard, ewallet: Smartphone, qr: QrCode }

export default function Payment() {
  const { items, subtotal, clear } = useCart()
  const { details, setLastOrder } = useCheckout()
  const navigate = useNavigate()
  useSeo({ title: 'Payment | NanoRev Malaysia', robots: 'noindex, nofollow' }, [])

  const [methodId, setMethodId] = useState('fpx')
  const [bank, setBank] = useState('')
  const [wallet, setWallet] = useState('')
  const [card, setCard] = useState({ number: '', name: '', exp: '', cvv: '' })
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  if (items.length === 0) {
    return (
      <div className="wrap page">
        <div className="empty-state">
          <div className="big"><Store size={44} strokeWidth={1.4} /></div>
          <h2>Your cart is empty</h2>
          <Link to="/shop" className="btn btn-primary">Browse products</Link>
        </div>
      </div>
    )
  }

  const { total } = computeTotals(subtotal, details.mode)

  const formatCard = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
  const formatExp = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 4)
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
  }

  const canPay = () => {
    if (processing) return false
    if (methodId === 'fpx') return !!bank
    if (methodId === 'ewallet') return !!wallet
    if (methodId === 'qr') return true
    if (methodId === 'card') return card.number.replace(/\s/g, '').length === 16 && card.name.trim() && card.exp.length === 5 && card.cvv.length >= 3
    return false
  }

  const pay = async () => {
    setError('')
    setProcessing(true)
    const ref = orderRef(items.map((i) => i.id).join(''))
    try {
      const method = { id: methodId, bank, wallet, cardNumber: card.number }
      const result = await processPayment({ method, amount: total, ref })

      // record the order in the backend: inventory, attribution, commission.
      // fire-and-forget — bookkeeping must never block the buyer's receipt
      let attribution = null
      try { attribution = JSON.parse(localStorage.getItem('nanorev.aff.v1')) } catch { /* none */ }
      apiQuiet('/orders', {
        method: 'POST',
        body: {
          ref,
          items: items.map((i) => ({ id: i.id, qty: i.qty })),
          details,
          payment: { gateway: result.gateway, method: methodId, receiptId: result.receiptId, paidAt: result.paidAt },
          attribution,
        },
      })

      setLastOrder({
        ref: result.ref,
        receiptId: result.receiptId,
        items,
        totals: computeTotals(subtotal, details.mode),
        details,
        method: paymentMethods.find((m) => m.id === methodId)?.label,
        methodDetail: bank || wallet || (card.number ? `•••• ${card.number.replace(/\s/g, '').slice(-4)}` : ''),
        location: locations.find((l) => l.id === details.locationId),
        paidAt: result.paidAt,
      })
      clear()
      navigate('/order/success')
    } catch (err) {
      setError(err.message || 'Payment could not be completed. Please try again.')
      setProcessing(false)
    }
  }

  return (
    <div className="wrap page">
      <Link to="/checkout" className="breadcrumb" style={{ display: 'inline-flex' }}>
        <ArrowLeft size={16} /> Back to details
      </Link>
      <h1 className="page-title">Payment</h1>
      <p className="page-sub">Step 2 of 2 · Secure payment via {GATEWAY}</p>

      <div className="checkout-layout">
        <div>
          <div className="panel">
            <h3>Choose payment method</h3>
            <p className="hint">All transactions are encrypted and processed securely.</p>

            {paymentMethods.map((m) => {
              const Icon = methodIcon[m.id]
              return (
                <div key={m.id}>
                  <div className={`option ${methodId === m.id ? 'active' : ''}`} onClick={() => { setMethodId(m.id); setError('') }}>
                    <div className="o-ic"><Icon size={22} strokeWidth={1.6} /></div>
                    <div className="o-main">
                      <div className="t">{m.label}</div>
                      <div className="d">{m.desc}</div>
                    </div>
                    <div className="o-radio" />
                  </div>

                  {methodId === m.id && m.id === 'fpx' && (
                    <div className="bank-grid" style={{ marginBottom: 16 }}>
                      {m.banks.map((b) => (
                        <button key={b} className={bank === b ? 'active' : ''} onClick={() => setBank(b)}>{b}</button>
                      ))}
                    </div>
                  )}
                  {methodId === m.id && m.id === 'ewallet' && (
                    <div className="bank-grid" style={{ marginBottom: 16 }}>
                      {m.wallets.map((w) => (
                        <button key={w} className={wallet === w ? 'active' : ''} onClick={() => setWallet(w)}>{w}</button>
                      ))}
                    </div>
                  )}
                  {methodId === m.id && m.id === 'qr' && (
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center', border: '1px solid var(--line)', borderRadius: 10, padding: 16, marginBottom: 16, background: '#f8f9fb' }}>
                      <div style={{ width: 72, height: 72, borderRadius: 10, background: '#fff', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', color: 'var(--ink)', flexShrink: 0 }}>
                        <QrCode size={40} strokeWidth={1.4} />
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                        A DuitNow QR will be shown after you confirm. Scan it with any Malaysian banking or e-wallet app to pay.
                      </div>
                    </div>
                  )}
                  {methodId === m.id && m.id === 'card' && (
                    <div style={{ marginBottom: 16 }}>
                      <div className="field">
                        <label>Card number</label>
                        <input value={card.number} onChange={(e) => setCard({ ...card, number: formatCard(e.target.value) })} placeholder="4242 4242 4242 4242" inputMode="numeric" />
                      </div>
                      <div className="field">
                        <label>Name on card</label>
                        <input value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} placeholder="IMRAN HAKIMI" />
                      </div>
                      <div className="grid-2">
                        <div className="field" style={{ marginBottom: 0 }}>
                          <label>Expiry</label>
                          <input value={card.exp} onChange={(e) => setCard({ ...card, exp: formatExp(e.target.value) })} placeholder="MM/YY" inputMode="numeric" />
                        </div>
                        <div className="field" style={{ marginBottom: 0 }}>
                          <label>CVV</label>
                          <input value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="123" inputMode="numeric" />
                        </div>
                      </div>
                      <p style={{ fontSize: '0.76rem', color: 'var(--muted)', marginTop: 10 }}>
                        Demo gateway — use any test card. Cards ending in 0000 simulate a decline.
                      </p>
                    </div>
                  )}
                </div>
              )
            })}

            {error && (
              <div className="note" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', background: '#fbeceb' }}>{error}</div>
            )}

            <div className="secure-note"><Lock size={14} strokeWidth={1.7} /> 256-bit SSL encrypted · Powered by {GATEWAY}</div>
          </div>
        </div>

        <OrderSummary
          mode={details.mode}
          cta={
            <>
              <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 8 }} disabled={!canPay()} onClick={pay}>
                {processing ? <><Loader2 size={18} className="spin" /> Processing…</> : <><Lock size={16} strokeWidth={1.8} /> Pay {rm(total)}</>}
              </button>
              <p style={{ fontSize: '0.74rem', color: 'var(--muted)', textAlign: 'center', marginTop: 10, marginBottom: 0 }}>
                By paying you agree to NanoRev's Terms &amp; Refund Policy.
              </p>
            </>
          }
        />
      </div>
    </div>
  )
}
