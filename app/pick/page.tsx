'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowRight, ArrowLeft, Camera, Battery, Zap, Smartphone,
  Feather, Monitor, Bolt, BadgeDollarSign, Check, Info,
  Crosshair, Gamepad2, Layers, Droplets, Waves, AlertTriangle,
  Star, Sparkles,
} from 'lucide-react'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import CompareBar from '@/app/components/CompareBar'
import { useToast } from '@/app/components/Toast'
import { api } from '@/lib/api'
import { ROUTES, phoneSlug, brandSlug, MAX_COMPARE } from '@/lib/config'
import { resolveDisplayPrice, formatDisplayPrice } from '@/lib/price'
import { PRICE_TIERS, getPriceTier, type PriceTierId } from '@/lib/priceTiers'
import { getTierStyle } from '@/lib/tiers'
import { c, r } from '@/lib/tokens'
import type { Phone } from '@/lib/types'

const STEPS = [1, 2, 3]

// Colors not covered by lib/tokens — lifted straight from the mockup.
const AMBER = '#B0651B'
const AMBER_BG = '#FBF0E4'
const AMBER_BORDER = '#EFD3AE'
const MATCH_BORDER = '#C9D2F2'

const TIER_VARS: Record<PriceTierId, { fg: string; bg: string }> = {
  s: { fg: 'var(--tier-ultra)', bg: 'var(--tier-ultra-bg)' },
  a: { fg: 'var(--tier-flagship)', bg: 'var(--tier-flagship-bg)' },
  b: { fg: 'var(--tier-upper)', bg: 'var(--tier-upper-bg)' },
  c: { fg: 'var(--tier-mid)', bg: 'var(--tier-mid-bg)' },
  d: { fg: 'var(--tier-budget)', bg: 'var(--tier-budget-bg)' },
}

const PRIORITIES = [
  { id: 'camera',             label: 'Camera Quality',       desc: 'Great photos & video',         icon: <Camera size={18} strokeWidth={1.7} /> },
  { id: 'battery',            label: 'Battery Life',         desc: 'Last all day and beyond',       icon: <Battery size={18} strokeWidth={1.7} /> },
  { id: 'performance',        label: 'Performance',          desc: 'No lag, fast for anything',     icon: <Zap size={18} strokeWidth={1.7} /> },
  { id: 'gaming',              label: 'Gaming',               desc: 'Sustained high frame rates',    icon: <Gamepad2 size={18} strokeWidth={1.7} /> },
  { id: 'compact',            label: 'Compact Size',         desc: 'Easy to use one-handed',        icon: <Smartphone size={18} strokeWidth={1.7} /> },
  { id: 'lightweight',        label: 'Lightweight',          desc: "Doesn't weigh you down",        icon: <Feather size={18} strokeWidth={1.7} /> },
  { id: 'display',            label: 'Display Quality',      desc: 'Sharp, bright, smooth',         icon: <Monitor size={18} strokeWidth={1.7} /> },
  { id: 'smooth_display',     label: 'High Refresh Rate',    desc: '120Hz+ for scrolling & games',  icon: <Waves size={18} strokeWidth={1.7} /> },
  { id: 'fast_charging',      label: 'Fast Charging',        desc: 'Quick top-ups, less waiting',   icon: <Bolt size={18} strokeWidth={1.7} /> },
  { id: 'wireless_charging',  label: 'Wireless Charging',    desc: 'Drop it on a pad, no cable',    icon: <Zap size={18} strokeWidth={1.7} /> },
  { id: 'foldable',           label: 'Foldable',             desc: 'Fold-out or flip form factor',  icon: <Layers size={18} strokeWidth={1.7} /> },
  { id: 'durability',         label: 'Water/Dust Resistant', desc: 'Rated for rain, splashes, dust', icon: <Droplets size={18} strokeWidth={1.7} /> },
  { id: 'value',              label: 'Best Value',           desc: 'Most specs per dollar',         icon: <BadgeDollarSign size={18} strokeWidth={1.7} /> },
]

function ProgressDots({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 36 }}>
      {STEPS.map(step => (
        <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 9, height: 9, borderRadius: '50%',
            background: step <= current ? c.primary : c.border,
            transition: 'all 0.2s',
            boxShadow: step === current ? '0 0 0 4px rgba(21,21,31,0.09)' : 'none',
          }} />
          {step < STEPS.length && (
            <div style={{ width: 44, height: 2, background: step < current ? c.primary : c.border, transition: 'background 0.2s' }} />
          )}
        </div>
      ))}
    </div>
  )
}

function StepHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 40 }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 4vw, 38px)', color: c.text1, letterSpacing: '-0.5px', marginBottom: 8 }}>
        {title}
      </h1>
      <p style={{ fontSize: 14, color: c.text3 }}>{sub}</p>
    </div>
  )
}

function StepTier({
  selected, onSelect, customMin, customMax, onCustomChange,
}: {
  selected: PriceTierId | null
  onSelect: (id: PriceTierId) => void
  customMin: string
  customMax: string
  onCustomChange: (min: string, max: string) => void
}) {
  return (
    <div style={{ animation: 'fadeIn 0.25s ease' }}>
      <StepHeader title="Let's find your perfect phone." sub="Step 1 of 3" />

      <div style={{ textAlign: 'center', marginBottom: 26 }}>
        <p style={{ fontSize: 17, fontWeight: 600, color: c.text1, marginBottom: 6 }}>What tier are you shopping in?</p>
        <p style={{ fontSize: 14, color: c.text3, maxWidth: 460, margin: '0 auto' }}>
          These are standard market tiers, not our invention — the same segments phone reviewers use.
        </p>
      </div>

      <div className="pick-tier-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        {PRICE_TIERS.map(tier => {
          const active = selected === tier.id
          const priceLabel = tier.max == null ? `$${tier.min.toLocaleString()}+` : `$${tier.min}–$${tier.max}`
          const tv = TIER_VARS[tier.id]
          return (
            <button
              key={tier.id}
              onClick={() => onSelect(tier.id)}
              style={{
                textAlign: 'left', background: active ? c.surface2 : c.surface,
                border: `1.5px solid ${active ? c.primary : c.border}`,
                borderRadius: r.lg, padding: 18,
                display: 'flex', flexDirection: 'column', gap: 7,
                position: 'relative', transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (active) return
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = c.borderHover
                el.style.transform = 'translateY(-2px)'
                el.style.boxShadow = 'var(--shadow-sm)'
              }}
              onMouseLeave={e => {
                if (active) return
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = c.border
                el.style.transform = 'none'
                el.style.boxShadow = 'none'
              }}
            >
              {active && (
                <div style={{ position: 'absolute', top: 14, right: 14, width: 20, height: 20, borderRadius: '50%', background: c.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={11} color="#fff" strokeWidth={3} />
                </div>
              )}
              <span style={{
                alignSelf: 'flex-start', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.4px',
                padding: '3px 9px', borderRadius: r.full, color: tv.fg, background: tv.bg,
              }}>
                {tier.label}
              </span>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 19, color: c.text1 }}>{tier.name}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: c.text1 }}>{priceLabel}</div>
              <div style={{ fontSize: 12, color: c.text3, lineHeight: 1.5 }}>{tier.blurb}</div>
              <div style={{ fontSize: 11, color: c.text3, fontStyle: 'italic', marginTop: 2 }}>{tier.examples}</div>
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 12, fontSize: 13.5, color: c.text2 }}>
        <span>Or set a custom range:</span>
        {(['min', 'max'] as const).map((bound, i) => (
          <input
            key={bound}
            type="number"
            min={0}
            placeholder={i === 0 ? 'Min' : 'Max'}
            value={i === 0 ? customMin : customMax}
            onChange={e => {
              if (i === 0) onCustomChange(e.target.value, customMax)
              else onCustomChange(customMin, e.target.value)
            }}
            style={{
              width: 96, padding: '9px 12px', border: `1px solid ${c.border}`,
              borderRadius: r.sm, fontSize: 13, color: c.text1, textAlign: 'center',
              outline: 'none', transition: 'border-color 0.15s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = c.primary }}
            onBlur={e => { e.currentTarget.style.borderColor = c.border }}
          />
        ))}
        <span>to</span>
      </div>

      {customMin && customMax && Number(customMax) <= Number(customMin) && (
        <p style={{ textAlign: 'center', fontSize: 13, color: c.accent, marginBottom: 16 }}>
          Max must be greater than min.
        </p>
      )}
    </div>
  )
}

