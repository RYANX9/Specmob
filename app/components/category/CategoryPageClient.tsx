// app/components/category/CategoryPageClient.tsx
'use client'

import { useState, useEffect, Fragment, Suspense } from 'react'
import Link from 'next/link'
import {
  ChevronRight, Star, Clock, Smartphone, TrendingUp, Info, ArrowRight,
  BarChart3, Check, Sparkles, Scale, Crosshair, RotateCcw,
} from 'lucide-react'
import Navbar from '@/app/components/Navbar'
import CompareBar from '@/app/components/CompareBar'
import Footer from '@/app/components/Footer'
import AdSlot from '@/app/components/ads/AdSlot'
import { useToast } from '@/app/components/Toast'
import { categoryIcon, paletteFor, shortLabel } from '@/app/components/category/categoryVisuals'
import { MAX_COMPARE, ROUTES } from '@/lib/config'
import { tierStyle } from '@/lib/tiers'
import { formatUsd } from '@/lib/price'
import { c, f, r, mq } from '@/lib/tokens'
import { analytics } from '@/lib/analytics'
import { trackNextStep, trackPageView } from '@/lib/events'
import type { CategoryDetail, CategoryListItem, CategoryPhone, Phone } from '@/lib/types'

const AMBER = '#B0651B'
const AMBER_BG = '#FBF0E4'
const AMBER_BORDER = '#EFD3AE'

export interface BuyOffer {
  url: string
  retailer: string
}

interface Props {
  data: CategoryDetail
  categories: CategoryListItem[]
  year: number
  updatedLabel: string
  lede: string
  tradeOff: string | null
  buy: Record<number, BuyOffer | undefined>
}

function RankCard({
  phone, rank, isBest, categoryLabel, tradeOff, buy, onCompare, isCompared,
}: {
  phone: CategoryPhone
  rank: number
  isBest: boolean
  categoryLabel: string
  tradeOff: string | null
  buy?: BuyOffer
  onCompare: (p: Phone) => void
  isCompared: boolean
}) {
  const tier = tierStyle(phone.tier)
  const facts = [phone.reason, ...(phone.best_for ?? [])].filter(Boolean) as string[]
  const outline: React.CSSProperties = {
    padding: '9px 16px', borderRadius: r.full, fontSize: 13, fontWeight: 600, color: c.text2,
    border: `1px solid ${c.border}`, background: 'transparent', cursor: 'pointer', transition: 'all 0.15s', textDecoration: 'none',
  }

  return (
    <div
      className="rank-card"
      style={{
        position: 'relative',
        background: isBest ? `linear-gradient(180deg, var(--accent-light) 0%, ${c.surface} 140px)` : c.surface,
        border: `1px solid ${isBest ? 'var(--accent-border)' : c.border}`,
        borderRadius: r.lg, padding: '22px 24px', marginBottom: 14, transition: 'all 150ms ease',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
    >
      {isBest && (
        <div style={{
          position: 'absolute', top: -11, left: 22, display: 'flex', alignItems: 'center', gap: 5,
          background: c.accent, color: '#fff', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.5px',
          textTransform: 'uppercase' as const, padding: '4px 12px', borderRadius: r.full, boxShadow: 'var(--shadow-sm)',
        }}>
          <Star size={10} fill="#fff" color="#fff" /> Best {categoryLabel}
        </div>
      )}

      <div className="rank-card-header" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <Link
          href={phone.path}
          aria-label={phone.display_name}
          style={{
            width: isBest ? 76 : 64, height: isBest ? 76 : 64, flexShrink: 0, background: c.bg, borderRadius: r.md,
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          }}
        >
          {phone.main_image_url
            ? <img
                src={phone.main_image_url}
                alt={phone.display_name}
                loading={isBest ? 'eager' : 'lazy'}
                fetchPriority={isBest ? 'high' : 'auto'}
                decoding="async"
                style={{ width: '100%', height: '100%', objectFit: 'contain', padding: isBest ? 8 : 5 }}
              />
            : <Smartphone size={26} color={c.borderHover} strokeWidth={1} />}
        </Link>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontFamily: f.serif, fontSize: isBest ? 23 : 19, color: c.text1, lineHeight: 1.2, marginBottom: 4, fontWeight: 400 }}>
            <Link href={phone.path} style={{ color: 'inherit', textDecoration: 'none' }}>
              {isBest ? phone.display_name : `#${rank} ${phone.display_name}`}
            </Link>
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: c.text3, flexWrap: 'wrap' }}>
            {phone.release_year && <span>{phone.release_year}</span>}
            {tier && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: r.full, color: tier.color, background: tier.bg }}>
                {tier.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {phone.summary && (
        <p
          style={{
            fontSize: isBest ? 14.5 : 13.5, color: c.text2, lineHeight: 1.6, margin: '0 0 14px',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}
        >
          {phone.summary}
        </p>
      )}

      {isBest ? (
        <>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.4px', color: c.text3, marginBottom: 10 }}>
            <Sparkles size={10} /> Why it leads {categoryLabel}
          </span>
          {facts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, paddingLeft: 2 }}>
              {facts.map((fact, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                  <Check size={14} color="var(--green)" strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 14.5, color: c.text2, lineHeight: 1.55, margin: 0 }}>{fact}</p>
                </div>
              ))}
            </div>
          )}
          {tradeOff && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, background: AMBER_BG, border: `1px solid ${AMBER_BORDER}`, borderRadius: r.sm, padding: '10px 13px', marginBottom: 16, fontSize: 12.5, color: c.text2, lineHeight: 1.5 }}>
              <Info size={14} color={AMBER} style={{ flexShrink: 0, marginTop: 1 }} />
              <span><b style={{ color: AMBER }}>Trade-off:</b> {tradeOff}</span>
            </div>
          )}
        </>
      ) : (
        facts.length > 0 && (
          <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.6, marginBottom: 14 }}>{facts.join(' · ')}</p>
        )
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {buy && (
          <a
            href={buy.url}
            onClick={() => analytics.affiliateClick({
              phone_id: phone.id, phone_name: phone.display_name, retailer: buy.retailer,
              price: phone.price_usd ?? undefined, location: 'category_rank',
            })}
            target="_blank"
            rel="noopener noreferrer sponsored"
            style={{ padding: '9px 20px', borderRadius: r.full, fontSize: 13, fontWeight: 700, background: c.primary, color: '#fff', textDecoration: 'none' }}
          >
            Buy Now
          </a>
        )}
        <Link href={phone.path} style={outline}>Details</Link>
        <button onClick={() => onCompare(phone)} style={outline}>
          {isCompared ? 'In Compare' : '+ Compare'}
        </button>
        <div style={{ marginLeft: 'auto', fontSize: isBest ? 21 : 18, fontWeight: 800, color: c.text1 }}>
          {formatUsd(phone.price_usd)}
        </div>
      </div>
    </div>
  )
}

