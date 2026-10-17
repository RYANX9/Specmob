// app/page.tsx
import type { Metadata } from 'next'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import JsonLd from '@/app/components/JsonLd'
import PriceDial from '@/app/components/home/PriceDial'
import { MostViewed } from '@/app/components/home/TrendingTabs'
import UpcomingTabs from '@/app/components/home/UpcomingTabs'
import { BestTiles, BrandsRow, HOME_CSS, MostComparedSets, TradeInBanner, TrustStrip } from '@/app/components/home/HomeSections'
import { api } from '@/lib/api'
import { buildMetadata } from '@/lib/seo'
import { buildItemList, buildOrganization, buildWebSite, phoneEntries } from '@/lib/structuredData'
import { DEFAULT_DIAL_VALUE } from '@/lib/priceTiers'
import { c } from '@/lib/tokens'
import type { BestHubTile, ComparePair, FilterStats, HomeBlock, HomeBrandItem, HomeResponse, Phone } from '@/lib/types'

export const revalidate = 900

export const metadata: Metadata = buildMetadata({
  title: 'Specmob: Find the Best Phone for Your Budget',
  description:
    'Set your budget, pick what matters, and see the top-rated phone instantly. Compare specs and prices, ranked on hardware, never on sponsors.',
  path: '/',
  absoluteTitle: true,
})

function block<T>(home: HomeResponse | null, id: HomeBlock['id']): T[] {
  const found = home?.blocks.find(b => b.id === id)
  return (found?.items ?? []) as unknown as T[]
}

export default async function HomePage() {
  const [home, stats, pick] = await Promise.all([
    api.discover.home().catch(() => null),
    api.filters.stats().catch((): FilterStats | null => null),
    api.phones.recommend({ budget: DEFAULT_DIAL_VALUE, limit: 1 }).then(r => r.phones[0] ?? null).catch(() => null),
  ])

  const tiles = block<BestHubTile>(home, 'categories')
  const compared = block<ComparePair>(home, 'most_compared')
  const viewed = block<Phone>(home, 'most_viewed')
  const upcoming = block<Phone>(home, 'coming_soon')
  const brands = block<HomeBrandItem>(home, 'brands')

  return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <JsonLd data={buildWebSite()} />
      <JsonLd data={buildOrganization()} />
      <JsonLd data={viewed.length ? buildItemList('Most viewed phones', phoneEntries(viewed)) : null} />

      <Navbar />

      <main>
        <PriceDial initialPick={pick} />
        <TrustStrip stats={stats} />
        <BestTiles tiles={tiles} />
        <MostViewed phones={viewed} />
        <MostComparedSets pairs={compared} />
        <UpcomingTabs phones={upcoming} />
        <BrandsRow brands={brands} />
        <TradeInBanner />
        <div style={{ height: 72 }} />
      </main>

      <Footer />
      <style>{HOME_CSS}</style>
    </div>
  )
}