function StepPriorities({ selected, onToggle }: { selected: Set<string>; onToggle: (id: string) => void }) {
  const count = selected.size
  const isMax = count >= 3

  return (
    <div style={{ animation: 'fadeIn 0.25s ease' }}>
      <StepHeader title="What matters most to you?" sub="Pick 2 or 3 · Step 2 of 3" />

      <div className="pick-prio-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        {PRIORITIES.map(p => {
          const active = selected.has(p.id)
          const dimmed = isMax && !active
          return (
            <button
              key={p.id}
              onClick={() => onToggle(p.id)}
              disabled={dimmed}
              style={{
                textAlign: 'left', background: active ? c.surface2 : c.surface,
                border: `1.5px solid ${active ? c.primary : c.border}`,
                borderRadius: r.lg, padding: 18,
                display: 'flex', flexDirection: 'column', gap: 12,
                cursor: dimmed ? 'not-allowed' : 'pointer',
                opacity: dimmed ? 0.4 : 1, position: 'relative', transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (active || dimmed) return
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = c.borderHover
                el.style.transform = 'translateY(-2px)'
                el.style.boxShadow = 'var(--shadow-sm)'
              }}
              onMouseLeave={e => {
                if (active || dimmed) return
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = c.border
                el.style.transform = 'none'
                el.style.boxShadow = 'none'
              }}
            >
              {active && (
                <div style={{ position: 'absolute', top: 12, right: 12, width: 19, height: 19, borderRadius: '50%', background: c.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={10} color="#fff" strokeWidth={3} />
                </div>
              )}
              <div style={{
                width: 36, height: 36, borderRadius: r.sm, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? c.primary : c.bg, color: active ? '#fff' : c.text3, transition: 'all 0.15s',
              }}>
                {p.icon}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16.5, color: c.text1, marginBottom: 2 }}>{p.label}</div>
                <div style={{ fontSize: 12, color: c.text3 }}>{p.desc}</div>
              </div>
            </button>
          )
        })}
      </div>

      <div style={{
        background: c.surface, border: `1px solid ${c.border}`, padding: '14px 18px', borderRadius: r.md,
        textAlign: 'center', fontSize: 13.5, color: c.text2, marginBottom: 24, minHeight: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        {count === 0
          ? <span>Select at least 2 priorities</span>
          : count < 2
            ? <span>Select {2 - count} more</span>
            : (
              <>
                <Check size={14} color="var(--green)" strokeWidth={2.5} />
                <span>
                  <strong style={{ color: c.text1 }}>
                    {Array.from(selected).map(id => PRIORITIES.find(p => p.id === id)?.label).join(', ')}
                  </strong>
                  {' '}({count} selected)
                </span>
              </>
            )
        }
      </div>
    </div>
  )
}

function MatchScoreBadge({ score }: { score: number }) {
  return (
    <div
      title="How well this fits the priorities you picked"
      style={{
        flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
        padding: '6px 13px', background: c.blueLight, border: `1px solid ${MATCH_BORDER}`, borderRadius: r.md,
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 800, color: c.blue, lineHeight: 1 }}>{score.toFixed(1)}</span>
      <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase' as const, color: c.blue, opacity: 0.7 }}>
        Match
      </span>
    </div>
  )
}

