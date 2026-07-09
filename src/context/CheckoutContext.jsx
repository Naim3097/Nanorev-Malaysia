import { createContext, useContext, useState } from 'react'
import { locations } from '../data/company'

const CheckoutContext = createContext(null)

const emptyDetails = {
  mode: 'delivery', // 'delivery' | 'pickup'
  locationId: locations[0].id,
  account: 'personal', // 'personal' | 'trade'
  name: '',
  company: '',
  phone: '',
  email: '',
  address: '',
  unit: '',
  postcode: '',
  note: '',
}

export function CheckoutProvider({ children }) {
  const [details, setDetails] = useState(emptyDetails)
  const [lastOrder, setLastOrder] = useState(null)

  const update = (patch) => setDetails((d) => ({ ...d, ...patch }))
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
