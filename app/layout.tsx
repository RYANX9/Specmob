// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Inter, Instrument_Serif } from 'next/font/google'
import { ToastProvider } from '@/app/components/Toast'
import { CompareProvider } from '@/lib/compareStore'
import DataNoticeBanner from '@/app/components/DataNoticeBanner'
import './globals.css'
import { SITE_URL } from '@/lib/config'
import { RegionProvider } from '@/lib/regionStore'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

const SITE_NAME = 'Specmob'
const SITE_DESCRIPTION =
  'No clutter. No discontinued junk. Find and compare phones you can actually buy today.'
const SOCIAL_DESCRIPTION = 'Compare phones side-by-side with honest specs and verdicts.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Find Your Next Phone`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: '2BjsGILrpbCz7V-WHptzI_bToLupKhUujS2aTGUJgQs',
  },
  icons: {
    icon: '/logored.svg',
    apple: '/logored.svg',
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Find Your Next Phone`,
    description: SOCIAL_DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Find Your Next Phone`,
    description: SOCIAL_DESCRIPTION,
    images: ['/og-image.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#15151F',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${instrumentSerif.variable}`}>
        <DataNoticeBanner />
        <RegionProvider>
        <ToastProvider>
          <CompareProvider>
            {children}
          </CompareProvider>
        </ToastProvider>
        </RegionProvider>
      </body>
    </html>
  )
}