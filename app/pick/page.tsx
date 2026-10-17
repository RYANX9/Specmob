// app\pick\page.tsx
'use client'
import { useState, useCallback, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowRight, ArrowLeft, Camera, Battery, Zap, Smartphone,
  Feather, Monitor, Bolt, BadgeDollarSign, Check, Info,
  Crosshair, Gamepad2, Layers, Droplets, Waves, AlertTriangle,
  Star, Sparkles, Scale,
} from 'lucide-react'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import CompareBar from '@/app/components/CompareBar'
import { useToast } from '@/app/components/Toast'
import { api } from '@/lib/api'
import { ROUTES, MAX_COMPARE } from '@/lib/config'
import { formatUsd } from '@/lib/price'
import { c, r } from '@/lib/tokens'
import BudgetDial from '@/app/components/BudgetDial'
import { budgetBounds, DEFAULT_DIAL_VALUE, DIAL_MAX, DIAL_MIN, PRICE_TIERS, getPriceTier, isPriceTierId, tierRangeText, type PriceTierId } from '@/lib/priceTiers'
import { TIER_STYLE } from '@/lib/tiers'
import type { Phone, TierId } from '@/lib/types'
import { analytics } from '@/lib/analytics'
const STEPS = [1, 2, 3]
// Colors not covered by lib/tokens — lifted straight from the mockup.
const AMBER = '#B0651B'
const AMBER_BG = '#FBF0E4'
const AMBER_BORDER = '#EFD3AE'
const MATCH_BORDER = '#C9D2F2'
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
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(26px, 4vw, 36px)', color: c.text1, letterSpacing: '-0.5px', marginBottom: 8, fontWeight: 400 }}>
        {title}
      </h2>
      <p style={{ fontSize: 14, color: c.text3, lineHeight: 1.6 }}>{sub}</p>
    </div>
  )
}
// Tier OR dial. Selecting a tier locks the dial and applies the tier's own
// price range; clearing it (or tapping "Use the dial") hands control back.
const TIER_TO_PHONE_TIER: Record<PriceTierId, TierId> = {
  s: 'ultra_flagship', a: 'flagship', b: 'upper_mid_range', c: 'mid_range', d: 'budget',
}


