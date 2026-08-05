import 'server-only'
import { getStore } from './store'
import type { StoreData } from '@/types'

/**
 * Read access to the store for Server Components and generateMetadata. Same
 * TTL-cached reload the read routes use, minus the HTTP hop — a server-rendered
 * landing page reads the database directly instead of fetching its own API.
 *
 * `force` skips the TTL. Next gives page routes and route handlers separate
 * module instances, so a page's store can hold a snapshot from before a write
 * a route handler just made. Catalogue pages don't care; a buyer returning from
 * a payment does — there, a stale snapshot means "order not found" for an order
 * that exists. Pass force wherever a miss is indistinguishable from a genuine
 * absence. (On Vercel every request reloads anyway; this is for long-lived hosts.)
 */
export async function readStore({ force = false }: { force?: boolean } = {}): Promise<StoreData> {
  const store = await getStore()
  await store.reload({ force })
  return store.data
}
