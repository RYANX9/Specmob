// app/trade-in/page.tsx
import type { Metadata } from 'next'
import JsonLd from '@/app/components/JsonLd'
import TradeInClient from '@/app/components/trade-in/TradeInClient'
import TradeInInfo from '@/app/components/trade-in/TradeInInfo'
import { ROUTES } from '@/lib/config'
import { buildMetadata } from '@/lib/seo'
import { buildBreadcrumbList } from '@/lib/structuredData'

export const metadata: Metadata = buildMetadata({
  title: 'Phone Trade-In Value Estimator: What Is Your Phone Worth?',
  description:
    'Get an estimated trade-in range for your phone from its screen, body and battery condition and any faults. An estimate based on tracked prices, not a buyback offer.',
  path: ROUTES.tradein,
})

export default function TradeInPage() {
  return (
    <>
      <JsonLd data={buildBreadcrumbList([{ name: 'Home', path: ROUTES.home }, { name: 'Trade-in estimator', path: ROUTES.tradein }])} />
      <TradeInClient>
        <TradeInInfo />
      </TradeInClient>
    </>
  )
}
