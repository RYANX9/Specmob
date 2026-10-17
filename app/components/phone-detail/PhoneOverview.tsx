'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Camera, Battery, Cpu, Monitor, HardHat, BadgeDollarSign, Smartphone } from 'lucide-react'
import { valueScoreColor } from '@/lib/valueScore'
import { tierStyle } from '@/lib/tiers'
import { formatUsd } from '@/lib/price'
import { realWeaknesses } from '@/lib/phone'
import { c, f } from '@/lib/tokens'
import type { ComparePair, Phone, PhoneAnalysis, PhoneDetail, PhoneMini } from '@/lib/types'

export function OverviewSection({ title, headline, specs }: { title: string; headline: string; specs: { label: string; value: string }[] }) {
  if (!specs.length) return null
  return (
    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', padding: '22px 24px' }}>
      <h3 style={{ fontFamily: f.serif, fontSize: 20, color: c.text1, marginBottom: 10, fontWeight: 400 }}>{title}</h3>
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

const QUALITY_ICON: Record<string, React.ReactNode> = {
  camera_score: <Camera size={14} strokeWidth={1.5} />,
  performance_score: <Cpu size={14} strokeWidth={1.5} />,
  battery_score: <Battery size={14} strokeWidth={1.5} />,
  display_score: <Monitor size={14} strokeWidth={1.5} />,
  build_score: <HardHat size={14} strokeWidth={1.5} />,
  value_score: <BadgeDollarSign size={14} strokeWidth={1.5} />,
}

const QUALITY_LABEL: Record<string, string> = {
  camera_score: 'Camera',
  performance_score: 'Performance',
  battery_score: 'Battery',
  display_score: 'Display',
  build_score: 'Build',
  value_score: 'Value',
}

function QualityBar({ field, score }: { field: string; score: number }) {
  const color = valueScoreColor(score)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ color, display: 'flex', flexShrink: 0, width: 16 }}>{QUALITY_ICON[field]}</span>
      <span style={{ width: 84, fontSize: 12, color: c.text2, flexShrink: 0 }}>{QUALITY_LABEL[field]}</span>
      <div style={{ flex: 1, height: 6, background: c.bg, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 3, width: `${score * 10}%`, background: color }} />
      </div>
      <span style={{ width: 28, fontSize: 12, fontWeight: 600, color: c.text1, textAlign: 'right', flexShrink: 0 }}>{score.toFixed(1)}</span>
    </div>
  )
}

function BulletList({ title, color, items }: { title: string; color: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div>
      <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color, marginBottom: 8 }}>
        {title}
      </h3>
      {items.slice(0, 5).map((s, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7, fontSize: 13, color: c.text2, lineHeight: 1.5 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 7 }} />
          <span>{s}</span>
        </div>
      ))}
    </div>
  )
}

export function ReviewSection({
  phone,
  analysis,
  fallbackSections,
}: {
  phone: PhoneDetail
  analysis: PhoneAnalysis | null
  fallbackSections: { title: string; headline: string; specs: { label: string; value: string }[] }[]
}) {
  const tier = tierStyle(phone.tier)
  const reasoning = analysis?.reasoning?.trim()

  if (!analysis || !reasoning) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {fallbackSections.map(s => <OverviewSection key={s.title} {...s} />)}
      </div>
    )
  }

  const qualityFields: [string, number | null][] = [
    ['camera_score', phone.camera_score],
    ['performance_score', phone.performance_score],
    ['battery_score', phone.battery_score],
    ['display_score', phone.display_score],
    ['build_score', phone.build_score],
    ['value_score', phone.value_score],
  ]
  const availableQuality = qualityFields.filter(([, v]) => v != null) as [string, number][]
  const weaknesses = realWeaknesses(analysis)

  return (
    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-lg)', padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ fontFamily: f.serif, fontSize: 22, color: c.text1, fontWeight: 400, margin: 0 }}>
          Why the {phone.name}
        </h2>
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

      <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.7, marginBottom: 20 }}>{reasoning}</p>

      {availableQuality.length > 0 && (
        <div style={{ marginBottom: 20, padding: '16px 18px', background: c.bg, borderRadius: 'var(--r-md)' }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: c.text3, marginBottom: 4 }}>
            Hardware quality by category
          </h3>
          <p style={{ fontSize: 11, color: c.text3, lineHeight: 1.5, marginBottom: 12 }}>
            The overall score is the average of these six components, rated within the phone&apos;s tier.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {availableQuality.map(([field, score]) => <QualityBar key={field} field={field} score={score} />)}
          </div>
        </div>
      )}

      <div className="specs-2col">
        <BulletList title="Strengths" color="var(--green)" items={analysis.strengths} />
        <BulletList title="Weaknesses" color="var(--orange)" items={weaknesses} />
      </div>
    </div>
  )
}

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

