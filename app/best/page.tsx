// app/best/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, ArrowRight, Smartphone } from 'lucide-react'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import JsonLd from '@/app/components/JsonLd'
import { categoryIcon, paletteFor, shortLabel } from '@/app/components/category/categoryVisuals'
import { api } from '@/lib/api'
import { ROUTES } from '@/lib/config'
import { buildMetadata } from '@/lib/seo'
import { buildBreadcrumbList, buildItemList } from '@/lib/structuredData'
import { c, f, r } from '@/lib/tokens'
import type { BestHubResponse } from '@/lib/types'

export const revalidate = 3600

export const metadata: Metadata = buildMetadata({
  title: 'Best Phones: Ranked by Camera, Battery, Gaming and Budget',
  description:
    'Browse every Specmob phone ranking: best camera, battery life, gaming, fast charging, compact, foldable and budget phones, ranked on specs and never on sponsors.',
  path: ROUTES.best,
})

async function getHub(): Promise<BestHubResponse | null> {
  try {
    return await api.discover.bestHub()
  } catch {
    return null
  }
}

export default async function BestHubPage() {
  const hub = await getHub()
  const groups = hub?.groups ?? []
  const tiles = groups.flatMap(g => g.categories)

  return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <JsonLd data={buildBreadcrumbList([{ name: 'Home', path: ROUTES.home }, { name: 'Best Phones', path: ROUTES.best }])} />
      <JsonLd data={tiles.length ? buildItemList('Best phone rankings', tiles.map(t => ({ path: t.path, name: t.title }))) : null} />
      <Navbar />

      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '0 var(--page-px) 72px' }}>
        <nav aria-label="Breadcrumb" style={{ padding: '16px 0 0', fontSize: 12.5, color: c.text3, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link href={ROUTES.home} style={{ color: c.text2 }}>Home</Link>
          <ChevronRight size={11} />
          <span aria-current="page">Best Phones</span>
        </nav>

        <header style={{ padding: '32px 0 28px' }}>
          <h1 style={{ fontFamily: f.serif, fontSize: 'clamp(30px,4vw,44px)', color: c.text1, letterSpacing: '-1px', lineHeight: 1.1, fontWeight: 400, marginBottom: 12 }}>
            The best phones, ranked
          </h1>
          <p style={{ fontSize: 15, color: c.text2, lineHeight: 1.65, maxWidth: 640, marginBottom: 12 }}>
            Every list is built from listed specifications and scored the same way for every brand. Pick what matters to you,
            or start from your budget.
          </p>
          <Link href={ROUTES.methodology} style={{ fontSize: 13, fontWeight: 600, color: c.primary }}>
            How the rankings work
          </Link>
        </header>

        {groups.length === 0 && (
          <p style={{ fontSize: 14, color: c.text3, padding: '40px 0' }}>Rankings are loading. Try again in a moment.</p>
        )}

        {groups.map(group => (
          <section key={group.id} aria-labelledby={`g-${group.id}`} style={{ marginBottom: 40 }}>
            <h2 id={`g-${group.id}`} style={{ fontFamily: f.serif, fontSize: 24, color: c.text1, fontWeight: 400, marginBottom: 16 }}>
              {group.title}
            </h2>
            <div className="hub-grid" style={{ display: 'grid', gap: 14 }}>
              {group.categories.map(tile => {
                const pal = paletteFor(tile.slug)
                const top = tile.top_phone
                return (
                  <Link key={tile.slug} href={tile.path} className="hub-tile" style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.lg, padding: 18, display: 'flex', gap: 14, alignItems: 'center', textDecoration: 'none' }}>
                    <div style={{ width: 84, height: 84, flexShrink: 0, background: pal.bg, borderRadius: r.md, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {top?.main_image_url
                        ? <img src={top.main_image_url} alt={top.display_name} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
                        : <Smartphone size={28} color={pal.iconColor} strokeWidth={1.2} />}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: pal.iconColor, marginBottom: 4 }}>
                        {categoryIcon(tile.slug, 14)}
                        <span style={{ fontSize: 11.5, fontWeight: 600 }}>{shortLabel(tile.title)}</span>
                      </div>
                      <div style={{ fontFamily: f.serif, fontSize: 18, color: c.text1, lineHeight: 1.25, marginBottom: 6 }}>{tile.title}</div>
                      {top && <div style={{ fontSize: 12.5, color: c.text3, marginBottom: 6 }}>#1 {top.display_name}</div>}
                      <div style={{ fontSize: 12, color: c.text3, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{tile.ranked_count} ranked</span>
                        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600, color: c.text1 }}>
                          View <ArrowRight size={11} />
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        ))}

        {hub && hub.next_steps.length > 0 && (
          <section aria-label="Next steps" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {hub.next_steps.map(step => (
              <Link key={step.slot} href={step.href} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.full, fontSize: 13, fontWeight: 600, color: c.text1, textDecoration: 'none' }}>
                {step.label}
                <ArrowRight size={13} color={c.text3} />
              </Link>
            ))}
          </section>
        )}
      </main>

      <Footer />

      <style>{`
        .hub-grid { grid-template-columns: repeat(3, 1fr); }
        .hub-tile { transition: all 150ms ease; }
        .hub-tile:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--border-hover); }
        @media (max-width: 1023px) { .hub-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 640px) { .hub-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  )
}
