'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BadgeDollarSign,
  Battery,
  Bolt,
  Camera,
  ChevronDown,
  Droplets,
  Feather,
  Gamepad2,
  Layers,
  Monitor,
  Smartphone,
  Waves,
  Zap,
} from 'lucide-react'

import { api } from '@/lib/api'
import { ROUTES } from '@/lib/config'
import { c, f } from '@/lib/tokens'
import { tierStyle } from '@/lib/tiers'
import { formatUsd } from '@/lib/price'
import { valueScoreColor } from '@/lib/valueScore'
import { trackBlockClick } from '@/lib/events'
import {
  DEFAULT_DIAL_VALUE,
  DIAL_MAX,
  DIAL_MIN,
} from '@/lib/priceTiers'
import type { Phone } from '@/lib/types'
import BudgetDial from '@/app/components/BudgetDial'

const PRIORITIES = [
  { id: 'camera', label: 'Camera', icon: <Camera size={14} strokeWidth={2} /> },
  { id: 'battery', label: 'Battery', icon: <Battery size={14} strokeWidth={2} /> },
  { id: 'performance', label: 'Performance', icon: <Zap size={14} strokeWidth={2} /> },
  { id: 'gaming', label: 'Gaming', icon: <Gamepad2 size={14} strokeWidth={2} /> },
  { id: 'display', label: 'Display', icon: <Monitor size={14} strokeWidth={2} /> },
  { id: 'value', label: 'Best Value', icon: <BadgeDollarSign size={14} strokeWidth={2} /> },
  { id: 'smooth_display', label: 'High Refresh Rate', icon: <Waves size={14} strokeWidth={2} /> },
  { id: 'fast_charging', label: 'Fast Charging', icon: <Bolt size={14} strokeWidth={2} /> },
  { id: 'wireless_charging', label: 'Wireless Charging', icon: <Zap size={14} strokeWidth={2} /> },
  { id: 'compact', label: 'Compact', icon: <Smartphone size={14} strokeWidth={2} /> },
  { id: 'lightweight', label: 'Lightweight', icon: <Feather size={14} strokeWidth={2} /> },
  { id: 'foldable', label: 'Foldable', icon: <Layers size={14} strokeWidth={2} /> },
  { id: 'durability', label: 'Water Resistant', icon: <Droplets size={14} strokeWidth={2} /> },
]

const COLLAPSED_CHIPS = 6
const MAX_PRIORITIES = 3
const STORE_KEY = 'specmob-dial'

function readStored(): { value: number; priorities: string[] } | null {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null')

    if (!raw || typeof raw.value !== 'number') return null

    const value = Math.min(DIAL_MAX, Math.max(DIAL_MIN, raw.value))
    const priorities = Array.isArray(raw.priorities)
      ? raw.priorities
          .filter((id: string) => PRIORITIES.some(p => p.id === id))
          .slice(0, MAX_PRIORITIES)
      : []

    return { value, priorities }
  } catch {
    return null
  }
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

