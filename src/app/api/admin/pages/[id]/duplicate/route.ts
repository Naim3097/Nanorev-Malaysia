import { bad, json, requireAdmin, withStoreWrite } from '@/server/request'
import type { LandingPage } from '@/types'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withStoreWrite((store) => {
    requireAdmin(req)
    const { data } = store
    const src = data.pages.find((p) => p.id === id)
    if (!src) throw bad('Page not found', 404)

    let copyId = `${src.id}-copy`
    let n = 2
    while (data.pages.some((p) => p.id === copyId)) copyId = `${src.id}-copy-${n++}`

    const copy: LandingPage = {
      ...structuredClone(src),
      id: copyId,
      name: `${src.name} (copy)`,
      status: 'draft',
      updatedAt: new Date().toISOString(),
    }
    data.pages.push(copy)
    store.save()
    return json(copy, 201)
  })
}
