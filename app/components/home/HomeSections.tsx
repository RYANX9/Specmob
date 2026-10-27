import Link from 'next/link'
import { ArrowRight, RotateCcw, Smartphone } from 'lucide-react'
import { categoryIcon, paletteFor, shortLabel } from '@/app/components/category/categoryVisuals'
import { ROUTES } from '@/lib/config'
import { tierStyle } from '@/lib/tiers'
import { c, f, r } from '@/lib/tokens'
import type { BestHubTile, ComparePair, FilterStats, HomeBrandItem } from '@/lib/types'

const wrap: React.CSSProperties = { maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 var(--page-px)' }

export function SectionHeading({ id, title, sub, href, hrefLabel }: { id: string; title: string; sub?: string; href?: string; hrefLabel?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
      <div>
        <h2 id={id} style={{ fontFamily: f.serif, fontSize: 'clamp(24px,3vw,32px)', color: c.text1, fontWeight: 400, letterSpacing: '-0.5px', lineHeight: 1.15, margin: 0 }}>{title}</h2>
        {sub && <p style={{ fontSize: 14, color: c.text3, marginTop: 6 }}>{sub}</p>}
      </div>
      {href && hrefLabel && (
        <Link href={href} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: c.accent }}>
          {hrefLabel} <ArrowRight size={13} />
        </Link>
      )}
    </div>
  )
}

export function TrustStrip({ stats }: { stats: FilterStats | null }) {
  const parts = [
    stats ? `${stats.total_phones.toLocaleString('en-US')} phones` : null,
    stats ? `${stats.total_brands} brands` : null,
    'Scored within each price tier',
  ].filter(Boolean)

  return (
    <div style={{ background: c.primary }}>
      <div style={{ ...wrap, padding: '14px var(--page-px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '4px 14px', fontSize: 12.5, color: 'rgba(255,255,255,0.7)' }}>
        <span>{parts.join(' · ')}</span>
        <Link href={ROUTES.methodology} style={{ color: '#fff', fontWeight: 600 }}>How we score</Link>
      </div>
    </div>
  )
}

export function BestTiles({ tiles }: { tiles: BestHubTile[] }) {
  if (!tiles.length) return null
  return (
    <section aria-labelledby="best-tiles" style={{ ...wrap, paddingTop: 64 }}>
      <SectionHeading id="best-tiles" title="Best phones by what matters" sub="Ranked lists built from listed specs" href={ROUTES.best} hrefLabel="All rankings" />
      <div className="home-grid-3">
        {tiles.slice(0, 6).map((tile, i) => {
          const pal = paletteFor(tile.slug)
          const top = tile.top_phone
          return (
            <Link key={tile.slug} href={tile.path} prefetch={false} className={`home-card${i >= 4 ? ' home-tile-extra' : ''}`} style={{ display: 'block', background: pal.bg, border: `1px solid ${c.border}`, borderRadius: r.lg, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ width: 32, height: 32, borderRadius: r.sm, display: 'flex', alignItems: 'center', justifyContent: 'center', background: pal.iconBg, color: pal.iconColor }}>{categoryIcon(tile.slug)}</span>
                <span style={{ fontSize: 11, color: c.text3 }}>{tile.ranked_count} ranked</span>
              </div>
              <div style={{ fontFamily: f.serif, fontSize: 18, color: c.text1, lineHeight: 1.2, marginBottom: 10 }}>{tile.title}</div>
              {top && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.7)', borderRadius: r.sm, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {top.main_image_url
                      ? <img src={top.main_image_url} alt={top.display_name} loading="lazy" decoding="async" style={{ width: '82%', height: '82%', objectFit: 'contain' }} />
                      : <Smartphone size={18} color={pal.iconColor} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: pal.iconColor }}>{shortLabel(tile.title)} #1</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: c.text1, lineHeight: 1.3 }}>{top.display_name}</div>
                  </div>
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export function MostComparedSets({ pairs }: { pairs: ComparePair[] }) {
  if (!pairs.length) return null
  return (
    <section aria-labelledby="most-compared" style={{ ...wrap, paddingTop: 64 }}>
      <SectionHeading id="most-compared" title="Most compared" sub="What other people are putting side by side" />
      <div className="home-compare-list">
        {pairs.slice(0, 6).map(pair => (
          <Link key={pair.path} href={pair.path} prefetch={false} className="home-card home-compare-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              {pair.phones.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 34, height: 34, background: c.bg, borderRadius: r.sm, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {p.main_image_url
                      ? <img src={p.main_image_url} alt="" loading="lazy" decoding="async" style={{ width: '82%', height: '82%', objectFit: 'contain' }} />
                      : <Smartphone size={14} color={c.border} />}
                  </div>
                  {i < pair.phones.length - 1 && <span style={{ fontSize: 9, fontWeight: 700, color: c.accent }}>vs</span>}
                </div>
              ))}
            </div>
            <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: c.text1, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {pair.phones.map(p => p.display_name).join(' vs ')}
            </span>
            <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: c.text3, border: `1px solid ${c.border}`, borderRadius: r.full, padding: '2px 8px', whiteSpace: 'nowrap' }}>
              {pair.phones.length} phones
            </span>
          </Link>
        ))}
      </div>
      <p style={{ fontSize: 13.5, color: c.text2, marginTop: 16 }}>
        Compare up to four phones at once, with a verdict.{' '}
        <Link href={ROUTES.compare} style={{ color: c.accent, fontWeight: 600 }}>Build your own</Link>
      </p>
    </section>
  )
}

