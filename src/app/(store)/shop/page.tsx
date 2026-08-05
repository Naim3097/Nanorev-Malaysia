import type { Metadata } from 'next'
import JsonLd from '@/components/JsonLd'
import ShopView from './ShopView'
import { itemListJsonLd } from './itemList'

type Search = Promise<{ q?: string }>

export async function generateMetadata({ searchParams }: { searchParams: Search }): Promise<Metadata> {
  const { q } = await searchParams
  return {
    title: q ? `Search: ${q} | NanoRev Malaysia` : 'Shop All Products — Lubricants & Additives | NanoRev Malaysia',
    description:
      'Browse the full NanoRev range — engine oil, motorcycle & diesel lubricants, transmission fluid, grease, coolant and nano additives. Ships across Malaysia.',
    alternates: { canonical: '/shop' },
    // search-result views are thin/duplicate — keep them out of the index
    ...(q ? { robots: { index: false, follow: true } } : {}),
  }
}

export default async function ShopPage({ searchParams }: { searchParams: Search }) {
  const { q } = await searchParams
  return (
    <>
      <JsonLd data={await itemListJsonLd()} />
      <ShopView q={q} />
    </>
  )
}
