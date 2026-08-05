'use client'

import { useEffect, useState } from 'react'
import { api } from '@/api/client'
import LandingView from '../LandingView'
import type { ResolvedLanding } from '@/types'

/**
 * Fetches a page — including unpublished drafts — with the admin key held in
 * localStorage, then hands it to the same renderer the live page uses, so what
 * you preview is exactly what ships.
 */
export default function LandingPreview({ slug }: { slug: string }) {
  const [resolved, setResolved] = useState<ResolvedLanding | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let alive = true
    const key = localStorage.getItem('nanorev.adminKey') || ''
    api<ResolvedLanding>(`/landing/${slug}?preview=1`, key ? { key } : undefined)
      .then((d) => { if (alive && d?.page) setResolved(d) })
      .catch(() => { /* falls through to the not-found state below */ })
      .finally(() => { if (alive) setDone(true) })
    return () => { alive = false }
  }, [slug])

  if (!done) return <div className="wrap page" />
  return <LandingView slug={slug} resolved={resolved} preview />
}
