'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Camera, Battery, Cpu, Monitor, HardHat, Smartphone } from 'lucide-react'
import type { PricePointRow } from '@/lib/api'
import { ROUTES, brandSlug, phoneSlug, valueScoreColor } from '@/lib/config'
import { getTierStyle } from '@/lib/tiers'
import { resolveDisplayPrice } from '@/lib/price'
import { c, f } from '@/lib/tokens'
import type { Phone } from '@/lib/types'

// ─── fallback overview section (used when no AI smart_score exists) ─────────

export function OverviewSection({ title, headline, specs }: { title: string; headline: string; specs: { label: string; value: string }[] }) {
  if (!specs.length) return null
  return (
    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', padding: '22px 24px' }}>
      <div style={{ fontFamily: f.serif, fontSize: 20, color: c.text1, marginBottom: 10 }}>{title}</div>
      <div style={{ fontWeight: 600, fontSize: 15, color: c.text1, marginBottom: 14 }}>{headline}</div>
      <div className="specs-2col">
        {specs.map(s => (
          <div key={s.label} style={{ padding: '9px 12px', background: c.bg, borderRadius: 'var(--r-sm)' }}>
            <div style={{ fontSize: 11, color: c.text3, marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: c.text1, lineHeight: 1.4 }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── "Why This Phone" quality bars ───────────────────────────────────────────

const QUALITY_ICON: Record<string, React.ReactNode> = {
  camera_score: <Camera size={14} strokeWidth={1.5} />,
  performance_score: <Cpu size={14} strokeWidth={1.5} />,
  battery_score: <Battery size={14} strokeWidth={1.5} />,
  display_score: <Monitor size={14} strokeWidth={1.5} />,
  build_score: <HardHat size={14} strokeWidth={1.5} />,
}

const QUALITY_LABEL: Record<string, string> = {
  camera_score: 'Camera',
  performance_score: 'Performance',
  battery_score: 'Battery',
  display_score: 'Display',
  build_score: 'Build',
}

function QualityBar({ field, score }: { field: string; score: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ color: c.text3, display: 'flex', flexShrink: 0, width: 16 }}>{QUALITY_ICON[field]}</span>
      <span style={{ width: 84, fontSize: 12, color: c.text2, flexShrink: 0 }}>{QUALITY_LABEL[field]}</span>
      <div style={{ flex: 1, height: 6, background: c.bg, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 3, width: `${score * 10}%`, background: valueScoreColor(score), transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ width: 28, fontSize: 12, fontWeight: 600, color: c.text1, textAlign: 'right', flexShrink: 0 }}>{score.toFixed(1)}</span>
    </div>
  )
}

export function WhyThisPhone({
  phone,
  fallbackSections,
}: {
  phone: Phone
  fallbackSections: { title: string; headline: string; specs: { label: string; value: string }[] }[]
}) {
  const smart = phone.smart_score

  if (!smart || !smart.reasoning) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {fallbackSections.map(s => <OverviewSection key={s.title} {...s} />)}
      </div>
    )
  }

  // chipset_tier arrives from the API already resolved (smart_tier preferred
  // over the chipset regex fallback in shaping.py) — do not re-resolve
  // against smart.tier here, that would be re-deriving the same value.
  const tier = getTierStyle(phone.chipset_tier)

  const qualityFields: [string, number | null][] = [
    ['camera_score', smart.camera_score],
    ['performance_score', smart.performance_score],
    ['battery_score', smart.battery_score],
    ['display_score', smart.display_score],
    ['build_score', smart.build_score],
  ]
  const availableQuality = qualityFields.filter(([, v]) => v != null) as [string, number][]

  return (
    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-lg)', padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontFamily: f.serif, fontSize: 22, color: c.text1 }}>Why This Phone</div>
        {tier && (
          <span style={{
            padding: '4px 12px', background: tier.bg, color: tier.color,
            border: `1px solid ${tier.color}25`, borderRadius: 'var(--r-full)',
            fontSize: 12, fontWeight: 600,
          }}>
            {tier.label}
          </span>
        )}
      </div>

      <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.7, marginBottom: 20 }}>{smart.reasoning}</p>

      {availableQuality.length > 0 && (
        <div style={{ marginBottom: 20, padding: '16px 18px', background: c.bg, borderRadius: 'var(--r-md)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: c.text3, marginBottom: 4 }}>
            Hardware Quality by Category
          </div>
          <p style={{ fontSize: 11, color: c.text3, lineHeight: 1.5, marginBottom: 12 }}>
            Independent of price. For price-adjusted comparison, see Value Score above.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {availableQuality.map(([field, score]) => <QualityBar key={field} field={field} score={score} />)}
          </div>
        </div>
      )}

      <div className="specs-2col">
        {!!smart.strengths?.length && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: 'var(--green)', marginBottom: 8 }}>
              Strengths
            </div>
            {smart.strengths.slice(0, 5).map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7, fontSize: 13, color: c.text2, lineHeight: 1.5 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', flexShrink: 0, marginTop: 7 }} />
                <span>{s}</span>
              </div>
            ))}
          </div>
        )}
        {!!smart.weaknesses?.length && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: 'var(--orange)', marginBottom: 8 }}>
              Weaknesses
            </div>
            {smart.weaknesses.slice(0, 5).map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7, fontSize: 13, color: c.text2, lineHeight: 1.5 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--orange)', flexShrink: 0, marginTop: 7 }} />
                <span>{s}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── price history chart ──────────────────────────────────────────────────────

