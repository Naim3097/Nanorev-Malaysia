import { json, requireAdmin, withStore } from '@/server/request'

export const dynamic = 'force-dynamic'

export function GET(req: Request) {
  return withStore((store) => {
    requireAdmin(req)
    const { data } = store
    const revenue = data.orders.reduce((n, o) => n + (o.totals?.total || 0), 0)
    const pendingCommissions = data.commissions
      .filter((c) => c.status === 'pending')
      .reduce((n, c) => n + c.amount, 0)
    return json({
      orders: data.orders.length,
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
