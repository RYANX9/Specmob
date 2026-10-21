// app/components/brand/BrandPageClient.tsx
'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { ChevronRight, Smartphone, ArrowRight } from 'lucide-react'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import CompareBar from '@/app/components/CompareBar'
import PhoneCard from '@/app/components/PhoneCard'
import AdSlot from '@/app/components/ads/AdSlot'
import UpcomingCard from '@/app/components/upcoming/UpcomingCard'
import { useToast } from '@/app/components/Toast'
import { useCompare } from '@/lib/compareStore'
import { MAX_COMPARE, ROUTES } from '@/lib/config'
import { formatUsd } from '@/lib/price'
import { tierStyle } from '@/lib/tiers'
import { c, f, mq } from '@/lib/tokens'
import { getBrandInfo, getBrandInitial } from '@/lib/brandData'
import { trackNextStep, trackPageView } from '@/lib/events'
import type { BrandDetail, Phone } from '@/lib/types'

interface Props {
  stats: BrandDetail
  phones: Phone[]
}

function BrandLogo({ logo, name }: { logo?: string; name: string }) {
  const [err, setErr] = useState(false)
  const wrap: React.CSSProperties = {
    flexShrink: 0, width: 72, height: 72, background: c.surface, border: `1px solid ${c.border}`,
    borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)',
  }
  if (logo && !err) {
    return (
      <div style={{ ...wrap, padding: 10 }}>
        <img src={logo} alt={`${name} logo`} width={52} height={52} referrerPolicy="no-referrer" decoding="async" onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
    )
  }
  return <div style={{ ...wrap, fontFamily: f.serif, fontSize: 28, fontWeight: 400, color: c.primary }}>{getBrandInitial(name)}</div>
}

function StatCard({ label, value, sub, href }: { label: string; value: string; sub?: string; href?: string }) {
  const body = (
    <>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: c.text3, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: f.serif, fontSize: 22, color: c.text1, lineHeight: 1.1, marginBottom: 4, wordBreak: 'break-word' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: c.text3 }}>{sub}</div>}
    </>
  )
  const style: React.CSSProperties = { background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', padding: '18px 20px', display: 'block', textDecoration: 'none' }
  return href ? <Link href={href} prefetch={false} style={style}>{body}</Link> : <div style={style}>{body}</div>
}

function TopCard({ phone, rank }: { phone: Phone; rank: number }) {
  const tier = tierStyle(phone.tier)
  return (
    <Link href={phone.path} prefetch={false} className="brand-top-card" style={{ display: 'flex', gap: 14, alignItems: 'center', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-lg)', padding: 16, textDecoration: 'none' }}>
      <div style={{ width: 76, height: 76, flexShrink: 0, background: c.bg, borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {phone.main_image_url
          ? <img src={phone.main_image_url} alt={phone.display_name} loading="lazy" decoding="async" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
          : <Smartphone size={28} color={c.border} strokeWidth={1} />}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: c.accent, marginBottom: 3 }}>#{rank} top rated</div>
        <div style={{ fontFamily: f.serif, fontSize: 17, color: c.text1, lineHeight: 1.2, marginBottom: 6 }}>{phone.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12.5, color: c.text3 }}>
          <span style={{ fontWeight: 700, color: c.text1 }}>{formatUsd(phone.price_usd)}</span>
          {phone.overall_score != null && <span>Score {phone.overall_score.toFixed(1)}</span>}
          {tier && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--r-full)', color: tier.color, background: tier.bg }}>{tier.label}</span>}
        </div>
      </div>
    </Link>
  )
}

