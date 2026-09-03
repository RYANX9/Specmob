import type { Metadata } from 'next'
import CompareClient from '@/app/components/compare/CompareClient'
import { api } from '@/lib/api'
import type { Phone } from '@/lib/types'

export const revalidate = 900

export const metadata: Metadata = {
  title: 'Compare Phones Side by Side',
  description:
    'Compare up to 4 smartphones side by side. Specs, benchmark scores, value ratings, and category winners highlighted in one view.',
  openGraph: {
    title: 'Compare Phones Side by Side | Specmob',
    description:
      'Compare up to 4 smartphones with detailed specs, winners highlighted, and honest verdicts.',
  },
  twitter: {
    card: 'summary',
    title: 'Compare Phones | Specmob',
    description: 'Side-by-side spec comparison for up to 4 smartphones.',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Phone Comparison Tool',
  description:
    'Compare smartphones side by side with specs, benchmarks, and value scores.',
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://specmob.vercel.app' },
      { '@type': 'ListItem', position: 2, name: 'Compare', item: 'https://specmob.vercel.app/compare' },
    ],
  },
}

// Pairs consecutive trending phones into ready-made "X vs Y" suggestions for
// the empty-state view. Trending already blends recency and smart score, so
// these lean toward phones people are likely to have an opinion about,
// rather than arbitrary picks.
async function getSuggestedPairs(): Promise<Phone[][]> {
  try {
    const { phones } = await api.phones.trending(8)
    const pairs: Phone[][] = []
    for (let i = 0; i + 1 < phones.length && pairs.length < 3; i += 2) {
      pairs.push([phones[i], phones[i + 1]])
    }
    return pairs
  } catch {
    return []
  }
}

export default async function ComparePage() {
  const suggestedPairs = await getSuggestedPairs()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CompareClient initialPhones={[]} suggestedPairs={suggestedPairs} />
    </>
  )
}
