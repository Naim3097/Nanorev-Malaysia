'use client'

import { Landmark, Smartphone } from 'lucide-react'

export interface PaymentService {
  payment_service_id: string
  payment_service_name: string
}

/**
 * The live FPX bank / e-wallet list from LeanX. The silent-bill flow requires
 * the customer to choose the specific bank up front — that choice becomes
 * `payment_service_id` on the bill, so this is a required step, not a nicety.
 */
export default function LeanXMethods({
  fpx,
  ewallet,
  selected,
  onSelect,
}: {
  fpx: PaymentService[]
  ewallet: PaymentService[]
  selected: string
  onSelect: (id: string) => void
}) {
  const groups = [
    { id: 'fpx', label: 'FPX Online Banking', desc: 'Maybank2u, CIMB Clicks, RHB & more', Icon: Landmark, list: fpx },
    { id: 'ewallet', label: 'E-Wallet', desc: "Touch 'n Go, GrabPay, Boost, ShopeePay", Icon: Smartphone, list: ewallet },
  ].filter((g) => g.list.length > 0)

  return (
    <>
      {groups.map(({ id, label, desc, Icon, list }) => (
        <div key={id}>
          <div className="option active" style={{ cursor: 'default' }}>
            <div className="o-ic"><Icon size={22} strokeWidth={1.6} /></div>
            <div className="o-main">
              <div className="t">{label}</div>
              <div className="d">{desc}</div>
            </div>
          </div>
          <div className="bank-grid" style={{ marginBottom: 16 }}>
            {list.map((s) => (
              <button
                key={s.payment_service_id}
                className={selected === s.payment_service_id ? 'active' : ''}
                onClick={() => onSelect(s.payment_service_id)}
              >
                {s.payment_service_name}
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
