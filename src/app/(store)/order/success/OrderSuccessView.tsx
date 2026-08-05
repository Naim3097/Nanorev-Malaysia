'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useCheckout } from '@/context/CheckoutContext'
import OrderReceipt, { type ReceiptLine } from './OrderReceipt'

/**
 * Receipt for the simulated gateway, which never leaves the site — the whole
 * order is still in React memory. Orders paid through a redirect gateway are
 * loaded from the store instead (see page.tsx → GatewayReceipt).
 */
export default function OrderSuccessView() {
  const { lastOrder } = useCheckout()
  const router = useRouter()

  // Memory-only, so a reload or a direct visit has nothing to show.
  useEffect(() => {
    if (!lastOrder) router.replace('/')
  }, [lastOrder, router])

  if (!lastOrder) return null

  const { ref, receiptId, items, totals, details, method, methodDetail, location } = lastOrder
  const lines: ReceiptLine[] = items.map((i) => ({
    id: i.id,
    label: `${i.name} ${i.grade}`.trim(),
    volume: i.volume,
    price: i.price,
    qty: i.qty,
  }))

  return (
    <div className="wrap page">
      <OrderReceipt
        reference={ref}
        receiptId={receiptId}
        lines={lines}
        totals={totals}
        details={details}
        method={method}
        methodDetail={methodDetail}
        locationName={location?.name}
        locationEta={location?.eta}
      />
    </div>
  )
}
