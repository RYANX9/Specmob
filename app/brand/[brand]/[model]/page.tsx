'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  ChevronRight, ChevronLeft, Share2, GitCompare, ShoppingCart,
  Check, Camera, Battery, Cpu, Monitor,
  Weight, Zap, Smartphone, ArrowRight, HardHat, ExternalLink,
} from 'lucide-react'
import { api, type PricePointRow } from '@/lib/api'
import { ROUTES, brandSlug, phoneSlug, valueScoreColor } from '@/lib/config'
import { resolveTier } from '@/lib/tiers'
import { resolveDisplayPrice, withLaunchPrice } from '@/lib/price'
import { getPanelType, getFrontCamera } from '@/lib/specs'
import { c, f, z } from '@/lib/tokens'
import type { Phone, PhoneVariant } from '@/lib/types'
import Navbar from '@/app/components/Navbar'
import { useToast } from '@/app/components/Toast'
import CompareBar from '@/app/components/CompareBar'
import Footer from '@/app/components/Footer'

// ─── variant types ─────────────────────────────────────────────────────────

type PhoneVariant = {
  ram_gb: number | null
  storage_gb: number
  price: number
  url: string
}

function formatStorage(gb: number): string {
  return gb >= 1000 ? `${gb / 1000}TB` : `${gb}GB`
}

function isSameVariant(a: PhoneVariant | null, b: PhoneVariant): boolean {
  return !!a && a.storage_gb === b.storage_gb && a.ram_gb === b.ram_gb
}

// ─── HTML / text helpers ──────────────────────────────────────────────────────

function stripHtml(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&deg;/g, '°')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&times;/g, '×')
    .replace(/&copy;/g, '©')
    .replace(/&reg;/g, '®')
    .replace(/&trade;/g, '™')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function specValueToString(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'string') {
    const stripped = stripHtml(v)
    return stripped || '—'
  }
  if (Array.isArray(v)) {
    return v.map(specValueToString).filter(s => s !== '—').join(', ') || '—'
  }
  if (typeof v === 'object') {
    return Object.entries(v as Record<string, unknown>)
      .filter(([, val]) => {
        const s = String(val ?? '')
        return !s.startsWith('http') && s !== 'null' && s !== ''
      })
      .map(([k, val]) => `${k}: ${specValueToString(val)}`)
      .join(' · ') || '—'
  }
  return String(v)
}

const SKIP_SPEC_KEYS = new Set([
  'metadata', 'media', 'benchmarks', 'price_info',
  'quick_specs', 'processed_at', 'source_url', 'specifications',
])

function getSpecGroups(phone: Phone): Array<[string, Record<string, string>]> {
  const fs = phone.full_specifications
  if (!fs || typeof fs !== 'object') return []
  const root: Record<string, unknown> =
    (fs as any).specifications && typeof (fs as any).specifications === 'object'
      ? (fs as any).specifications
      : (fs as any)

  const groups: Array<[string, Record<string, string>]> = []
  for (const [groupName, groupVal] of Object.entries(root)) {
    if (SKIP_SPEC_KEYS.has(groupName)) continue
    if (!groupVal || typeof groupVal !== 'object' || Array.isArray(groupVal)) continue
    const rows: Record<string, string> = {}
    for (const [k, v] of Object.entries(groupVal as Record<string, unknown>)) {
      if (k.toLowerCase().includes('url') && typeof v === 'string' && v.startsWith('http')) continue
      const val = specValueToString(v)
      if (val && val !== '—') rows[k] = val
    }
    if (Object.keys(rows).length > 0) groups.push([groupName, rows])
  }
  return groups
}

// ─── spec group ordering ──────────────────────────────────────────────────────

const SPEC_GROUP_ORDER = [
  'launch', 'availability', 'status',
  'network', 'sim',
  'display', 'screen',
  'platform', 'performance', 'chipset', 'processor',
  'memory', 'storage',
  'main camera', 'rear camera', 'camera',
  'selfie', 'front camera', 'secondary camera',
  'sound', 'audio',
  'comms', 'connectivity', 'wlan', 'bluetooth', 'nfc',
  'sensors', 'features',
  'battery',
  'body', 'build', 'design', 'dimensions',
  'tests', 'misc', 'other',
]

function rankSpecGroup(name: string): number {
  const lower = name.toLowerCase()
  const idx = SPEC_GROUP_ORDER.findIndex(k => lower.includes(k))
  return idx === -1 ? 998 : idx
}

// ─── slug resolution ────────────────────────────────────────────────────────

