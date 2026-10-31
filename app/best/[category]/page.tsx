// app/best/[category]/page.tsx
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import CategoryPageClient, { type BuyOffer } from '@/app/components/category/CategoryPageClient'
import JsonLd from '@/app/components/JsonLd'
import { api, getCategory } from '@/lib/api'
import { ROUTES } from '@/lib/config'
import { SITE_URL } from "@/lib/config"
import { buildMetadata, noindexMetadata } from '@/lib/seo'
import { categoryDescription, categoryLede, categoryTitle } from '@/lib/categoryCopy'
import { buildBreadcrumbList, buildItemList, phoneEntries } from '@/lib/structuredData'
import type { CategoryDetail } from '@/lib/types'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ category: string }>
}

function monthLabel(): string {
  return new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

function latestYear(data: CategoryDetail): number {
  const years = data.phones.map(p => p.release_year).filter((y): y is number => !!y)
  return years.length ? Math.max(...years) : new Date().getFullYear()
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: slug } = await params
  const data = await getCategory(slug)
  if (!data) return { title: 'Best Phones', robots: { index: false, follow: true } }

  const year = latestYear(data)
  const title = categoryTitle(data, year)
  const description = categoryDescription(data)

  if (!data.indexable) return noindexMetadata(data.path, title)
  return buildMetadata({
    title,
    description,
    path: data.path,
    image: `${SITE_URL}${data.path}/opengraph-image`,
    imageAlt: `${title} on Specmob`,
  })
}

export default async function CategoryPage({ params }: PageProps) {
  const { category: slug } = await params
  const [data, list] = await Promise.all([
    getCategory(slug),
    api.categories.list().catch(() => null),
  ])
  if (!data) notFound()
  if (data.alias_of) permanentRedirect(data.path)

  const buy: Record<number, BuyOffer | undefined> = data.buy ?? {}
  const tradeOff = data.top_weakness ?? null
  const year = latestYear(data)
  const updatedLabel = monthLabel()
  const name = `${data.title} ${year}`

  return (
    <>
      <JsonLd
        data={buildBreadcrumbList([
          { name: 'Home', path: ROUTES.home },
          { name: 'Best Phones', path: ROUTES.best },
          { name, path: data.path },
        ])}
      />
      <JsonLd data={data.phones.length ? buildItemList(name, phoneEntries(data.phones), categoryDescription(data)) : null} />
      <CategoryPageClient
        data={data}
        categories={list?.categories ?? []}
        year={year}
        updatedLabel={updatedLabel}
        lede={categoryLede(data)}
        tradeOff={tradeOff}
        buy={buy}
      />
    </>
  )
}
