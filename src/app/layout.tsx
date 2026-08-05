import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { SITE_URL } from '@/data/company'
import Providers from './providers'
import './globals.css'

// Self-hosted by Next at build time — no render-blocking request to Google.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'NanoRev — Nano Revolution Autolube',
  description:
    'NanoRev Malaysia — Nano Revolution Autolube. Fully synthetic engine oils, motorcycle & diesel lubricants, gear oils, grease and additives. Distributor & dealer supply across Malaysia.',
  icons: { icon: '/favicon.svg' },
}

export const viewport: Viewport = {
  themeColor: '#14161c',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