function pickBest(phones: Phone[], targetSlug: string): Phone | null {
  if (!phones.length) return null
  const target = targetSlug.toLowerCase()
  let best: Phone | null = null
  let bestScore = -1
  for (const p of phones) {
    const ps = phoneSlug(p).toLowerCase()
    if (ps === target) return p
    let score = 0; let ti = 0
    for (let pi = 0; pi < ps.length && ti < target.length; pi++) {
      if (ps[pi] === target[ti]) { score++; ti++ }
    }
    if (score > bestScore) { bestScore = score; best = p }
  }
  return bestScore > target.length * 0.45 ? best : null
}

async function resolvePhone(brand: string, model: string, signal: AbortSignal): Promise<Phone | null> {
  const brandName  = brand.replace(/-/g, ' ')
  const modelWords = model.replace(/-/g, ' ')

  const [withBrand, withoutBrand] = await Promise.allSettled([
    api.phones.search({ q: modelWords, brand: brandName, page_size: 10 }, signal),
    api.phones.search({ q: modelWords, page_size: 10 }, signal),
  ])

  if (withBrand.status === 'fulfilled') {
    const match = pickBest(withBrand.value.results, model)
    if (match) return api.phones.detail(match.id, signal)
  }

  if (withoutBrand.status === 'fulfilled') {
    const match = pickBest(withoutBrand.value.results, model)
    if (match) return api.phones.detail(match.id, signal)
  }

  const brandTokens = brandName.toLowerCase().split(' ')
  let queryTokens = modelWords.toLowerCase().split(' ')
  for (const bt of brandTokens) {
    if (queryTokens[0] === bt) queryTokens = queryTokens.slice(1)
  }
  const stripped = queryTokens.join(' ')

  if (stripped && stripped !== modelWords.toLowerCase()) {
    try {
      const res = await api.phones.search({ q: stripped, brand: brandName, page_size: 10 }, signal)
      const match = pickBest(res.results, model)
      if (match) return api.phones.detail(match.id, signal)
    } catch { /* continue */ }
  }

  try {
    const res = await api.phones.search({ brand: brandName, page_size: 50 }, signal)
    const match = pickBest(res.results, model)
    if (match) return api.phones.detail(match.id, signal)
  } catch { /* ignore */ }

  return null
}

// ─── sub-components ───────────────────────────────────────────────────────────

type TabType = 'overview' | 'specs' | 'compare'

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '14px 20px', fontSize: 14, fontWeight: 500,
      color: active ? c.text1 : c.text3,
      borderBottom: `2px solid ${active ? c.accent : 'transparent'}`,
      transition: 'all 0.15s', whiteSpace: 'nowrap',
      background: 'none', border: 'none', cursor: 'pointer',
    }}>
      {children}
    </button>
  )
}

function SpecRow({ label, value, alt }: { label: string; value: string; alt: boolean }) {
  const lines = value.split('\n').filter(Boolean)
  return (
    <div style={{
      display: 'flex', gap: 0, padding: '7px 14px',
      borderBottom: `1px solid ${c.border}`,
      background: alt ? 'rgba(248,248,245,0.6)' : 'transparent',
      alignItems: 'flex-start',
    }}>
      <div style={{ width: 130, minWidth: 130, flexShrink: 0, fontSize: 12, color: c.text3, fontWeight: 500, paddingTop: 1, paddingRight: 12, lineHeight: 1.4 }}>
        {label}
      </div>
      <div style={{ flex: 1, fontSize: 13, color: c.text1, lineHeight: 1.5 }}>
        {lines.length <= 1
          ? value
          : lines.map((line, i) => <div key={i} style={{ marginBottom: i < lines.length - 1 ? 3 : 0 }}>{line}</div>)
        }
      </div>
    </div>
  )
}

function SpecGroup({ title, specs }: { title: string; specs: Record<string, string> }) {
  const entries = Object.entries(specs)
  if (!entries.length) return null
  return (
    <div style={{ marginBottom: 6, borderRadius: 'var(--r-md)', overflow: 'hidden', border: `1px solid ${c.border}` }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', background: c.bg,
        borderBottom: `1px solid ${c.border}`,
      }}>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.6px', color: c.text1 }}>
          {title}
        </span>
        <span style={{ fontSize: 11, color: c.text3 }}>{entries.length} specs</span>
      </div>
      <div style={{ background: c.surface }}>
        {entries.map(([k, v], i) => <SpecRow key={k} label={k} value={v} alt={i % 2 === 1} />)}
      </div>
    </div>
  )
}

function QuickSpecCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', padding: '16px 12px', textAlign: 'center' }}>
      <div style={{ color: c.text3, display: 'flex', justifyContent: 'center', marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: c.text1, marginBottom: 3, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 11, color: c.text3, textTransform: 'uppercase' as const, letterSpacing: '0.3px' }}>{label}</div>
    </div>
  )
}

// ─── variant picker ─────────────────────────────────────────────────────────

