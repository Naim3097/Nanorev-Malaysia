import { bad, body, json, requireAdmin, withStore, withStoreWrite } from '@/server/request'
import type { StoredProduct } from '@/types'

export const dynamic = 'force-dynamic'

export function GET(req: Request) {
  return withStore((store) => {
    requireAdmin(req)
    return json(store.data.products)
  })
}

export function POST(req: Request) {
  return withStoreWrite(async (store) => {
    requireAdmin(req)
    const { data } = store
    const b = await body<Partial<StoredProduct>>(req)
    const { id, name, cat, price } = b
    if (!id || !name || !cat) throw bad('id, name and cat are required')
    if (!data.categories.some((c) => c.id === cat)) throw bad('Unknown category')
    if (price !== undefined && (!Number.isFinite(Number(price)) || Number(price) < 0)) {
      throw bad('price must be a non-negative number')
    }
    if (data.products.some((p) => p.id === id)) throw bad('Product id already exists', 409)

    const p: StoredProduct = {
      id, name, cat, price: Number(price) || 0,
      grade: b.grade || '', tile: b.tile || b.grade || '',
      volume: b.volume || '', base: b.base || '', spec: b.spec || '',
      badge: b.badge, image: b.image,
      stock: Math.max(0, Math.floor(Number(b.stock) || 0)), active: true,
    }
    data.products.push(p)
    store.save()
    return json(p, 201)
  })
}
