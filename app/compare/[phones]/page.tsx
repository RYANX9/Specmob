import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CompareClient from '@/app/components/compare/CompareClient'
import { api } from '@/lib/api'
import type { Phone } from '@/lib/types'

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
 * Improved similarity that handles the common case where the URL slug was
 * generated from the DB `slug` field (which may be brand-prefixed, e.g.
 * "samsung-galaxy-s24-ultra") while model_name produces a shorter candidate
 * ("galaxy-s24-ultra").  The original character-overlap algorithm gave a
 * negative score for that pair, dropping the phone.
 *
 * Priority:
 *   1. target ends with candidate  →  near-perfect score
 *   2. target contains candidate   →  strong score
 *   3. original character-overlap  →  fallback
 */
function similarity(target: string, candidate: string): number {
  if (target === candidate) return candidate.length

  if (target.endsWith(candidate)) {
    // e.g. target="samsung-galaxy-s24-ultra", candidate="galaxy-s24-ultra"
    return candidate.length - Math.abs(target.length - candidate.length) * 0.1
  }

  if (target.includes(candidate)) {
    return candidate.length * 0.85
  }

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
 * Resolves each URL slug to a distinct Phone.
 *
 * Pass 1 — exact match: checks both toSlug(model_name) and the DB slug field.
 *   The DB slug is what phoneSlug() uses when present, so the URL slug may not
 *   match the computed model_name slug at all.
 *
 * Pass 2 — fuzzy match: uses the improved similarity function with a lower
 *   threshold so brand-prefixed slugs are not silently dropped.
 */
async function resolvePhones(slugParts: string[]): Promise<Phone[]> {
  const candidateLists = await Promise.all(slugParts.map(searchCandidates))
  const claimed = new Set<number>()
  const resolved: (Phone | null)[] = new Array(slugParts.length).fill(null)

  // Pass 1: exact match against computed slug OR the DB slug field
  slugParts.forEach((slug, i) => {
    const target = slug.toLowerCase()
    const exact = candidateLists[i].find(p => {
      if (claimed.has(p.id)) return false
      if (toSlug(p.model_name) === target) return true
      if (p.slug != null && p.slug.toLowerCase() === target) return true
      return false
    })
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
    // Threshold lowered from 0.4 to 0.3 to tolerate brand-prefix length delta
    if (best && bestScore > target.length * 0.3) {
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
