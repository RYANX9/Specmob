// app/brand/[brand]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import JsonLd from '@/app/components/JsonLd'
import { api, getBrand } from '@/lib/api'
import { BRAND_PAGE_SIZE, ROUTES } from '@/lib/config'
import { formatUsd } from '@/lib/price'
import { buildMetadata, noindexMetadata, pageParam, pickSearchParam } from '@/lib/seo'
import { buildBreadcrumbList, buildCollectionPage, phoneEntries } from '@/lib/structuredData'
import BrandPageClient from '@/app/components/brand/BrandPageClient'
import { BRAND_SORTS } from '@/lib/brandSorts'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ brand: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const TIERS = new Set(['budget', 'mid_range', 'upper_mid_range', 'flagship', 'ultra_flagship'])

function readState(sp: Record<string, string | string[] | undefined>) {
  const sortParam = pickSearchParam(sp, 'sort')
  const sort = BRAND_SORTS.find(s => s.key === sortParam) ?? BRAND_SORTS[0]
  const tierParam = pickSearchParam(sp, 'tier')
  const tier = tierParam && TIERS.has(tierParam) ? tierParam : null
  return { sort, tier, page: pageParam(sp) }
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { brand: slug } = await params
  const stats = await getBrand(slug)
  if (!stats) return { title: 'Brand not found', robots: { index: false, follow: true } }

  const { sort, tier, page } = readState(await searchParams)
  const filtered = sort.key !== 'newest' || !!tier
  const title = `${stats.brand} Phones: Specs, Prices & Scores`
  const range =
    stats.price_range.min != null && stats.price_range.max != null
      ? `, priced from ${formatUsd(stats.price_range.min)} to ${formatUsd(stats.price_range.max)}`
      : ''
  const top = stats.top_phones[0]
  const description =
    `Browse ${stats.total_phones} ${stats.brand} phones${range}. ` +
    `${top ? `Top rated: ${top.display_name}. ` : ''}Compare specs, prices and scores on Specmob.`

  if (filtered || !stats.indexable) return noindexMetadata(stats.path, title)

  const meta = buildMetadata({
    title: page > 1 ? `${title} (Page ${page})` : title,
    description,
    path: page > 1 ? `${stats.path}?page=${page}` : stats.path,
    image: top?.main_image_url,
    imageAlt: top?.display_name,
  })
  return meta
}

export default async function BrandPage({ params, searchParams }: PageProps) {
  const { brand: slug } = await params
  const stats = await getBrand(slug)
  if (!stats) notFound()

  const { sort, tier, page } = readState(await searchParams)
  const list = await api.brands
    .phones(stats.brand_slug, {
      sort_by: sort.sort_by,
      sort_order: sort.sort_order,
      tier: tier ?? undefined,
      page,
      page_size: BRAND_PAGE_SIZE,
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
      <BrandPageClient
        key={`${slug}-${page}-${sort.key}-${tier ?? ''}`}
        stats={stats}
        phones={phones}
        total={list?.total ?? 0}
        page={page}
        totalPages={list?.total_pages ?? 1}
        sortKey={sort.key}
        tier={tier}
        basePath={stats.path}
      />
    </>
  )
}
