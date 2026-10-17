// app/compare/layout.tsx
import type { Metadata } from 'next'
import { ROUTES } from '@/lib/config'
import { buildMetadata } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'Compare Phones Side by Side',
  description:
    'Compare up to 4 phones side by side: specs, scores and a clear verdict. Start from a popular matchup or search for any two phones.',
  path: ROUTES.compare,
})

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children
}
