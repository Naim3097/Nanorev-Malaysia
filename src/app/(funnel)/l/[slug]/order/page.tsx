import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { readStore } from '@/server/read'
import { resolveSlug } from '@/server/resolve'
import FunnelReceipt, { type FunnelOrder } from './FunnelReceipt'

// Where a funnel buyer lands after LeanX. Deliberately inside the funnel route
// group: someone who bought from a chrome-free BM landing page should not be
// dropped onto the English storefront receipt with a navbar and search box.
//
// Never indexed — it is a per-order page reachable only with a token.

export const metadata: Metadata = {
  title: 'Status Pembayaran | NanoRev',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type Params = Promise<{ slug: string }>
type Search = Promise<{ ref?: string; t?: string }>

export default async function FunnelOrderPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: Search
}) {
  const { slug } = await params
  const { ref, t } = await searchParams

  // force: the buyer can arrive seconds after the order was written by a route
  // handler, which lives in a different module instance with its own snapshot.
  // A TTL-stale read here would 404 a customer who has just paid.
  const data = await readStore({ force: true })
  const resolved = resolveSlug(data, slug)
  if (!resolved) notFound()

  // Order refs are guessable, so the per-order token is what authorises this.
  // Without a valid pair we 404 rather than confirm that the order exists.
  const order = ref && t ? data.orders.find((o) => o.ref === ref) : undefined
  if (!order || !order.accessToken || order.accessToken !== t) notFound()

  const snapshot: FunnelOrder = {
    ref: order.ref,
    status: order.status,
    items: order.items,
    totals: order.totals,
    payment: {
      method: (order.payment as { method?: string } | null)?.method ?? null,
      receiptId: (order.payment as { billNo?: string } | null)?.billNo ?? null,
    },
  }

  return (
    <FunnelReceipt
      initial={snapshot}
      token={t as string}
      slug={slug}
      whatsapp={resolved.workshop?.whatsapp || resolved.page.whatsapp}
    />
  )
}
