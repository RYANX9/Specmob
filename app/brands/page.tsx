import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import AllBrandsClient, { type BrandSummary, type FeaturedBrand } from '@/app/components/brand/AllBrandsClient'
import { api } from '@/lib/api'
import { SITE_URL, ROUTES, brandSlug } from '@/lib/config'
import { c, f } from '@/lib/tokens'

export const revalidate = 3600

const FEATURED_COUNT = 8
const PHONES_PER_BRAND = 4

export const metadata: Metadata = {
  title: 'All Phone Brands',
  description: 'Browse every smartphone brand on Specmob, from the biggest names to niche makers, with the latest phones, specs, and prices.',
  alternates: { canonical: `${SITE_URL}${ROUTES.brands}` },
  openGraph: {
    title: 'All Phone Brands | Specmob',
    description: 'Browse every smartphone brand with its latest phones, specs, and prices.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'All Phone Brands | Specmob',
    description: 'Browse every smartphone brand with its latest phones, specs, and prices.',
  },
}

async function getData(): Promise<{ all: BrandSummary[]; featured: FeaturedBrand[] }> {
  const brands = await api.brands.list().then(d => d.brands).catch(() => [])
  const all: BrandSummary[] = brands.map(b => ({ brand: b.brand, slug: brandSlug(b.brand), count: b.count }))

  const top = all.slice(0, FEATURED_COUNT)
  const settled = await Promise.allSettled(
    top.map(b =>
      api.brands.phones(b.slug, { sort_by: 'release_year', sort_order: 'desc', page: 1, page_size: PHONES_PER_BRAND }),
    ),
  )

  const featured = top.map((b, i) => {
    const res = settled[i]
    return { ...b, phones: res.status === 'fulfilled' ? res.value.results : [] }
  })

  return { all, featured }
}

export default async function BrandsPage() {
  const { all, featured } = await getData()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'All Phone Brands',
    url: `${SITE_URL}${ROUTES.brands}`,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Brands', item: `${SITE_URL}${ROUTES.brands}` },
      ],
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: all.length,
      itemListElement: all.map((b, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: b.brand,
        url: `${SITE_URL}${ROUTES.brand(b.slug)}`,
      })),
    },
  }

  return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Suspense fallback={null}>
        <Navbar />
      </Suspense>

      <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 var(--page-px) 80px' }}>
        <nav style={{ padding: '16px 0 0', fontSize: 13, color: c.text3, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link href={ROUTES.home} style={{ color: c.text2 }}>Home</Link>
          <span>/</span>
          <span>Brands</span>
        </nav>

        <header style={{ padding: '32px 0', maxWidth: 640 }}>
          <h1 style={{ fontFamily: f.serif, fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 400, color: c.text1, letterSpacing: '-0.6px', marginBottom: 10 }}>
            All brands
          </h1>
          <p style={{ fontSize: 15, color: c.text2, lineHeight: 1.65 }}>
            {all.length > 0
              ? `${all.length} brands tracked. Start with the biggest lineups, or jump to any brand alphabetically.`
              : 'Brands are temporarily unavailable. Please try again in a moment.'}
          </p>
        </header>

        {all.length > 0 && <AllBrandsClient featured={featured} all={all} />}
      </div>

      <Footer />
    </div>
  )
}