function VariantPicker({
  variants,
  loading,
  selected,
  onSelect,
}: {
  variants: PhoneVariant[]
  loading: boolean
  selected: PhoneVariant | null
  onSelect: (v: PhoneVariant) => void
}) {
  if (loading) {
    return <div className="skeleton" style={{ height: 92, borderRadius: 'var(--r-lg)', marginBottom: 18 }} />
  }
  if (!variants.length) return null

  const hasRam = variants.some(v => v.ram_gb != null)
  const cheapest = Math.min(...variants.map(v => v.price))

  // Helper to format storage cleanly (e.g., 1024 -> 1TB, 512 -> 512GB)
  const formatSize = (s: number) => {
    if (s >= 1000) {
      // Rounds 1024 or 1000 to 1, 2048 to 2, etc.
      return `${Math.round(s / 1000)}TB`
    }
    return `${s}GB`
  }

  return (
    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-lg)', padding: '18px 20px', marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: c.text1 }}>Choose a configuration</span>
        <span style={{ fontSize: 11, color: c.text3 }}>{variants.length} option{variants.length > 1 ? 's' : ''}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
        {variants.map((v, i) => {
          const isSelected = isSameVariant(selected, v)
          const isCheapest = v.price === cheapest
          return (
            <button
              key={`${v.ram_gb ?? 'x'}-${v.storage_gb}-${i}`}
              onClick={() => onSelect(v)}
              style={{
                position: 'relative',
                display: 'flex', flexDirection: 'column', gap: 3,
                padding: '10px 12px', textAlign: 'left',
                borderRadius: 'var(--r-md)', cursor: 'pointer',
                border: `1.5px solid ${isSelected ? c.accent : c.border}`,
                background: isSelected ? `${c.accent}12` : c.bg,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = c.borderHover }}
              onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = c.border }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: isSelected ? c.accent : c.text1 }}>
                {hasRam && v.ram_gb ? `${v.ram_gb}/${formatSize(v.storage_gb)}` : formatSize(v.storage_gb)}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: c.text1 }}>
                ${v.price.toLocaleString()}
              </span>
              {isCheapest && variants.length > 1 && (
                <span style={{ position: 'absolute', top: -7, right: 8, fontSize: 9, fontWeight: 700, letterSpacing: '0.3px', color: 'var(--green)', background: 'var(--green-light)', border: '1px solid var(--green-border)', borderRadius: 'var(--r-full)', padding: '1px 6px' }}>
                  BEST PRICE
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p style={{ fontSize: 11, color: c.text3, marginTop: 10, lineHeight: 1.5 }}>
        Prices reflect the selected storage{hasRam ? ' and RAM' : ''} configuration and may differ from the base listing above.
      </p>
    </div>
  )
}


