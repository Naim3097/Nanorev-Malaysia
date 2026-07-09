import { useEffect } from 'react'
import { applyHead } from './head'

// Per-page SEO for storefront routes. Pass null to skip (e.g. before data
// resolves). Cleanup restores the previous head on unmount/route change.
export function useSeo(config, deps) {
  useEffect(() => (config ? applyHead(config) : undefined), deps) // eslint-disable-line react-hooks/exhaustive-deps
}
