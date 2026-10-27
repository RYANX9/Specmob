import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import JsonLd from '@/app/components/JsonLd'
import AllBrandsClient, { type BrandSummary, type FeaturedBrand } from '@/app/components/brand/AllBrandsClient'
import { api } from '@/lib/api'
import { ROUTES } from '@/lib/config'
import { buildMetadata } from '@/lib/seo'
import { buildBreadcrumbList, buildItemList } from '@/lib/structuredData'
import { c, f } from '@/lib/tokens'

export const revalidate = 3600

const FEATURED_COUNT = 8
const PHONES_PER_BRAND = 4

export async function generateMetadata(): Promise<Metadata> {
  const brands = await api.brands.list({ featured: FEATURED_COUNT, perBrand: PHONES_PER_BRAND }).then(d => d.brands).catch(() => [])
  const phones = brands.reduce((sum, b) => sum + b.phone_count, 0)
  return buildMetadata({
    title: 'All Phone Brands: Specs, Prices & Scores',
    description: brands.length
      ? `Browse ${phones.toLocaleString('en-US')} phones from ${brands.length} brands, with specs, prices and scores for every model on Specmob.`
      : 'Browse every smartphone brand on Specmob with specs, prices and scores.',
    path: ROUTES.brands,
  })
}

async function getData(): Promise<{ all: BrandSummary[]; featured: FeaturedBrand[]; totalPhones: number }> {
  const brands = await api.brands.list({ featured: FEATURED_COUNT, perBrand: PHONES_PER_BRAND }).then(d => d.brands).catch(() => [])
  const all: BrandSummary[] = brands.map(b => ({ brand: b.brand, slug: b.brand_slug, count: b.phone_count, path: b.path }))
  const totalPhones = brands.reduce((sum, b) => sum + b.phone_count, 0)
  const featured: FeaturedBrand[] = all.slice(0, FEATURED_COUNT).map((b, i) => ({ ...b, phones: brands[i].phones ?? [] }))

  return { all, featured, totalPhones }
}

export default async function BrandsPage() {
  const { all, featured, totalPhones } = await getData()

  return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <JsonLd data={buildBreadcrumbList([{ name: 'Home', path: ROUTES.home }, { name: 'Brands', path: ROUTES.brands }])} />
      <JsonLd data={all.length ? buildItemList('Phone brands', all.map(b => ({ path: b.path, name: b.brand }))) : null} />

      <Suspense fallback={<div style={{ height: 'var(--nav-h)' }} />}>
        <Navbar />
      </Suspense>

      <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 var(--page-px) 80px' }}>
        <nav aria-label="Breadcrumb" style={{ padding: '16px 0 0', fontSize: 13, color: c.text3, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link href={ROUTES.home} style={{ color: c.text2 }}>Home</Link>
          <span>/</span>
          <span aria-current="page">Brands</span>
        </nav>

        <header style={{ padding: '32px 0', maxWidth: 640 }}>
          <h1 style={{ fontFamily: f.serif, fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 400, color: c.text1, letterSpacing: '-0.6px', marginBottom: 10 }}>
            All phone brands
          </h1>
          <p style={{ fontSize: 15, color: c.text2, lineHeight: 1.65, marginBottom: 10 }}>
            {all.length > 0
              ? `${all.length} brands and ${totalPhones.toLocaleString('en-US')} phones tracked. Start with the biggest lineups, or jump to any brand alphabetically.`
              : 'Brands are temporarily unavailable. Please try again in a moment.'}
          </p>
          <Link href={ROUTES.best} style={{ fontSize: 13, fontWeight: 600, color: c.primary }}>Or browse the best phones by category</Link>
        </header>

        {all.length > 0 && <AllBrandsClient featured={featured} all={all} />}
      </div>

      <Footer />
    </div>
  )
}