function OverviewSection({ title, headline, specs }: { title: string; headline: string; specs: { label: string; value: string }[] }) {
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

function WhyThisPhone({
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

  const tier = resolveTier(smart.tier, phone.chipset_tier)

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

function PriceHistoryChart({ points, loading }: { points: PricePointRow[]; loading: boolean }) {
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

function SimilarCard({ phone }: { phone: Phone }) {
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

function buildGalleryUrls(phone: Phone): string[] {
  const extra = (phone.images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(img => img.image_url)
    .filter(url => url !== phone.main_image_url)

  const urls = phone.main_image_url ? [phone.main_image_url, ...extra] : extra
  return urls.filter(Boolean)
}

function PhoneGallery({ phone }: { phone: Phone }) {
  const gallery = buildGalleryUrls(phone)
  const [index, setIndex] = useState(0)
  const [failed, setFailed] = useState<Record<number, boolean>>({})

  const current = gallery[index]
  const hasMultiple = gallery.length > 1
  const goTo = (i: number) => setIndex((i + gallery.length) % gallery.length)

  return (
    <div style={{
      background: c.surface, border: `1px solid ${c.border}`,
      borderRadius: 'var(--r-xl)', padding: 32,
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ position: 'relative', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {current && !failed[index]
          ? <img
              src={current}
              alt={`${phone.brand} ${phone.model_name}`}
              onError={() => setFailed(prev => ({ ...prev, [index]: true }))}
              style={{ maxWidth: '72%', maxHeight: '72%', objectFit: 'contain' }}
            />
          : <Smartphone size={100} color={c.border} strokeWidth={0.8} />}

        {phone.release_year && (
          <div style={{ position: 'absolute', top: 14, right: 14, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 'var(--r-full)', padding: '4px 10px', fontSize: 11, fontWeight: 600, color: c.text3 }}>
            {phone.release_year}
          </div>
        )}

        {hasMultiple && (
          <>
            <button
              onClick={() => goTo(index - 1)}
              aria-label="Previous image"
              style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: c.surface, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.text2, cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => goTo(index + 1)}
              aria-label="Next image"
              style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: c.surface, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.text2, cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>

      {hasMultiple && (
        <div className="scrollbar-none" style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
          {gallery.map((url, i) => (
            <button
              key={`${url}-${i}`}
              onClick={() => setIndex(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === index}
              style={{
                flexShrink: 0, width: 56, height: 56, padding: 0,
                borderRadius: 'var(--r-sm)',
                border: `2px solid ${i === index ? c.accent : c.border}`,
                background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.15s',
              }}
            >
              {!failed[i]
                ? <img
                    src={url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={() => setFailed(prev => ({ ...prev, [i]: true }))}
                    style={{ width: '80%', height: '80%', objectFit: 'contain' }}
                  />
                : <Smartphone size={20} color={c.border} strokeWidth={1} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── JSON-LD builders ─────────────────────────────────────────────────────────

function buildProductJsonLd(phone: Phone, brand: string, model: string, displayPrice: number | null): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${phone.brand} ${phone.model_name}`,
    brand: { '@type': 'Brand', name: phone.brand },
    description: [
      phone.main_camera_mp ? `${phone.main_camera_mp}MP main camera` : null,
      phone.battery_capacity ? `${phone.battery_capacity.toLocaleString()}mAh battery` : null,
      phone.chipset ? phone.chipset : null,
      phone.screen_size ? `${phone.screen_size}" display` : null,
    ].filter(Boolean).join(', '),
    ...(displayPrice != null && {
      offers: {
        '@type': 'Offer',
        price: displayPrice,
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: `https://specmob.vercel.app/brand/${brandSlug(phone.brand)}/${phoneSlug(phone)}`,
      },
    }),
    ...(phone.main_image_url && { image: phone.main_image_url }),
  }
}

function buildBreadcrumbJsonLd(phone: Phone): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://specmob.vercel.app' },
      { '@type': 'ListItem', position: 2, name: phone.brand, item: `https://specmob.vercel.app/brand/${brandSlug(phone.brand)}` },
      { '@type': 'ListItem', position: 3, name: phone.model_name, item: `https://specmob.vercel.app/brand/${brandSlug(phone.brand)}/${phoneSlug(phone)}` },
    ],
  }
}

// ─── main page component ──────────────────────────────────────────────────────

function PhoneDetailContent() {
  const params       = useParams()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { toast }    = useToast()

  const brand = (params?.brand as string) ?? ''
  const model = (params?.model as string) ?? ''

  const [phone, setPhone]                   = useState<Phone | null>(null)
  const [similar, setSimilar]               = useState<Phone[]>([])
  const [similarLoading, setSimilarLoading] = useState(false)
  const [loading, setLoading]               = useState(true)
  const [notFound, setNotFound]             = useState(false)
  const [tab, setTab]                       = useState<TabType>(() => {
    const t = searchParams.get('tab')
    return (t === 'specs' || t === 'compare') ? t : 'overview'
  })
  const [imgErr, setImgErr]               = useState(false)
  const [copied, setCopied]               = useState(false)
  const [comparePhones, setComparePhones] = useState<Phone[]>([])
  const [priceHistoryPoints, setPriceHistoryPoints] = useState<PricePointRow[]>([])
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(false)
  const [variants, setVariants]                 = useState<PhoneVariant[]>([])
  const [variantsLoading, setVariantsLoading]   = useState(false)
  const [selectedVariant, setSelectedVariant]   = useState<PhoneVariant | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleTabChange = (newTab: TabType) => {
    setTab(newTab)
    const p = new URLSearchParams(searchParams.toString())
    if (newTab === 'overview') {
      p.delete('tab')
    } else {
      p.set('tab', newTab)
    }
    const str = p.toString()
    router.replace(str ? `?${str}` : window.location.pathname, { scroll: false })
  }

  useEffect(() => {
    if (!brand || !model) return
    const controller = new AbortController()

    setLoading(true)
    setNotFound(false)
    setPhone(null)
    setSimilar([])
    setPriceHistoryPoints([])
    setVariants([])
    setSelectedVariant(null)

    resolvePhone(brand, model, controller.signal)
      .then(async found => {
        if (controller.signal.aborted) return
        if (!found) { setNotFound(true); return }
        setPhone(found)

        setSimilarLoading(true)
        api.phones.similar(found.id, 12)
          .then(res => { if (!controller.signal.aborted) setSimilar(res?.phones ?? []) })
          .catch(() => {})
          .finally(() => { if (!controller.signal.aborted) setSimilarLoading(false) })
      })
      .catch(() => { if (!controller.signal.aborted) setNotFound(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })

    return () => controller.abort()
  }, [brand, model])

  useEffect(() => {
    if (!phone?.id) return
    const controller = new AbortController()
    setPriceHistoryLoading(true)
    api.phones.priceHistory(phone.id, { scope: 'global' }, controller.signal)
      .then(res => { if (!controller.signal.aborted) setPriceHistoryPoints(res.price_points ?? []) })
      .catch(() => { if (!controller.signal.aborted) setPriceHistoryPoints([]) })
      .finally(() => { if (!controller.signal.aborted) setPriceHistoryLoading(false) })
    return () => controller.abort()
  }, [phone?.id])

  // Fetch storage/RAM price variants for this phone. Backed by GET /phones/{id}/variants
  // — add a matching `variants(id, signal)` method next to `priceHistory` in lib/api.ts:
  //
  //   variants: (id: number, signal?: AbortSignal) =>
  //     fetchJson<{ phone_id: number; variants: PhoneVariant[] }>(`/phones/${id}/variants`, signal),
  //
  useEffect(() => {
    if (!phone?.id) return
    const controller = new AbortController()
    setVariantsLoading(true)
    api.phones.variants(phone.id, controller.signal)
      .then(res => {
        if (controller.signal.aborted) return
        const vs = (res?.variants ?? []) as PhoneVariant[]
        setVariants(vs)
        setSelectedVariant(vs[0] ?? null)
      })
      .catch(() => { if (!controller.signal.aborted) { setVariants([]); setSelectedVariant(null) } })
      .finally(() => { if (!controller.signal.aborted) setVariantsLoading(false) })
    return () => controller.abort()
  }, [phone?.id])

  const inCompare = phone ? comparePhones.some(p => p.id === phone.id) : false

  const handleCompareToggle = () => {
    if (!phone) return
    setComparePhones(prev => {
      if (prev.find(p => p.id === phone.id)) {
        toast('Removed from compare', 'info')
        return prev.filter(p => p.id !== phone.id)
      }
      if (prev.length >= 4) { toast('Maximum 4 phones', 'error'); return prev }
      toast('Added to compare', 'success')
      return [...prev, phone]
    })
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      toast('Link copied!', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('Could not copy link — try copying from the address bar', 'error')
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <Navbar compareCount={0} />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px var(--page-px)' }}>
        <div className="phone-hero-grid" style={{ gap: 40, paddingBottom: 48 }}>
          <div className="skeleton" style={{ aspectRatio: '1', borderRadius: 'var(--r-xl)' }} />
          <div style={{ paddingTop: 8 }}>
            {([['30%', 12], ['85%', 36], ['40%', 28], ['100%', 72]] as const).map(([w, h], i) => (
              <div key={i} className="skeleton" style={{ height: h, width: w, marginBottom: 16, borderRadius: 8 }} />
            ))}
          </div>
        </div>
        <div className="quick-specs-grid" style={{ marginBottom: 48 }}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--r-md)' }} />)}
        </div>
      </div>
    </div>
  )

  if (notFound || !phone) return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <Navbar compareCount={0} />
      <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 var(--page-px)', textAlign: 'center' }}>
        <Smartphone size={64} color={c.border} strokeWidth={1} style={{ margin: '0 auto 20px' }} />
        <h1 style={{ fontFamily: f.serif, fontSize: 28, color: c.text1, marginBottom: 10 }}>Phone not found</h1>
        <p style={{ fontSize: 15, color: c.text2, lineHeight: 1.6, marginBottom: 24 }}>
          We don't have this phone in our database. We only track phones currently available for purchase.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href={ROUTES.home} style={{ padding: '10px 24px', background: c.primary, color: '#fff', borderRadius: 'var(--r-full)', fontSize: 14, fontWeight: 600 }}>
            Browse All Phones
          </Link>
          <Link href={ROUTES.brand(brand)} style={{ padding: '10px 24px', border: `1px solid ${c.border}`, color: c.text2, borderRadius: 'var(--r-full)', fontSize: 14, fontWeight: 500 }}>
            Browse {brand.replace(/-/g, ' ')} phones
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  )

  // ── derived ──────────────────────────────────────────────────────────────────
  const displayPrice = resolveDisplayPrice(phone, priceHistoryPoints)

  // Effective price/link reflect the selected variant when one exists; otherwise fall
  // back to the phone table's own price (which is what phones with no variants use).
  const effectivePrice = selectedVariant ? selectedVariant.price : displayPrice
  const buyUrl   = selectedVariant?.url || phone.amazon_link
  const isAmazon = !!buyUrl && buyUrl.includes('amazon.')

  const quickSpecs = [
    phone.screen_size         ? { icon: <Monitor size={20} strokeWidth={1.5} />, value: `${phone.screen_size}"`,                label: 'Display'  } : null,
    phone.main_camera_mp      ? { icon: <Camera  size={20} strokeWidth={1.5} />, value: `${phone.main_camera_mp}MP`,            label: 'Camera'   } : null,
    phone.battery_capacity    ? { icon: <Battery size={20} strokeWidth={1.5} />, value: `${phone.battery_capacity.toLocaleString()}`, label: 'mAh' } : null,
    phone.ram_options?.length ? { icon: <Cpu     size={20} strokeWidth={1.5} />, value: `${Math.max(...phone.ram_options!)}GB`, label: 'Max RAM'  } : null,
    phone.fast_charging_w     ? { icon: <Zap     size={20} strokeWidth={1.5} />, value: `${phone.fast_charging_w}W`,            label: 'Charging' } : null,
    phone.weight_g            ? { icon: <Weight  size={20} strokeWidth={1.5} />, value: `${phone.weight_g}g`,                  label: 'Weight'   } : null,
  ].filter(Boolean) as { icon: React.ReactNode; value: string; label: string }[]

  const specGroups  = getSpecGroups(phone)
  const sortedSpecGroups = withLaunchPrice(
    [...specGroups].sort(([a], [b]) => rankSpecGroup(a) - rankSpecGroup(b)),
    phone,
  )
  const valueScore  = (phone as any).value_score as number | null
  const tier        = resolveTier(phone.smart_score?.tier, phone.chipset_tier)

  const overviewSections = [
    {
      title: 'Display', headline: phone.screen_size ? `${phone.screen_size}" Screen` : 'Display',
      specs: [
        phone.screen_size       ? { label: 'Screen Size', value: `${phone.screen_size}"` } : null,
        phone.screen_resolution ? { label: 'Resolution',  value: phone.screen_resolution } : null,
        getPanelType(phone) !== '—' ? { label: 'Type', value: getPanelType(phone) } : null,
      ].filter(Boolean) as { label: string; value: string }[],
    },
    {
      title: 'Camera', headline: phone.main_camera_mp ? `${phone.main_camera_mp}MP Main Camera` : 'Camera System',
      specs: [
        phone.main_camera_mp ? { label: 'Main Camera', value: `${phone.main_camera_mp} MP` } : null,
        (phone.full_specifications as any)?.quick_specs?.cam1modules
          ? { label: 'Rear System', value: stripHtml(String((phone.full_specifications as any).quick_specs.cam1modules)) } : null,
        getFrontCamera(phone) !== '—' ? { label: 'Front Camera', value: getFrontCamera(phone) } : null,
      ].filter(Boolean) as { label: string; value: string }[],
    },
    {
      title: 'Performance', headline: phone.chipset || 'Processor',
      specs: [
        phone.chipset             ? { label: 'Chipset', value: phone.chipset } : null,
        phone.ram_options?.length ? { label: 'RAM', value: phone.ram_options!.map(r => `${r}GB`).join(' / ') } : null,
        phone.storage_options?.length
          ? { label: 'Storage', value: phone.storage_options!.map(s => s >= 1000 ? `${s/1000}TB` : `${s}GB`).join(' / ') } : null,
        phone.antutu_score ? { label: 'AnTuTu Score', value: phone.antutu_score.toLocaleString() } : null,
      ].filter(Boolean) as { label: string; value: string }[],
    },
    {
      title: 'Battery & Charging', headline: phone.battery_capacity ? `${phone.battery_capacity.toLocaleString()} mAh` : 'Battery',
      specs: [
        phone.battery_capacity ? { label: 'Capacity',      value: `${phone.battery_capacity.toLocaleString()} mAh` } : null,
        phone.fast_charging_w  ? { label: 'Fast Charging', value: `${phone.fast_charging_w}W wired` }               : null,
      ].filter(Boolean) as { label: string; value: string }[],
    },
    {
      title: 'Build & Design', headline: phone.weight_g ? `${phone.weight_g}g` : 'Build',
      specs: [
        phone.weight_g     ? { label: 'Weight',    value: `${phone.weight_g}g` }      : null,
        phone.thickness_mm ? { label: 'Thickness', value: `${phone.thickness_mm}mm` } : null,
      ].filter(Boolean) as { label: string; value: string }[],
    },
  ].filter(s => s.specs.length > 0)

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildProductJsonLd(phone, brand, model, displayPrice)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd(phone)) }}
      />

      <Navbar
        compareCount={comparePhones.length}
        onOpenCompare={() => {
          if (comparePhones.length >= 2)
            router.push(ROUTES.compare(...comparePhones.map(p => phoneSlug(p))))
        }}
      />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 var(--page-px)' }}>

        <nav style={{ padding: '14px 0', fontSize: 13, color: c.text3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Link href={ROUTES.home} style={{ color: c.text2 }}>Home</Link>
          <ChevronRight size={12} />
          <Link href={ROUTES.brand(brandSlug(phone.brand))} style={{ color: c.text2 }}>{phone.brand}</Link>
          <ChevronRight size={12} />
          <span style={{ color: c.text3 }}>{phone.model_name}</span>
        </nav>

        <div className="phone-hero-grid">
            <PhoneGallery phone={phone} />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.6px', color: c.text3, marginBottom: 6 }}>
              {phone.brand}
            </div>
            <h1 style={{ fontFamily: f.serif, fontSize: 'clamp(24px,3vw,36px)', color: c.text1, letterSpacing: '-0.4px', lineHeight: 1.15, marginBottom: 10 }}>
              {phone.model_name}
            </h1>
            <div style={{ fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 600, color: c.text1, marginBottom: 4 }}>
              {effectivePrice != null ? `$${Math.round(effectivePrice).toLocaleString()}` : 'Price TBA'}
            </div>
            {effectivePrice != null && (
              <div style={{ fontSize: 13, color: c.text3, marginBottom: 18 }}>
                {selectedVariant
                  ? `${selectedVariant.ram_gb ? `${selectedVariant.ram_gb}GB + ` : ''}${formatStorage(selectedVariant.storage_gb)} · US`
                  : 'Starting price · US'}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
              <span style={{ padding: '4px 12px', background: 'var(--green-light)', color: 'var(--green)', border: '1px solid var(--green-border)', borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 600 }}>
                Available
              </span>
              {tier && (
                <span style={{ padding: '4px 12px', background: tier.bg, color: tier.color, border: `1px solid ${tier.color}25`, borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 600 }}>
                  {tier.label}
                </span>
              )}
            </div>

            {valueScore != null && (
              <div style={{ padding: '14px 18px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: c.accent }}>
                    {valueScore.toFixed(1)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: c.text2, marginBottom: 5 }}>Value Score</div>
                    <div style={{ height: 5, background: c.bg, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${valueScore * 10}%`, background: c.accent, borderRadius: 3, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: c.text3 }}>vs peers</div>
                </div>
                <p style={{ fontSize: 11, color: c.text3, marginTop: 10, lineHeight: 1.5 }}>
                  Hardware-per-dollar vs similarly priced phones. Not a quality rating — see Hardware Quality below for that.
                </p>
              </div>
            )}

            <VariantPicker
              variants={variants}
              loading={variantsLoading}
              selected={selectedVariant}
              onSelect={setSelectedVariant}
            />

            <div className="hero-actions">
              <button
                onClick={handleCompareToggle}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px',
                  fontSize: 14, fontWeight: 600, flex: 1,
                  color: inCompare ? '#fff' : c.primary,
                  background: inCompare ? c.primary : 'transparent',
                  border: `1px solid ${c.primary}`, borderRadius: 'var(--r-full)',
                  transition: 'all 0.15s', cursor: 'pointer',
                }}
              >
                <GitCompare size={15} strokeWidth={2} />
                {inCompare ? 'In Compare' : 'Add to Compare'}
              </button>

              {buyUrl && (
                <a
                  href={buyUrl}
                  target="_blank"
                  rel={isAmazon ? 'noopener noreferrer sponsored' : 'noopener noreferrer'}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', fontSize: 14, fontWeight: 600, color: '#fff', background: c.primary, borderRadius: 'var(--r-full)', textDecoration: 'none', justifyContent: 'center', flex: 1 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2A2A42' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = c.primary }}
                >
                  {isAmazon ? <ShoppingCart size={15} strokeWidth={2} /> : <ExternalLink size={15} strokeWidth={2} />}
                  {isAmazon ? 'Buy on Amazon' : 'View This Price'}
                </a>
              )}
            </div>
            {buyUrl && (
              <span style={{ fontSize: 10, color: c.text3, display: 'block', marginTop: 6 }}>
                {isAmazon ? 'Affiliate link — we may earn a commission' : 'Price shown by third-party retailer, may change'}
              </span>
            )}

            <button
              onClick={handleShare}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: copied ? 'var(--green)' : c.text3, transition: 'color 0.15s', marginTop: 14, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {copied ? <Check size={13} /> : <Share2 size={13} />}
              {copied ? 'Link copied!' : 'Copy link'}
            </button>
          </div>
        </div>

        <div className="quick-specs-grid" style={{ marginBottom: 40 }}>
          {quickSpecs.map((spec, i) => <QuickSpecCard key={i} {...spec} />)}
        </div>

        <div style={{
          position: 'sticky', top: 'var(--nav-h)', zIndex: z.sticky,
          background: 'rgba(248,248,245,0.95)', backdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${c.border}`, marginBottom: 28,
          display: 'flex', overflowX: 'auto',
        }}>
          <TabButton active={tab === 'overview'} onClick={() => handleTabChange('overview')}>Overview</TabButton>
          <TabButton active={tab === 'specs'}    onClick={() => handleTabChange('specs')}>Full Specs</TabButton>
          <TabButton active={tab === 'compare'}  onClick={() => handleTabChange('compare')}>Compare</TabButton>
        </div>

        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 48 }}>
            <WhyThisPhone phone={phone} fallbackSections={overviewSections} />
            <PriceHistoryChart points={priceHistoryPoints} loading={priceHistoryLoading} />
          </div>
        )}

        {tab === 'specs' && (
          <div style={{ marginBottom: 48 }}>
            {sortedSpecGroups.length > 0
              ? sortedSpecGroups.map(([name, specs]) => (
                  <SpecGroup key={name} title={name} specs={specs} />
                ))
              : (
                <div style={{ textAlign: 'center', padding: '48px 0', color: c.text3 }}>
                  <Smartphone size={48} color={c.border} strokeWidth={1} style={{ margin: '0 auto 12px' }} />
                  <p>Detailed specifications not available for this model.</p>
                </div>
              )
            }
          </div>
        )}

        {tab === 'compare' && (
          <div style={{ maxWidth: 600, marginBottom: 48 }}>
            <div style={{ fontFamily: f.serif, fontSize: 22, color: c.text1, marginBottom: 6 }}>
              Compare {phone.model_name}
            </div>
            <p style={{ fontSize: 14, color: c.text3, marginBottom: 22 }}>
              Pick any phone below for a full side-by-side spec comparison.
            </p>

            {similarLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 68, borderRadius: 'var(--r-md)' }} />)}
              </div>
            ) : similar.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', color: c.text3 }}>
                <Smartphone size={36} color={c.border} strokeWidth={1} style={{ margin: '0 auto 10px' }} />
                <p style={{ fontSize: 14 }}>No similar phones found at this price range.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {similar.slice(0, 8).map(p => (
                  <Link
                    key={p.id}
                    href={ROUTES.compare(phoneSlug(phone), phoneSlug(p))}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', transition: 'all 0.15s', textDecoration: 'none' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.primary; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
                  >
                    <div style={{ width: 44, height: 44, background: c.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {p.main_image_url
                        ? <img src={p.main_image_url} alt="" loading="lazy" decoding="async" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                        : <Smartphone size={20} color={c.border} strokeWidth={1} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: c.text1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.model_name}</div>
                      <div style={{ fontSize: 12, color: c.text3, marginTop: 2 }}>
                        {(() => { const dp = resolveDisplayPrice(p); return dp != null ? `$${Math.round(dp).toLocaleString()}` : '—' })()}
                        {p.main_camera_mp   ? ` · ${p.main_camera_mp}MP`                             : ''}
                        {p.battery_capacity ? ` · ${p.battery_capacity.toLocaleString()}mAh`          : ''}
                        {p.antutu_score     ? ` · ${(p.antutu_score/1_000_000).toFixed(1)}M AnTuTu`  : ''}
                      </div>
                    </div>
                    <ArrowRight size={15} color={c.text3} strokeWidth={2} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        <section style={{ marginTop: 8, marginBottom: 64 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontFamily: f.serif, fontSize: 24, color: c.text1 }}>Similar Phones</h2>
            <span style={{ fontSize: 13, color: c.text3 }}>Price · Size · Performance</span>
          </div>

          {similarLoading ? (
            <div style={{ display: 'flex', gap: 14 }}>
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ width: 156, height: 200, flexShrink: 0, borderRadius: 'var(--r-md)' }} />)}
            </div>
          ) : similar.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 'var(--r-md)', color: c.text3 }}>
              <p style={{ fontSize: 14 }}>No similar phones found at a comparable price range.</p>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div ref={scrollRef} className="scrollbar-none" style={{ display: 'flex', gap: 14, overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: 4 }}>
                {similar.map(p => <SimilarCard key={p.id} phone={p} />)}
              </div>
              <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 56, background: 'linear-gradient(-90deg,var(--bg) 0%,transparent 100%)', pointerEvents: 'none' }} />
            </div>
          )}
        </section>
      </div>

      <Footer />

      <CompareBar
        phones={comparePhones}
        onRemove={id => setComparePhones(prev => prev.filter(p => p.id !== id))}
        onClear={() => setComparePhones([])}
      />

      <style>{`
        .phone-hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; padding-bottom: 40px; align-items: start; }
        .quick-specs-grid { display: grid; grid-template-columns: repeat(6,1fr); gap: 12px; }
        .specs-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 4px; }
        .hero-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        @media (max-width: 1023px) {
          .phone-hero-grid { grid-template-columns: 1fr; gap: 28px; }
          .phone-hero-grid > div:first-child { max-width: 400px; margin: 0 auto; width: 100%; }
          .quick-specs-grid { grid-template-columns: repeat(3,1fr); }
        }
        @media (max-width: 640px) {
          .quick-specs-grid { grid-template-columns: repeat(2,1fr); gap: 8px; }
          .specs-2col { grid-template-columns: 1fr; }
          .hero-actions { flex-direction: column; }
          .hero-actions a, .hero-actions button { justify-content: center; }
        }
      `}</style>
    </div>
  )
}

export default function PhoneDetailPage() {
  return (
    <Suspense fallback={null}>
      <PhoneDetailContent />
    </Suspense>
  )
}
