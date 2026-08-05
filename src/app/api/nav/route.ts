import { json, withStore } from '@/server/request'
import { navEntries } from '@/server/resolve'

export const dynamic = 'force-dynamic'

export function GET() {
  return withStore((store) => json(navEntries(store.data)))
}
