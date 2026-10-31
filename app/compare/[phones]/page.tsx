// app/compare/[phones]/page.tsx
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import CompareClient from '@/app/components/compare/CompareClient'
import JsonLd from '@/app/components/JsonLd'
import { getComparePair } from '@/lib/api'
import { ROUTES, SITE_URL } from '@/lib/config'
import { buildMetadata, noindexMetadata } from '@/lib/seo'
import { buildBreadcrumbList } from '@/lib/structuredData'

export const revalidate = 86400

interface PageProps {
  params: Promise<{ phones: string }>
}

// Social previews truncate around 125 characters.
function clip(text: string, max = 125): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  const base = lastSpace > 60 ? cut.slice(0, lastSpace) : cut
  return `${base.replace(/[\s,;:.\-\u2013]+$/, '')}\u2026`
}

// Page titles get " | Specmob" appended by the root template (10 chars). The
// wording from the page guide ('{A} vs {B}: Specs, Price & Score Compared') is
// used whenever it fits; for long names (mostly 3-4 phone pairs) it is
// shortened step by step instead of being cut off in search results.
const TITLE_BUDGET_PAIR = 64
const TITLE_BUDGET_MULTI = 50

function compareTitle(phones: { brand: string; name: string; display_name: string }[]): string {
  // "Apple iPhone 17e vs Apple iPhone Air" -> "Apple iPhone 17e vs iPhone Air"
  const names = phones
    .map((p, i) => (i > 0 && p.brand === phones[i - 1].brand ? p.name : p.display_name))
    .join(' vs ')

  const candidates = [
    `${names}: Specs, Price & Score Compared`,
    `${names}: Specs & Score Compared`,
    `${names}: Compared`,
  ]
  const budget = phones.length <= 2 ? TITLE_BUDGET_PAIR : TITLE_BUDGET_MULTI
  return candidates.find(t => t.length <= budget) ?? candidates[candidates.length - 1]
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { phones: slug } = await params
  const res = await getComparePair(slug).catch(() => null)
  if (!res || 'redirect' in res) return noindexMetadata(`/compare/${slug}`, 'Compare phones')

  const names = res.phones.map(p => p.display_name).join(' vs ')
  const title = compareTitle(res.phones)
  const description =
    res.summary.text ??
    `Side-by-side comparison of ${names}. Camera, battery, performance and value scores with a clear verdict.`

  // Non-indexable pairs must still get the full title, description and social
  // tags (only robots changes). Returning noindexMetadata() here dropped
  // og:title/og:description, so social previews fell back to the homepage text.
  return buildMetadata({
    title,
    description: clip(description),
    path: res.canonical.path,
    // The generated 1200x630 card (./opengraph-image.tsx), NOT the first
    // phone's raw photo.
    image: `${SITE_URL.replace(/\/$/, '')}${res.canonical.path}/opengraph-image`,
    imageAlt: `${names} compared on Specmob`,
    noindex: !res.indexable,
  })
}

export default async function ComparePairPage({ params }: PageProps) {
  const { phones: slug } = await params
  const res = await getComparePair(slug)
  if (!res) notFound()
  if ('redirect' in res) permanentRedirect(res.redirect)
  if (res.canonical.path !== `/compare/${slug}`) permanentRedirect(res.canonical.path)

  const names = res.phones.map(p => p.display_name).join(' vs ')

  return (
    <>
      <JsonLd
        data={buildBreadcrumbList([
          { name: 'Home', path: ROUTES.home },
          { name: 'Compare', path: ROUTES.compare },
          { name: names, path: res.canonical.path },
        ])}
      />
      <CompareClient
        initialPhones={res.phones}
        initialVerdict={res.verdict}
        initialWinnerId={res.winner_id}
        nextSteps={res.next_steps}
      />
    </>
  )
}
