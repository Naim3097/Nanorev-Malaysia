import Link from 'next/link'
import { Check, ClipboardCheck, Home as HomeIcon, MapPin, Package, Truck } from 'lucide-react'
import { rm } from '@/utils/format'
import type { CheckoutDetails, Totals } from '@/types'

// The confirmed-order receipt. Shared by both paths so a buyer sees the same
// thing whether they paid through the simulator (receipt held in memory) or
// through LeanX (order loaded from the store after returning from the gateway).

export interface ReceiptLine {
  id: string
  /** Already-composed product label, e.g. "NanoRev Ultra 0W-20". */
  label: string
  volume: string
  price: number
  qty: number
}

export default function OrderReceipt({
  reference,
  receiptId,
  lines,
  totals,
  details,
  method,
  methodDetail,
  locationName,
  locationEta,
}: {
  reference: string
  receiptId?: string
  lines: ReceiptLine[]
  totals: Totals
  details: CheckoutDetails
  method?: string
  methodDetail?: string
  locationName?: string
  locationEta?: string
}) {
  const isDelivery = details.mode === 'delivery'

  const steps = [
    { icon: <Check size={16} />, label: 'Confirmed' },
    { icon: <ClipboardCheck size={16} />, label: 'Packing' },
    { icon: isDelivery ? <Truck size={16} /> : <Package size={16} />, label: isDelivery ? 'Dispatched' : 'Ready' },
    { icon: <HomeIcon size={16} />, label: isDelivery ? 'Delivered' : 'Collected' },
  ]

  return (
    <div className="success">
      <div className="success-check"><Check size={44} strokeWidth={3} /></div>
      <h1>Order confirmed</h1>
      <p style={{ color: 'var(--muted)' }}>
        Thank you, {details.name.split(' ')[0] || 'there'}. Your order <span className="ref">{reference}</span> is paid and being prepared.
      </p>

      <div className="track">
        {steps.map((s, i) => (
          <div className={`track-step ${i === 0 ? 'done' : ''}`} key={s.label}>
            <div className="dot">{s.icon}</div>
            <div className="lbl">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="receipt">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <strong>Receipt</strong>
          {receiptId && <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{receiptId}</span>}
        </div>

        {lines.map((i) => (
          <div className="receipt-row" key={i.id}>
            <span className="k">{i.qty} × {i.label} <small>({i.volume})</small></span>
            <span className="v">{rm(i.price * i.qty)}</span>
          </div>
        ))}

        <div style={{ borderTop: '1px solid var(--line)', margin: '10px 0' }} />
        <div className="receipt-row"><span className="k">Subtotal</span><span className="v">{rm(totals.subtotal)}</span></div>
        <div className="receipt-row"><span className="k">{isDelivery ? 'Delivery' : 'Pickup'}</span><span className="v">{totals.delivery === 0 ? 'FREE' : rm(totals.delivery)}</span></div>
        <div className="receipt-row"><span className="k">SST (6%)</span><span className="v">{rm(totals.sst)}</span></div>
        <div className="receipt-row" style={{ fontSize: '1.05rem', borderTop: '1px solid var(--line)', marginTop: 4, paddingTop: 12 }}>
          <span className="k" style={{ color: 'var(--ink)', fontWeight: 700 }}>Total paid</span>
          <span className="v" style={{ color: 'var(--blue)' }}>{rm(totals.total)}</span>
        </div>

        <div style={{ borderTop: '1px solid var(--line)', margin: '14px 0 10px' }} />
        {details.account === 'trade' && details.company && (
          <div className="receipt-row"><span className="k">Trade account</span><span className="v">{details.company}</span></div>
        )}
        {method && (
          <div className="receipt-row"><span className="k">Payment</span><span className="v">{method}{methodDetail ? ` · ${methodDetail}` : ''}</span></div>
        )}
        <div className="receipt-row">
          <span className="k">{isDelivery ? 'Deliver to' : 'Pickup at'}</span>
          <span className="v" style={{ textAlign: 'right', maxWidth: 240 }}>
            {isDelivery ? `${details.address}${details.unit ? ', ' + details.unit : ''}, ${details.postcode}` : locationName}
          </span>
        </div>
        <div className="receipt-row"><span className="k">Contact</span><span className="v">{details.phone}</span></div>
      </div>

      <div className="note" style={{ display: 'flex', gap: 10, alignItems: 'center', textAlign: 'left', marginBottom: 24, padding: '14px 16px' }}>
        <MapPin size={18} strokeWidth={1.7} style={{ color: 'var(--blue)', flexShrink: 0 }} />
        <div style={{ fontSize: '0.85rem' }}>
          <strong>{isDelivery ? 'Estimated dispatch' : 'Ready for pickup'}:</strong> {locationEta || 'Same-day dispatch'} · A confirmation was sent to {details.email}.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/shop" className="btn btn-primary btn-lg">Continue shopping</Link>
        <Link href="/" className="btn btn-ghost btn-lg">Back to home</Link>
      </div>
    </div>
  )
}
