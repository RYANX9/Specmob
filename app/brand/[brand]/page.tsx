// app/brand/[brand]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { api } from '@/lib/api'
import { ROUTES, SITE_URL } from '@/lib/config'
import { parseFilterParams } from '@/lib/filterParams'
import { getBrandInfo } from '@/lib/brandData'
import BrandPageClient from '@/app/components/brand/BrandPageClient'
import JsonLd from '@/app/components/JsonLd'
import { buildBreadcrumbList, buildProductItemList } from '@/lib/structuredData'
import type { SearchFilters, BrandStats } from '@/lib/types'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ brand: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const SORT_OPTIONS = [
  { value: 'release_year',     order: 'desc' as const },
  { value: 'release_year',     order: 'asc' as const },
  { value: 'price_usd',        order: 'asc' as const },
  { value: 'price_usd',        order: 'desc' as const },
  { value: 'main_camera_mp',   order: 'desc' as const },
  { value: 'battery_capacity', order: 'desc' as const },
  { value: 'antutu_score',     order: 'desc' as const },
]

const PAGE_SIZE = 24

function toURLSearchParams(sp: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === 'string') params.set(k, v)
  }
  return params
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brand } = await params
  const info = getBrandInfo(brand)

  const brandName = info?.name ?? brand.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const title = `${brandName} Phones — Specs, Prices & Comparisons`
  const description = info?.description
    ? info.description.slice(0, 160)
    : `Browse ${brandName} smartphones. Compare full specs, prices, and alternatives on Specmob.`

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical: `${SITE_URL}${ROUTES.brand(brand)}` },
  }
}

export default async function BrandPage({ params, searchParams }: PageProps) {
  const { brand: slug } = await params
  const sp = toURLSearchParams(await searchParams)
  const brandWords = slug.replace(/-/g, ' ')

  const stats = await api.brands.detail(slug).catch(() => null as BrandStats | null)
  if (!stats) notFound()

  const filters: SearchFilters = parseFilterParams(sp)
  const rawPage = parseInt(sp.get('page') ?? '1', 10)
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1
  const rawSort = parseInt(sp.get('sort') ?? '0', 10)
  const sortIdx = Number.isFinite(rawSort) && rawSort >= 0 && rawSort < SORT_OPTIONS.length ? rawSort : 0
  const sort = SORT_OPTIONS[sortIdx]

  const [latestRes, phonesRes] = await Promise.all([
    api.brands.phones(slug, { sort_by: 'release_year', sort_order: 'desc', page: 1, page_size: 12 }),
    api.phones.search({
      brand: brandWords,
      ...filters,
      sort_by: sort.value,
      sort_order: sort.order,
      page,
      page_size: PAGE_SIZE,
    }),
  ])

  const brandHref = `${SITE_URL}${ROUTES.brand(slug)}`
  const collectionPage = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${stats.brand} Phones`,
    url: brandHref,
  }

  return (
    <>
      <JsonLd data={collectionPage} />
      <JsonLd
        data={buildBreadcrumbList([
          { name: 'Home', url: SITE_URL },
          { name: stats.brand, url: brandHref },
        ])}
      />
      <JsonLd
        data={
          latestRes.results.length > 0
            ? buildProductItemList(`Latest ${stats.brand} Phones`, latestRes.results)
            : null
        }
      />
      <BrandPageClient
        key={slug}
        slug={slug}
        brandName={brandWords}
        initialStats={stats}
        initialLatest={latestRes.results}
        initialPhones={phonesRes.results}
        initialTotal={phonesRes.total}
        initialFilters={filters}
        initialPage={page}
        initialSortIdx={sortIdx}
      />
    </>
  )
}
