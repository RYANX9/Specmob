// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { DM_Serif_Display, Instrument_Serif } from 'next/font/google'
import localFont from 'next/font/local'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { GoogleAnalytics } from '@next/third-parties/google'
import { ToastProvider } from '@/app/components/Toast'
import { CompareProvider } from '@/lib/compareStore'
import PageViewTracker from '@/app/components/PageViewTracker'
import DataNoticeBanner from '@/app/components/DataNoticeBanner'
import './globals.css'
import { SITE_URL } from '@/lib/config'
import { RegionProvider } from '@/lib/regionStore'

// Google Sans: self-hosted Latin subset of the Google Fonts variable file (wght 400-700).
// next/font/google only lists "Google Sans" from Next 16, so we load it locally on Next 15.
const sans = localFont({
  src: './fonts/GoogleSans-Variable.woff2',
  weight: '400 700',
  style: 'normal',
  variable: '--font-sans',
  display: 'swap',
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
})

const serif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

// Italic wordmark only ("Specmob."). Regular Instrument Serif is no longer loaded.
const wordmark = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: 'italic',
  variable: '--font-wordmark',
  display: 'swap',
})

const SITE_NAME = 'Specmob'
const SITE_DESCRIPTION =
  'Compare phone specs, prices and scores. Ranked on hardware, never on sponsors.'
const SOCIAL_DESCRIPTION = 'Compare phones side-by-side with honest specs and verdicts.'
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID ?? 'G-T7WV2C51YF'

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable} ${wordmark.variable}`}>
        <DataNoticeBanner />
        <RegionProvider>
          <ToastProvider>
            <CompareProvider>
              {children}
            </CompareProvider>
          </ToastProvider>
        </RegionProvider>
        <PageViewTracker />
        <Analytics endpoint="/va/view" scriptSrc="/va/script.js" />
        <SpeedInsights />
        <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />
      </body>
    </html>
  )
}
