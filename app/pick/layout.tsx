import type { Metadata } from 'next'
import { ROUTES } from '@/lib/config'
import { buildMetadata } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'Phone Finder: Find the Best Phone for Your Budget',
  description:
    'Find a phone that fits your budget and priorities. Set a price range or choose a tier, pick camera, battery, gaming and other priorities, then compare ranked phone recommendations.',
  path: ROUTES.pick,
})

export default function PickLayout({ children }: { children: React.ReactNode }) {
  return children
}
