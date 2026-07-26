// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { Geist, Instrument_Serif } from 'next/font/google'
import { ToastProvider } from '@/app/components/Toast'
import { CompareProvider } from '@/lib/compareStore'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import CompareBar from '@/app/components/CompareBar'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
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

const SITE_URL = 'https://Specmob.vercel.app'
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
  themeColor: '#1A1A2E',
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
      <body className={`${geist.variable} ${instrumentSerif.variable}`}>
        <ToastProvider>
          <CompareProvider>
            {/* Navbar uses useSearchParams, which requires a Suspense boundary
                on the segment that renders it. Previously each page supplied
                this implicitly (Navbar was rendered inside that page's own
                Suspense wrapper). Now that Navbar sits above {children} in
                the tree, it needs its own boundary here. */}
            <Suspense fallback={<div style={{ height: 'var(--nav-h)' }} />}>
              <Navbar />
            </Suspense>
            {children}
            <Footer />
            <CompareBar />
          </CompareProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
