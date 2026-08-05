'use client'

import { useEffect, useState } from 'react'

// Live viewport check — used to gate desktop-only admin surfaces
// (Pages tab, page builder) and to adapt layouts.
//
// Starts false and resolves in an effect: matchMedia doesn't exist during
// server rendering, and reading it while rendering would desync hydration.
export function useIsMobile(query = '(max-width: 900px)') {
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(query)
    setMobile(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])

  return mobile
}
