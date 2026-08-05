import { bad, json, withStore } from '@/server/request'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withStore((store) => {
    const p = store.data.products.find((x) => x.id === id)
    if (!p || !p.active) throw bad('Product not found', 404)
    return json(p)
  })
}
