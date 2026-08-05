import type { Metadata } from 'next'
import { readStore } from '@/server/read'
import LandingTemplateView from '../LandingTemplateView'

type Params = Promise<{ id: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params
  const product = (await readStore()).products.find((p) => p.id === id && p.active)
  if (!product) return { title: 'NanoRev Engine Oil | NanoRev Malaysia' }
  return {
    title: `${product.name} ${product.grade} — Protect Your Engine | NanoRev Malaysia`,
    description: `${product.name} ${product.grade} (${product.volume} · ${product.base} · ${product.spec}). Official distributor stock, same-day dispatch from Shah Alam.`,
    alternates: { canonical: `/landing/${product.id}` },
  }
}

export default async function LandingTemplateByIdPage({ params }: { params: Params }) {
  const { id } = await params
  return <LandingTemplateView id={id} />
}