function ResultCard({
  phone,
  loading,
  failed,
  value,
  priorities,
  pickHref,
}: {
  phone: Phone | null
  loading: boolean
  failed: boolean
  value: number
  priorities: string[]
  pickHref: string
}) {
  const uncapped = value >= DIAL_MAX
  const budgetText = uncapped ? 'at $2,000+' : `up to ${formatUsd(value)}`
  const labels = priorities.map(id => PRIORITIES.find(p => p.id === id)?.label ?? id)
  const kicker = labels.length
    ? `Best for ${joinList(labels)} ${budgetText}`
    : `Best phone ${budgetText}`

  if (!phone && loading) {
    return (
      <div className="pd-card" aria-busy="true">
        <div className="skeleton" style={{ height: 11, width: 170, marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
          <div className="skeleton" style={{ width: 88, height: 104, borderRadius: 'var(--r-lg)' }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 10, width: 70, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 20, width: '80%', marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 16, width: '50%' }} />
          </div>
        </div>
        <div className="skeleton" style={{ height: 40 }} />
      </div>
    )
  }

  if (!phone && failed) {
    return (
      <div className="pd-card" style={{ textAlign: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6, marginBottom: 14 }}>
          Could not load a pick right now. Move the dial or try again in a moment.
        </p>
        <Link href={ROUTES.best} style={{ fontSize: 13, fontWeight: 600, color: c.accent }}>
          Browse the rankings
        </Link>
      </div>
    )
  }

  if (!phone) {
    return (
      <div className="pd-card" style={{ textAlign: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6, marginBottom: 14 }}>
          Nothing is listed {budgetText} for these priorities yet. Raise the budget or drop a priority.
        </p>
        <Link href={ROUTES.best} style={{ fontSize: 13, fontWeight: 600, color: c.accent }}>
          Browse the rankings
        </Link>
      </div>
    )
  }

  const tier = tierStyle(phone.tier)
  const score = phone.overall_score
  const why = priorities.length
    ? phone.match_line ?? phone.reason
    : phone.reason ?? 'Highest Smart Score in this price range.'

  return (
    <div className="pd-card" style={{ opacity: loading ? 0.55 : 1 }}>
      <div className="pd-kicker">{kicker}</div>

      <div className="pd-row">
        <Link
          href={phone.path}
          prefetch={false}
          onClick={() => trackBlockClick('hero.card', phone.path, 'home')}
          className="pd-img"
          aria-label={phone.display_name}
        >
          {phone.main_image_url ? (
            <img src={phone.main_image_url} alt={phone.display_name} />
          ) : (
            <Smartphone size={30} color={c.border} strokeWidth={1} />
          )}
        </Link>

        <div className="pd-info">
          <div className="pd-brand">
            {tier && <span className="pd-dot" style={{ background: tier.color }} />}
            {phone.brand}{tier ? ` · ${tier.label}` : ''}
          </div>
          <div className="pd-name">{phone.name}</div>
          <div className="pd-meta">
            <span className="pd-price">{formatUsd(phone.price_usd)}</span>
            {score != null && (
              <span className="pd-score">
                <strong style={{ color: valueScoreColor(score) }}>{score.toFixed(1)}</strong> Smart Score
              </span>
            )}
          </div>
        </div>
      </div>

      {why && <p className="pd-why">{why}</p>}

      {phone.over_budget && (
        <p className="pd-warn">
          Slightly over budget (within 5%).
        </p>
      )}

      <div className="pd-actions">
        <Link href={phone.path} prefetch={false} className="pd-btn-primary">View full specs</Link>
        <Link
          href={pickHref}
          prefetch={false}
          onClick={() => trackBlockClick('hero.top5', pickHref, 'home')}
          className="pd-btn-ghost"
        >
          Top 5 matches
        </Link>
      </div>
    </div>
  )
}

export default function PriceDial({ initialPick }: { initialPick: Phone | null }) {
  const [value, setValue] = useState(DEFAULT_DIAL_VALUE)
  const [priorities, setPriorities] = useState<string[]>([])
  const [pick, setPick] = useState<Phone | null>(initialPick)
  const [loading, setLoading] = useState(!initialPick)
  const [failed, setFailed] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [restored, setRestored] = useState(false)

  const skipFetch = useRef(initialPick !== null)

  const priorityKey = [...priorities].sort().join(',')
  const uncapped = value >= DIAL_MAX

  const pickHref = `${ROUTES.pick}?budget=${value}${
    priorities.length ? `&p=${priorities.map(encodeURIComponent).join(',')}` : ''
  }`

  useEffect(() => {
    const stored = readStored()

    if (stored) {
      setValue(stored.value)
      setPriorities(stored.priorities)
    }

    setRestored(true)
  }, [])

  useEffect(() => {
    if (!restored) return

    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ value, priorities }))
    } catch {}
  }, [restored, value, priorities])

  useEffect(() => {
    if (skipFetch.current) {
      skipFetch.current = false
      return
    }

    const controller = new AbortController()
    setLoading(true)

    const timer = setTimeout(() => {
      api.phones
        .recommend(
          {
            budget: value,
            priorities: priorityKey || undefined,
            limit: 1,
          },
          controller.signal,
        )
        .then(d => {
          setFailed(false)
          setPick(d.phones[0] ?? null)
        })
        .catch(() => {
          if (controller.signal.aborted) return
          setFailed(true)
          setPick(null)
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 250)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [value, priorityKey])

  const toggle = (id: string) => {
    setPriorities(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      return prev.length < MAX_PRIORITIES ? [...prev, id] : prev
    })
  }

  const chips = showAll
    ? PRIORITIES
    : PRIORITIES.filter((p, i) => i < COLLAPSED_CHIPS || priorities.includes(p.id))

  return (
    <section className="pd-wrap" aria-label="Phone budget finder">
      <div className="pd-head">
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 14px',
            background: c.surface,
            border: `1px solid ${c.border}`,
            borderRadius: 'var(--r-full)',
            marginBottom: 22,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.accent }} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: c.text2,
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
            }}
          >
            No sponsored picks. Ranked on specs.
          </span>
        </div>

        <h1
          style={{
            fontFamily: f.serif,
            fontSize: 'clamp(30px,4.6vw,50px)',
            fontWeight: 400,
            color: c.text1,
            letterSpacing: '-1px',
            lineHeight: 1.08,
            marginBottom: 12,
          }}
        >
          Find the best phone for your budget
        </h1>

        <p
          style={{
            fontSize: 'clamp(15px,1.5vw,16.5px)',
            color: c.text2,
            lineHeight: 1.6,
            maxWidth: 520,
            marginBottom: 20,
          }}
        >
          Set what you want to spend. We show the highest-scoring phone up to that price.
        </p>

        <BudgetDial value={value} onChange={setValue} big />
      </div>

      <div className="pd-card-cell">
        <div className="pd-card-sticky" aria-live="polite">
          <ResultCard
            phone={pick}
            loading={loading}
            failed={failed}
            value={value}
            priorities={priorities}
            pickHref={pickHref}
          />
        </div>
      </div>

      <div className="pd-chips">
        <p style={{ fontSize: 13, fontWeight: 600, color: c.text2, marginBottom: 12 }}>
          What matters most?{' '}
          <span style={{ color: c.text3, fontWeight: 500 }}>
            (optional, up to {MAX_PRIORITIES})
          </span>
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {chips.map(p => {
            const active = priorities.includes(p.id)
            const dimmed = priorities.length >= MAX_PRIORITIES && !active

            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                disabled={dimmed}
                onClick={() => toggle(p.id)}
                className={`pd-chip${active ? ' active' : ''}`}
              >
                <span style={{ display: 'flex' }}>{p.icon}</span>
                {p.label}
              </button>
            )
          })}

          <button
            type="button"
            className="pd-more"
            onClick={() => setShowAll(v => !v)}
          >
            {showAll ? 'Show fewer' : 'More'}
            <ChevronDown
              size={13}
              style={{
                transform: showAll ? 'rotate(180deg)' : undefined,
                transition: 'transform 150ms ease',
              }}
            />
          </button>
        </div>
      </div>

      <style>{PD_CSS}</style>
    </section>
  )
}

