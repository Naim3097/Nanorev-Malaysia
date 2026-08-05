import { bad, isAdmin, json, withStore } from '@/server/request'
import { resolveSlug } from '@/server/resolve'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const preview = new URL(req.url).searchParams.get('preview') === '1' && isAdmin(req)
  return withStore((store) => {
    const resolved = resolveSlug(store.data, slug, { preview })
    if (!resolved) throw bad('Link not found', 404)
    return json(resolved)
  })
}
