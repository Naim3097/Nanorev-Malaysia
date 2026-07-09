// Distributor / fulfilment info.
// TODO: replace with the real production domain before launch —
// used for canonical URLs, Open Graph and JSON-LD on landing pages.
export const SITE_URL = 'https://nanorev.my'

export const company = {
  name: 'NanoRev Malaysia',
  legal: 'Nano Revolution Autolube Sdn Bhd',
  tagline: 'Nano Revolution Autolube',
}

export const locations = [
  {
    id: 'hq',
    name: 'HQ & Distribution Centre',
    address: 'Lot 8, Jalan Perindustrian 4, Shah Alam, Selangor',
    hours: 'Mon–Sat · 9:00 AM – 6:00 PM',
    role: 'Warehouse pickup & dealer collection',
    eta: 'Same-day dispatch',
  },
  {
    id: 'north',
    name: 'Northern Hub',
    address: 'Bukit Mertajam, Pulau Pinang',
    hours: 'Mon–Sat · 9:00 AM – 6:00 PM',
    role: 'Regional stock & delivery',
    eta: '1–2 working days',
  },
]

// Simple bulk / dealer tiers shown on the storefront.
export const dealerNote = 'Dealer & workshop pricing available on bulk orders — request a trade account at checkout.'
