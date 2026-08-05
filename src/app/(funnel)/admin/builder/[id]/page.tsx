import type { Metadata } from 'next'
import BuilderView from './BuilderView'

export const metadata: Metadata = {
  title: 'Page Builder | NanoRev Admin',
  robots: { index: false, follow: false },
}

export default async function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <BuilderView id={id} />
}
