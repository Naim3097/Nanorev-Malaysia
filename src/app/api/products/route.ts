import { json, withStore } from '@/server/request'

export const dynamic = 'force-dynamic'

export function GET() {
  return withStore((store) => json(store.data.products.filter((p) => p.active)))
}
