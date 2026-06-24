import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CompareClient from '@/app/components/compare/CompareClient'
import { api } from '@/lib/api'
import type { Phone } from '@/lib/types'

// ISR — slug-to-phone mappings change only when new phones are added.
// Revalidate every hour; fully dynamic was unnecessary and prevented caching.
export const revalidate = 3600

interface PageProps {
  params: Promise<{ phones: string }>
}

function parseCompareSlug(slug: string): string[] {
  return slug.split('-vs-').filter(Boolean)
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function toReadable(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/**
 * Character-overlap similarity, penalised by length mismatch so a short slug
 * cannot outscore an exact match against a longer sibling.
 */
function similarity(target: string, candidate: string): number {
  let score = 0
  let ti = 0
  for (let ci = 0; ci < candidate.length && ti < target.length; ci++) {
    if (candidate[ci] === target[ti]) { score++; ti++ }
  }
  return score - Math.abs(candidate.length - target.length) * 0.5
}

async function searchCandidates(slug: string): Promise<Phone[]> {
  try {
    const res = await api.phones.search({ q: slug.replace(/-/g, ' '), page_size: 10 })
    return res.results
  } catch {
    return []
  }
}

/**
 * Resolves each slug to a distinct phone.
 * Exact slug matches are claimed first; remaining slugs fall back to
 * best-effort fuzzy matching among unclaimed candidates.
 *
 * Note: the same fuzzy matching logic also lives in
 * app/brand/[brand]/[model]/page.tsx. Both should eventually be replaced
 * by an exact server-side slug index, which the backend already supports
 * for the /phones/compare?slugs= endpoint.
 */
async function resolvePhones(slugParts: string[]): Promise<Phone[]> {
  const candidateLists = await Promise.all(slugParts.map(searchCandidates))
  const claimed = new Set<number>()
  const resolved: (Phone | null)[] = new Array(slugParts.length).fill(null)

  // Pass 1: exact slug matches
  slugParts.forEach((slug, i) => {
    const target = slug.toLowerCase()
    const exact = candidateLists[i].find(p => !claimed.has(p.id) && toSlug(p.model_name) === target)
    if (exact) { resolved[i] = exact; claimed.add(exact.id) }
  })

  // Pass 2: fuzzy matching for any unresolved slugs
  slugParts.forEach((slug, i) => {
    if (resolved[i]) return
    const target = slug.toLowerCase()
    let best: Phone | null = null
    let bestScore = -Infinity
    for (const p of candidateLists[i]) {
      if (claimed.has(p.id)) continue
      const s = similarity(target, toSlug(p.model_name))
      if (s > bestScore) { bestScore = s; best = p }
    }
    if (best && bestScore > target.length * 0.4) {
      resolved[i] = best
      claimed.add(best.id)
    }
  })

  return resolved.filter((p): p is Phone => p !== null)
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
    twitter: { card: 'summary', title, description },
  }
}

export default async function CompareWithPhonesPage({ params }: PageProps) {
  const { phones: phonesSlug } = await params

  if (!phonesSlug?.trim()) return <CompareClient initialPhones={[]} />

  const slugParts = parseCompareSlug(phonesSlug)
  if (slugParts.length === 0) return <CompareClient initialPhones={[]} />

  const validPhones = await resolvePhones(slugParts)
  if (validPhones.length === 0) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',    item: 'https://mobylite.vercel.app' },
      { '@type': 'ListItem', position: 2, name: 'Compare', item: 'https://mobylite.vercel.app/compare' },
      { '@type': 'ListItem', position: 3, name: validPhones.map(p => p.model_name).join(' vs '), item: `https://mobylite.vercel.app/compare/${phonesSlug}` },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CompareClient initialPhones={validPhones} />
    </>
  )
}