function BudgetPicker({
  budget,
  onBudget,
  tierId,
  onTier,
  compact = false,
  showTiers = true,
}: {
  budget: number
  onBudget: (v: number) => void
  tierId: PriceTierId | null
  onTier: (t: PriceTierId | null) => void
  compact?: boolean
  showTiers?: boolean
}) {
  const { min, max } = budgetBounds(budget)
  const dialRange =
    max == null
      ? `$${min.toLocaleString()}+`
      : `$${min.toLocaleString()} – $${max.toLocaleString()}`

  const activeTier = tierId ? getPriceTier(tierId) : null

  const chip = (active: boolean): React.CSSProperties => ({
    padding: compact ? '12px 13px' : '16px',
    borderRadius: r.lg,
    fontSize: compact ? 12 : 13,
    fontWeight: 600,
    cursor: 'pointer',
    border: `1.5px solid ${active ? c.primary : c.border}`,
    background: active ? c.surface2 : c.surface,
    color: c.text2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
    lineHeight: 1.35,
    textAlign: 'left',
    minWidth: 0,
    width: '100%',
    height: '100%',
    transition: 'border-color 150ms ease, background 150ms ease, transform 150ms ease',
    boxShadow: active ? 'var(--shadow-sm)' : 'none',
  })

  return (
    <div>
      <div style={{ maxWidth: 560, margin: '0 auto 8px' }}>
        <BudgetDial
          value={budget}
          onChange={onBudget}
          disabled={!!tierId}
        />
      </div>

      <p
        style={{
          textAlign: 'center',
          fontSize: 13,
          color: c.text3,
          margin: '4px 0 22px',
        }}
      >
        {activeTier ? (
          <>
            Dial is off while a tier is selected.{' '}
            <button
              onClick={() => onTier(null)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: c.primary,
                fontWeight: 600,
                fontSize: 13,
                textDecoration: 'underline',
                textUnderlineOffset: 2,
              }}
            >
              Use the dial instead
            </button>
          </>
        ) : (
          <>
            Showing phones priced{' '}
            <b style={{ color: c.text2 }}>{dialRange}</b>
          </>
        )}
      </p>

      {showTiers && (
        <>
          <div
            style={{
              textAlign: 'center',
              margin: compact ? '8px 0 10px' : '12px 0 14px',
            }}
          >
            <p
              style={{
                fontSize: compact ? 12 : 14,
                fontWeight: 700,
                color: c.text2,
                marginBottom: 4,
              }}
            >
              Or choose a price tier
            </p>

            <p
              style={{
                fontSize: 12,
                color: c.text3,
                lineHeight: 1.5,
              }}
            >
              Selecting a tier replaces the dial and uses that tier's fixed
              price range.
            </p>
          </div>

          <div
            className="pick-tier-grid"
            role="group"
            aria-label="Price tier"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 10,
              marginBottom: 8,
            }}
          >
            {PRICE_TIERS.map(t => {
              const active = tierId === t.id
              const tierStyle = TIER_STYLE[TIER_TO_PHONE_TIER[t.id]]

              return (
                <button
                  key={t.id}
                  aria-pressed={active}
                  style={chip(active)}
                  onClick={() => onTier(active ? null : t.id)}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      width: '100%',
                    }}
                  >
                    <span
                      style={{
                        fontSize: compact ? 12 : 13,
                        fontWeight: 750,
                        color: active ? c.text1 : tierStyle.color,
                      }}
                    >
                      {t.name}
                    </span>

                    {active && (
                      <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                    )}
                  </span>

                  <span
                    style={{
                      fontSize: compact ? 11 : 12,
                      color: c.text1,
                      fontWeight: 700,
                    }}
                  >
                    {tierRangeText(t)}
                  </span>

                  {!compact && (
                    <span
                      style={{
                        fontSize: 11.5,
                        color: c.text3,
                        fontWeight: 400,
                        lineHeight: 1.45,
                      }}
                    >
                      {t.blurb}
                    </span>
                  )}

                  {!compact && (
                    <span
                      style={{
                        fontSize: 10.5,
                        color: c.text3,
                        fontWeight: 500,
                        lineHeight: 1.4,
                      }}
                    >
                      Examples: {t.examples}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}



function StepBudget(props: { budget: number; onBudget: (v: number) => void; tierId: PriceTierId | null; onTier: (t: PriceTierId | null) => void }) {
  return (
    <div style={{ animation: 'fadeIn 0.25s ease' }}>
      <StepHeader title="Set your phone budget" sub="Step 1 of 3 · Move the dial to set a maximum price, or choose a tier below." />
      <BudgetPicker {...props} />
    </div>
  )
}

function StepPriorities({ selected, onToggle }: { selected: Set<string>; onToggle: (id: string) => void }) {
  const count = selected.size
  const isMax = count >= 3
  return (
    <div style={{ animation: 'fadeIn 0.25s ease' }}>
      <StepHeader title="Choose what matters most" sub={`Step 2 of 3 · Select 2 or 3 priorities (${count} selected).`} />
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
        {count < 2
          ? <span>{count === 0 ? 'Choose at least 2 priorities to continue.' : 'Choose one more priority to continue.'}</span>
          : (
              <>
                <Check size={14} color="var(--green)" strokeWidth={2.5} />
                <span>
                  <strong style={{ color: c.text1 }}>
                    {Array.from(selected).map(id => PRIORITIES.find(p => p.id === id)?.label).join(', ')}
                  </strong>
                  {' '}({count} of 3 selected)
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
  phone, rank, score, isBest, onCompare, isCompared, budget,
}: {
  phone: Phone
  rank: number
  score: number
  isBest: boolean
  onCompare: (p: Phone) => void
  isCompared: boolean
  budget?: number | null
}) {
  const router = useRouter()
  const displayPrice = phone.price_usd
  const outOfBudget = (phone as Phone & { over_budget?: boolean }).over_budget === true
  const belowRange = (phone as Phone & { below_range?: boolean }).below_range === true
  const tier = phone.tier ? TIER_STYLE[phone.tier as TierId] : null
  const tradeOffFallback = outOfBudget
    ? `Priced at ${displayPrice != null ? `$${Math.round(displayPrice).toLocaleString()}` : 'slightly more'}, slightly above your ${budget != null ? `$${budget.toLocaleString()} ` : ''}budget (within 5%).`
    : null
  const whyText = phone.match_line ?? phone.reason ?? (phone.tier ? `A ${tier?.label ?? ''} pick in your price range.` : 'In your price range.')
  const tradeText = outOfBudget ? tradeOffFallback : (phone.tradeoff_line ?? null)
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
              ? <img src={phone.main_image_url} alt={phone.display_name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: isBest ? 8 : 5 }} />
              : <Smartphone size={26} color={c.borderHover} strokeWidth={1} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: isBest ? 23 : 19, color: c.text1, lineHeight: 1.2, marginBottom: 4 }}>
              {isBest ? phone.display_name : `#${rank} ${phone.display_name}`}
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
      </div>
      {isBest ? (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 12, paddingLeft: 2 }}>
            <Check size={14} color="var(--green)" strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 14.5, color: c.text2, lineHeight: 1.55 }}>{whyText}</p>
          </div>
          {tradeText && <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 9, background: AMBER_BG, border: `1px solid ${AMBER_BORDER}`,
            borderRadius: r.sm, padding: '10px 13px', marginBottom: 16, fontSize: 12.5, color: c.text2, lineHeight: 1.5,
          }}>
            <Info size={14} color={AMBER} style={{ flexShrink: 0, marginTop: 1 }} />
            <span><b style={{ color: AMBER }}>Trade-off</b> — {tradeText}</span>
          </div>}
        </>
      ) : (
        <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.6, marginBottom: 14 }}>{whyText}</p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => router.push(phone.path)}
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
        {outOfBudget && !isBest && (
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--orange)', background: 'rgba(231,111,81,0.1)', padding: '2px 8px', borderRadius: r.full, textTransform: 'uppercase' as const, letterSpacing: '0.4px' }}>
            Within 5% over
          </span>
        )}
        {belowRange && (
          <span style={{ fontSize: 10, fontWeight: 700, color: c.text3, background: c.bg, padding: '2px 8px', borderRadius: r.full, textTransform: 'uppercase' as const, letterSpacing: '0.4px' }}>
            Below your range
          </span>
        )}
        <div style={{ marginLeft: 'auto', fontSize: isBest ? 21 : 18, fontWeight: 800, color: c.text1 }}>
          {formatUsd(phone.price_usd)}
        </div>
      </div>
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
  phones, priorities, budget, onBudget, tierId, onTier, onCompare, onEditPriorities, compareIds, meta, loading,
}: {
  phones: Phone[]
  priorities: string[]
  budget: number
  onBudget: (v: number) => void
  tierId: PriceTierId | null
  onTier: (t: PriceTierId | null) => void
  onCompare: (p: Phone) => void
  onEditPriorities: () => void
  compareIds: number[]
  meta: {
    budgetWidened: boolean
    insufficientMatches: boolean
    effectiveMin: number | null
    effectiveMax: number | null
  } | null
  loading: boolean
}) {
  const priorityLabels = priorities.map(id => PRIORITIES.find(p => p.id === id)?.label ?? id)
  // Top 3 for the "Compare top 3" button: same order as the ranked list, skipping
  // phones flagged over budget so we never push the user to compare something
  // they ruled out.
  const top3 = phones.filter(p => (p as Phone & { over_budget?: boolean }).over_budget !== true).slice(0, 3)
  const [fallback, setFallback] = useState<Phone[]>([])
  const [fallbackScope, setFallbackScope] = useState<'budget' | 'all'>('budget')
  const [fallbackLoading, setFallbackLoading] = useState(false)
  const [adjusting, setAdjusting] = useState(false)
  const activeTier = tierId ? getPriceTier(tierId) : null
  const bounds = budgetBounds(budget)
  const money = (n: number) => `$${n.toLocaleString('en-US')}`
  const heading = activeTier
    ? `Top 5 ${activeTier.name} phones`
    : budget >= DIAL_MAX ? 'Top 5 phones at $2,000+' : `Top 5 phones up to ${money(budget)}`
  const rangeText = activeTier
    ? tierRangeText(activeTier)
    : bounds.max == null ? `${money(bounds.min)}+` : `${money(bounds.min)} – ${money(bounds.max)}`
  const pill: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: r.full, background: c.surface, border: `1px solid ${c.border}`, fontSize: 12.5, color: c.text2, fontWeight: 500 }
  const linkBtn: React.CSSProperties = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: c.primary, fontSize: 13, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }
  useEffect(() => {
    if (loading || phones.length > 0) { setFallback([]); return }
    let cancelled = false
    setFallbackLoading(true)
    ;(async () => {
      try {
        let res = await api.phones.recommend(tierId ? { tier: tierId, limit: 3 } : { budget, limit: 3 })
        let scope: 'budget' | 'all' = 'budget'
        if (res.phones.length === 0) {
          res = await api.phones.recommend({ limit: 3 })
          scope = 'all'
        }
        if (!cancelled) { setFallback(res.phones); setFallbackScope(scope) }
      } catch {
        if (!cancelled) setFallback([])
      } finally {
        if (!cancelled) setFallbackLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [loading, phones.length, budget, tierId])
  return (
    <div style={{ animation: 'fadeIn 0.25s ease' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 4.4vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.8px', fontWeight: 400, color: c.text1, margin: '0 0 14px' }}>
        {heading}
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: adjusting ? 14 : 22 }}>
        <span style={pill}>{activeTier ? `${activeTier.name} · ` : ''}{rangeText}</span>
        {priorityLabels.map(l => <span key={l} style={pill}>{l}</span>)}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 16 }}>
          <button type="button" style={linkBtn} aria-expanded={adjusting} onClick={() => setAdjusting(v => !v)}>
            {adjusting ? 'Done' : 'Adjust budget'}
          </button>
          <button type="button" style={linkBtn} onClick={onEditPriorities}>Change priorities</button>
        </span>
      </div>

      {adjusting && (
        <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.lg, padding: '18px 20px 14px', marginBottom: 22 }}>
          <BudgetPicker budget={budget} onBudget={onBudget} tierId={tierId} onTier={onTier} compact showTiers />
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
          {meta?.budgetWidened && !tierId && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 16px', background: 'var(--blue-light)', border: '1px solid rgba(69,123,157,0.15)', borderRadius: r.md, marginBottom: 16 }}>
              <Info size={15} color="var(--blue)" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.5 }}>
                Not enough matches in this range, so we lowered the floor{meta.effectiveMin != null ? ` to $${Math.round(meta.effectiveMin).toLocaleString()}` : ''}. Your ceiling of ${budgetBounds(budget).max?.toLocaleString() ?? 'no limit'} is unchanged.
              </p>
            </div>
          )}

          {top3.length >= 2 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <Link
                href={ROUTES.comparePair(...top3.map(p => p.full_slug))}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', background: c.primary, color: '#fff', borderRadius: r.full, fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', textDecoration: 'none' }}
              >
                <Scale size={15} strokeWidth={2} />
                Compare top {top3.length}
              </Link>
            </div>
          )}

          {phones.length === 0 ? (
            <div>
              <div style={{ textAlign: 'center', padding: '28px 0 24px' }}>
                <Crosshair size={40} color={c.border} strokeWidth={1} style={{ margin: '0 auto 14px' }} />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: c.text1, marginBottom: 8, fontWeight: 400 }}>No phone fits every priority</h3>
                <p style={{ fontSize: 14, color: c.text3, maxWidth: 460, margin: '0 auto', lineHeight: 1.6 }}>
                  {fallback.length > 0
                    ? fallbackScope === 'budget'
                      ? 'Here are the top rated phones in this price range instead. You can also change a priority, the budget or the tier above.'
                      : 'Nothing is listed in this budget yet, so here are the top rated phones overall.'
                    : 'Try a different budget or fewer priorities.'}
                </p>
              </div>
              {fallbackLoading && (
                <p style={{ textAlign: 'center', fontSize: 13, color: c.text3, padding: '12px 0' }}>Finding the closest picks...</p>
              )}
              {fallback.map((phone, i) => (
                <ResultCard
                  key={phone.id}
                  phone={phone}
                  rank={i + 1}
                  score={0}
                  isBest={i === 0}
                  onCompare={onCompare}
                  isCompared={compareIds.includes(phone.id)}
                  budget={tierId ? null : budget}
                />
              ))}
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
                  budget={tierId ? null : budget}
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
  const [budget, setBudget] = useState<number>(() => {
    const b = Number(searchParams.get('budget'))
    return Number.isFinite(b) && b >= DIAL_MIN ? Math.min(b, DIAL_MAX) : DEFAULT_DIAL_VALUE
  })
  // Tier OR dial. When tierId is set the dial is locked and the tier's range is used.
  const [tierId, setTierId] = useState<PriceTierId | null>(() => {
    const t = searchParams.get('tier')
    return isPriceTierId(t) ? t : null
  })
  const [step, setStep] = useState<number>(() => {
    const s = parseInt(searchParams.get('step') ?? (searchParams.get('budget') || searchParams.get('tier') ? '3' : '1'), 10)
    return [1, 2, 3].includes(s) ? s : 1
  })
  const [priorities, setPriorities] = useState<Set<string>>(() => {
    const raw = searchParams.get('p')
    return raw ? new Set(raw.split(',').filter(id => PRIORITIES.some(p => p.id === id))) : new Set()
  })
  const [results, setResults] = useState<Phone[]>([])
  const [loading, setLoading] = useState(false)
  const [comparePhones, setComparePhones] = useState<Phone[]>([])
  const [recommendMeta, setRecommendMeta] = useState<{
    budgetWidened: boolean
    insufficientMatches: boolean
    effectiveMin: number | null
    effectiveMax: number | null
  } | null>(null)
  useEffect(() => {
    analytics.pickStart()
  }, [])
  const commit = useCallback((s: number, b: number, t: PriceTierId | null, pSet: Set<string>) => {
    const params = new URLSearchParams()
    params.set('step', String(s))
    // Never both: the URL carries either the tier or the dial value.
    if (t) params.set('tier', t)
    else params.set('budget', String(b))
    if (pSet.size > 0) params.set('p', Array.from(pSet).join(','))
    router.replace(`/pick?${params.toString()}`, { scroll: false })
  }, [router])
  const handleBudget = (v: number) => { if (tierId) return; setBudget(v); commit(step, v, null, priorities) }
  const handleTier = (t: PriceTierId | null) => { setTierId(t); commit(step, budget, t, priorities) }
  const handlePriorityToggle = (id: string) => {
    const next = new Set(priorities)
    if (next.has(id)) next.delete(id)
    else if (next.size < 3) next.add(id)
    setPriorities(next)
    commit(step, budget, tierId, next)
  }
  const priorityKey = Array.from(priorities).sort().join(',')
  useEffect(() => {
    if (step !== 3) return
    const controller = new AbortController()
    setLoading(true)
    const timer = setTimeout(() => {
      api.phones.recommend({
        ...(tierId ? { tier: tierId } : { budget }),
        priorities: priorityKey || undefined, limit: 5,
      }, controller.signal)
        .then(data => {
          setResults(data.phones as Phone[])
          analytics.pickComplete({ priorities: priorityKey, result_count: data.phones.length, max_price: data.requested_price_range?.max ?? undefined, min_price: data.requested_price_range?.min ?? undefined })
          setRecommendMeta({
            budgetWidened: data.budget_widened,
            insufficientMatches: data.insufficient_matches,
            effectiveMin: data.effective_price_range?.min ?? null,
            effectiveMax: data.effective_price_range?.max ?? null,
          })
        })
        .catch(() => { if (!controller.signal.aborted) { setResults([]); setRecommendMeta(null); toast('Failed to load recommendations', 'error') } })
        .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }, 200)
    return () => { clearTimeout(timer); controller.abort() }
  }, [step, tierId ? null : budget, tierId, priorityKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const canProceedStep1 = true
  const canProceedStep2 = priorities.size >= 2 && priorities.size <= 3
  
  const goNext = () => {
    const next = Math.min(step + 1, 3)

    commit(next, budget, tierId, priorities)

    setStep(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goBack = () => {
    const prev = Math.max(step - 1, 1)
    setStep(prev)
    commit(prev, budget, tierId, priorities)
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
      analytics.compareAddPhone(phone, prev.length + 1)
      return [...prev, phone]
    })
  }
  const compareIds = comparePhones.map(p => p.id)
  return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <Navbar />
      <main style={{ maxWidth: 1040, margin: '0 auto', padding: '36px 24px 100px' }}>
        {step < 3 && (
          <>
            <header style={{ maxWidth: 560, margin: '0 auto 26px', textAlign: 'center' }}>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 4.4vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.8px', fontWeight: 400, color: c.text1, marginBottom: 10 }}>
                Find the right phone for your budget
              </h1>
              <p style={{ fontSize: 15, lineHeight: 1.65, color: c.text2 }}>
                Set a budget, pick what matters, and get a ranked shortlist.
              </p>
            </header>
            <ProgressDots current={step} />
          </>
        )}
        {step === 1 && (
          <StepBudget budget={budget} onBudget={handleBudget} tierId={tierId} onTier={handleTier} />
        )}
        {step === 2 && (
          <StepPriorities selected={priorities} onToggle={handlePriorityToggle} />
        )}
        {step === 3 && (
          <StepResults
            phones={results}
            priorities={Array.from(priorities)}
            budget={budget}
            onBudget={handleBudget}
            tierId={tierId}
            onTier={handleTier}
            onCompare={handleCompare}
            onEditPriorities={goBack}
            compareIds={compareIds}
            meta={recommendMeta}
            loading={loading}
          />
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
              {step === 1 ? 'Choose priorities' : 'Find my phones'}
              <ArrowRight size={16} />
            </button>
          )}
          {step === 3 && (
            <Link
              href={ROUTES.best}
              style={{
                padding: '11px 22px', borderRadius: r.md,
                fontWeight: 600, fontSize: 13.5,
                color: c.primary, transition: 'all 0.15s',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              Browse the best-of lists <ArrowRight size={16} />
            </Link>
          )}
        </div>
        <section
          aria-labelledby="pick-how-it-works"
          style={{
            marginTop: 64,
            paddingTop: 28,
            borderTop: `1px solid ${c.border}`,
          }}
        >
          <div style={{ maxWidth: 700, margin: '0 0 24px' }}>
            <h2
              id="pick-how-it-works"
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(24px, 3vw, 30px)',
                fontWeight: 400,
                color: c.text1,
                marginBottom: 8,
              }}
            >
              How it works
            </h2>
            <p style={{ color: c.text2, fontSize: 14, lineHeight: 1.7 }}>
              Three quick steps to narrow your options and find phones worth comparing.
            </p>
          </div>

          <div
            className="pick-how-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 14,
              marginBottom: 28,
            }}
          >
            {[
              {
                n: '01',
                title: 'Set your budget',
                body: 'Use the dial or choose a price tier to set your price range.',
              },
              {
                n: '02',
                title: 'Choose priorities',
                body: 'Pick 2–3 features that matter most, such as camera, battery, or gaming.',
              },
              {
                n: '03',
                title: 'Compare your matches',
                body: 'Review ranked recommendations, check the trade-offs, and compare your favourites.',
              },
            ].map(item => (
              <article
                key={item.n}
                style={{
                  padding: 18,
                  border: `1px solid ${c.border}`,
                  borderRadius: r.lg,
                  background: c.surface,
                }}
              >
                <p
                  style={{
                    color: c.text3,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '1px',
                    marginBottom: 10,
                  }}
                >
                  {item.n} / STEP
                </p>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: c.text1,
                    marginBottom: 6,
                  }}
                >
                  {item.title}
                </h3>
                <p style={{ fontSize: 13, lineHeight: 1.7, color: c.text2 }}>
                  {item.body}
                </p>
              </article>
            ))}
          </div>

          <div
            className="pick-seo-columns"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 24,
              alignItems: 'start',
            }}
          >
            <article>
              <h2
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 22,
                  fontWeight: 400,
                  color: c.text1,
                  marginBottom: 8,
                }}
              >
                How are phones ranked?
              </h2>
              <p
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.75,
                  color: c.text2,
                  marginBottom: 10,
                }}
              >
                Your budget and selected priorities help filter and rank the available
                phones. Some priorities may exclude phones that do not meet the
                requirements.
              </p>
              <Link
                href={ROUTES.methodology}
                style={{
                  color: c.primary,
                  fontSize: 13,
                  fontWeight: 650,
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                Read our ranking methodology
              </Link>
            </article>

            <article
              style={{
                background: c.surface,
                border: `1px solid ${c.border}`,
                borderRadius: r.lg,
                padding: 18,
              }}
            >
              <h2
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 22,
                  fontWeight: 400,
                  color: c.text1,
                  marginBottom: 8,
                }}
              >
                Want more options?
              </h2>
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: c.text2,
                  marginBottom: 12,
                }}
              >
                Explore our curated rankings for the best phones in different
                categories and price ranges.
              </p>
              <Link
                href={ROUTES.best}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  color: c.primary,
                  textDecoration: 'none',
                }}
              >
                Browse the best phone rankings
                <ArrowRight size={14} />
              </Link>
            </article>
          </div>

          <style>{`
            @media (max-width: 760px) {
              .pick-how-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              }
              .pick-seo-columns {
                grid-template-columns: 1fr !important;
              }
            }
            @media (max-width: 520px) {
              .pick-how-grid {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>
        </section>
      </main>
      <Footer />
      <CompareBar
        phones={comparePhones}
        onRemove={id => setComparePhones(prev => prev.filter(p => p.id !== id))}
        onClear={() => setComparePhones([])}
      />
      <style>{`
        @media (max-width: 760px) {
          .pick-tier-grid, .pick-prio-grid, .pick-how-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .pick-seo-columns { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 520px) {
          .pick-tier-grid, .pick-prio-grid, .pick-how-grid { grid-template-columns: 1fr !important; }
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