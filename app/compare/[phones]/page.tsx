import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CompareClient from '@/app/components/compare/CompareClient'
import { parseCompareSlug, resolveComparePhones } from '@/lib/api'
import { SITE_URL, ROUTES } from '@/lib/config'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ phones: string }>
}

function toReadable(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { phones: phonesSlug } = await params
  if (!phonesSlug?.trim()) return { title: 'Compare Phones' }

  const slugParts = parseCompareSlug(phonesSlug)
  if (slugParts.length === 0) return { title: 'Compare Phones' }

  const readableNames = slugParts.map(toReadable)
  const title       = `Compare: ${readableNames.join(' vs ')}`
  const description = `Side-by-side spec comparison of ${readableNames.join(' vs ')}. Camera, battery, performance, and value scores.`

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function CompareWithPhonesPage({ params }: PageProps) {
  const { phones: phonesSlug } = await params

  if (!phonesSlug?.trim()) return <CompareClient initialPhones={[]} />

  const slugParts = parseCompareSlug(phonesSlug)
  if (slugParts.length === 0) return <CompareClient initialPhones={[]} />

  const { phones: validPhones, verdict } = await resolveComparePhones(slugParts)
  if (validPhones.length === 0) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',    item: `${SITE_URL}` },
      { '@type': 'ListItem', position: 2, name: 'Compare', item: `${SITE_URL}${ROUTES.compare()}` },
      { '@type': 'ListItem', position: 3, name: validPhones.map(p => p.model_name).join(' vs '), item: `${SITE_URL}/compare/${phonesSlug}` },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CompareClient initialPhones={validPhones} initialVerdict={verdict} />
    </>
  )
}
