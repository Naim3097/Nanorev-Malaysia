import { useState } from 'react'

// Real bottle shot when available; otherwise a clean technical spec tile
// (viscosity grade / product type). Falls back to the tile if an image
// fails to load, so the grid never shows a broken image.
export default function ProductImage({ product, sizes, variant = 'tile' }) {
  const [failed, setFailed] = useState(false)

  if (product.image && !failed) {
    return (
      <img
        className="thumb-img"
        src={product.image}
        alt={product.name}
        loading="lazy"
        decoding="async"
        sizes={sizes}
        onError={() => setFailed(true)}
      />
    )
  }

  if (variant === 'mini') {
    return <span className="g">{product.tile}</span>
  }

  return (
    <div className="spec-tile">
      <span className="g">{product.tile}</span>
      <span className="b">{product.base}</span>
    </div>
  )
}
