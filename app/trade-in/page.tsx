import type { Metadata } from 'next'
import { SITE_URL, ROUTES } from '@/lib/config'
import TradeInClient from '@/app/components/trade-in/TradeInClient'

export const metadata: Metadata = {
  title: "What's Your Phone Worth? | Trade-In Value Estimator",
  description:
    'Get an instant, honest trade-in estimate for your phone. Describe its screen, body, and battery condition and see a fair value range based on live market prices.',
  alternates: {
    canonical: `${SITE_URL}${ROUTES.tradein}`,
  },
  openGraph: {
    title: "What's Your Phone Worth?",
    description:
      'Search your model, describe its condition, and get an instant estimated trade-in range based on live market data.',
    url: `${SITE_URL}${ROUTES.tradein}`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "What's Your Phone Worth?",
    description:
      'Search your model, describe its condition, and get an instant estimated trade-in range based on live market data.',
  },
}

export default function TradeInPage() {
  return <TradeInClient />
}
