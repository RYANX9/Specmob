//app/components/PageViewTracker.tsx

'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackPageView } from '@/lib/events'

// Pages that already track themselves with richer data (phone id etc.).
const SELF_TRACKED = /^\/(brand\/[^/]+(\/[^/]+)?|best\/[^/]+|trade-in)\/?$/

function pageTypeOf(path: string) {
  if (path === '/') return 'home' as const
  if (path.startsWith('/compare')) return 'compare' as const
  if (path === '/best') return 'best_hub' as const
  if (path === '/brands') return 'brands' as const
  if (path.startsWith('/pick')) return 'pick' as const
  if (path === '/methodology') return 'methodology' as const
  return 'other' as const
}

export default function PageViewTracker() {
  const pathname = usePathname()
  useEffect(() => {
    if (!pathname || SELF_TRACKED.test(pathname)) return
    trackPageView(pageTypeOf(pathname), pathname)
  }, [pathname])
  return null
}
