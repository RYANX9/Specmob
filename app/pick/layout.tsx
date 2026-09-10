// app/pick/layout.tsx
import type { Metadata } from 'next'
import { ROUTES } from '@/lib/config'

export const metadata: Metadata = {
  title: 'Help Me Choose a Phone',
  description:
    'Set a budget and pick 2-3 priorities — camera, battery, performance, and more. We rank the phones that actually fit, using the same scoring as every other page.',
  alternates: { canonical: ROUTES.pick },
  openGraph: {
    title: 'Help Me Choose a Phone | Specmob',
    description:
      'Set a budget and pick your priorities. We rank the phones that actually fit — no sponsored picks.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Help Me Choose a Phone | Specmob',
    description:
      'Set a budget and pick your priorities. We rank the phones that actually fit.',
  },
}

export default function PickLayout({ children }: { children: React.ReactNode }) {
  return children
} 
