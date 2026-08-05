import { bad, body, json, requireAdmin, withStoreWrite } from '@/server/request'
import { assignFields } from '@/server/validate'
import type { StoredProduct } from '@/types'

const EDITABLE = [
  'name', 'cat', 'price', 'grade', 'tile', 'volume', 'base', 'spec', 'badge', 'image', 'stock', 'active',
] as const

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withStoreWrite(async (store) => {
    requireAdmin(req)
    const { data } = store
    const p = data.products.find((x) => x.id === id)
    if (!p) throw bad('Product not found', 404)
    const b = await body<Partial<StoredProduct>>(req)

    // validate BEFORE mutating — a rejected request must leave no trace
    if ('price' in b && (!Number.isFinite(Number(b.price)) || Number(b.price) < 0)) {
      throw bad('price must be a non-negative number')
    }
    if ('stock' in b && (!Number.isFinite(Number(b.stock)) || Number(b.stock) < 0)) {
      throw bad('stock must be a non-negative number')
    }
    if ('cat' in b && !data.categories.some((c) => c.id === b.cat)) throw bad('Unknown category')
    if ('name' in b && !String(b.name).trim()) throw bad('name cannot be empty')

    assignFields(p, b, EDITABLE)
    p.price = Number(p.price)
    p.stock = Math.floor(Number(p.stock))
    store.save()
    return json(p)
  })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withStoreWrite((store) => {
    requireAdmin(req)
    const { data } = store
    const i = data.products.findIndex((p) => p.id === id)
    if (i === -1) throw bad('Product not found', 404)
    if (data.orders.some((o) => o.items.some((it) => it.id === id))) {
      throw bad('Product has orders — deactivate it instead', 409)
    }
    const usedBy = data.pages.filter((p) => p.productId === id)
    if (usedBy.length) {
      throw bad(`Product is used by ${usedBy.length} landing page(s) — repoint or delete those first`, 409)
    }
    data.products.splice(i, 1)
    store.save()
    return json({ ok: true })
  })
}