function BrandContent({ stats, phones }: Props) {
  const { toast } = useToast()
  const { phones: comparePhones, add, remove } = useCompare()
  const info = getBrandInfo(stats.brand_slug) ?? getBrandInfo(stats.brand)

  useEffect(() => { trackPageView('brand', stats.path) }, [stats.path])

  const priceLine =
    stats.price_range.min != null && stats.price_range.max != null
      ? `from ${formatUsd(stats.price_range.min)} to ${formatUsd(stats.price_range.max)}`
      : null
  const topName = stats.top_phones[0]?.display_name
  const generatedIntro =
    `${stats.brand} has ${stats.total_phones} phone${stats.total_phones === 1 ? '' : 's'} in the Specmob catalog` +
    `${priceLine ? `, priced ${priceLine}` : ''}` +
    `${stats.latest_year ? `, with releases up to ${stats.latest_year}` : ''}.` +
    `${topName ? ` The highest-rated model is the ${topName}.` : ''}`

  const handleCompare = (phone: Phone) => {
    if (comparePhones.find(p => p.id === phone.id)) { remove(phone.id); toast('Removed from compare', 'info'); return }
    if (comparePhones.length >= MAX_COMPARE) { toast(`Maximum ${MAX_COMPARE} phones`, 'error'); return }
    add(phone)
    toast('Added to compare', 'success')
  }

  return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <Navbar />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px 80px' }}>
        <nav aria-label="Breadcrumb" style={{ padding: '16px 0 0', fontSize: 13, color: c.text3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Link href={ROUTES.home} style={{ color: c.text2 }}>Home</Link>
          <ChevronRight size={12} />
          <Link href={ROUTES.brands} style={{ color: c.text2 }}>Brands</Link>
          <ChevronRight size={12} />
          <span aria-current="page">{stats.brand}</span>
        </nav>

        <header style={{ padding: '28px 0 36px', display: 'flex', alignItems: 'flex-start', gap: 28, flexWrap: 'wrap' }}>
          <BrandLogo logo={info?.logo} name={stats.brand} />
          <div style={{ flex: 1, minWidth: 260 }}>
            <h1 style={{ fontFamily: f.serif, fontSize: 'clamp(30px,4vw,48px)', color: c.text1, letterSpacing: -1, lineHeight: 1.1, marginBottom: 10, fontWeight: 400 }}>
              {stats.brand} phones
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 14, color: c.text2, marginBottom: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Smartphone size={14} /> {stats.total_phones} phones</span>
              {stats.latest_year && <span>Latest: {stats.latest_year}</span>}
              {info && <span>Founded {info.founded}</span>}
              {info && <span>{info.hq}</span>}
            </div>
            <p style={{ fontSize: 15, color: c.text2, maxWidth: 680, lineHeight: 1.7, marginBottom: 16 }}>
              {info?.description ?? generatedIntro}
            </p>
            {info && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {info.highlights.map(h => (
                  <span key={h} style={{ padding: '4px 12px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 500, color: c.text2 }}>{h}</span>
                ))}
              </div>
            )}
          </div>
        </header>

        {(stats.upcoming?.length ?? 0) > 0 && (
          <section aria-labelledby="brand-upcoming" style={{ marginBottom: 40 }}>
            <h2 id="brand-upcoming" style={{ fontFamily: f.serif, fontSize: 24, color: c.text1, fontWeight: 400, marginBottom: 16 }}>
              Upcoming {stats.brand} phones
            </h2>
            <div className="scrollbar-none" style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: 4 }}>
              {stats.upcoming.map(p => <UpcomingCard key={p.id} phone={p} showStage prefetch={false} />)}
            </div>
          </section>
        )}

        <div className="brand-stats-grid" style={{ marginBottom: 40 }}>
          <StatCard label="Average price" value={stats.price_range.avg != null ? formatUsd(stats.price_range.avg) : '—'} sub={`Across ${stats.total_phones} models`} />
          <StatCard label="Price range" value={priceLine ? `${formatUsd(stats.price_range.min)} – ${formatUsd(stats.price_range.max)}` : '—'} />
          <StatCard label="Latest model" value={stats.latest_phone?.name ?? '—'} sub={stats.latest_year ? `Released ${stats.latest_year}` : undefined} href={stats.latest_phone?.path} />
          <StatCard label="Average battery" value={stats.avg_battery != null ? `${Math.round(stats.avg_battery).toLocaleString()} mAh` : '—'} sub="Across the lineup" />
        </div>

        {stats.top_phones.length > 0 && (
          <section aria-labelledby="top-rated" style={{ marginBottom: 44 }}>
            <h2 id="top-rated" style={{ fontFamily: f.serif, fontSize: 24, color: c.text1, fontWeight: 400, marginBottom: 18 }}>Top rated {stats.brand} phones</h2>
            <div className="brand-top-grid" style={{ display: 'grid', gap: 14 }}>
              {stats.top_phones.map((p, i) => <TopCard key={p.id} phone={p} rank={i + 1} />)}
            </div>
          </section>
        )}

        {stats.categories.length > 0 && (
          <section aria-labelledby="best-of" style={{ marginBottom: 44 }}>
            <h2 id="best-of" style={{ fontFamily: f.serif, fontSize: 24, color: c.text1, fontWeight: 400, marginBottom: 16 }}>Where {stats.brand} ranks</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {stats.categories.map(cat => (
                <Link key={cat.slug} href={cat.path} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-full)', fontSize: 13, fontWeight: 600, color: c.text1, textDecoration: 'none' }}>
                  {cat.title}
                  <span style={{ fontSize: 11, fontWeight: 700, color: c.accent }}>best #{cat.best_rank}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section id="latest-phones" aria-labelledby="latest-heading">
          <h2 id="latest-heading" style={{ fontFamily: f.serif, fontSize: 24, color: c.text1, fontWeight: 400, marginBottom: 16 }}>
            Latest {stats.brand} phones
          </h2>

          {phones.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: c.text3 }}>
              <Smartphone size={44} color={c.border} strokeWidth={1.2} style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 14 }}>No {stats.brand} phones to show right now.</p>
            </div>
          ) : (
            <div className="brand-phone-grid">
              {phones.map(p => (
                <PhoneCard
                  key={p.id}
                  phone={p}
                  prefetch={false}
                  compareIds={comparePhones.map(x => x.id)}
                  onCompareToggle={handleCompare}
                />
              ))}
            </div>
          )}

          <p style={{ fontSize: 13.5, color: c.text3, marginTop: 20 }}>
            Looking for another {stats.brand} model? Search for it by name in the search bar.
          </p>
        </section>

        <div style={{ marginTop: 40 }}><AdSlot placement="inline" /></div>

        {stats.similar_brands.length > 0 && (
          <section aria-labelledby="similar-brands" style={{ marginTop: 44 }}>
            <h2 id="similar-brands" style={{ fontFamily: f.serif, fontSize: 22, color: c.text1, fontWeight: 400, marginBottom: 14 }}>Similar brands</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {stats.similar_brands.map(b => (
                <Link key={b.brand_slug} href={b.path} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-full)', fontSize: 13, fontWeight: 600, color: c.text1, textDecoration: 'none' }}>
                  {b.brand}
                  <span style={{ fontSize: 11, color: c.text3, fontWeight: 500 }}>{b.phone_count} phones</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {stats.next_steps.length > 0 && (
          <section aria-label="Next steps" style={{ marginTop: 32, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {stats.next_steps.map(step => (
              <Link
                key={step.slot + step.href}
                href={step.href}
                onClick={() => trackNextStep(step.slot, step.href, 'brand')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-full)', fontSize: 13, fontWeight: 600, color: c.text1, textDecoration: 'none' }}
              >
                {step.label}
                <ArrowRight size={13} color={c.text3} />
              </Link>
            ))}
          </section>
        )}
      </div>

      <Footer />
      <CompareBar />

      <style>{`
        .brand-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        .brand-top-grid { grid-template-columns: repeat(3, 1fr); }
        .brand-phone-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 14px; }
        .brand-top-card { transition: all 150ms ease; }
        .brand-top-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
        ${mq.lg} { .brand-stats-grid { grid-template-columns: repeat(2, 1fr); } .brand-top-grid { grid-template-columns: 1fr; } }
        ${mq.md} { .brand-phone-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; } }
      `}</style>
    </div>
  )
}

export default function BrandPageClient(props: Props) {
  return (
    <Suspense fallback={null}>
      <BrandContent {...props} />
    </Suspense>
  )
}
