// app/page.tsx
import type { Metadata } from 'next'
import HomeClient from '@/app/components/home/HomeClient'
import { api } from '@/lib/api'
import { TRENDING_LIMIT } from '@/lib/config'
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

function buildTrendingJsonLd(trending: Phone[]) {
  if (trending.length === 0) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Trending Phones',
    itemListElement: trending.map((phone, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: `${phone.brand} ${phone.model_name}`,
        brand: { '@type': 'Brand', name: phone.brand },
        ...(phone.price_usd != null && {
          offers: {
            '@type': 'Offer',
            price: phone.price_usd,
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
          },
        }),
      },
    })),
  }
}

export default async function Page() {
  const [trending, stats] = await Promise.all([getTrending(), getStats()])
  const jsonLd = buildTrendingJsonLd(trending)

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <HomeClient initialTrending={trending} initialStats={stats} />
    </>
  )
}
