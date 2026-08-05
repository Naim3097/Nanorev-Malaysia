import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import JsonLd from '@/components/JsonLd'
import { readStore } from '@/server/read'
import ShopView from '../ShopView'
import { itemListJsonLd } from '../itemList'

type Params = Promise<{ catId: string }>
type Search = Promise<{ q?: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { catId } = await params
  const cat = (await readStore()).categories.find((c) => c.id === catId)
  if (!cat) return {}
  return {
    title: `${cat.name} — Genuine NanoRev Stock | NanoRev Malaysia`,
    description: `${cat.name} for ${cat.blurb.toLowerCase()} — genuine NanoRev stock, dealer pricing on bulk orders, same-day dispatch from Shah Alam across Malaysia.`,
    alternates: { canonical: `/shop/${cat.id}` },
  }
}

export default async function ShopCategoryPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: Search
}) {
  const { catId } = await params
  const { q } = await searchParams
  const cat = (await readStore()).categories.find((c) => c.id === catId)
  if (!cat) notFound()

  return (
    <>
      <JsonLd data={await itemListJsonLd(cat.id, cat.name)} />
      <ShopView catId={cat.id} q={q} />
    </>
  )
}
