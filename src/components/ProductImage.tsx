'use client'

import { useState } from 'react'
import type { Product } from '@/types'

// Real bottle shot when available; otherwise a clean technical spec tile
// (viscosity grade / product type). Falls back to the tile if an image
// fails to load, so the grid never shows a broken image.
export default function ProductImage({
  product,
  sizes,
  variant = 'tile',
}: {
  product: Product
  sizes?: string
  variant?: 'tile' | 'mini'
}) {
  const [failed, setFailed] = useState(false)

  if (product.image && !failed) {
    return (
      // Plain <img>: sources are admin uploads (local disk or Supabase Storage)
      // with unknown intrinsic dimensions, and the CSS already sizes them.
      // eslint-disable-next-line @next/next/no-img-element
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