export function BrandsRow({ brands }: { brands: HomeBrandItem[] }) {
  const unique = Array.from(new Map(brands.map(b => [b.brand_slug, b])).values())
  if (!unique.length) return null
  return (
    <section aria-labelledby="brands-row" style={{ ...wrap, paddingTop: 64 }}>
      <SectionHeading id="brands-row" title="Shop by brand" href={ROUTES.brands} hrefLabel="All brands" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {unique.slice(0, 10).map(b => (
          <Link key={b.brand_slug} href={b.path} prefetch={false} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.full, fontSize: 14, fontWeight: 600, color: c.text1 }}>
            {b.brand}
            <span style={{ fontSize: 11, color: c.text3, fontWeight: 500 }}>{b.phone_count}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function TradeInBanner() {
  return (
    <section aria-labelledby="trade-in" style={{ ...wrap, paddingTop: 64 }}>
      <div className="home-tradein">
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 10 }}>Trade-in estimator</div>
          <h2 id="trade-in" style={{ fontFamily: f.serif, fontSize: 'clamp(24px,3vw,32px)', fontWeight: 400, color: '#fff', lineHeight: 1.15, margin: '0 0 8px' }}>
            Got an old phone? See what it&apos;s worth.
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0, maxWidth: 460 }}>
            Rate its screen, body and battery and get an estimated range in under a minute, then see what that value buys.
          </p>
        </div>
        <Link href={ROUTES.tradein} className="home-tradein-cta">
          <RotateCcw size={15} strokeWidth={2} />
          Get my estimate
        </Link>
      </div>
    </section>
  )
}

export const HOME_CSS = `
  .home-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .home-compare-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .home-compare-row { display: flex; align-items: center; gap: 14px; background: ${c.surface}; border: 1px solid ${c.border}; border-radius: ${r.lg}; padding: 12px 16px; }
  .home-tradein { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; background: ${c.primary}; border-radius: ${r.xl}; padding: 32px 36px; }
  .home-tradein-cta { display: inline-flex; align-items: center; gap: 8px; padding: 13px 26px; background: #fff; color: ${c.primary}; border-radius: ${r.full}; font-size: 14px; font-weight: 700; flex-shrink: 0; transition: transform 150ms ease; }
  .home-tradein-cta:hover { transform: translateY(-1px); }
  .home-card { transition: all 150ms ease; }
  .home-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--border-hover); }
  @media (max-width: 1023px) { .home-grid-3 { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 640px) { .home-tradein { padding: 24px 22px; } .home-tradein-cta { width: 100%; justify-content: center; } .home-grid-3 { gap: 10px; } .home-tile-extra { display: none !important; } .home-compare-list { grid-template-columns: 1fr; } }
`