export function PriceHistoryChart({ points, loading }: { points: { date: string; usd: number }[]; loading: boolean }) {
  if (loading) return <div className="skeleton" style={{ height: 280, borderRadius: 'var(--r-lg)' }} />

  const data = points.map(p => ({ date: p.date, price: Number(p.usd) }))
  if (data.length < 2) return null

  const first = data[0].price
  const last = data[data.length - 1].price
  const deltaPct = first ? ((last - first) / first) * 100 : 0
  const yDomain = computeYDomain(data.map(d => d.price))

  return (
    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-lg)', padding: '22px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ fontFamily: f.serif, fontSize: 20, color: c.text1, fontWeight: 400, margin: 0 }}>Price history</h2>
        <div style={{ fontSize: 13, fontWeight: 600, color: deltaPct <= 0 ? 'var(--green)' : c.accent }}>
          {deltaPct > 0 ? '+' : ''}{deltaPct.toFixed(1)}% since first tracked
        </div>
      </div>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={c.border} vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-3)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} minTickGap={40} />
            <YAxis domain={yDomain} tick={{ fontSize: 11, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} width={54} tickFormatter={v => `$${v}`} />
            <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Lowest price']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border)' }} />
            <Line type="monotone" dataKey="price" stroke="var(--accent)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function SimilarCard({ phone }: { phone: Phone }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <Link
      href={phone.path}
      style={{ flexShrink: 0, width: 156, background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', padding: '14px 12px', textAlign: 'center', transition: 'all 0.15s', scrollSnapAlign: 'start', display: 'block', textDecoration: 'none' }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = 'var(--shadow-md)'; el.style.borderColor = c.borderHover }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'none'; el.style.boxShadow = 'none'; el.style.borderColor = c.border }}
    >
      <div style={{ width: 72, height: 72, margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {phone.main_image_url && !imgErr
          ? <img src={phone.main_image_url} alt={phone.display_name} loading="lazy" decoding="async" onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          : <Smartphone size={32} color={c.border} strokeWidth={1} />}
      </div>
      <div style={{ fontSize: 10, color: c.text3, textTransform: 'uppercase' as const, letterSpacing: '0.4px', marginBottom: 2 }}>{phone.brand}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: c.text1, lineHeight: 1.3, marginBottom: 6, fontFamily: f.serif }}>{phone.name}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: c.text1 }}>{formatUsd(phone.price_usd)}</div>
      {phone.main_camera_mp && (
        <div style={{ fontSize: 11, color: c.text3, marginTop: 3 }}>{phone.main_camera_mp}MP{phone.battery_capacity ? ` · ${phone.battery_capacity}mAh` : ''}</div>
      )}
    </Link>
  )
}

export function CompareWithCard({ pair, selfId }: { pair: ComparePair; selfId: number }) {
  const [imgErr, setImgErr] = useState(false)
  const other: PhoneMini | undefined = pair.phones.find(p => p.id !== selfId)
  if (!other) return null
  const tier = tierStyle(other.tier)
  return (
    <Link
      href={pair.path}
      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', transition: 'all 0.15s', textDecoration: 'none' }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = c.primary; el.style.boxShadow = 'var(--shadow-sm)' }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = c.border; el.style.boxShadow = 'none' }}
    >
      <div style={{ width: 52, height: 52, background: c.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {other.main_image_url && !imgErr
          ? <img src={other.main_image_url} alt={other.display_name} loading="lazy" decoding="async" onError={() => setImgErr(true)} style={{ width: 42, height: 42, objectFit: 'contain' }} />
          : <Smartphone size={20} color={c.border} strokeWidth={1} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: c.text1 }}>{other.display_name}</span>
          {pair.source === 'popular' && (
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.3px', color: c.accent, background: `${c.accent}14`, borderRadius: 'var(--r-full)', padding: '2px 7px' }}>
              POPULAR
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: c.text3, marginTop: 3 }}>
          {formatUsd(other.price_usd)}
          {other.overall_score != null ? ` · Score ${other.overall_score.toFixed(1)}` : ''}
          {tier ? ` · ${tier.label}` : ''}
        </div>
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: c.primary, flexShrink: 0 }}>Compare</span>
    </Link>
  )
}
