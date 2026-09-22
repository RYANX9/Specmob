// app/components/trade-in/TradeInFlow.tsx
'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import {
  Smartphone,
  Search,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Search as SearchIcon,
  ClipboardList,
  Banknote,
  Battery,
  Monitor,
  Frame,
  Activity,
  HardDrive,
} from 'lucide-react'

import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import { useToast } from '@/app/components/Toast'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/config'
import { c, f, r, space } from '@/lib/tokens'
import { formatDisplayPrice } from '@/lib/price'
import type { Phone, TradeInRequest, TradeInResponse } from '@/lib/types'
import { formatStorage, type PhoneVariant } from '@/app/components/phone-detail/PhoneSpecs'
import { analytics } from '@/lib/analytics'

import { ResultsView, BudgetRecommendations } from './TradeInResults'

// ─── static option data ─────────────────────────────────────────────────────

export const SCREEN_OPTIONS = [
  { id: 'perfect', label: 'Perfect', desc: 'No visible marks' },
  { id: 'minor_scratches', label: 'Minor scratches', desc: 'Not visible when screen is on' },
  { id: 'deep_scratches', label: 'Deep scratches', desc: 'Visible wear' },
  { id: 'cracked_touch_ok', label: 'Cracked, touch works', desc: 'Fully responsive' },
  { id: 'cracked_unresponsive', label: 'Cracked, unresponsive', desc: 'Touch fails or bleeding pixels' },
] as const

export const BODY_OPTIONS = [
  { id: 'flawless', label: 'Flawless', desc: 'Like new' },
  { id: 'light_wear', label: 'Light wear', desc: 'Micro-scratches on back or frame' },
  { id: 'moderate_wear', label: 'Moderate wear', desc: 'Visible scuffs, small dents' },
  { id: 'heavy_wear', label: 'Heavy wear', desc: 'Deep dents, chipped paint, bent frame' },
  { id: 'cracked_back', label: 'Cracked glass back', desc: '' },
] as const

export const FUNCTIONAL_ITEMS = [
  { id: 'camera', label: 'Camera issues' },
  { id: 'biometric', label: 'Face ID / fingerprint broken' },
  { id: 'audio', label: 'Speaker / microphone issues' },
  { id: 'charging_port', label: 'Charging port faulty' },
  { id: 'buttons', label: 'Physical buttons unresponsive' },
] as const

export const STEPS = [
  {
    icon: SearchIcon,
    title: 'Find your phone',
    desc: 'Search by model name, then pick the storage/RAM configuration you own.',
  },
  {
    icon: ClipboardList,
    title: 'Describe condition',
    desc: 'Screen, body, battery health, and any functional issues. Be honest — it keeps the estimate accurate.',
  },
  {
    icon: Banknote,
    title: 'Get your estimate',
    desc: 'We calculate a fair trade-in range based on current market value and the deductions for wear and damage.',
  },
] as const

// ─── battery health: percentage scale with labeled condition bands ──────────

const BATTERY_MIN = 50
const BATTERY_MAX = 100
const BATTERY_DEFAULT = 92
const BATTERY_BREAKPOINTS = [50, 70, 80, 90, 95, 100]

const BATTERY_BANDS: { min: number; max: number; label: string; color: string }[] = [
  { min: 95, max: 100, label: 'Like new', color: 'var(--green)' },
  { min: 90, max: 94, label: 'Excellent', color: 'var(--green)' },
  { min: 80, max: 89, label: 'Good', color: 'var(--blue)' },
  { min: 70, max: 79, label: 'Fair', color: 'var(--orange)' },
  { min: 50, max: 69, label: 'Poor', color: 'var(--accent)' },
]

export function batteryBand(pct: number) {
  return BATTERY_BANDS.find(b => pct >= b.min && pct <= b.max) ?? BATTERY_BANDS[BATTERY_BANDS.length - 1]
}

// Backend's score_battery() takes a 1-10 health scale. Mapping the
// displayed percentage onto that scale keeps the API contract unchanged —
// 100% -> 10, 90% -> 8, 70% -> 4, <=50% -> 1.
export function batteryPctToHealthScore(pct: number): number {
  return Math.max(1, Math.min(10, Math.round((pct - BATTERY_MIN) / 5)))
}

