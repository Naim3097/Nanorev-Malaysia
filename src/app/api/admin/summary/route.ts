import { json, requireAdmin, withStore } from '@/server/request'
import type { OrderStatus } from '@/types'

export const dynamic = 'force-dynamic'

// Money that actually arrived. Before a real gateway every order was written
// straight to `paid`, so summing all of them was right; with LeanX an order is
// `pending` before the buyer leaves and may end `failed` or `cancelled`, and
// counting those inflates revenue with sales that never happened.
const EARNED: OrderStatus[] = ['paid', 'packing', 'dispatched', 'completed']

export function GET(req: Request) {
  return withStore((store) => {
    requireAdmin(req)
    const { data } = store
    const paid = data.orders.filter((o) => EARNED.includes(o.status))
    const revenue = paid.reduce((n, o) => n + (o.totals?.total || 0), 0)
    const pendingCommissions = data.commissions
      .filter((c) => c.status === 'pending')
      .reduce((n, c) => n + c.amount, 0)
    return json({
      orders: paid.length,
      // Surfaced rather than hidden: a rising pending count means buyers are
      // reaching the gateway and not completing.
      pendingOrders: data.orders.filter((o) => o.status === 'pending').length,
      revenue: +revenue.toFixed(2),
      clicks: data.links.reduce((n, l) => n + l.clicks, 0),
      pendingCommissions: +pendingCommissions.toFixed(2),
      workshops: data.workshops.filter((w) => w.active).length,
      pages: data.pages.length,
      topLinks: [...data.links].sort((a, b) => b.clicks - a.clicks).slice(0, 5),
      lowStock: data.products
        .filter((p) => p.active && p.stock <= 10)
        .map((p) => ({ id: p.id, name: `${p.name} ${p.grade}`.trim(), stock: p.stock })),
    })
  })
}
