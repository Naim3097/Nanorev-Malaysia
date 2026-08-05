import { bad, body, json, requireAdmin, withStore, withStoreWrite } from '@/server/request'
import { assignFields } from '@/server/validate'
import type { LandingPage, PaymentGateway } from '@/types'

export const dynamic = 'force-dynamic'

const EDITABLE = [
  'name', 'productId', 'lang', 'whatsapp', 'waText', 'buyLabel', 'status', 'seo', 'sections',
  'paymentGateway',
] as const

const GATEWAYS: PaymentGateway[] = ['mock', 'leanx']

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withStore((store) => {
    requireAdmin(req)
    const p = store.data.pages.find((x) => x.id === id)
    if (!p) throw bad('Page not found', 404)
    return json(p)
  })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withStoreWrite(async (store) => {
    requireAdmin(req)
    const { data } = store
    const p = data.pages.find((x) => x.id === id)
    if (!p) throw bad('Page not found', 404)
    const b = await body<Partial<LandingPage>>(req)

    // validate BEFORE mutating — a rejected request must leave no trace
    if ('sections' in b && !Array.isArray(b.sections)) throw bad('sections must be an array')
    if ('status' in b && !['draft', 'published'].includes(b.status as string)) {
      throw bad('status must be draft or published')
    }
    if ('productId' in b && !data.products.some((x) => x.id === b.productId)) throw bad('Unknown productId')
    if ('name' in b && !String(b.name).trim()) throw bad('name cannot be empty')
    // Switching a page to a live gateway means real money — only known values.
    if ('paymentGateway' in b && !GATEWAYS.includes(b.paymentGateway as PaymentGateway)) {
      throw bad(`paymentGateway must be one of: ${GATEWAYS.join(', ')}`)
    }

    assignFields(p, b, EDITABLE)
    p.updatedAt = new Date().toISOString()
    store.save()
    return json(p)
  })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withStoreWrite((store) => {
    requireAdmin(req)
    const { data } = store
    const i = data.pages.findIndex((p) => p.id === id)
    if (i === -1) throw bad('Page not found', 404)
    const linked = data.links.filter((l) => l.pageId === id)
    if (linked.length) throw bad(`Page has ${linked.length} link(s) — delete those first`, 409)
    data.pages.splice(i, 1)
    store.save()
    return json({ ok: true })
  })
}