// ─── the payload ConditionForm hands back up ─────────────────────────────────
// screen_non_original mirrors battery_non_original but isn't a field on
// TradeInRequest yet — see the note at the bottom of this file.

type ConditionPayload = Omit<TradeInRequest, 'phone_id' | 'variant_id'> & {
  screen_non_original: boolean
}

// ─── injected styles for custom controls ────────────────────────────────────

export function CustomStyles() {
  return (
    <style>{`
      input[type=range].tradein-range {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 4px;
        border-radius: 3px;
        outline: none;
        cursor: pointer;
        background: ${c.border};
      }
      input[type=range].tradein-range::-webkit-slider-runnable-track {
        height: 4px;
        border-radius: 3px;
        background: linear-gradient(
          to right,
          ${c.primary} 0%,
          ${c.primary} var(--tradein-progress, 0%),
          ${c.border} var(--tradein-progress, 0%),
          ${c.border} 100%
        );
      }
      input[type=range].tradein-range::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #fff;
        border: 2.5px solid ${c.primary};
        box-shadow: 0 1px 4px rgba(21,21,31,.18);
        cursor: pointer;
        transition: transform .1s;
        margin-top: -8px;
      }
      input[type=range].tradein-range::-webkit-slider-thumb:hover {
        transform: scale(1.1);
      }
      input[type=range].tradein-range::-moz-range-track {
        height: 4px;
        border-radius: 3px;
        background: ${c.border};
      }
      input[type=range].tradein-range::-moz-range-progress {
        height: 4px;
        border-radius: 3px;
        background: ${c.primary};
      }
      input[type=range].tradein-range::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #fff;
        border: 2.5px solid ${c.primary};
        box-shadow: 0 1px 4px rgba(21,21,31,.18);
        cursor: pointer;
      }

      .tradein-check {
        appearance: none;
        -webkit-appearance: none;
        width: 17px;
        height: 17px;
        border: 1.5px solid ${c.border};
        border-radius: 5px;
        background: ${c.surface};
        cursor: pointer;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        transition: all .12s;
      }
      .tradein-check:checked {
        background: ${c.primary};
        border-color: ${c.primary};
      }
      .tradein-check:checked::after {
        content: '';
        width: 4.5px;
        height: 8px;
        border: solid #fff;
        border-width: 0 1.5px 1.5px 0;
        transform: rotate(45deg) translate(-0.5px, -0.5px);
      }
      .tradein-check:hover {
        border-color: ${c.borderHover};
      }

      .step-connector { position: relative; }
      @media (min-width: 769px) {
        .step-connector::before {
          content: '';
          position: absolute;
          top: 24px;
          left: 16.66%;
          right: 16.66%;
          height: 1px;
          background: ${c.border};
          z-index: 0;
        }
      }

      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-fade-up { animation: fadeUp .3s ease both; }

      @media (max-width: 768px) {
        .steps-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
      }

      @media (max-width: 640px) {
        .tradein-hero { padding-top: 44px !important; padding-bottom: 32px !important; }
        .selected-phone-chip { flex-wrap: wrap; }
        .budget-add-form { flex-wrap: wrap; }
      }

      @media (max-width: 480px) {
        .conditionform-actions { flex-direction: column-reverse !important; align-items: stretch !important; }
        .conditionform-actions > button { width: 100%; justify-content: center; }
      }
    `}</style>
  )
}

// ─── hero ────────────────────────────────────────────────────────────────────

export function Hero({ hasStarted }: { hasStarted: boolean }) {
  if (hasStarted) return null
  return (
    <section className="tradein-hero" style={{ background: c.primary }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: `${space['5xl']}px 24px ${space['4xl']}px`, textAlign: 'center' }}>
        <h1 style={{ fontFamily: f.serif, fontSize: 'clamp(34px, 5vw, 52px)', color: '#fff', letterSpacing: '-0.5px', marginBottom: space.md, lineHeight: 1.1 }}>
          What's your phone worth?
        </h1>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
          Search your model, describe its condition, and get an instant estimated trade-in range based on live market data.
        </p>
      </div>
    </section>
  )
}

// ─── 3-step guide ───────────────────────────────────────────────────────────