function ResultCard({
  phone, rank, score, isBest, onCompare, isCompared,
}: {
  phone: Phone & { match_score?: number; in_requested_budget?: boolean | null }
  rank: number
  score: number
  isBest: boolean
  onCompare: (p: Phone) => void
  isCompared: boolean
}) {
  const router = useRouter()
  const displayPrice = resolveDisplayPrice(phone)
  const outOfBudget = phone.in_requested_budget === false
  const tier = getTierStyle(phone.chipset_tier)

  const whyPointsFallback = [
    phone.main_camera_mp && phone.main_camera_mp >= 48
      ? `${phone.main_camera_mp}MP camera system with advanced computational photography.`
      : null,
    phone.battery_capacity && phone.battery_capacity >= 4500
      ? `${phone.battery_capacity.toLocaleString()}mAh battery — above average for this price bracket.`
      : null,
    phone.chipset_tier && tier?.label === 'Flagship'
      ? `Flagship ${phone.chipset || 'chipset'} delivers top-tier performance.`
      : `Reliable ${tier?.label ?? 'mid-range'} performance for everyday use.`,
    phone.fast_charging_w && phone.fast_charging_w >= 30
      ? `${phone.fast_charging_w}W fast charging.`
      : null,
  ].filter(Boolean) as string[]

  const tradeOffFallback = outOfBudget
    ? `Exceeds your selected budget${displayPrice != null ? ` at $${displayPrice.toLocaleString()}` : ''}, included because too few matches were found inside it.`
    : phone.weight_g && phone.weight_g > 200
      ? `Heavy at ${phone.weight_g}g.`
      : phone.screen_size && phone.screen_size < 6.0
        ? `Compact ${phone.screen_size}" screen may feel small for media.`
        : displayPrice && displayPrice > 800
          ? `Premium pricing at $${displayPrice.toLocaleString()} — check alternatives below.`
          : `No major trade-offs at this price point.`

  const whyText = phone.match_line ?? whyPointsFallback.slice(0, 2).join(' ')
  const tradeText = outOfBudget ? tradeOffFallback : (phone.tradeoff_line ?? tradeOffFallback)

  return (
    <div
      style={{
        background: c.surface,
        border: `1px solid ${isBest ? 'var(--accent-border)' : c.border}`,
        borderRadius: r.lg, padding: '22px 24px', marginBottom: 14,
        position: 'relative', transition: 'all 0.15s',
        backgroundImage: isBest ? `linear-gradient(180deg, var(--accent-light) 0%, ${c.surface} 130px)` : undefined,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'
        ;(e.currentTarget as HTMLElement).style.borderColor = isBest ? 'var(--accent-border)' : c.borderHover
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none'
        ;(e.currentTarget as HTMLElement).style.borderColor = isBest ? 'var(--accent-border)' : c.border
      }}
    >
      {isBest && (
        <div style={{
          position: 'absolute', top: -11, left: 22, display: 'flex', alignItems: 'center', gap: 5,
          background: c.accent, color: '#fff', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.5px',
          textTransform: 'uppercase' as const, padding: '4px 12px', borderRadius: r.full, boxShadow: 'var(--shadow-sm)',
        }}>
          <Star size={10} fill="#fff" color="#fff" /> Best Match
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
          <div style={{
            width: isBest ? 76 : 64, height: isBest ? 76 : 64, flexShrink: 0, background: c.bg,
            borderRadius: r.md, display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', transition: 'width 0.2s, height 0.2s',
          }}>
            {phone.main_image_url
              ? <img src={phone.main_image_url} alt={phone.model_name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: isBest ? 8 : 5 }} />
              : <Smartphone size={26} color={c.borderHover} strokeWidth={1} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: isBest ? 23 : 19, color: c.text1, lineHeight: 1.2, marginBottom: 4 }}>
              {isBest ? phone.model_name : `#${rank} ${phone.model_name}`}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: c.text3, flexWrap: 'wrap' }}>
              <span>{phone.brand} · {phone.release_year}</span>
              {tier && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: r.full, color: tier.color, background: tier.bg }}>
                  {tier.label}
                </span>
              )}
            </div>
          </div>
        </div>

        <MatchScoreBadge score={score} />
      </div>

      {isBest ? (
        <>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.4px', color: c.text3, marginBottom: 10 }}>
            <Sparkles size={10} /> Matched to your priorities
          </span>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 12, paddingLeft: 2 }}>
            <Check size={14} color="var(--green)" strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 14.5, color: c.text2, lineHeight: 1.55 }}>{whyText}</p>
          </div>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 9, background: AMBER_BG, border: `1px solid ${AMBER_BORDER}`,
            borderRadius: r.sm, padding: '10px 13px', marginBottom: 16, fontSize: 12.5, color: c.text2, lineHeight: 1.5,
          }}>
            <Info size={14} color={AMBER} style={{ flexShrink: 0, marginTop: 1 }} />
            <span><b style={{ color: AMBER }}>Trade-off</b> — {tradeText}</span>
          </div>
        </>
      ) : (
        <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.6, marginBottom: 14 }}>{whyText}</p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {phone.amazon_link && (
          <a
            href={phone.amazon_link}
            target="_blank"
            rel="noopener noreferrer sponsored"
            style={{
              padding: '9px 20px', borderRadius: r.full, fontSize: 13, fontWeight: 700,
              background: c.primary, color: '#fff', textDecoration: 'none', transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = c.primaryHover }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = c.primary }}
          >
            Buy Now
          </a>
        )}
        <button
          onClick={() => router.push(ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone)))}
          style={{
            padding: '9px 16px', borderRadius: r.full, fontSize: 13, fontWeight: 600,
            color: c.text2, border: `1px solid ${c.border}`, background: 'transparent', cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.primary; (e.currentTarget as HTMLElement).style.color = c.text1 }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.color = c.text2 }}
        >
          Details
        </button>
        <button
          onClick={() => onCompare(phone)}
          style={{
            padding: '9px 16px', borderRadius: r.full, fontSize: 13, fontWeight: 600,
            color: c.text2, border: `1px solid ${c.border}`, background: 'transparent', cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.primary; (e.currentTarget as HTMLElement).style.color = c.text1 }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.color = c.text2 }}
        >
          {isCompared ? '✓ In Compare' : '+ Compare'}
        </button>
        {outOfBudget && (
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--orange)', background: 'rgba(231,111,81,0.1)', padding: '2px 8px', borderRadius: r.full, textTransform: 'uppercase' as const, letterSpacing: '0.4px' }}>
            Outside budget
          </span>
        )}
        <div style={{ marginLeft: 'auto', fontSize: isBest ? 21 : 18, fontWeight: 800, color: c.text1 }}>
          {formatDisplayPrice(phone)}
        </div>
      </div>
    </div>
  )
}

