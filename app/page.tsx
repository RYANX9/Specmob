// app/page.tsx
import type { Metadata } from 'next'
import HomeClient from '@/app/components/home/HomeClient'
import JsonLd from '@/app/components/JsonLd'
import { api } from '@/lib/api'
import { TRENDING_LIMIT } from '@/lib/config'
import { buildProductItemList } from '@/lib/structuredData'
import type { Phone, FilterStats } from '@/lib/types'

export const revalidate = 900

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

async function getTrending(): Promise<Phone[]> {
  try {
    const res = await api.phones.trending(TRENDING_LIMIT)
    return res.phones
  } catch {
    return []
  }
}

async function getStats(): Promise<FilterStats | null> {
  try {
    return await api.filters.stats()
  } catch {
    return null
  }
}

export default async function Page() {
  const [trending, stats] = await Promise.all([getTrending(), getStats()])

  return (
    <>
      <JsonLd data={trending.length ? buildProductItemList('Trending Phones', trending) : null} />
      <HomeClient initialTrending={trending} initialStats={stats} />
    </>
  )
}