export function StepsGuide({ hasStarted }: { hasStarted: boolean }) {
  if (hasStarted) return null
  return (
    <section className="step-connector" style={{ maxWidth: 960, margin: '0 auto', padding: `${space['4xl']}px 24px 0` }}>
      <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: space.xl, position: 'relative', zIndex: 1 }}>
        {STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <div key={step.title} style={{ textAlign: 'center', padding: `${space.lg}px ${space.md}px` }}>
              <div style={{ width: 48, height: 48, borderRadius: r.lg, background: c.surface, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', marginBottom: space.lg, position: 'relative' }}>
                <Icon size={20} color={c.text2} strokeWidth={1.5} />
                <span style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: r.full, background: c.primary, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2.5px solid ${c.bg}` }}>
                  {i + 1}
                </span>
              </div>
              <h3 style={{ fontFamily: f.serif, fontSize: 18, color: c.text1, marginBottom: space.sm }}>{step.title}</h3>
              <p style={{ fontSize: 13, color: c.text3, lineHeight: 1.6, maxWidth: 260, margin: '0 auto' }}>{step.desc}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── selected phone chip (shows chosen variant, if any) ─────────────────────

export function SelectedPhoneChip({
  phone,
  variant,
  onChangePhone,
  onChangeVariant,
}: {
  phone: Phone
  variant: PhoneVariant | null
  onChangePhone: () => void
  onChangeVariant?: () => void
}) {
  const [imgErr, setImgErr] = useState(false)

  const ghostButtonStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: c.text2, background: 'none', border: 'none',
    cursor: 'pointer', padding: '6px 10px', borderRadius: r.sm, flexShrink: 0, transition: 'all 0.12s',
  }

  return (
    <div className="selected-phone-chip" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.lg, marginBottom: 28, transition: 'all 0.15s' }}>
      <div style={{ width: 56, height: 56, background: c.bg, borderRadius: r.md, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {phone.main_image_url && !imgErr ? (
          <img src={phone.main_image_url} alt="" onError={() => setImgErr(true)} style={{ width: 44, height: 44, objectFit: 'contain' }} />
        ) : (
          <Smartphone size={24} color={c.border} strokeWidth={1.5} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: f.serif, fontSize: 18, color: c.text1 }}>{phone.model_name}</div>
        <div style={{ fontSize: 12, color: c.text3, marginTop: 2 }}>
          {phone.brand}
          {variant
            ? ` · ${variant.ram_gb ? `${variant.ram_gb}GB + ` : ''}${formatStorage(variant.storage_gb)} · ${formatPrice(variant.price)}`
            : ` · Tracked price ${formatDisplayPrice(phone)}`}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {variant && onChangeVariant && (
          <button
            onClick={onChangeVariant}
            style={ghostButtonStyle}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = c.bg }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            Change storage
          </button>
        )}
        <button
          onClick={onChangePhone}
          style={ghostButtonStyle}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = c.bg }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          Change phone
        </button>
      </div>
    </div>
  )
}

// ─── phone picker ───────────────────────────────────────────────────────────

export function PhonePicker({ onSelect }: { onSelect: (p: Phone) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Phone[]>([])
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    clearTimeout(timer.current)
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    timer.current = setTimeout(async () => {
      try {
        const res = await api.phones.search({ q: query, page_size: 8 })
        setResults(res.results)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 280)
    return () => clearTimeout(timer.current)
  }, [query])

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={15} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: c.text3, pointerEvents: 'none' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search your phone..."
          autoFocus
          style={{ width: '100%', height: 48, padding: '0 18px 0 44px', border: `1px solid ${c.border}`, borderRadius: r.full, fontSize: 14, color: c.text1, background: c.surface, outline: 'none', transition: 'border-color 0.15s' }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-hover)' }}
          onBlur={e => { e.currentTarget.style.borderColor = c.border }}
        />
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: c.text3 }} />
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {results.map(p => (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.md, cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ width: 40, height: 40, background: c.bg, borderRadius: r.sm, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {p.main_image_url ? <img src={p.main_image_url} alt="" style={{ width: 30, height: 30, objectFit: 'contain' }} /> : <Smartphone size={16} color={c.border} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: c.text1 }}>{p.model_name}</div>
                <div style={{ fontSize: 11, color: c.text3 }}>{p.brand} · {formatDisplayPrice(p)}</div>
              </div>
              <ArrowRight size={14} color={c.text3} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── variant (storage/RAM) step ──────────────────────────────────────────────

function VariantStep({
  phone,
  variants,
  loading,
  onSelect,
  onBack,
}: {
  phone: Phone
  variants: PhoneVariant[]
  loading: boolean
  onSelect: (v: PhoneVariant) => void
  onBack: () => void
}) {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.lg, padding: `${space.xl}px`, marginBottom: space.xl }}>
        <FormSectionHeader icon={<HardDrive size={15} color={c.text2} />} title="Select your configuration" />

        <p style={{ fontSize: 13, color: c.text3, marginBottom: space.lg, lineHeight: 1.6 }}>
          The {phone.model_name} comes in more than one configuration, each tracked at a different price. Pick the one you own.
        </p>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: c.text3 }} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
            {variants.map(v => (
              <button
                key={v.id}
                onClick={() => onSelect(v)}
                style={{ textAlign: 'left', padding: '16px 18px', borderRadius: r.lg, cursor: 'pointer', border: `2px solid ${c.border}`, background: c.surface, display: 'flex', flexDirection: 'column', gap: 6, transition: 'all 0.12s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = c.primary }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = c.border }}
              >
                <span style={{ fontSize: 14, fontWeight: 700, color: c.text1 }}>
                  {formatStorage(v.storage_gb)}{v.ram_gb ? ` · ${v.ram_gb}GB RAM` : ''}
                </span>
                <span style={{ fontSize: 13, color: c.text3 }}>{formatPrice(v.price)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <BackButton onClick={onBack} />
      </div>
    </div>
  )
}

// ─── shared small pieces ─────────────────────────────────────────────────────

export function FormSectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: space.lg }}>
      <div style={{ width: 32, height: 32, borderRadius: r.md, background: c.bg, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <h3 style={{ fontFamily: f.serif, fontSize: 18, color: c.text1 }}>{title}</h3>
    </div>
  )
}

export function ReplacedPartToggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: c.text2, cursor: 'pointer', userSelect: 'none', marginTop: space.md }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="tradein-check" />
      <span>{label}</span>
    </label>
  )
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 22px', borderRadius: r.md, fontSize: 14, fontWeight: 500, color: c.text2, border: `1px solid ${c.border}`, background: 'transparent', cursor: 'pointer', transition: 'all 0.12s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = c.primary; e.currentTarget.style.color = c.text1 }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.color = c.text2 }}
    >
      <ArrowLeft size={14} /> Back
    </button>
  )
}

// ─── option group (card-based selection) ────────────────────────────────────

function OptionGroup<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: readonly { id: T; label: string; desc: string }[]
  selected: T | null
  onSelect: (id: T) => void
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
      {options.map(opt => {
        const active = selected === opt.id
        return (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            style={{ textAlign: 'left', padding: '16px 18px', borderRadius: r.lg, cursor: 'pointer', border: `2px solid ${active ? c.primary : c.border}`, background: active ? 'var(--surface-2)' : c.surface, display: 'flex', flexDirection: 'column', gap: 6, transition: 'all 0.12s', position: 'relative' }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = 'var(--border-hover)' }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = c.border }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: c.text1 }}>{opt.label}</span>
              {active && (
                <div style={{ width: 20, height: 20, borderRadius: r.full, background: c.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={11} color="#fff" strokeWidth={3} />
                </div>
              )}
            </div>
            {opt.desc && <span style={{ fontSize: 12, color: c.text3, lineHeight: 1.45 }}>{opt.desc}</span>}
          </button>
        )
      })}
    </div>
  )
}

// ─── battery health dial — percentage scale, labeled condition bands ────────

export function BatteryHealthDial({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const band = batteryBand(value)
  const progress = ((value - BATTERY_MIN) / (BATTERY_MAX - BATTERY_MIN)) * 100

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: c.text2 }}>Battery health</span>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: c.text1, fontVariantNumeric: 'tabular-nums' }}>{value}%</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: band.color, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            {band.label}
          </span>
        </span>
      </div>

      <input
        type="range"
        min={BATTERY_MIN}
        max={BATTERY_MAX}
        step={1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="tradein-range"
        aria-label="Battery health percentage"
        style={{ width: '100%', marginBottom: 10, ['--tradein-progress' as string]: `${progress}%` } as React.CSSProperties}
      />

      <div style={{ position: 'relative', height: 18 }}>
        {BATTERY_BREAKPOINTS.map(bp => {
          const left = ((bp - BATTERY_MIN) / (BATTERY_MAX - BATTERY_MIN)) * 100
          const transform = bp === BATTERY_MIN ? 'translateX(0)' : bp === BATTERY_MAX ? 'translateX(-100%)' : 'translateX(-50%)'
          return (
            <span key={bp} style={{ position: 'absolute', left: `${left}%`, top: 0, transform, fontSize: 10.5, color: c.text3, whiteSpace: 'nowrap' }}>
              {bp}%
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ─── condition form ─────────────────────────────────────────────────────────

export function ConditionForm({
  onSubmit,
  submitting,
  onBack,
}: {
  onSubmit: (payload: ConditionPayload) => void
  submitting: boolean
  onBack: () => void
}) {
  const [screen, setScreen] = useState<TradeInRequest['screen_condition'] | null>(null)
  const [screenNonOriginal, setScreenNonOriginal] = useState(false)
  const [body, setBody] = useState<TradeInRequest['body_condition'] | null>(null)
  const [batteryPct, setBatteryPct] = useState(BATTERY_DEFAULT)
  const [batteryNonOriginal, setBatteryNonOriginal] = useState(false)
  const [broken, setBroken] = useState<Set<string>>(new Set())

  const toggleBroken = (id: string) => {
    setBroken(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const canSubmit = screen !== null && body !== null

  const cardStyle: React.CSSProperties = {
    background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.lg,
    padding: `${space.xl}px`, marginBottom: space.lg,
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Screen */}
      <div style={cardStyle}>
        <FormSectionHeader icon={<Monitor size={15} color={c.text2} />} title="Screen condition" />
        <OptionGroup options={SCREEN_OPTIONS} selected={screen} onSelect={setScreen} />
        <ReplacedPartToggle
          checked={screenNonOriginal}
          onChange={setScreenNonOriginal}
          label="Screen has been replaced with a non-original part"
        />
      </div>

      {/* Body */}
      <div style={cardStyle}>
        <FormSectionHeader icon={<Frame size={15} color={c.text2} />} title="Body and frame" />
        <OptionGroup options={BODY_OPTIONS} selected={body} onSelect={setBody} />
      </div>

      {/* Battery */}
      <div style={cardStyle}>
        <FormSectionHeader icon={<Battery size={15} color={c.text2} />} title="Battery" />
        <div style={{ background: c.bg, borderRadius: r.md, padding: `${space.lg}px ${space.xl}px` }}>
          <BatteryHealthDial value={batteryPct} onChange={setBatteryPct} />
          <ReplacedPartToggle
            checked={batteryNonOriginal}
            onChange={setBatteryNonOriginal}
            label="Battery has been replaced with a non-original part"
          />
        </div>
      </div>

      {/* Functional issues */}
      <div style={{ ...cardStyle, marginBottom: space['2xl'] }}>
        <FormSectionHeader icon={<Activity size={15} color={c.text2} />} title="Functional issues" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {FUNCTIONAL_ITEMS.map(item => (
            <label
              key={item.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                background: broken.has(item.id) ? 'var(--surface-2)' : c.surface,
                border: `1.5px solid ${broken.has(item.id) ? c.primary : c.border}`,
                borderRadius: r.md, fontSize: 13, color: broken.has(item.id) ? c.text1 : c.text2,
                cursor: 'pointer', userSelect: 'none', transition: 'all 0.12s',
                fontWeight: broken.has(item.id) ? 500 : 400,
              }}
            >
              <input type="checkbox" checked={broken.has(item.id)} onChange={() => toggleBroken(item.id)} className="tradein-check" />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Submit + Back */}
      <div className="conditionform-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <BackButton onClick={onBack} />

        <button
          disabled={!canSubmit || submitting}
          onClick={() =>
            onSubmit({
              screen_condition: screen!,
              body_condition: body!,
              battery_health: batteryPctToHealthScore(batteryPct),
              battery_non_original: batteryNonOriginal,
              screen_non_original: screenNonOriginal,
              broken_components: Array.from(broken),
            })
          }
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: r.full,
            border: 'none', fontSize: 14, fontWeight: 700, color: '#fff',
            background: canSubmit ? c.primary : c.border, cursor: canSubmit ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s', boxShadow: canSubmit ? '0 6px 20px rgba(21,21,31,.12)' : 'none',
          }}
          onMouseEnter={e => { if (canSubmit) { e.currentTarget.style.background = 'var(--primary-hover)'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
          onMouseLeave={e => { if (canSubmit) { e.currentTarget.style.background = c.primary; e.currentTarget.style.transform = 'none' } }}
        >
          {submitting ? 'Calculating...' : 'Get my estimate'}
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}

// ─── page orchestrator ────────────────────────────────────────────────────────

function TradeInContent() {
  const { toast } = useToast()

  const [phone, setPhone] = useState<Phone | null>(null)
  const [variants, setVariants] = useState<PhoneVariant[]>([])
  const [variantsLoading, setVariantsLoading] = useState(false)
  const [variant, setVariant] = useState<PhoneVariant | null>(null)
  const [result, setResult] = useState<TradeInResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const hasStarted = phone !== null

  useEffect(() => {
    if (!phone) {
      setVariants([])
      setVariant(null)
      return
    }
    let cancelled = false
    setVariantsLoading(true)
    api.phones.variants(phone.id)
      .then(res => {
        if (cancelled) return
        setVariants(res.variants)
        if (res.variants.length <= 1) setVariant(res.variants[0] ?? null)
      })
      .catch(() => { if (!cancelled) setVariants([]) })
      .finally(() => { if (!cancelled) setVariantsLoading(false) })
    return () => { cancelled = true }
  }, [phone])

  // Storage/RAM step shows only while a phone with multiple configurations
  // hasn't had one picked yet.
  const showVariantStep = hasStarted && variant === null && (variantsLoading || variants.length > 1)

  const handleSubmit = async (payload: ConditionPayload) => {
    if (!phone) return
    setSubmitting(true)
    try {
      // screen_non_original isn't a TradeInRequest field yet — see the
      // note at the bottom of this file for the backend/type addition
      // needed before it affects the estimate.
      const res = await api.tradein.estimate({
        phone_id: phone.id,
        variant_id: variant?.id,
        ...payload,
      } as TradeInRequest)

      setResult(res)
      analytics.tradeinComplete({
        phone_id: phone.id,
        estimated_low: res.estimated_range.low,
        estimated_high: res.estimated_range.high,
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      toast('Could not calculate a trade-in estimate', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const changePhone = () => {
    setPhone(null)
    setVariants([])
    setVariant(null)
    setResult(null)
  }
  const changeVariant = () => setVariant(null)
  const backFromVariant = () => {
    setPhone(null)
    setVariants([])
    setVariant(null)
  }
  const backFromForm = () => {
    if (variants.length > 1) setVariant(null)
    else setPhone(null)
  }
  const backFromResults = () => setResult(null)

  return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <CustomStyles />
      <Navbar />
      <Hero hasStarted={hasStarted} />

      <main style={{ maxWidth: result ? 1100 : 900, margin: '0 auto', padding: hasStarted ? '48px 24px 80px' : '0 24px 80px' }}>
        {!hasStarted && <StepsGuide hasStarted={hasStarted} />}

        {!hasStarted && (
          <div style={{ maxWidth: 520, margin: '0 auto', padding: `${space['2xl']}px 0 ${space['4xl']}px` }}>
            <PhonePicker
              onSelect={p => {
                analytics.tradeinStart({ id: p.id, brand: p.brand, model_name: p.model_name })
                setPhone(p)
              }}
            />
          </div>
        )}

        {phone && (
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <SelectedPhoneChip
              phone={phone}
              variant={variant}
              onChangePhone={changePhone}
              onChangeVariant={variants.length > 1 ? changeVariant : undefined}
            />
          </div>
        )}

        {showVariantStep && phone && (
          <VariantStep phone={phone} variants={variants} loading={variantsLoading} onSelect={setVariant} onBack={backFromVariant} />
        )}

        {phone && !showVariantStep && !result && (
          <ConditionForm onSubmit={handleSubmit} submitting={submitting} onBack={backFromForm} />
        )}

        {phone && result && (
          <>
            <ResultsView phone={phone} result={result} onBack={backFromResults} />
            <BudgetRecommendations phone={phone} result={result} />
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default function TradeInFlow() {
  return (
    <Suspense fallback={null}>
      <TradeInContent />
    </Suspense>
  )
}
