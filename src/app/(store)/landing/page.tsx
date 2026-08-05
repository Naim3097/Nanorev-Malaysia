import type { Metadata } from 'next'
import LandingTemplateView from './LandingTemplateView'

export const metadata: Metadata = {
  title: 'NanoRev Engine Oil — Protect Your Engine | NanoRev Malaysia',
  description:
    'Fully synthetic NanoRev engine oil, engineered for Malaysian heat and stop-start traffic. Official distributor stock, same-day dispatch from Shah Alam.',
  alternates: { canonical: '/landing' },
}

export default function LandingTemplatePage() {
  return <LandingTemplateView />
}
