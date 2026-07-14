'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowRight, ArrowLeft, Camera, Battery, Zap, Smartphone,
  Feather, Monitor, Bolt, BadgeDollarSign, Check, Info,
  ChevronRight, Crosshair, Gamepad2, Layers, Droplets, Waves, AlertTriangle,
} from 'lucide-react'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import CompareBar from '@/app/components/CompareBar'
import { useToast } from '@/app/components/Toast'
import { api } from '@/lib/api'
import { ROUTES, phoneSlug, brandSlug, MAX_COMPARE } from '@/lib/config'
import { resolveDisplayPrice } from '@/lib/price'
import { PRICE_TIERS, getPriceTier, type PriceTierId } from '@/lib/priceTiers'
import { c, z } from '@/lib/tokens'
import type { Phone } from '@/lib/types'
import { formatDisplayPrice } from '@/lib/price'

const STEPS = [
  { num: 1, label: 'Tier' },
  { num: 2, label: 'Priorities' },
  { num: 3, label: 'Results' },
]

const TIER_ICON: Record<PriceTierId, React.ReactNode> = {
  s: <BadgeDollarSign size={22} strokeWidth={1.5} />,
  a: <BadgeDollarSign size={22} strokeWidth={1.5} />,
  b: <BadgeDollarSign size={22} strokeWidth={1.5} />,
  c: <BadgeDollarSign size={22} strokeWidth={1.5} />,
  d: <BadgeDollarSign size={22} strokeWidth={1.5} />,
}

const TIER_COLOR: Record<PriceTierId, string> = {
  s: '#C9A84C',
  a: 'var(--accent)',
  b: 'var(--blue)',
  c: 'var(--green)',
  d: 'var(--text-2)',
}

const PRIORITIES = [
  { id: 'camera',             label: 'Camera Quality',      desc: 'Great photos & video',        icon: <Camera size={24} strokeWidth={1.5} /> },
  { id: 'battery',            label: 'Battery Life',        desc: 'Last all day and beyond',      icon: <Battery size={24} strokeWidth={1.5} /> },
  { id: 'performance',        label: 'Performance',         desc: 'No lag, fast for anything',    icon: <Zap size={24} strokeWidth={1.5} /> },
  { id: 'gaming',              label: 'Gaming',              desc: 'Sustained high frame rates',   icon: <Gamepad2 size={24} strokeWidth={1.5} /> },
  { id: 'compact',            label: 'Compact Size',        desc: 'Easy to use one-handed',       icon: <Smartphone size={24} strokeWidth={1.5} /> },
  { id: 'lightweight',        label: 'Lightweight',         desc: "Doesn't weigh you down",       icon: <Feather size={24} strokeWidth={1.5} /> },
  { id: 'display',            label: 'Display Quality',     desc: 'Sharp, bright, smooth',        icon: <Monitor size={24} strokeWidth={1.5} /> },
  { id: 'smooth_display',     label: 'High Refresh Rate',   desc: '120Hz+ for scrolling & games',  icon: <Waves size={24} strokeWidth={1.5} /> },
  { id: 'fast_charging',      label: 'Fast Charging',       desc: 'Quick top-ups, less waiting',   icon: <Bolt size={24} strokeWidth={1.5} /> },
  { id: 'wireless_charging',  label: 'Wireless Charging',   desc: 'Drop it on a pad, no cable',    icon: <Zap size={24} strokeWidth={1.5} /> },
  { id: 'foldable',           label: 'Foldable',            desc: 'Fold-out or flip form factor',  icon: <Layers size={24} strokeWidth={1.5} /> },
  { id: 'durability',         label: 'Water/Dust Resistant',desc: 'Rated for rain, splashes, dust', icon: <Droplets size={24} strokeWidth={1.5} /> },
  { id: 'value',              label: 'Best Value',          desc: 'Most specs per dollar',         icon: <BadgeDollarSign size={24} strokeWidth={1.5} /> },
]

function scoreColor(score: number): string {
  if (score >= 9)   return 'var(--green)'
  if (score >= 7.5) return 'var(--blue)'
  if (score >= 6)   return 'var(--text-2)'
  return 'var(--orange)'
}

