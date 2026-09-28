// app/best/[category]/page.tsx

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CategoryPageClient from '@/app/components/category/CategoryPageClient'
import { api } from '@/lib/api'
import { ROUTES, SITE_URL, brandSlug, phoneSlug, buildFullDisplayName } from '@/lib/config'
import {
  CATEGORY_SEO,
  categoryDescription,
  categoryTitle,
  latestReleaseYear,
  type RankedPhone,
} from '@/lib/categorySeo'
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

function buildItemListJsonLd(name: string, description: string, phones: RankedPhone[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    description,
    numberOfItems: phones.length,
    itemListElement: phones.map((phone, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: buildFullDisplayName(phone),
      url: `${SITE_URL}${ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone))}`,
    })),
  }
}

function buildBreadcrumbJsonLd(name: string, slug: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name, item: `${SITE_URL}${ROUTES.category(slug)}` },
    ],
  }
}

function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
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
      <JsonLd data={buildBreadcrumbJsonLd(name, slug)} />
      {phones.length > 0 && <JsonLd data={buildItemListJsonLd(name, seo.basis, phones)} />}
      <CategoryPageClient slug={slug} initialData={data} />
    </>
  )
}
