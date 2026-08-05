import type { Metadata } from 'next'
import { readStore } from '@/server/read'
import GatewayReceipt, { type OrderSnapshot } from './GatewayReceipt'
import OrderSuccessView from './OrderSuccessView'

export const metadata: Metadata = {
  title: 'Order Confirmed | NanoRev Malaysia',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type Search = Promise<{ ref?: string; t?: string }>

/**
 * Two ways a buyer lands here:
 *
 * • Back from a hosted payment page (`?ref=…&t=…`) — the order is loaded from
 *   the store. The token is required because order refs are guessable.
 * • Straight from the simulated gateway — the receipt is still in React memory,
 *   so the original client view renders it.
 */
export default async function OrderSuccessPage({ searchParams }: { searchParams: Search }) {
  const { ref, t } = await searchParams

  if (ref && t) {
    const order = (await readStore()).orders.find((o) => o.ref === ref)
    if (order && order.accessToken && order.accessToken === t) {
      const snapshot: OrderSnapshot = {
        ref: order.ref,
        status: order.status,
        items: order.items,
        totals: order.totals,
        customer: order.customer,
        payment: {
          gateway: (order.payment as { gateway?: string } | null)?.gateway ?? null,
          method: (order.payment as { method?: string } | null)?.method ?? null,
          receiptId: (order.payment as { billNo?: string } | null)?.billNo ?? null,
        },
      }
      return <GatewayReceipt initial={snapshot} token={t} />
    }
  }

  return <OrderSuccessView />
}
