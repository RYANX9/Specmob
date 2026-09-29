// app/best/[category]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CategoryPageClient from '@/app/components/category/CategoryPageClient'
import JsonLd from '@/app/components/JsonLd'
import { api } from '@/lib/api'
import { ROUTES, SITE_URL } from '@/lib/config'
import {
  CATEGORY_SEO,
  categoryDescription,
  categoryTitle,
  latestReleaseYear,
} from '@/lib/categorySeo'
import { buildBreadcrumbList, buildProductItemList } from '@/lib/structuredData'
import type { CategoryResult } from '@/lib/types'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ category: string }>
}

const SOCIAL_IMAGES = ['/og-image.png']

async function getCategory(slug: string): Promise<CategoryResult | null> {
  try {
    return await api.categories.get(slug, 10)
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: slug } = await params
  if (!CATEGORY_SEO[slug]) return { title: 'Best Phones' }

  const phones = (await getCategory(slug))?.phones ?? []
  const year = latestReleaseYear(phones)
  const title = categoryTitle(slug, year)
  const description = categoryDescription(slug, year, phones)
  const socialTitle = `${title} | Specmob`

  return {
    title,
    description,
    openGraph: { title: socialTitle, description, images: SOCIAL_IMAGES },
    twitter: { card: 'summary_large_image', title: socialTitle, description, images: SOCIAL_IMAGES },
    alternates: { canonical: ROUTES.category(slug) },
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { category: slug } = await params
  const seo = CATEGORY_SEO[slug]
  if (!seo) notFound()

  const data = await getCategory(slug)
  const phones = data?.phones ?? []
  const name = `${seo.heading} ${latestReleaseYear(phones)}`

  return (
    <>
      <JsonLd
        data={buildBreadcrumbList([
          { name: 'Home', url: SITE_URL },
          { name, url: `${SITE_URL}${ROUTES.category(slug)}` },
        ])}
      />
      <JsonLd data={phones.length > 0 ? buildProductItemList(name, phones, seo.basis) : null} />
      <CategoryPageClient slug={slug} initialData={data} />
    </>
  )
}
