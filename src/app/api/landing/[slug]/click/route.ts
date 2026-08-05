import { json, rateLimit, withStoreWrite } from '@/server/request'

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return withStoreWrite((store) => {
    rateLimit(req, 'landing', 600)
    const link = store.data.links.find((l) => l.slug === slug)
    if (link) {
      link.clicks += 1
      store.save()
    }
    return json({ ok: true })
  })
}
