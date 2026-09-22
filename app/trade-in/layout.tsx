// app/trade-in/layout.tsx
import type { Metadata } from 'next'
import { ROUTES } from '@/lib/config'

export const metadata: Metadata = {
  title: 'Trade-In Value Estimator',
  description:
    "Get an estimated trade-in range for your phone based on its condition, battery health, functional issues, and the phone's live market price.",
  alternates: { canonical: ROUTES.tradein },
  openGraph: {
    title: 'Trade-In Value Estimator | Specmob',
    description:
      'Condition, battery health, functional issues — get an estimated trade-in range in under a minute.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trade-In Value Estimator | Specmob',
    description:
      'Condition, battery health, functional issues — get an estimated trade-in range in under a minute.',
  },
}

export default function TradeInLayout({ children }: { children: React.ReactNode }) {
  return children
}
