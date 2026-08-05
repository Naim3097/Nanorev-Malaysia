import type { Metadata } from 'next'
import JsonLd from '@/components/JsonLd'
import { SITE_URL, company } from '@/data/company'
import HomeView from './HomeView'

export const metadata: Metadata = {
  title: 'NanoRev Malaysia — Engine Oil, Lubricants & Nano Additives | Nano Revolution Autolube',
  description:
    'Official NanoRev store — fully synthetic engine oil, motorcycle & diesel lubricants, gear oil, coolant and nano additives. Dealer & workshop pricing. Same-day dispatch from Shah Alam across Malaysia.',
  keywords:
    'minyak enjin, engine oil Malaysia, lubricant distributor Malaysia, minyak hitam, aditif enjin, workshop supplier, dealer minyak enjin, NanoRev',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_MY',
    siteName: company.name,
    url: '/',
    images: [`${SITE_URL}/nanorev-logo.png`],
  },
}

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={[
          {
            '@type': 'Organization',
            name: company.name,
            legalName: company.legal,
            url: SITE_URL,
            logo: `${SITE_URL}/nanorev-logo.png`,
            address: {
              '@type': 'PostalAddress',
              addressLocality: 'Shah Alam',
              addressRegion: 'Selangor',
              addressCountry: 'MY',
            },
          },
          {
            '@type': 'WebSite',
            name: company.name,
            url: SITE_URL,
            potentialAction: {
              '@type': 'SearchAction',
              target: `${SITE_URL}/shop?q={search_term_string}`,
              'query-input': 'required name=search_term_string',
            },
          },
        ]}
      />
      <HomeView />
    </>
  )
}
