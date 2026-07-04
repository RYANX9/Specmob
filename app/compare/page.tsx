import type { Metadata } from 'next'
import CompareClient from '@/app/components/compare/CompareClient'

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
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://Specmob.vercel.app' },
      { '@type': 'ListItem', position: 2, name: 'Compare', item: 'https://Specmob.vercel.app/compare' },
    ],
  },
}

export default function ComparePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CompareClient initialPhones={[]} />
    </>
  )
}
