// app/methodology/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Suspense } from 'react'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import JsonLd from '@/app/components/JsonLd'
import { api } from '@/lib/api'
import { ROUTES } from '@/lib/config'
import { buildMetadata } from '@/lib/seo'
import { buildBreadcrumbList } from '@/lib/structuredData'
import { c, f } from '@/lib/tokens'
import type { CategoryListItem } from '@/lib/types'

export const revalidate = 86400

export const metadata: Metadata = buildMetadata({
  title: 'How Specmob Ranks Phones: Smart Score and Category Methods',
  description:
    'How the Specmob Smart Score is built from six components, why scores are rated within a price tier, and how each best-of ranking is calculated.',
  path: ROUTES.methodology,
})

const COMPONENTS = [
  ['Camera', 'Main sensor, stabilization, ultrawide, telephoto and zoom, and video capability.'],
  ['Performance', 'Chipset class and memory, plus benchmark results where they are listed.'],
  ['Battery', 'Capacity relative to the device, wired and wireless charging speed.'],
  ['Display', 'Panel type, refresh rate, resolution, brightness and size.'],
  ['Build', 'Materials, water and dust resistance, and durability technology.'],
  ['Value', 'What the hardware delivers for the listed price in its tier.'],
] as const

async function getCategories(): Promise<CategoryListItem[]> {
  try {
    return (await api.categories.list()).categories
  } catch {
    return []
  }
}

export default async function MethodologyPage() {
  const categories = await getCategories()
  const h2: React.CSSProperties = { fontFamily: f.serif, fontSize: 26, color: c.text1, fontWeight: 400, margin: '40px 0 14px' }
  const p: React.CSSProperties = { fontSize: 15, color: c.text2, lineHeight: 1.7, marginBottom: 14, maxWidth: 680 }

  return (
    <Suspense fallback={null}>
      <div style={{ minHeight: '100vh', background: c.bg }}>
        <JsonLd data={buildBreadcrumbList([{ name: 'Home', path: ROUTES.home }, { name: 'Methodology', path: ROUTES.methodology }])} />
        <Navbar />

        <main style={{ maxWidth: 860, margin: '0 auto', padding: '0 var(--page-px) 72px' }}>
          <nav aria-label="Breadcrumb" style={{ padding: '16px 0 0', fontSize: 12.5, color: c.text3, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Link href={ROUTES.home} style={{ color: c.text2 }}>Home</Link>
            <ChevronRight size={11} />
            <span aria-current="page">Methodology</span>
          </nav>

          <h1 style={{ fontFamily: f.serif, fontSize: 'clamp(30px,4vw,42px)', color: c.text1, letterSpacing: '-1px', lineHeight: 1.1, fontWeight: 400, margin: '32px 0 16px' }}>
            How Specmob ranks phones
          </h1>
          <p style={p}>
            Every score and ranking on Specmob comes from listed specifications. We do not run hands-on tests, we do not accept
            payment for placement, and every brand is scored by the same rules.
          </p>

          <h2 style={h2}>The Smart Score</h2>
          <p style={p}>
            The overall Smart Score is the average of six component scores, each from 1 to 10. Each component is rated against the
            phone&apos;s market tier (budget, mid-range, upper mid-range, flagship or ultra flagship), so a score describes quality
            within a tier, not across the whole market. That is why Specmob shows the tier next to a score.
          </p>
          <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
            {COMPONENTS.map(([name, text]) => (
              <div key={name} style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', padding: '14px 18px' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: c.text1, margin: '0 0 4px' }}>{name}</h3>
                <p style={{ fontSize: 13.5, color: c.text2, lineHeight: 1.6, margin: 0 }}>{text}</p>
              </div>
            ))}
          </div>
          <p style={p}>
            Scoring never invents specifications. When a value is not listed, such as a benchmark result, it is treated as unknown
            and the written analysis says so.
          </p>

          <h2 style={h2}>Best-of rankings</h2>
          <p style={p}>
            Each ranking uses its own formula and a limit on phones per brand, so one manufacturer cannot fill a whole list.
            Regional editions are excluded.
          </p>
          <div style={{ display: 'grid', gap: 10 }}>
            {categories.map(cat => (
              <div key={cat.slug} style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', padding: '14px 18px' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: c.text1, margin: '0 0 4px' }}>
                  <Link href={cat.path} style={{ color: 'inherit' }}>{cat.title}</Link>
                </h3>
                <p style={{ fontSize: 13.5, color: c.text2, lineHeight: 1.6, margin: 0 }}>{cat.description}</p>
              </div>
            ))}
          </div>

          <h2 style={h2}>Prices</h2>
          <p style={p}>
            Prices are shown in US dollars. The price on a phone page is the lowest recorded price across its storage
            configurations. Buy buttons appear only when a retailer offer exists, and some retail links are affiliate links.
            Affiliate relationships never change a ranking.
          </p>

          <p style={{ ...p, marginTop: 28 }}>
            <Link href={ROUTES.best} style={{ fontWeight: 600, color: c.primary }}>Browse all rankings</Link>
          </p>
        </main>

        <Footer />
      </div>
    </Suspense>
  )
}
