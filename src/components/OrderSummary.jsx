import { useCart } from '../context/CartContext'
import { computeTotals } from '../utils/pricing'
import { rm } from '../utils/format'
import ProductImage from './ProductImage'

export default function OrderSummary({ mode = 'delivery', cta = null }) {
  const { items, subtotal } = useCart()
  const { delivery, sst, total } = computeTotals(subtotal, mode)

  return (
    <div className="summary-card panel">
      <h3>Order summary</h3>
      <div className="summary-items">
        {items.map((i) => (
          <div className="summary-line" key={i.id}>
            <div className="sq"><ProductImage product={i} variant="mini" /></div>
            <div className="sn">{i.name} {i.grade}<small>{i.qty} × {rm(i.price)} · {i.volume}</small></div>
            <div className="sp">{rm(i.price * i.qty)}</div>
          </div>
        ))}
      </div>
      <div className="summary-row"><span>Subtotal</span><span>{rm(subtotal)}</span></div>
      <div className="summary-row">
        <span>{mode === 'pickup' ? 'Pickup' : 'Delivery'}</span>
        <span>{delivery === 0 ? <b style={{ color: 'var(--green)' }}>FREE</b> : rm(delivery)}</span>
      </div>
      <div className="summary-row"><span>SST (6%)</span><span>{rm(sst)}</span></div>
      <div className="summary-row total"><span>Total</span><span>{rm(total)}</span></div>
      {cta}
    </div>
  )
}
