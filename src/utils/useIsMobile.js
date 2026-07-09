import { useEffect, useState } from 'react'

// Live viewport check — used to gate desktop-only admin surfaces
// (Pages tab, page builder) and to adapt layouts.
export function useIsMobile(query = '(max-width: 900px)') {
  const [mobile, setMobile] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = (e) => setMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return mobile
}
