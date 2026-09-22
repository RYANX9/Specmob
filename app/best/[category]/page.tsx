// app/best/[category]/page.tsx

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CategoryPageClient from '@/app/components/category/CategoryPageClient'
import { api } from '@/lib/api'
import { ROUTES } from '@/lib/config'
import type { CategoryResult } from '@/lib/types'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ category: string }>
}

const CATEGORY_TITLES: Record<string, string> = {
  'camera-phones':  'Best Camera Phones',
  'battery-life':   'Best Battery Life Phones',
  'gaming-phones':  'Best Gaming Phones',
  'under-300':      'Best Phones Under $300',
  'under-500':      'Best Phones Under $500',
  'lightweight':    'Lightest Smartphones',
  'foldables':      'Best Foldable Phones',
  'compact-phones': 'Best Compact Phones',
  'fast-charging':  'Fastest Charging Phones',
}

async function getCategory(slug: string): Promise<CategoryResult | null> {
  try {
    return await api.categories.get(slug, 10)
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: slug } = await params
  const title = CATEGORY_TITLES[slug]
  if (!title) return { title: 'Best Phones' }

  const data = await getCategory(slug)
  const year = data?.phones.reduce((max, p) => Math.max(max, p.release_year ?? 0), 0) || new Date().getFullYear()
  const description = data?.description ?? `${title} ${year}, ranked by specs.`

  return {
    title: `${title} ${year}`,
    description,
    openGraph: { title: `${title} ${year}`, description },
    twitter: { card: 'summary', title: `${title} ${year}`, description },
    alternates: { canonical: ROUTES.category(slug) },
  }
}

function buildItemListJsonLd(slug: string, title: string, data: CategoryResult) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    description: data.description,
    numberOfItems: data.phones.length,
    itemListElement: data.phones.map((phone, i) => ({
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

export default async function CategoryPage({ params }: PageProps) {
  const { category: slug } = await params
  if (!CATEGORY_TITLES[slug]) notFound()

  const data = await getCategory(slug)
  const jsonLd = data ? buildItemListJsonLd(slug, CATEGORY_TITLES[slug], data) : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <CategoryPageClient slug={slug} initialData={data} />
    </>
  )
}
