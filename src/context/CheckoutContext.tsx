'use client'

import { createContext, useContext, useState } from 'react'
import { locations } from '@/data/company'
import type { CheckoutDetails, Receipt } from '@/types'

interface CheckoutValue {
  details: CheckoutDetails
  update: (patch: Partial<CheckoutDetails>) => void
  reset: () => void
  lastOrder: Receipt | null
  setLastOrder: (o: Receipt | null) => void
}

const CheckoutContext = createContext<CheckoutValue | null>(null)

const emptyDetails: CheckoutDetails = {
  mode: 'delivery',
  locationId: locations[0].id,
  account: 'personal',
  name: '',
  company: '',
  phone: '',
  email: '',
  address: '',
  unit: '',
  postcode: '',
  note: '',
}

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const [details, setDetails] = useState<CheckoutDetails>(emptyDetails)
  const [lastOrder, setLastOrder] = useState<Receipt | null>(null)

  const update = (patch: Partial<CheckoutDetails>) => setDetails((d) => ({ ...d, ...patch }))
  const reset = () => setDetails(emptyDetails)

  return (
    <CheckoutContext.Provider value={{ details, update, reset, lastOrder, setLastOrder }}>
      {children}
    </CheckoutContext.Provider>
  )
}

export function useCheckout() {
  const ctx = useContext(CheckoutContext)
  if (!ctx) throw new Error('useCheckout must be used within CheckoutProvider')
  return ctx
}