const PD_CSS = `
.pd-wrap{max-width:1060px;margin:0 auto;padding:36px var(--page-px) 48px;display:grid;gap:22px 44px;grid-template-columns:minmax(0,1fr);grid-template-areas:"head" "card" "chips"}
.pd-head{grid-area:head;min-width:0}
.pd-card-cell{grid-area:card;min-width:0}
.pd-chips{grid-area:chips;min-width:0}
@media(min-width:1024px){
  .pd-wrap{grid-template-columns:minmax(0,1fr) 360px;grid-template-areas:"head card" "chips card";padding-top:56px}
  .pd-card-cell{align-self:stretch}
  .pd-card-sticky{position:sticky;top:calc(var(--nav-h) + 24px)}
}
.pd-card{display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-xl);padding:18px;box-shadow:var(--shadow-lg);transition:opacity 150ms ease}
.pd-kicker{font-size:10.5px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--text-3);margin-bottom:12px;line-height:1.4}
.pd-row{display:flex;gap:14px;align-items:center;margin-bottom:12px}
.pd-img{flex:0 0 88px;height:104px;border-radius:var(--r-lg);background:var(--bg);display:flex;align-items:center;justify-content:center;overflow:hidden}
.pd-img img{width:74%;height:86%;object-fit:contain}
.pd-info{min-width:0;flex:1}
.pd-brand{display:flex;align-items:center;gap:5px;font-size:10.5px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px}
.pd-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.pd-name{font-family:var(--font-serif);font-size:20px;line-height:1.15;color:var(--text-1);margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.pd-meta{display:flex;align-items:baseline;flex-wrap:wrap;gap:2px 10px;margin-bottom:6px}
.pd-price{font-size:19px;font-weight:700;color:var(--text-1)}
.pd-score{font-size:11.5px;color:var(--text-3)}
.pd-score strong{font-size:14px;margin-right:2px}
.pd-why{font-size:12.5px;line-height:1.5;color:var(--text-2);margin:0 0 12px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.pd-warn{font-size:11.5px;color:#B0651B;background:#FBF0E4;border:1px solid #EFD3AE;border-radius:var(--r-sm);padding:7px 10px;line-height:1.45;margin:0 0 12px}
.pd-actions{display:flex;gap:8px}
.pd-btn-primary{flex:1;text-align:center;padding:10px 0;border-radius:var(--r-full);font-size:13px;font-weight:700;background:var(--primary);color:#fff;transition:background 150ms ease}
.pd-btn-primary:hover{background:var(--primary-hover)}
.pd-btn-ghost{flex:1;text-align:center;white-space:nowrap;padding:10px 12px;border-radius:var(--r-full);font-size:13px;font-weight:600;color:var(--text-2);border:1px solid var(--border);transition:border-color 150ms ease}
.pd-btn-ghost:hover{border-color:var(--primary);color:var(--text-1)}
@media(max-width:380px){.pd-img{flex-basis:72px;height:88px}.pd-name{font-size:18px}}
.pd-chip{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:var(--r-full);border:1.5px solid var(--border);background:var(--surface);color:var(--text-2);font-size:13px;font-weight:500;transition:all 120ms ease}
.pd-chip span{color:var(--text-3)}
.pd-chip.active{background:var(--primary);border-color:var(--primary);color:#fff}
.pd-chip.active span{color:#fff}
.pd-chip:disabled{opacity:.4;cursor:not-allowed}
.pd-more{display:inline-flex;align-items:center;gap:4px;padding:8px 6px;font-size:13px;font-weight:600;color:var(--text-3)}
`
