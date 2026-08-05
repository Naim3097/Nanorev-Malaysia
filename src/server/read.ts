import 'server-only'
import { getStore } from './store'
import type { StoreData } from '@/types'

// Read access to the store for Server Components and generateMetadata. Same
// TTL-cached reload the read routes use, minus the HTTP hop — a server-rendered
// landing page reads the database directly instead of fetching its own API.
export async function readStore(): Promise<StoreData> {
  const store = await getStore()
  await store.reload()
  return store.data
}
