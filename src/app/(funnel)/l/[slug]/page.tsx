import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import JsonLd from '@/components/JsonLd'
import { SITE_URL, company } from '@/data/company'
import { readStore } from '@/server/read'
import { resolveSlug } from '@/server/resolve'
import LandingView from './LandingView'
import type { FaqProps } from '@/types'

// Public landing pages. This route deliberately takes no searchParams —
// reading them would opt the whole route out of static generation. Draft
// preview lives at /l/[slug]/preview instead.

type Params = Promise<{ slug: string }>

async function resolve(slug: string) {
  return resolveSlug(await readStore(), slug)
}

// Pre-render every live landing page at build time. An unreachable store
// during the build simply defers every page to request time.
export async function generateStaticParams() {
  try {
    const data = await readStore()
    return data.links
      .filter((l) => l.active && resolveSlug(data, l.slug))
      .map((l) => ({ slug: l.slug }))
  } catch {
    return []
  }
}

// Landing copy changes through the admin builder, not a deploy — so serve
// from cache and re-check hourly rather than pinning to build time.
export const revalidate = 3600
export const dynamicParams = true

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const resolved = await resolve(slug)
  if (!resolved) return {}

  const { page, product, canonicalSlug } = resolved
  const image = product.image ? `${SITE_URL}${product.image}` : undefined
  return {
    title: page.seo.title,
    description: page.seo.description,
    keywords: page.seo.keywords,
    alternates: { canonical: `/l/${canonicalSlug}` },
    openGraph: {
      type: 'website',
      locale: 'ms_MY',
      siteName: company.name,
      title: page.seo.title,
      description: page.seo.description,
      url: `/l/${canonicalSlug}`,
      ...(image ? { images: [image] } : {}),
    },
    other: {
      'geo.region': 'MY-10',
      'geo.placename': 'Shah Alam, Selangor, Malaysia',
      'geo.position': '3.0733;101.5185',
      ICBM: '3.0733, 101.5185',
    },
  }
}

export default async function LandingPage({ params }: { params: Params }) {
  const { slug } = await params
  const resolved = await resolve(slug)
  if (!resolved) notFound()

  const { page, product, canonicalSlug } = resolved
  const image = product.image ? `${SITE_URL}${product.image}` : undefined
  const faq = page.sections.find((s) => s.type === 'faq')
  const faqItems = (faq?.props as FaqProps | undefined)?.items ?? []

  return (
    <>
      <JsonLd
        data={[
          {
            '@type': 'Product',
            name: product.name,
            description: page.seo.description,
            ...(image ? { image } : {}),
            brand: { '@type': 'Brand', name: 'NanoRev' },
            offers: {
              '@type': 'Offer',
              url: `${SITE_URL}/l/${canonicalSlug}`,
              priceCurrency: 'MYR',
              price: product.price.toFixed(2),
              availability:
                product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
              seller: { '@type': 'Organization', name: company.legal },
            },
          },
          ...(faqItems.length
            ? [{
                '@type': 'FAQPage',
                mainEntity: faqItems.map((f) => ({
                  '@type': 'Question',
                  name: f.q,
                  acceptedAnswer: { '@type': 'Answer', text: f.a },
                })),
              }]
            : []),
        ]}
      />
      <LandingView slug={slug} resolved={resolved} />
    </>
  )
}
