import { json } from '@/server/request'
import { leanxConfigured, listPaymentServices, type PaymentService } from '@/server/leanx'
import { readStore } from '@/server/read'
import { resolveSlug } from '@/server/resolve'

// Which gateway applies, and (for LeanX) the live bank / e-wallet list.
//
// The SERVER decides the gateway from the landing page document — the client
// only supplies the affiliate slug it was attributed to. A tampered slug can at
// worst point at another published page, never turn the mock into real money
// or vice versa.

export const dynamic = 'force-dynamic'

// The bank list changes rarely and every checkout needs it; cache per instance.
const TTL_MS = 5 * 60_000
let cache: { at: number; fpx: PaymentService[]; ewallet: PaymentService[] } | null = null

async function services() {
  if (cache && Date.now() - cache.at < TTL_MS) return cache
  const [fpx, ewallet] = await Promise.all([
    listPaymentServices('WEB_PAYMENT'),
    listPaymentServices('DIGITAL_PAYMENT'),
  ])
  cache = { at: Date.now(), fpx, ewallet }
  return cache
}

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get('slug') || ''

  let gateway: string = 'mock'
  try {
    const data = await readStore()
    const resolved = slug ? resolveSlug(data, slug) : null
    gateway = resolved?.page.paymentGateway ?? 'mock'
  } catch (e) {
    console.error('[payments] gateway lookup failed:', (e as Error).message)
    return json({ error: 'Store temporarily unavailable' }, 503)
  }

  if (gateway !== 'leanx') return json({ gateway: 'mock' })

  // A page flagged for LeanX with no credentials must not silently fall back to
  // the simulator — say so, and let the client surface a real error.
  if (!leanxConfigured()) {
    return json({ gateway: 'leanx', configured: false, fpx: [], ewallet: [] })
  }

  try {
    const { fpx, ewallet } = await services()
    return json({ gateway: 'leanx', configured: true, fpx, ewallet })
  } catch (e) {
    console.error('[leanx] list-payment-services failed:', (e as Error).message)
    return json({ gateway: 'leanx', configured: true, fpx: [], ewallet: [], error: 'Bank list unavailable' }, 502)
  }
}
