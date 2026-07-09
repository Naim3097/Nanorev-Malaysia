import { Link } from 'react-router-dom'
import { Plus, Minus } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { rm } from '../utils/format'
import ProductImage from './ProductImage'

const badgeClass = { bestseller: 'badge-bestseller', new: 'badge-new', pro: 'badge-pro', bulk: 'badge-bulk' }
const badgeText = { bestseller: 'Bestseller', new: 'New', pro: 'Pro', bulk: 'Bulk' }

export default function ProductCard({ product }) {
  const { items, add, setQty } = useCart()
  const inCart = items.find((i) => i.id === product.id)

  return (
    <article className="prod-card">
      <Link to={`/product/${product.id}`} className="prod-thumb">
        {product.badge && (
          <span className={`prod-badge ${badgeClass[product.badge]}`}>{badgeText[product.badge]}</span>
        )}
        <ProductImage product={product} sizes="(max-width: 680px) 45vw, 220px" />
      </Link>

      {/* minimal, left-aligned: name · spec · price */}
      <div className="prod-body">
        <Link to={`/product/${product.id}`} className="prod-name">{product.name} {product.grade}</Link>
        <span className="prod-spec">{product.volume} · {product.base}</span>

        <div className="prod-foot">
          <span className="prod-price">{rm(product.price)}</span>
          {inCart ? (
            <div className="qty-pill">
              <button onClick={() => setQty(product.id, inCart.qty - 1)} aria-label="Decrease"><Minus size={15} /></button>
              <span>{inCart.qty}</span>
              <button onClick={() => setQty(product.id, inCart.qty + 1)} aria-label="Increase"><Plus size={15} /></button>
            </div>
          ) : (
            <button className="add-btn" onClick={() => add(product)} aria-label={`Add ${product.name}`}>
              <Plus size={18} />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
