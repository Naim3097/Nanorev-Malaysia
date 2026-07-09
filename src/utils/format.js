export const rm = (n) =>
  'RM ' + Number(n).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const orderRef = (seed) => {
  const t = Date.now().toString(36).toUpperCase()
  const s = String(seed || '').slice(-4).toUpperCase().padStart(4, '0')
  return `NR-${t.slice(-6)}${s}`
}