function PriceSummary({
  tier, onPriceChange,
}: {
  tier: ReturnType<typeof getPriceTier>
  onPriceChange: (min: number, max: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [minInput, setMinInput] = useState(String(tier.min))
  const [maxInput, setMaxInput] = useState(tier.max != null ? String(tier.max) : '2000')

  useEffect(() => {
    setMinInput(String(tier.min))
    setMaxInput(tier.max != null ? String(tier.max) : '2000')
  }, [tier.min, tier.max])

  const priceLabel = tier.max != null
    ? `$${tier.min.toLocaleString()}–$${tier.max.toLocaleString()}`
    : `$${tier.min.toLocaleString()}+`

  const apply = () => {
    const min = Number(minInput)
    const max = Number(maxInput)
    if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max <= min) return
    onPriceChange(min, max)
    setEditing(false)
  }

  const tv = TIER_VARS[tier.id as PriceTierId] ?? TIER_VARS.b

  if (!editing) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        background: c.surface, border: `1px solid ${c.border}`, padding: '12px 18px', borderRadius: r.md,
        marginBottom: 14, fontSize: 13.5, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: r.full, color: tv.fg, background: tv.bg }}>
          {tier.label.toUpperCase()}
        </span>
        <strong style={{ color: c.text1 }}>{priceLabel}</strong>
        <button
          onClick={() => setEditing(true)}
          style={{ fontSize: 12, fontWeight: 600, color: c.primary, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}
        >
          Change price
        </button>
      </div>
    )
  }

  const invalid = minInput !== '' && maxInput !== '' && Number(maxInput) <= Number(minInput)

  return (
    <div style={{ background: c.surface, border: `1px solid ${c.border}`, padding: '14px 18px', borderRadius: r.md, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: c.text2 }}>$</span>
        <input
          type="number" min={0} value={minInput}
          onChange={e => setMinInput(e.target.value)}
          aria-label="Minimum price"
          style={{ width: 90, padding: '7px 10px', border: `1px solid ${c.border}`, borderRadius: r.sm, fontSize: 13, color: c.text1 }}
        />
        <span style={{ fontSize: 13, color: c.text3 }}>to</span>
        <span style={{ fontSize: 13, color: c.text2 }}>$</span>
        <input
          type="number" min={0} value={maxInput}
          onChange={e => setMaxInput(e.target.value)}
          aria-label="Maximum price"
          style={{ width: 90, padding: '7px 10px', border: `1px solid ${c.border}`, borderRadius: r.sm, fontSize: 13, color: c.text1 }}
        />
        <button
          onClick={apply}
          disabled={invalid}
          style={{
            padding: '7px 16px', background: invalid ? c.border : c.primary, color: '#fff',
            borderRadius: r.sm, fontSize: 13, fontWeight: 600, border: 'none', cursor: invalid ? 'not-allowed' : 'pointer',
          }}
        >
          Apply
        </button>
        <button
          onClick={() => setEditing(false)}
          style={{ padding: '7px 12px', background: 'transparent', color: c.text3, border: 'none', fontSize: 13, cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
      {invalid && (
        <p style={{ textAlign: 'center', fontSize: 12, color: c.accent, marginTop: 8 }}>
          Max must be greater than min.
        </p>
      )}
    </div>
  )
}

// FIX: StepResults now takes `loading` and gates the empty state on it, so
// the "No matches found" message can never render while a fetch is still
// in flight. Previously `phones.length === 0` was checked with no
// awareness of loading, so on step 3 the empty state rendered instantly
// (since `results` starts as []) at the same time as the separate spinner
// below it — two contradictory states on screen at once. The spinner is
// now rendered *inside* StepResults when loading, and the duplicate
// top-level spinner block in PickPageContent has been removed.
function StepResults({
  phones, priorities, tier, onCompare, compareIds, meta, onPriceChange, loading,
}: {
  phones: (Phone & { match_score?: number; in_requested_budget?: boolean | null })[]
  priorities: string[]
  tier: ReturnType<typeof getPriceTier>
  onCompare: (p: Phone) => void
  compareIds: number[]
  meta: {
    budgetWidened: boolean
    insufficientMatches: boolean
    effectiveMin: number | null
    effectiveMax: number | null
  } | null
  onPriceChange: (min: number, max: number) => void
  loading: boolean
}) {
  const priorityLabels = priorities.map(id => PRIORITIES.find(p => p.id === id)?.label ?? id)

  return (
    <div style={{ animation: 'fadeIn 0.25s ease' }}>
      <StepHeader title="Your top picks" sub="Step 3 of 3" />

      <PriceSummary tier={tier} onPriceChange={onPriceChange} />

      {priorityLabels.length > 0 && (
        <div style={{ textAlign: 'center', fontSize: 13, color: c.text3, marginBottom: 24 }}>
          Matched on <b style={{ color: c.text2, fontWeight: 600 }}>{priorityLabels.join(' · ')}</b>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{
            width: 36, height: 36, border: `3px solid ${c.border}`,
            borderTopColor: c.primary, borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
          }} />
          <p style={{ fontSize: 14, color: c.text3 }}>Finding your perfect phone...</p>
        </div>
      ) : (
        <>
          {meta?.insufficientMatches && phones.length > 0 && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 16px', background: 'rgba(231,111,81,0.06)', border: '1px solid rgba(231,111,81,0.15)', borderRadius: r.md, marginBottom: 16 }}>
              <AlertTriangle size={15} color="var(--orange)" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.5 }}>
                Only {phones.length} phone{phones.length !== 1 ? 's' : ''} match{phones.length === 1 ? 'es' : ''} every requirement you picked — that's the full catalog for this combination right now, not a partial list.
              </p>
            </div>
          )}

          {meta?.budgetWidened && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 16px', background: 'var(--blue-light)', border: '1px solid rgba(69,123,157,0.15)', borderRadius: r.md, marginBottom: 16 }}>
              <Info size={15} color="var(--blue)" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.5 }}>
                Not enough matches inside {tier.name} for a hard requirement like foldable, so we widened the price range
                {meta.effectiveMax != null ? ` up to $${Math.round(meta.effectiveMax).toLocaleString()}` : ''}
                {meta.effectiveMin != null && meta.effectiveMin !== tier.min ? ` (from $${Math.round(meta.effectiveMin).toLocaleString()})` : ''} to find them. Phones outside your original budget are marked below.
              </p>
            </div>
          )}

          {phones.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Crosshair size={48} color={c.border} strokeWidth={1} style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: c.text1, marginBottom: 8 }}>No matches found</h3>
              <p style={{ fontSize: 14, color: c.text3 }}>Try a different tier or fewer priorities.</p>
            </div>
          ) : (
            phones.map((phone, i) => {
              const score = phone.match_score ?? phone.value_score ?? 7.5
              return (
                <ResultCard
                  key={phone.id}
                  phone={phone}
                  rank={i + 1}
                  score={score}
                  isBest={i === 0}
                  onCompare={onCompare}
                  isCompared={compareIds.includes(phone.id)}
                />
              )
            })
          )}
        </>
      )}
    </div>
  )
}

function PickPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [step, setStep] = useState<number>(() => {
    const s = parseInt(searchParams.get('step') ?? '1', 10)
    return [1, 2, 3].includes(s) ? s : 1
  })
  const [tierId, setTierId] = useState<PriceTierId | null>(() => {
    const t = searchParams.get('tier')
    return t && ['s', 'a', 'b', 'c', 'd'].includes(t) ? (t as PriceTierId) : null
  })
  const [customMin, setCustomMin] = useState(() =>
    searchParams.get('tier') === 'custom' ? (searchParams.get('min') ?? '') : ''
  )
  const [customMax, setCustomMax] = useState(() =>
    searchParams.get('tier') === 'custom' ? (searchParams.get('max') ?? '') : ''
  )
  const [priorities, setPriorities] = useState<Set<string>>(() => {
    const raw = searchParams.get('p')
    return raw ? new Set(raw.split(',').filter(id => PRIORITIES.some(p => p.id === id))) : new Set()
  })
  const [results, setResults] = useState<(Phone & { match_score?: number; in_requested_budget?: boolean | null })[]>([])
  const [loading, setLoading] = useState(false)
  const [comparePhones, setComparePhones] = useState<Phone[]>([])
  const [recommendMeta, setRecommendMeta] = useState<{
    budgetWidened: boolean
    insufficientMatches: boolean
    effectiveMin: number | null
    effectiveMax: number | null
  } | null>(null)

  const commit = useCallback((s: number, tid: PriceTierId | null, cMin: string, cMax: string, pSet: Set<string>) => {
    const params = new URLSearchParams()
    params.set('step', String(s))
    if (tid) {
      params.set('tier', tid)
    } else if (cMin && cMax) {
      params.set('tier', 'custom')
      params.set('min', cMin)
      params.set('max', cMax)
    }
    if (pSet.size > 0) params.set('p', Array.from(pSet).join(','))
    router.replace(`/pick?${params.toString()}`, { scroll: false })
  }, [router])

  const handleTierSelect = (id: PriceTierId) => {
    setTierId(id)
    setCustomMin('')
    setCustomMax('')
    commit(step, id, '', '', priorities)
  }

  const handleCustomChange = (min: string, max: string) => {
    setCustomMin(min)
    setCustomMax(max)
    setTierId(null)
    commit(step, null, min, max, priorities)
  }

  const handlePriorityToggle = (id: string) => {
    setPriorities(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 3) {
        next.add(id)
      }
      commit(step, tierId, customMin, customMax, next)
      return next
    })
  }

  const customRangeValid = !!(
    customMin && customMax &&
    Number(customMin) >= 0 &&
    Number(customMax) > Number(customMin)
  )
  const canProceedStep1 = !!(tierId || customRangeValid)
  const canProceedStep2 = priorities.size >= 2

  const activeTier = tierId ? getPriceTier(tierId) : null

  // Takes explicit min/max rather than reading customMin/customMax off
  // state, so a caller that just set new state (async) can pass the fresh
  // values directly instead of racing a stale closure.
  const fetchResultsWithPrice = useCallback(async (minPrice: number | undefined, maxPrice: number | undefined) => {
    const priorityList = Array.from(priorities)
    if (priorityList.length === 0) return

    setLoading(true)
    try {
      const data = await api.phones.recommend({
        min_price: minPrice,
        max_price: maxPrice,
        priorities: priorityList.join(','),
        limit: 5,
      })
      setResults(data.phones as (Phone & { match_score?: number; in_requested_budget?: boolean | null })[])
      setRecommendMeta({
        budgetWidened: data.budget_widened,
        insufficientMatches: data.insufficient_matches,
        effectiveMin: data.effective_price_range?.min ?? null,
        effectiveMax: data.effective_price_range?.max ?? null,
      })
    } catch {
      setResults([])
      setRecommendMeta(null)
      toast('Failed to load recommendations', 'error')
    } finally {
      setLoading(false)
    }
  }, [priorities, toast])

  const fetchResults = useCallback(async () => {
    let minPrice: number | undefined
    let maxPrice: number | undefined

    if (tierId) {
      const t = getPriceTier(tierId)
      minPrice = t.min
      maxPrice = t.max
    } else if (customRangeValid) {
      minPrice = Number(customMin)
      maxPrice = Number(customMax)
    }

    await fetchResultsWithPrice(minPrice, maxPrice)
  }, [tierId, customMin, customMax, customRangeValid, fetchResultsWithPrice])

  useEffect(() => {
    const canFetch = (tierId != null || customRangeValid) && priorities.size >= 2
    if (step === 3 && canFetch && results.length === 0 && !loading) {
      fetchResults()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // Called from the editable price control on Step 3. Editing the price
  // always drops any preset tier — the tier badge is re-derived from the
  // new numbers instead (see resultsTier below).
  const handlePriceEdit = (min: number, max: number) => {
    setTierId(null)
    setCustomMin(String(min))
    setCustomMax(String(max))
    commit(step, null, String(min), String(max), priorities)
    fetchResultsWithPrice(min, max)
  }

  const goNext = () => {
    const next = Math.min(step + 1, 3)
    if (step === 2) fetchResults()
    setStep(next)
    commit(next, tierId, customMin, customMax, priorities)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goBack = () => {
    const prev = Math.max(step - 1, 1)
    setStep(prev)
    commit(prev, tierId, customMin, customMax, priorities)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCompare = (phone: Phone) => {
    setComparePhones(prev => {
      if (prev.find(p => p.id === phone.id)) {
        toast('Removed from compare', 'info')
        return prev.filter(p => p.id !== phone.id)
      }
      if (prev.length >= MAX_COMPARE) {
        toast(`Maximum ${MAX_COMPARE} phones in compare`, 'error')
        return prev
      }
      toast('Added to compare', 'success')
      return [...prev, phone]
    })
  }

  const compareIds = comparePhones.map(p => p.id)

  // Reflects whatever is actually driving the query right now: a preset
  // tier, a custom range typed on Step 1, or a custom range set via the
  // inline price editor on Step 3 (which always clears tierId).
  const resultsTier: ReturnType<typeof getPriceTier> = activeTier ?? {
    id: 'b',
    label: 'Custom',
    name: 'Custom Range',
    min: customRangeValid ? Number(customMin) : 0,
    max: customRangeValid ? Number(customMax) : undefined,
    blurb: '',
    examples: '',
  }

  return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <Navbar
        compareCount={comparePhones.length}
        onOpenCompare={() => {
          if (comparePhones.length >= 2)
            router.push(ROUTES.compare(...comparePhones.map(p => phoneSlug(p))))
        }}
      />

      <main style={{ maxWidth: 840, margin: '0 auto', padding: '44px 24px 140px' }}>
        <ProgressDots current={step} />

        {step === 1 && (
          <StepTier
            selected={tierId}
            onSelect={handleTierSelect}
            customMin={customMin}
            customMax={customMax}
            onCustomChange={handleCustomChange}
          />
        )}
        {step === 2 && (
          <StepPriorities selected={priorities} onToggle={handlePriorityToggle} />
        )}
        {step === 3 && (
          <StepResults
            phones={results}
            priorities={Array.from(priorities)}
            tier={resultsTier}
            onCompare={handleCompare}
            compareIds={compareIds}
            meta={recommendMeta}
            onPriceChange={handlePriceEdit}
            loading={loading}
          />
        )}

        {/* NOTE: the old top-level spinner that used to render here
            (duplicating the one now inside StepResults) has been removed —
            StepResults handles its own loading state. */}

        {step === 3 && !loading && results.length === 0 && !recommendMeta && (
          <div style={{ textAlign: 'center', padding: '20px 0 0' }}>
            <p style={{ fontSize: 13, color: c.text3, marginBottom: 12 }}>
              Nothing to show yet for this combination.
            </p>
            <button
              onClick={goBack}
              style={{
                padding: '10px 22px', borderRadius: r.md,
                fontWeight: 500, fontSize: 13, cursor: 'pointer',
                border: `1px solid ${c.border}`, background: 'transparent',
                color: c.text2,
              }}
            >
              Start over
            </button>
          </div>
        )}

        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginTop: 36,
          flexDirection: step === 1 ? 'row-reverse' : 'row',
        }}>
          {step > 1 && step < 3 && (
            <button
              onClick={goBack}
              style={{
                padding: '11px 22px', borderRadius: r.md,
                fontWeight: 500, fontSize: 14, cursor: 'pointer',
                border: `1px solid ${c.border}`, background: 'transparent',
                color: c.text2, transition: 'all 0.15s',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.text2 }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border }}
            >
              <ArrowLeft size={16} /> Back
            </button>
          )}

          {step === 3 && (
            <button
              onClick={goBack}
              style={{
                padding: '11px 22px', borderRadius: r.md,
                fontWeight: 500, fontSize: 14, cursor: 'pointer',
                border: `1px solid ${c.border}`, background: 'transparent',
                color: c.text2, transition: 'all 0.15s',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.text2 }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border }}
            >
              <ArrowLeft size={16} /> Change priorities
            </button>
          )}

          {step < 3 && (
            <button
              onClick={goNext}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
              style={{
                padding: '11px 26px', borderRadius: r.md,
                fontWeight: 700, fontSize: 14,
                cursor: (step === 1 ? canProceedStep1 : canProceedStep2) ? 'pointer' : 'not-allowed',
                border: 'none',
                background: (step === 1 ? canProceedStep1 : canProceedStep2) ? c.primary : '#D0D0CC',
                color: '#fff', transition: 'all 0.15s',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
              onMouseEnter={e => {
                if (step === 1 ? canProceedStep1 : canProceedStep2)
                  (e.currentTarget as HTMLElement).style.background = c.primaryHover
              }}
              onMouseLeave={e => {
                if (step === 1 ? canProceedStep1 : canProceedStep2)
                  (e.currentTarget as HTMLElement).style.background = c.primary
              }}
            >
              {step === 1 ? 'Next' : 'Show me results'}
              <ArrowRight size={16} />
            </button>
          )}

          {step === 3 && (
            <Link
              href={ROUTES.home}
              style={{
                padding: '11px 22px', borderRadius: r.md,
                fontWeight: 600, fontSize: 13.5,
                color: c.primary, transition: 'all 0.15s',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              Browse all phones <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </main>

      <Footer />

      <CompareBar
        phones={comparePhones}
        onRemove={id => setComparePhones(prev => prev.filter(p => p.id !== id))}
        onClear={() => setComparePhones([])}
      />

      <style>{`
        @media (max-width: 760px) {
          .pick-tier-grid, .pick-prio-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 520px) {
          .pick-tier-grid, .pick-prio-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

export default function PickPage() {
  return (
    <Suspense fallback={null}>
      <PickPageContent />
    </Suspense>
  )
}