import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import JsonLd from '@/app/components/JsonLd'
import BrandPageClient from '@/app/components/brand/BrandPageClient'
import { api, getBrand } from '@/lib/api'
import { BRAND_PHONES_LIMIT, ROUTES } from '@/lib/config'
import { formatUsd } from '@/lib/price'
import { buildMetadata, noindexMetadata } from '@/lib/seo'
import { buildBreadcrumbList, buildCollectionPage, phoneEntries } from '@/lib/structuredData'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ brand: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brand: slug } = await params
  const stats = await getBrand(slug)
  if (!stats) return { title: 'Brand not found', robots: { index: false, follow: true } }

  const title = `${stats.brand} Phones: Specs, Prices & Scores`
  if (!stats.indexable) return noindexMetadata(stats.path, title)

  const range =
    stats.price_range.min != null && stats.price_range.max != null
      ? `, priced from ${formatUsd(stats.price_range.min)} to ${formatUsd(stats.price_range.max)}`
      : ''
  const top = stats.top_phones[0]

  return buildMetadata({
    title,
    description:
      `Browse ${stats.total_phones} ${stats.brand} phones${range}. ` +
      `${top ? `Top rated: ${top.display_name}. ` : ''}Compare specs, prices and scores on Specmob.`,
    path: stats.path,
    image: top?.main_image_url,
    imageAlt: top?.display_name,
  })
}

export default async function BrandPage({ params }: PageProps) {
  const { brand: slug } = await params
  const stats = await getBrand(slug)
  if (!stats) notFound()

  const list = await api.brands
    .phones(stats.brand_slug, {
      sort_by: 'release_year',
      sort_order: 'desc',
      page: 1,
      page_size: BRAND_PHONES_LIMIT,
    })
    .catch(() => null)

  const phones = list?.results ?? []

  return (
    <>
      <JsonLd
        data={buildBreadcrumbList([
          { name: 'Home', path: ROUTES.home },
          { name: 'Brands', path: ROUTES.brands },
          { name: stats.brand, path: stats.path },
        ])}
      />
      <JsonLd
        data={buildCollectionPage(
          `${stats.brand} phones`,
          stats.path,
          `${stats.total_phones} ${stats.brand} phones with specs, prices and scores.`,
          phoneEntries(phones),
        )}
      />
      <BrandPageClient stats={stats} phones={phones} />
    </>
  )
}
