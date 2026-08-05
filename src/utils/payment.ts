import type { PaymentResult } from '@/types'

// Mock payment gateway — modelled on LeanX (leanx.io), a Malaysian
// payment provider supporting FPX, cards, e-wallets and DuitNow QR.
// To go live, replace `processPayment` with a fetch() to your backend
// that creates a LeanX transaction and returns the checkout/redirect URL.

export const GATEWAY = 'LeanX'

export interface PaymentMethod {
  id: string
  label: string
  desc: string
  banks?: string[]
  wallets?: string[]
}

/** What the payment form collects — card fields only apply to the card method. */
export interface PaymentSelection {
  id?: string
  cardNumber?: string
  [key: string]: unknown
}

export const paymentMethods: PaymentMethod[] = [
  {
    id: 'fpx',
    label: 'FPX Online Banking',
    desc: 'Maybank2u, CIMB Clicks, RHB & more',
    banks: ['Maybank2u', 'CIMB Clicks', 'RHB Now', 'Public Bank', 'Bank Islam', 'Hong Leong'],
  },
  {
    id: 'card',
    label: 'Credit / Debit Card',
    desc: 'Visa, Mastercard',
  },
  {
    id: 'ewallet',
    label: 'E-Wallet',
    desc: "Touch 'n Go, GrabPay, Boost, ShopeePay",
    wallets: ["Touch 'n Go", 'GrabPay', 'Boost', 'ShopeePay'],
  },
  {
    id: 'qr',
    label: 'DuitNow QR',
    desc: 'Scan to pay with any banking app',
  },
]

export function processPayment({
  method,
  amount,
  ref,
}: {
  method: PaymentSelection | null
  amount: number
  ref: string
}): Promise<PaymentResult> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const declined = amount > 0 && method?.cardNumber?.replace(/\s/g, '').endsWith('0000')
      if (declined) {
        reject({ code: 'DECLINED', message: 'Card declined by issuing bank. Try another method.' })
        return
      }
      resolve({
        status: 'PAID',
        ref,
        gateway: GATEWAY,
        method: method?.id,
        amount,
        paidAt: new Date().toISOString(),
        receiptId: 'LX' + Math.floor(100000 + Math.random() * 899999),
      })
    }, 1700)
  })
}
