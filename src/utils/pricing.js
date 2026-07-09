export const FREE_DELIVERY_THRESHOLD = 150
export const DELIVERY_FEE = 12.0
export const SST_RATE = 0.06 // Malaysia SST (illustrative)

export function computeTotals(subtotal, mode = 'delivery') {
  const delivery = mode === 'pickup' ? 0 : subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE
  const sst = +(subtotal * SST_RATE).toFixed(2)
  const total = +(subtotal + delivery + sst).toFixed(2)
  return { subtotal, delivery, sst, total }
}
