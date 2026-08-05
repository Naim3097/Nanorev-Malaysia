'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Clock, Loader2, XCircle } from 'lucide-react'
import { api } from '@/api/client'
import { useCart } from '@/context/CartContext'
import OrderReceipt, { type ReceiptLine } from './OrderReceipt'
import type { CheckoutDetails, OrderStatus, Totals } from '@/types'

export interface OrderSnapshot {
  ref: string
  status: OrderStatus
  items: { id: string; name: string; volume: string; price: number; qty: number }[]
  totals: Totals
  customer: CheckoutDetails
  payment: { gateway: string | null; method: string | null; receiptId: string | null }
}

const PAID: OrderStatus[] = ['paid', 'packing', 'dispatched', 'completed']
const POLL_MS = 3000
const MAX_POLLS = 20 // ~1 minute, then stop and let the buyer refresh

/**
 * Receipt for an order that came back from a hosted payment page.
 *
 * The buyer often returns before LeanX's webhook lands, so the order may still
 * be `pending` on arrival. We poll our own status route, which reconciles
 * against LeanX — the browser's return is never itself treated as payment.
 */
export default function GatewayReceipt({
  initial,
  token,
}: {
  initial: OrderSnapshot
  token: string
}) {
  const [order, setOrder] = useState(initial)
  const [polls, setPolls] = useState(0)
  const { clear } = useCart()

  const paid = PAID.includes(order.status)
  const settled = paid || order.status === 'failed' || order.status === 'cancelled'

  // The cart was intentionally kept through the redirect in case the buyer
  // abandoned payment; once it's confirmed paid, it has served its purpose.
  useEffect(() => {
    if (paid) clear()
  }, [paid, clear])

  useEffect(() => {
    if (settled || polls >= MAX_POLLS) return undefined
    const id = setTimeout(async () => {
      try {
        const next = await api<OrderSnapshot>(`/orders/${order.ref}/status?t=${encodeURIComponent(token)}`)
        setOrder(next)
      } catch { /* transient — the next tick retries */ }
      setPolls((n) => n + 1)
    }, POLL_MS)
    return () => clearTimeout(id)
  }, [order.ref, token, settled, polls])

  if (paid) {
    const lines: ReceiptLine[] = order.items.map((i) => ({
      id: i.id, label: i.name, volume: i.volume, price: i.price, qty: i.qty,
    }))
    return (
      <div className="wrap page">
        <OrderReceipt
          reference={order.ref}
          receiptId={order.payment.receiptId ?? undefined}
          lines={lines}
          totals={order.totals}
          details={order.customer}
          method={order.payment.method ?? 'FPX / e-wallet'}
        />
      </div>
    )
  }

  if (order.status === 'failed' || order.status === 'cancelled') {
    return (
      <div className="wrap page">
        <div className="empty-state">
          <div className="big" style={{ color: 'var(--danger)' }}><XCircle size={44} strokeWidth={1.4} /></div>
          <h2>Payment not completed</h2>
          <p>
            Your order <b>{order.ref}</b> was {order.status === 'cancelled' ? 'cancelled' : 'declined'} and
            you have not been charged. Your cart is still saved.
          </p>
          <Link href="/checkout" className="btn btn-primary btn-lg">Try again</Link>
        </div>
      </div>
    )
  }

  const gaveUp = polls >= MAX_POLLS
  return (
    <div className="wrap page">
      <div className="empty-state">
        <div className="big" style={{ color: 'var(--blue)' }}>
          {gaveUp ? <Clock size={44} strokeWidth={1.4} /> : <Loader2 size={44} strokeWidth={1.4} className="spin" />}
        </div>
        <h2>{gaveUp ? 'Still confirming your payment' : 'Confirming your payment…'}</h2>
        <p>
          Order <b>{order.ref}</b>. {gaveUp
            ? 'Your bank is taking longer than usual. If you completed payment, it will be confirmed shortly — keep this reference and refresh in a moment.'
            : 'This usually takes a few seconds. Please don’t close this page.'}
        </p>
        {gaveUp && <Link href="/shop" className="btn btn-ghost btn-lg">Continue shopping</Link>}
      </div>
    </div>
  )
}