function CategoryPageContent({ data, categories, year, updatedLabel, lede, tradeOff, buy }: Props) {
  const { toast } = useToast()
  const [comparePhones, setComparePhones] = useState<Phone[]>([])

  const label = shortLabel(data.title)
  const pal = paletteFor(data.slug)
  const phones = data.phones
  const top3 = phones.slice(0, 3)

  useEffect(() => {
    analytics.categoryView(data.slug)
    trackPageView('category', data.path)
  }, [data.slug, data.path])

  const handleCompare = (phone: Phone) => {
    setComparePhones(prev => {
      if (prev.find(p => p.id === phone.id)) { toast('Removed from compare', 'info'); return prev.filter(p => p.id !== phone.id) }
      if (prev.length >= MAX_COMPARE) { toast(`Maximum ${MAX_COMPARE} phones in compare`, 'error'); return prev }
      toast('Added to compare', 'success')
      analytics.compareAddPhone(phone, prev.length + 1)
      return [...prev, phone]
    })
  }

  const compareIds = comparePhones.map(p => p.id)
  const otherCats = categories.filter(cat => cat.slug !== data.slug)

  // Price pages are non-overlapping bands, so point readers to the neighbouring bands.
  const budgetLinks = (() => {
    const cap = (slug: string) => parseInt(slug.replace('under-', ''), 10)
    if (!data.slug.startsWith('under-')) return []
    const bands = categories.filter(cat => cat.slug.startsWith('under-')).sort((a, b) => cap(a.slug) - cap(b.slug))
    const i = bands.findIndex(b => b.slug === data.slug)
    const links: { slug: string; lead: string; label: string }[] = []
    if (i > 0) links.push({ slug: bands[i - 1].slug, lead: 'Looking for something cheaper? See the', label: `best phones under $${cap(bands[i - 1].slug)}` })
    if (i >= 0 && i < bands.length - 1) links.push({ slug: bands[i + 1].slug, lead: 'Have more to spend? See the', label: `best phones under $${cap(bands[i + 1].slug)}` })
    return links
  })()

  return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <Navbar />

      <div className="category-container" style={{ maxWidth: 1240, margin: '0 auto', padding: '0 var(--page-px) 72px' }}>
        <nav aria-label="Breadcrumb" style={{ padding: '16px 0 0', fontSize: 12.5, color: c.text3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Link href={ROUTES.home} style={{ color: c.text2 }}>Home</Link>
          <ChevronRight size={11} color={c.text3} />
          <Link href={ROUTES.best} style={{ color: c.text2 }}>Best Phones</Link>
          <ChevronRight size={11} color={c.text3} />
          <span aria-current="page">{data.title}</span>
        </nav>

        <div className="category-tabs" style={{ marginTop: 20, overflowX: 'auto', scrollbarWidth: 'none', borderBottom: `1px solid ${c.border}` }}>
          <div style={{ display: 'flex', gap: 0, minWidth: 'max-content' }}>
            {categories.map(cat => {
              const active = cat.slug === data.slug
              const catPal = paletteFor(cat.slug)
              return (
                <Link
                  key={cat.slug}
                  href={cat.path}
                  style={{ padding: '11px 16px', fontSize: 12.5, fontWeight: 500, color: active ? c.text1 : c.text3, whiteSpace: 'nowrap', borderBottom: `2px solid ${active ? catPal.iconColor : 'transparent'}`, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <span style={{ color: active ? catPal.iconColor : 'inherit', display: 'flex', alignItems: 'center' }}>{categoryIcon(cat.slug)}</span>
                  {shortLabel(cat.title)}
                </Link>
              )
            })}
          </div>
        </div>

        <div className="hero-section" style={{ padding: '32px 0 28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 28, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: pal.bg, borderRadius: 'var(--r-full)', fontSize: 11.5, fontWeight: 600, color: pal.iconColor, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>
              <TrendingUp size={12} />
              Category ranking
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
              <div className="category-hero-icon" style={{ width: 46, height: 46, flexShrink: 0, borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: pal.iconBg, color: pal.iconColor }}>
                {categoryIcon(data.slug, 22)}
              </div>
              <h1 className="category-hero-title" style={{ fontFamily: f.serif, fontSize: 40, color: c.text1, letterSpacing: '-1px', lineHeight: 1.1, fontWeight: 400 }}>
                {data.slug.startsWith('under-') ? `${data.title} (${year})` : `${data.title} ${year}`}
              </h1>
            </div>
            <p style={{ fontSize: 15, color: c.text2, lineHeight: 1.65, maxWidth: 620, marginBottom: 16 }}>
              {lede || data.description}{' '}
              <a href="#methodology" style={{ color: c.primary, fontWeight: 600, whiteSpace: 'nowrap' }}>How we rank</a>
            </p>
            {budgetLinks.length > 0 && (
              <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6, maxWidth: 620, marginBottom: 16 }}>
                {budgetLinks.map((l, i) => (
                  <span key={l.slug}>
                    {i > 0 && ' '}
                    {l.lead} <Link href={ROUTES.category(l.slug)} style={{ color: c.primary, fontWeight: 600 }}>{l.label}</Link>.
                  </span>
                ))}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: c.text3 }}><Clock size={13} />Updated {updatedLabel}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: c.text3 }}><Smartphone size={13} /><strong style={{ color: c.text2, fontWeight: 600 }}>{data.ranked_count}</strong>&nbsp;phones ranked</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: c.text3 }}><Star size={13} />Limited phones per brand</span>
            </div>
          </div>
          {top3.length >= 2 && (
            <div style={{ flexShrink: 0 }}>
              <Link
                href={ROUTES.comparePair(...top3.map(p => p.full_slug))}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', background: c.primary, color: '#fff', borderRadius: 'var(--r-full)', fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', textDecoration: 'none' }}
              >
                <Scale size={15} strokeWidth={2} />
                Compare top {top3.length}
              </Link>
            </div>
          )}
        </div>

        {phones.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Smartphone size={52} color={c.border} strokeWidth={1.5} style={{ margin: '0 auto 16px' }} />
            <h2 style={{ fontFamily: f.serif, fontSize: 20, color: c.text1, marginBottom: 8, fontWeight: 400 }}>No phones ranked yet</h2>
            <p style={{ fontSize: 13.5, color: c.text3 }}>This list has no ranked phones right now. Try another ranking below.</p>
          </div>
        ) : (
          phones.map((phone, i) => (
            <Fragment key={phone.id}>
              <RankCard
                phone={phone}
                rank={phone.position ?? i + 1}
                isBest={i === 0}
                categoryLabel={label}
                tradeOff={i === 0 ? tradeOff : null}
                buy={buy[phone.id]}
                onCompare={handleCompare}
                isCompared={compareIds.includes(phone.id)}
              />
              {i === 2 && <div style={{ margin: '20px 0' }}><AdSlot placement="inline" /></div>}
            </Fragment>
          ))
        )}

        <section id="methodology" style={{ marginTop: 40, background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-lg)', padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <BarChart3 size={17} color={c.text2} />
            <h2 style={{ fontFamily: f.serif, fontSize: 18, color: c.text1, fontWeight: 400, margin: 0 }}>How we rank {label.toLowerCase()}</h2>
          </div>
          <p style={{ fontSize: 13.5, color: c.text2, lineHeight: 1.65, maxWidth: 680, marginBottom: 14 }}>{data.description}</p>
          <div style={{ padding: '11px 14px', background: pal.bg, borderRadius: 'var(--r-sm)', fontSize: 12.5, color: c.text2, lineHeight: 1.55, display: 'flex', gap: 9, alignItems: 'flex-start', marginBottom: 12 }}>
            <Info size={14} style={{ flexShrink: 0, color: pal.iconColor, marginTop: 1 }} />
            <span>Rankings use listed specifications, not hands-on testing, so real-world results can differ. No brand sponsors these rankings.</span>
          </div>
          <Link href={ROUTES.methodology} style={{ fontSize: 13, fontWeight: 600, color: c.primary }}>
            Read the full methodology
          </Link>
        </section>

        {data.next_steps.length > 0 && (
          <section aria-label="Next steps" style={{ marginTop: 32 }}>
            <h2 style={{ fontFamily: f.serif, fontSize: 20, color: c.text1, fontWeight: 400, marginBottom: 12 }}>Where to next</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {data.next_steps.map(step => (
                <Link
                  key={step.slot + step.href}
                  href={step.href}
                  onClick={() => trackNextStep(step.slot, step.href, 'category')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.full, fontSize: 13, fontWeight: 600, color: c.text1, textDecoration: 'none' }}
                >
                  {step.label}
                  <ArrowRight size={13} color={c.text3} />
                </Link>
              ))}
            </div>
          </section>
        )}

        <div style={{ marginTop: 40 }}><AdSlot placement="inline" /></div>

        <section aria-label="More rankings" style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: c.text3, marginBottom: 14 }}>More rankings</h2>
          <div className="other-cats-grid" style={{ display: 'grid', gap: 12 }}>
            {otherCats.map(cat => {
              const p = paletteFor(cat.slug)
              return (
                <Link key={cat.slug} href={cat.path} className="hover-lift" style={{ background: p.bg, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', padding: '18px 16px', textDecoration: 'none', display: 'block' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: p.iconBg, color: p.iconColor, marginBottom: 12 }}>
                    {categoryIcon(cat.slug)}
                  </div>
                  <div style={{ fontFamily: f.serif, fontSize: 15, color: c.text1, marginBottom: 10 }}>{cat.title}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: c.text1, display: 'flex', alignItems: 'center', gap: 4 }}>View ranking <ArrowRight size={11} /></div>
                </Link>
              )
            })}
            <Link href={ROUTES.pick} className="hover-lift" style={{ background: c.primary, borderRadius: 'var(--r-md)', padding: '18px 16px', textDecoration: 'none', display: 'block' }}>
              <div style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', color: '#fff', marginBottom: 12 }}><Crosshair size={16} strokeWidth={1.5} /></div>
              <div style={{ fontFamily: f.serif, fontSize: 15, color: '#fff', marginBottom: 10 }}>Help me choose</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}>Try it <ArrowRight size={11} /></div>
            </Link>
            <Link href={ROUTES.tradein} className="hover-lift" style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', padding: '18px 16px', textDecoration: 'none', display: 'block' }}>
              <div style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.bg, color: c.text1, marginBottom: 12 }}><RotateCcw size={16} strokeWidth={1.5} /></div>
              <div style={{ fontFamily: f.serif, fontSize: 15, color: c.text1, marginBottom: 10 }}>Trade-in calculator</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: c.text1, display: 'flex', alignItems: 'center', gap: 4 }}>Check value <ArrowRight size={11} /></div>
            </Link>
          </div>
        </section>
      </div>

      <Footer />

      <CompareBar
        phones={comparePhones}
        onRemove={id => setComparePhones(prev => prev.filter(p => p.id !== id))}
        onClear={() => setComparePhones([])}
      />

      <style>{`
        .other-cats-grid { grid-template-columns: repeat(4, 1fr); }
        .hover-lift { transition: all 150ms ease; }
        .hover-lift:hover { transform: translateY(-2px); box-shadow: var(--shadow-sm); }
        ${mq.lg} {
          .category-hero-title { font-size: 32px !important; }
          .category-hero-icon { width: 38px !important; height: 38px !important; }
          .hero-section { padding: 24px 0 20px; gap: 20px; }
          .rank-card { padding: 18px !important; }
          .other-cats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        ${mq.md} {
          .category-hero-title { font-size: 24px !important; }
          .hero-section { flex-direction: column; gap: 14px; }
          .rank-card-header { flex-wrap: wrap; }
          .other-cats-grid { grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
        }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
      `}</style>
    </div>
  )
}

export default function CategoryPageClient(props: Props) {
  return (
    <Suspense fallback={null}>
      <CategoryPageContent {...props} />
    </Suspense>
  )
}
