import type { Metadata } from 'next'
import JsonLd from '@/components/JsonLd'
import { SITE_URL } from '@/data/company'
import { readStore } from '@/server/read'
import { rm } from '@/utils/format'
import ProductView from './ProductView'

type Params = Promise<{ id: string }>

async function load(id: string) {
  const data = await readStore()
  const product = data.products.find((p) => p.id === id && p.active)
  const category = product ? data.categories.find((c) => c.id === product.cat) : undefined
  return { product, category }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params
  const { product, category } = await load(id)
  if (!product) return { title: 'Product not found | NanoRev Malaysia' }

  const catName = category?.name ?? 'Lubricants'
  const image = product.image ? `${SITE_URL}${product.image}` : undefined
  return {
    title: `${product.name} ${product.grade} · ${product.volume} — ${catName} | NanoRev Malaysia`,
    description: `${product.name} ${product.grade} (${product.volume} · ${product.base} · ${product.spec}). Genuine NanoRev stock at ${rm(product.price)}. Same-day dispatch from Shah Alam, delivery across Malaysia.`,
    keywords: `${product.name}, ${product.grade}, ${catName}, ${product.base}, NanoRev, minyak enjin Malaysia, lubricant`,
    alternates: { canonical: `/product/${product.id}` },
    openGraph: {
      type: 'website',
      locale: 'en_MY',
      url: `/product/${product.id}`,
      ...(image ? { images: [image] } : {}),
    },
  }
}

export default async function ProductPage({ params }: { params: Params }) {
  const { id } = await params
  const { product, category } = await load(id)

  // A missing product still renders the client view, which shows its own
  // "not found" state — the catalogue may resolve client-side from cache.
  const jsonLd = product
    ? [
        {
          '@type': 'Product',
          name: `${product.name} ${product.grade}`,
          description: `${product.volume} · ${product.base} · ${product.spec}`,
          ...(product.image ? { image: `${SITE_URL}${product.image}` } : {}),
          brand: { '@type': 'Brand', name: 'NanoRev' },
          offers: {
            '@type': 'Offer',
            url: `${SITE_URL}/product/${product.id}`,
            priceCurrency: 'MYR',
            price: product.price.toFixed(2),
            availability:
              product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
            { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE_URL}/shop` },
            ...(category
              ? [{ '@type': 'ListItem', position: 3, name: category.name, item: `${SITE_URL}/shop/${category.id}` }]
              : []),
            { '@type': 'ListItem', position: category ? 4 : 3, name: `${product.name} ${product.grade}` },
          ],
        },
      ]
    : []

  return (
    <>
      <JsonLd data={jsonLd} />
      <ProductView id={id} />
    </>
  )
}