function ProgressDots({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 40 }}>
      {STEPS.map(step => (
        <div key={step.num} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: step.num <= current ? c.primary : c.border,
            transition: 'all 0.3s ease',
            boxShadow: step.num === current ? '0 0 0 4px rgba(26,26,46,0.08)' : 'none',
          }} />
          {step.num < STEPS.length && (
            <div style={{
              width: 40, height: 2,
              background: step.num < current ? c.primary : c.border,
              transition: 'all 0.3s ease',
            }} />
          )}
        </div>
      ))}
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
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 5vw, 40px)',
          color: c.text1, letterSpacing: '-0.5px', marginBottom: 8,
        }}>
          Let's find your perfect phone.
        </h1>
        <p style={{ fontSize: 15, color: c.text3 }}>Step 1 of 3</p>
      </div>

      <p style={{ textAlign: 'center', fontSize: 18, fontWeight: 500, color: c.text1, marginBottom: 6 }}>
        What tier are you shopping in?
      </p>
      <p style={{ textAlign: 'center', fontSize: 13, color: c.text3, marginBottom: 28, maxWidth: 480, margin: '0 auto 28px' }}>
        These are standard market tiers, not our invention — the same segments phone reviewers use.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 28 }}>
        {PRICE_TIERS.map(tier => {
          const active = selected === tier.id
          const priceLabel = tier.max == null ? `$${tier.min.toLocaleString()}+` : `$${tier.min}–$${tier.max}`
          return (
            <button
              key={tier.id}
              onClick={() => onSelect(tier.id)}
              style={{
                background: active ? 'rgba(26,26,46,0.04)' : c.surface,
                border: `2px solid ${active ? c.primary : c.border}`,
                borderRadius: 'var(--r-lg)', padding: '20px 16px',
                cursor: 'pointer', transition: 'all 0.15s ease',
                textAlign: 'left', display: 'flex', flexDirection: 'column',
                gap: 8, position: 'relative',
              }}
              onMouseEnter={e => {
                if (!active) {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'var(--border-hover)'
                  el.style.transform = 'translateY(-2px)'
                  el.style.boxShadow = 'var(--shadow-md)'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = c.border
                  el.style.transform = 'none'
                  el.style.boxShadow = 'none'
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: 11, fontWeight: 800, letterSpacing: '0.5px',
                  color: TIER_COLOR[tier.id], padding: '2px 9px',
                  background: `${TIER_COLOR[tier.id]}18`, borderRadius: 'var(--r-full)',
                }}>
                  {tier.label}
                </span>
                {active && (
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: c.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={12} color="#fff" strokeWidth={3} />
                  </div>
                )}
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: c.text1, fontWeight: 500 }}>
                {tier.name}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: c.text1 }}>{priceLabel}</div>
              <div style={{ fontSize: 12, color: c.text3, lineHeight: 1.5 }}>{tier.blurb}</div>
              <div style={{ fontSize: 11, color: c.text3, fontStyle: 'italic', marginTop: 2 }}>{tier.examples}</div>
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 14, color: c.text3 }}>Or set a custom range:</span>
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
              width: 100, padding: '10px 14px',
              border: `1px solid ${c.border}`,
              borderRadius: 'var(--r-sm)', fontSize: 14, color: c.text1,
              outline: 'none', transition: 'border-color 0.15s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = c.primary }}
            onBlur={e => { e.currentTarget.style.borderColor = c.border }}
          />
        ))}
        <span style={{ color: c.text3 }}>to</span>
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
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 5vw, 40px)',
          color: c.text1, letterSpacing: '-0.5px', marginBottom: 8,
        }}>
          What matters most to you?
        </h1>
        <p style={{ fontSize: 15, color: c.text3 }}>
          Pick 2 or 3. <span style={{ color: c.text2 }}>Step 2 of 3</span>
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
        {PRIORITIES.map(p => {
          const active = selected.has(p.id)
          const dimmed = isMax && !active
          return (
            <button
              key={p.id}
              onClick={() => onToggle(p.id)}
              disabled={dimmed}
              style={{
                background: active ? 'rgba(26,26,46,0.04)' : c.surface,
                border: `2px solid ${active ? c.primary : c.border}`,
                borderRadius: 'var(--r-lg)', padding: '22px 18px',
                cursor: dimmed ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease', textAlign: 'left',
                display: 'flex', flexDirection: 'column', gap: 8,
                opacity: dimmed ? 0.5 : 1, position: 'relative',
              }}
              onMouseEnter={e => {
                if (!active && !dimmed) {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'var(--border-hover)'
                  el.style.transform = 'translateY(-2px)'
                  el.style.boxShadow = 'var(--shadow-md)'
                }
              }}
              onMouseLeave={e => {
                if (!active && !dimmed) {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = c.border
                  el.style.transform = 'none'
                  el.style.boxShadow = 'none'
                }
              }}
            >
              {active && (
                <div style={{
                  position: 'absolute', top: 10, right: 10,
                  width: 22, height: 22, borderRadius: '50%',
                  background: c.primary, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={13} color="#fff" strokeWidth={3} />
                </div>
              )}
              <div style={{ color: active ? c.primary : c.text3 }}>{p.icon}</div>
              <div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, color: c.text1, fontWeight: 500, marginBottom: 2 }}>
                  {p.label}
                </div>
                <div style={{ fontSize: 13, color: c.text3, lineHeight: 1.4 }}>{p.desc}</div>
              </div>
            </button>
          )
        })}
      </div>

      <div style={{
        background: c.bg, padding: '14px 18px', borderRadius: 'var(--r-md)',
        textAlign: 'center', fontSize: 14, color: c.text2,
        marginBottom: 24, minHeight: 48, display: 'flex',
        alignItems: 'center', justifyContent: 'center', gap: 6,
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

// ResultCard shows the backend's per-phone match_line / tradeoff_line when
// present (generated server-side from the shopper's actual tier +
// priorities). Falls back to spec-derived copy only if the backend call
// didn't return anything for this phone. A phone flagged in_requested_budget
// === false was included only because a hard filter (e.g. foldable) needed
// the price range widened to find enough matches — that always wins over
// any other fallback tradeoff, and is never masked by the AI copy either
// (see routes/recommend_copy.py's within_requested_budget instruction).
function ResultCard({
  phone, rank, score, isBest, onCompare, isCompared, tier,
}: {
  phone: Phone & { match_score?: number; in_requested_budget?: boolean | null }
  rank: number
  score: number
  isBest: boolean
  onCompare: (p: Phone) => void
  isCompared: boolean
  tier: ReturnType<typeof getPriceTier>
}) {
  const router = useRouter()
  const color = scoreColor(score)
  const displayPrice = resolveDisplayPrice(phone)
  const outOfBudget = phone.in_requested_budget === false

  const whyPointsFallback = [
    phone.main_camera_mp && phone.main_camera_mp >= 48
      ? `${phone.main_camera_mp}MP camera system with advanced computational photography.`
      : null,
    phone.battery_capacity && phone.battery_capacity >= 4500
      ? `${phone.battery_capacity.toLocaleString()}mAh battery — above average for this price bracket.`
      : null,
    phone.chipset_tier === 'flagship'
      ? `Flagship ${phone.chipset || 'chipset'} delivers top-tier performance.`
      : `Reliable ${phone.chipset_tier || 'mid-range'} performance for everyday use.`,
    phone.fast_charging_w && phone.fast_charging_w >= 30
      ? `${phone.fast_charging_w}W fast charging.`
      : null,
  ].filter(Boolean) as string[]

  const tradeOffFallback = outOfBudget
    ? `Outside your selected budget${displayPrice != null ? ` — $${displayPrice.toLocaleString()}` : ''}, included because too few matches were found inside it.`
    : phone.weight_g && phone.weight_g > 200
      ? `Heavy at ${phone.weight_g}g.`
      : phone.screen_size && phone.screen_size < 6.0
        ? `Compact ${phone.screen_size}" screen may feel small for media.`
        : displayPrice && displayPrice > 800
          ? `Premium pricing at $${displayPrice.toLocaleString()} — check alternatives below.`
          : `No major trade-offs at this price point.`

  const whyText   = phone.match_line ?? null
  const tradeText = outOfBudget ? tradeOffFallback : (phone.tradeoff_line ?? tradeOffFallback)

  return (
    <div
      style={{
        background: c.surface, border: `1px solid ${c.border}`,
        borderRadius: 'var(--r-lg)', padding: '24px 28px',
        marginBottom: 16, position: 'relative',
        borderLeft: isBest ? `3px solid ${c.accent}` : undefined,
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'
        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none'
        ;(e.currentTarget as HTMLElement).style.borderColor = c.border
      }}
    >
      {isBest && (
        <div style={{
          position: 'absolute', top: -12, left: 28,
          background: c.accent, color: '#fff',
          fontSize: 11, fontWeight: 700, padding: '3px 10px',
          borderRadius: 'var(--r-full)', letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}>
          Best Match
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: isBest ? 80 : 56, height: isBest ? 80 : 56, background: c.bg,
            borderRadius: 'var(--r-md)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0,
            border: isBest ? `1px solid ${c.border}` : undefined,
            transition: 'width 0.2s, height 0.2s',
          }}>
            {phone.main_image_url
              ? <img src={phone.main_image_url} alt={phone.model_name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: isBest ? 8 : 4 }} />
              : <Smartphone size={isBest ? 36 : 28} color={c.border} strokeWidth={1} />}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: isBest ? 24 : 20, color: c.text1, letterSpacing: '-0.3px' }}>
              {isBest ? phone.model_name : `#${rank} ${phone.model_name}`}
            </div>
            <div style={{ fontSize: 13, color: c.text3, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span>{phone.brand} · {phone.release_year}</span>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.4px',
                color: TIER_COLOR[tier.id], padding: '1px 7px',
                background: `${TIER_COLOR[tier.id]}18`, borderRadius: 'var(--r-full)',
              }}>
                {tier.label}
              </span>
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', background: `${color}10`,
          borderRadius: 'var(--r-md)', border: `1px solid ${color}25`,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color }}>{score.toFixed(1)}/10</span>
        </div>
      </div>

      {isBest ? (
        <>
          <div style={{ marginBottom: 14, paddingLeft: 4 }}>
            {whyText ? (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, fontSize: 14, color: c.text2, lineHeight: 1.5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0, marginTop: 7 }} />
                <span>{whyText}</span>
              </div>
            ) : (
              whyPointsFallback.slice(0, 3).map((pt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, fontSize: 14, color: c.text2, lineHeight: 1.5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0, marginTop: 7 }} />
                  <span>{pt}</span>
                </div>
              ))
            )}
          </div>
          <div style={{
            fontSize: 13, color: 'var(--orange)', fontStyle: 'italic',
            marginBottom: 18, background: 'rgba(231,111,81,0.06)',
            padding: '10px 14px', borderRadius: 'var(--r-sm)',
            display: 'inline-flex', alignItems: 'flex-start', gap: 8,
          }}>
            <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span><strong>Trade-off:</strong> {tradeText}</span>
          </div>
        </>
      ) : (
        <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6, marginBottom: 14 }}>{whyText ?? tradeOffFallback}</p>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {phone.amazon_link && (
          
            href={phone.amazon_link}
            target="_blank"
            rel="noopener noreferrer sponsored"
            style={{
              padding: '9px 18px', background: c.primary, color: '#fff',
              borderRadius: 'var(--r-full)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2A2A42' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = c.primary }}
          >
            Buy Now
          </a>
        )}
        <button
          onClick={() => router.push(ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone)))}
          style={{
            padding: '9px 18px', border: `1px solid ${c.border}`,
            color: c.text2, borderRadius: 'var(--r-full)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            background: 'transparent', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.primary; (e.currentTarget as HTMLElement).style.color = c.text1 }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.color = c.text2 }}
        >
          Details <ChevronRight size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />
        </button>
        <button
          onClick={() => onCompare(phone)}
          style={{
            padding: '9px 18px', border: `1px solid ${c.border}`,
            color: c.text2, borderRadius: 'var(--r-full)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            background: 'transparent', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.primary; (e.currentTarget as HTMLElement).style.color = c.text1 }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.color = c.text2 }}
        >
          {isCompared ? '✓ In Compare' : '+ Compare'}
        </button>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {outOfBudget && (
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--orange)', background: 'rgba(231,111,81,0.1)', padding: '2px 8px', borderRadius: 'var(--r-full)', textTransform: 'uppercase' as const, letterSpacing: '0.4px' }}>
              Outside budget
            </span>
          )}
          <span style={{ fontSize: 18, fontWeight: 700, color: c.text1 }}>{formatDisplayPrice(phone)}</span>
        </span>
      </div>
    </div>
  )
}

function StepResults({
  phones, priorities, tier, onCompare, compareIds, meta,
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
}) {
  const priorityLabels = priorities.map(id => PRIORITIES.find(p => p.id === id)?.label ?? id)

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 5vw, 40px)',
          color: c.text1, letterSpacing: '-0.5px', marginBottom: 8,
        }}>
          Your top picks
        </h1>
        <p style={{ fontSize: 15, color: c.text3 }}>Step 3 of 3</p>
      </div>

      <div style={{
        background: c.bg, padding: '14px 18px', borderRadius: 'var(--r-md)',
        textAlign: 'center', fontSize: 14, color: c.text2, marginBottom: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap',
      }}>
        <span style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '0.4px',
          color: TIER_COLOR[tier.id], padding: '2px 8px',
          background: `${TIER_COLOR[tier.id]}18`, borderRadius: 'var(--r-full)',
        }}>
          {tier.label}
        </span>
        <span><strong style={{ color: c.text1 }}>{tier.name}</strong> · {priorityLabels.join(' · ')}</span>
      </div>

      {meta?.insufficientMatches && phones.length > 0 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 16px', background: 'rgba(231,111,81,0.06)', border: '1px solid rgba(231,111,81,0.15)', borderRadius: 'var(--r-md)', marginBottom: 16 }}>
          <AlertTriangle size={15} color="var(--orange)" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.5 }}>
            Only {phones.length} phone{phones.length !== 1 ? 's' : ''} match{phones.length === 1 ? 'es' : ''} every requirement you picked — that's the full catalog for this combination right now, not a partial list.
          </p>
        </div>
      )}

      {meta?.budgetWidened && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 16px', background: 'var(--blue-light)', border: '1px solid rgba(69,123,157,0.15)', borderRadius: 'var(--r-md)', marginBottom: 16 }}>
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
        phones.map((phone, i) => (
          <ResultCard
            key={phone.id}
            phone={phone}
            rank={i + 1}
            score={phone.match_score ?? phone.value_score ?? 7.5}
            isBest={i === 0}
            onCompare={onCompare}
            isCompared={compareIds.includes(phone.id)}
            tier={tier}
          />
        ))
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
  }, [tierId, customMin, customMax, customRangeValid, priorities, toast])

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

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', minHeight: 'calc(100vh - 200px)' }}>
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
          />
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{
              width: 36, height: 36, border: `3px solid ${c.border}`,
              borderTopColor: c.primary, borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
            }} />
            <p style={{ fontSize: 14, color: c.text3 }}>Finding your perfect phone...</p>
          </div>
        )}

        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginTop: 32,
          flexDirection: step === 1 ? 'row-reverse' : 'row',
        }}>
          {step > 1 && step < 3 && (
            <button
              onClick={goBack}
              style={{
                padding: '12px 24px', borderRadius: 'var(--r-md)',
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
                padding: '12px 24px', borderRadius: 'var(--r-md)',
                fontWeight: 500, fontSize: 14, cursor: 'pointer',
                border: `1px solid ${c.border}`, background: 'transparent',
                color: c.text2, transition: 'all 0.15s',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.text2 }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border }}
            >
              <ArrowLeft size={16} /> Change Priorities
            </button>
          )}

          {step < 3 && (
            <button
              onClick={goNext}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
              style={{
                padding: '12px 28px', borderRadius: 'var(--r-md)',
                fontWeight: 600, fontSize: 14,
                cursor: (step === 1 ? canProceedStep1 : canProceedStep2) ? 'pointer' : 'not-allowed',
                border: 'none',
                background: (step === 1 ? canProceedStep1 : canProceedStep2) ? c.primary : '#D0D0CC',
                color: '#fff', transition: 'all 0.15s',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
              onMouseEnter={e => {
                if (step === 1 ? canProceedStep1 : canProceedStep2)
                  (e.currentTarget as HTMLElement).style.background = '#2A2A42'
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
                padding: '12px 24px', borderRadius: 'var(--r-md)',
                fontWeight: 500, fontSize: 14,
                border: `1px solid ${c.border}`, background: 'transparent',
                color: c.text2, transition: 'all 0.15s',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.text2 }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border }}
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
