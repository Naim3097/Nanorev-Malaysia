import type { Metadata } from 'next'
import LandingPreview from './LandingPreview'

// Draft preview for the page builder. Kept off /l/[slug] so that route can be
// statically generated: the document is fetched client-side with the admin key
// (which lives in localStorage), and nothing here is ever indexed.

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function LandingPreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <LandingPreview slug={slug} />
}
