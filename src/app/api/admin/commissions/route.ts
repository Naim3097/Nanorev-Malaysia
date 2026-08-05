import { json, requireAdmin, withStore } from '@/server/request'

export const dynamic = 'force-dynamic'

export function GET(req: Request) {
  return withStore((store) => {
    requireAdmin(req)
    return json(store.data.commissions)
  })
}