function computeYDomain(prices: number[]): [number, number] {
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const spread = max - min
  const padding = Math.max(spread * 0.35, 40)

  let lo = min - padding
  let hi = max + padding

  const MIN_SPAN = 300
  if (hi - lo < MIN_SPAN) {
    const mid = (hi + lo) / 2
    lo = mid - MIN_SPAN / 2
    hi = mid + MIN_SPAN / 2
  }

  lo = Math.max(0, Math.floor(lo / 50) * 50)
  hi = Math.ceil(hi / 50) * 50
  return [lo, hi]
}

export function PriceHistoryChart({ points, loading }: { points: PricePointRow[]; loading: boolean }) {
  const data = points
    .filter(p => p.price_usd != null)
    .map(p => ({ date: p.snapshot_date, price: Number(p.price_usd) }))

  if (loading) {
    return <div className="skeleton" style={{ height: 280, borderRadius: 'var(--r-lg)' }} />
  }

  if (data.length < 2) return null

  const first = data[0].price
  const last  = data[data.length - 1].price
  const deltaPct = first ? ((last - first) / first) * 100 : 0
  const yDomain = computeYDomain(data.map(d => d.price))

  return (
    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-lg)', padding: '22px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontFamily: f.serif, fontSize: 20, color: c.text1 }}>Price History</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: deltaPct <= 0 ? 'var(--green)' : c.accent }}>
          {deltaPct > 0 ? '+' : ''}{deltaPct.toFixed(1)}% since first tracked
        </div>
      </div>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={c.border} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'var(--text-3)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              minTickGap={40}
            />
            <YAxis
              domain={yDomain}
              tick={{ fontSize: 11, fill: 'var(--text-3)' }}
              tickLine={false}
              axisLine={false}
              width={54}
              tickFormatter={v => `$${v}`}
            />
            <Tooltip
              formatter={(v: number) => [`$${v.toLocaleString()}`, 'Price']}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border)' }}
            />
            <Line type="monotone" dataKey="price" stroke="var(--accent)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── similar phone card ───────────────────────────────────────────────────────

export function SimilarCard({ phone }: { phone: Phone }) {
  const [imgErr, setImgErr] = useState(false)
  const displayPrice = resolveDisplayPrice(phone)
  return (
    <Link
      href={ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone))}
      style={{ flexShrink: 0, width: 156, background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', padding: '14px 12px', textAlign: 'center', transition: 'all 0.15s', scrollSnapAlign: 'start', display: 'block', textDecoration: 'none' }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = 'var(--shadow-md)'; el.style.borderColor = c.borderHover }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'none'; el.style.boxShadow = 'none'; el.style.borderColor = c.border }}
    >
      <div style={{ width: 72, height: 72, margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {phone.main_image_url && !imgErr
          ? <img src={phone.main_image_url} alt={phone.model_name} loading="lazy" decoding="async" onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          : <Smartphone size={32} color={c.border} strokeWidth={1} />}
      </div>
      <div style={{ fontSize: 10, color: c.text3, textTransform: 'uppercase' as const, letterSpacing: '0.4px', marginBottom: 2 }}>{phone.brand}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: c.text1, lineHeight: 1.3, marginBottom: 6, fontFamily: f.serif }}>{phone.model_name}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: c.text1 }}>
        {displayPrice != null ? `$${Math.round(displayPrice).toLocaleString()}` : '—'}
      </div>
      {phone.main_camera_mp && (
        <div style={{ fontSize: 11, color: c.text3, marginTop: 3 }}>{phone.main_camera_mp}MP · {phone.battery_capacity ? `${phone.battery_capacity}mAh` : ''}</div>
      )}
    </Link>
  )
}
