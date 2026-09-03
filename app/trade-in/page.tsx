'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import Link from 'next/link'
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
  Scale,
} from 'lucide-react'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import { useToast } from '@/app/components/Toast'
import { api } from '@/lib/api'
import { ROUTES, phoneSlug } from '@/lib/config'
import { c, f, r, space } from '@/lib/tokens'
import { formatDisplayPrice } from '@/lib/price'
import type { Phone, TradeInResponse, TradeInRequest } from '@/lib/types'

const SCREEN_OPTIONS = [
  { id: 'perfect', label: 'Perfect', desc: 'No visible marks' },
  { id: 'minor_scratches', label: 'Minor scratches', desc: 'Not visible when screen is on' },
  { id: 'deep_scratches', label: 'Deep scratches', desc: 'Visible wear' },
  { id: 'cracked_touch_ok', label: 'Cracked, touch works', desc: 'Fully responsive' },
  { id: 'cracked_unresponsive', label: 'Cracked, unresponsive', desc: 'Touch fails or bleeding pixels' },
] as const

const BODY_OPTIONS = [
  { id: 'flawless', label: 'Flawless', desc: 'Like new' },
  { id: 'light_wear', label: 'Light wear', desc: 'Micro-scratches on back or frame' },
  { id: 'moderate_wear', label: 'Moderate wear', desc: 'Visible scuffs, small dents' },
  { id: 'heavy_wear', label: 'Heavy wear', desc: 'Deep dents, chipped paint, bent frame' },
  { id: 'cracked_back', label: 'Cracked glass back', desc: '' },
] as const

const FUNCTIONAL_ITEMS = [
  { id: 'camera', label: 'Camera issues' },
  { id: 'biometric', label: 'Face ID / fingerprint broken' },
  { id: 'audio', label: 'Speaker / microphone issues' },
  { id: 'charging_port', label: 'Charging port faulty' },
  { id: 'buttons', label: 'Physical buttons unresponsive' },
] as const

const CONDITION_LABEL: Record<TradeInResponse['condition_tier'], string> = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
}

const STEPS = [
  {
    icon: SearchIcon,
    title: 'Find your phone',
    desc: 'Search by model name. We track live prices across retailers so your estimate reflects the real market.',
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

// ─── injected styles for custom controls ────────────────────────────────────
function CustomStyles() {
  return (
    <style>{`
      /* Range slider — filled portion driven by --tradein-progress, set inline
         per-render. Track color must differ from the card background or the
         line disappears; base track uses c.border, fill uses c.primary. */
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

      /* Custom checkbox — small rounded square */
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

      /* Step connector line — desktop only */
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

// ─── solid dark hero (no gradients) ─────────────────────────────────────────
function Hero({ hasStarted }: { hasStarted: boolean }) {
  if (hasStarted) return null
  return (
    <section className="tradein-hero" style={{ background: c.primary }}>
      <div
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: `${space['5xl']}px 24px ${space['4xl']}px`,
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontFamily: f.serif,
            fontSize: 'clamp(34px, 5vw, 52px)',
            color: '#fff',
            letterSpacing: '-0.5px',
            marginBottom: space.md,
            lineHeight: 1.1,
          }}
        >
          What's your phone worth?
        </h1>
        <p
          style={{
            fontSize: 16,
            color: 'rgba(255,255,255,0.55)',
            maxWidth: 480,
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          Search your model, describe its condition, and get an instant estimated trade-in range based on live market data.
        </p>
      </div>
    </section>
  )
}

// ─── 3-step guide ───────────────────────────────────────────────────────────
function StepsGuide({ hasStarted }: { hasStarted: boolean }) {
  if (hasStarted) return null
  return (
    <section
      className="step-connector"
      style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: `${space['4xl']}px 24px 0`,
      }}
    >
      <div
        className="steps-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: space.xl,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <div
              key={step.title}
              style={{ textAlign: 'center', padding: `${space.lg}px ${space.md}px` }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: r.lg,
                  background: c.surface,
                  border: `1px solid ${c.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  marginBottom: space.lg,
                  position: 'relative',
                }}
              >
                <Icon size={20} color={c.text2} strokeWidth={1.5} />
                <span
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    width: 22,
                    height: 22,
                    borderRadius: r.full,
                    background: c.primary,
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `2.5px solid ${c.bg}`,
                  }}
                >
                  {i + 1}
                </span>
              </div>
              <h3
                style={{
                  fontFamily: f.serif,
                  fontSize: 18,
                  color: c.text1,
                  marginBottom: space.sm,
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: c.text3,
                  lineHeight: 1.6,
                  maxWidth: 260,
                  margin: '0 auto',
                }}
              >
                {step.desc}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── selected phone chip ────────────────────────────────────────────────────
function SelectedPhoneChip({ phone, onChange }: { phone: Phone; onChange: () => void }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <div
      className="selected-phone-chip"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 18px',
        background: c.surface,
        border: `1px solid ${c.border}`,
        borderRadius: r.lg,
        marginBottom: 28,
        transition: 'all 0.15s',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          background: c.bg,
          borderRadius: r.md,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {phone.main_image_url && !imgErr ? (
          <img
            src={phone.main_image_url}
            alt=""
            onError={() => setImgErr(true)}
            style={{ width: 44, height: 44, objectFit: 'contain' }}
          />
        ) : (
          <Smartphone size={24} color={c.border} strokeWidth={1.5} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: f.serif, fontSize: 18, color: c.text1 }}>
          {phone.model_name}
        </div>
        <div style={{ fontSize: 12, color: c.text3, marginTop: 2 }}>
          {phone.brand} · Tracked price {formatDisplayPrice(phone)}
        </div>
      </div>
      <button
        onClick={onChange}
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: c.text2,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '6px 10px',
          borderRadius: r.sm,
          flexShrink: 0,
          transition: 'all 0.12s',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLElement).style.background = c.bg
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLElement).style.background = 'transparent'
        }}
      >
        Change phone
      </button>
    </div>
  )
}

// ─── phone picker ───────────────────────────────────────────────────────────
function PhonePicker({ onSelect }: { onSelect: (p: Phone) => void }) {
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
        <Search
          size={15}
          style={{
            position: 'absolute',
            left: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            color: c.text3,
            pointerEvents: 'none',
          }}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your phone..."
          autoFocus
          style={{
            width: '100%',
            height: 48,
            padding: '0 18px 0 44px',
            border: `1px solid ${c.border}`,
            borderRadius: r.full,
            fontSize: 14,
            color: c.text1,
            background: c.surface,
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-hover)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = c.border
          }}
        />
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <Loader2
            size={20}
            style={{ animation: 'spin 1s linear infinite', color: c.text3 }}
          />
        </div>
      )}

      {!loading && results.length > 0 && (
        <div
          className="animate-fade-up"
          style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
        >
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                background: c.surface,
                border: `1px solid ${c.border}`,
                borderRadius: r.md,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.12s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-hover)'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = c.border
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  background: c.bg,
                  borderRadius: r.sm,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {p.main_image_url ? (
                  <img
                    src={p.main_image_url}
                    alt=""
                    style={{ width: 30, height: 30, objectFit: 'contain' }}
                  />
                ) : (
                  <Smartphone size={16} color={c.border} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: c.text1 }}>
                  {p.model_name}
                </div>
                <div style={{ fontSize: 11, color: c.text3 }}>
                  {p.brand} · {formatDisplayPrice(p)}
                </div>
              </div>
              <ArrowRight size={14} color={c.text3} />
            </button>
          ))}
        </div>
      )}
    </div>
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
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: 10,
      }}
    >
      {options.map((opt) => {
        const active = selected === opt.id
        return (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            style={{
              textAlign: 'left',
              padding: '16px 18px',
              borderRadius: r.lg,
              cursor: 'pointer',
              border: `2px solid ${active ? c.primary : c.border}`,
              background: active ? 'var(--surface-2)' : c.surface,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              transition: 'all 0.12s',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.borderColor = 'var(--border-hover)'
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.borderColor = c.border
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{ fontSize: 13.5, fontWeight: 600, color: c.text1 }}
              >
                {opt.label}
              </span>
              {active && (
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: r.full,
                    background: c.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Check size={11} color="#fff" strokeWidth={3} />
                </div>
              )}
            </div>
            {opt.desc && (
              <span style={{ fontSize: 12, color: c.text3, lineHeight: 1.45 }}>
                {opt.desc}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── condition form ─────────────────────────────────────────────────────────
function ConditionForm({
  onSubmit,
  submitting,
  onBack,
}: {
  onSubmit: (payload: Omit<TradeInRequest, 'phone_id'>) => void
  submitting: boolean
  onBack: () => void
}) {
  const [screen, setScreen] = useState<TradeInRequest['screen_condition'] | null>(null)
  const [body, setBody] = useState<TradeInRequest['body_condition'] | null>(null)
  const [batteryHealth, setBatteryHealth] = useState(8)
  const [nonOriginal, setNonOriginal] = useState(false)
  const [broken, setBroken] = useState<Set<string>>(new Set())

  const toggleBroken = (id: string) => {
    setBroken((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const canSubmit = screen !== null && body !== null
  const batteryProgress = ((batteryHealth - 1) / 9) * 100

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Screen */}
      <div
        style={{
          background: c.surface,
          border: `1px solid ${c.border}`,
          borderRadius: r.lg,
          padding: `${space.xl}px`,
          marginBottom: space.lg,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: space.lg,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: r.md,
              background: c.bg,
              border: `1px solid ${c.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Monitor size={15} color={c.text2} />
          </div>
          <h3 style={{ fontFamily: f.serif, fontSize: 18, color: c.text1 }}>
            Screen condition
          </h3>
        </div>
        <OptionGroup options={SCREEN_OPTIONS} selected={screen} onSelect={setScreen} />
      </div>

      {/* Body */}
      <div
        style={{
          background: c.surface,
          border: `1px solid ${c.border}`,
          borderRadius: r.lg,
          padding: `${space.xl}px`,
          marginBottom: space.lg,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: space.lg,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: r.md,
              background: c.bg,
              border: `1px solid ${c.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Frame size={15} color={c.text2} />
          </div>
          <h3 style={{ fontFamily: f.serif, fontSize: 18, color: c.text1 }}>
            Body and frame
          </h3>
        </div>
        <OptionGroup options={BODY_OPTIONS} selected={body} onSelect={setBody} />
      </div>

      {/* Battery */}
      <div
        style={{
          background: c.surface,
          border: `1px solid ${c.border}`,
          borderRadius: r.lg,
          padding: `${space.xl}px`,
          marginBottom: space.lg,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: space.lg,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: r.md,
              background: c.bg,
              border: `1px solid ${c.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Battery size={15} color={c.text2} />
          </div>
          <h3 style={{ fontFamily: f.serif, fontSize: 18, color: c.text1 }}>
            Battery
          </h3>
        </div>

        <div
          style={{
            background: c.bg,
            borderRadius: r.md,
            padding: `${space.lg}px ${space.xl}px`,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 14,
              fontSize: 13,
              color: c.text2,
            }}
          >
            <span style={{ fontWeight: 500 }}>Battery health</span>
            <span style={{ fontWeight: 700, color: c.text1 }}>
              {batteryHealth}/10
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={batteryHealth}
            onChange={(e) => setBatteryHealth(Number(e.target.value))}
            className="tradein-range"
            style={{
              width: '100%',
              marginBottom: 16,
              ['--tradein-progress' as string]: `${batteryProgress}%`,
            } as React.CSSProperties}
          />
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 13,
              color: c.text2,
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={nonOriginal}
              onChange={(e) => setNonOriginal(e.target.checked)}
              className="tradein-check"
            />
            <span>Battery has been replaced with a non-original part</span>
          </label>
        </div>
      </div>

      {/* Functional */}
      <div
        style={{
          background: c.surface,
          border: `1px solid ${c.border}`,
          borderRadius: r.lg,
          padding: `${space.xl}px`,
          marginBottom: space['2xl'],
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: space.lg,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: r.md,
              background: c.bg,
              border: `1px solid ${c.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Activity size={15} color={c.text2} />
          </div>
          <h3 style={{ fontFamily: f.serif, fontSize: 18, color: c.text1 }}>
            Functional issues
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {FUNCTIONAL_ITEMS.map((item) => (
            <label
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: broken.has(item.id) ? 'var(--surface-2)' : c.surface,
                border: `1.5px solid ${broken.has(item.id) ? c.primary : c.border}`,
                borderRadius: r.md,
                fontSize: 13,
                color: broken.has(item.id) ? c.text1 : c.text2,
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'all 0.12s',
                fontWeight: broken.has(item.id) ? 500 : 400,
              }}
            >
              <input
                type="checkbox"
                checked={broken.has(item.id)}
                onChange={() => toggleBroken(item.id)}
                className="tradein-check"
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Submit + Back row */}
      <div
        className="conditionform-actions"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 20px',
            borderRadius: r.md,
            fontSize: 14,
            fontWeight: 500,
            color: c.text2,
            border: `1px solid ${c.border}`,
            background: 'transparent',
            cursor: 'pointer',
            transition: 'all 0.12s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = c.primary
            e.currentTarget.style.color = c.text1
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = c.border
            e.currentTarget.style.color = c.text2
          }}
        >
          <ArrowLeft size={14} /> Back
        </button>

        <button
          disabled={!canSubmit || submitting}
          onClick={() =>
            onSubmit({
              screen_condition: screen!,
              body_condition: body!,
              battery_health: batteryHealth,
              battery_non_original: nonOriginal,
              broken_components: Array.from(broken),
            })
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 28px',
            borderRadius: r.full,
            border: 'none',
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            background: canSubmit ? c.primary : c.border,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
            boxShadow: canSubmit ? '0 6px 20px rgba(21,21,31,.12)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (canSubmit) {
              e.currentTarget.style.background = 'var(--primary-hover)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }
          }}
          onMouseLeave={(e) => {
            if (canSubmit) {
              e.currentTarget.style.background = c.primary
              e.currentTarget.style.transform = 'none'
            }
          }}
        >
          {submitting ? 'Calculating...' : 'Get my estimate'}
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}

// ─── score bar ──────────────────────────────────────────────────────────────
function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          color: c.text2,
          marginBottom: 6,
        }}
      >
        <span>{label}</span>
        <span style={{ fontWeight: 700, color: c.text1 }}>
          {value}/{max}
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: c.bg,
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: c.primary,
            borderRadius: 3,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
    </div>
  )
}

// ─── recommendation card — sized by its grid cell, not a fixed width ────────
function RecCard({ phone }: { phone: Phone }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <div style={{ textAlign: 'center', padding: '18px 14px 14px' }}>
      <div
        style={{
          height: 130,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
        }}
      >
        {phone.main_image_url && !imgErr ? (
          <img
            src={phone.main_image_url}
            alt=""
            onError={() => setImgErr(true)}
            style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
          />
        ) : (
          <Smartphone size={36} color={c.border} strokeWidth={1} />
        )}
      </div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          color: c.text3,
          marginBottom: 5,
        }}
      >
        {phone.brand}
      </div>
      <div
        style={{
          fontFamily: f.serif,
          fontSize: 15,
          color: c.text1,
          marginBottom: 6,
          lineHeight: 1.25,
          padding: '0 4px',
        }}
      >
        {phone.model_name}
      </div>
      <div style={{ fontSize: 17, fontWeight: 800, color: c.text1, marginBottom: 4 }}>
        {formatDisplayPrice(phone)}
      </div>
    </div>
  )
}

function RecommendationCard({ original, phone }: { original: Phone; phone: Phone }) {
  return (
    <div
      style={{
        background: c.surface,
        border: `1px solid ${c.border}`,
        borderRadius: r.lg,
        overflow: 'hidden',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-hover)'
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = 'var(--shadow-md)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = c.border
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <RecCard phone={phone} />
      <div style={{ padding: '0 12px 12px' }}>
        <Link
          href={ROUTES.compare(phoneSlug(original), phoneSlug(phone))}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '9px 0',
            fontSize: 12,
            fontWeight: 600,
            color: c.text2,
            border: `1px solid ${c.border}`,
            borderRadius: r.full,
            textDecoration: 'none',
            transition: 'all 0.12s',
            width: '100%',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = c.primary
            e.currentTarget.style.color = c.text1
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = c.border
            e.currentTarget.style.color = c.text2
          }}
        >
          <Scale size={12} strokeWidth={1.5} /> compare vs {original.model_name.split(' ').slice(-1)[0]}
        </Link>
      </div>
    </div>
  )
}

// ─── budget recommendations — wraps into a grid so nothing gets clipped ────
function BudgetRecommendations({ phone, result }: { phone: Phone; result: TradeInResponse }) {
  const [extraBudgetInput, setExtraBudgetInput] = useState('')
  const [extraBudget, setExtraBudget] = useState(0)
  const [recs, setRecs] = useState<Phone[]>([])
  const [loading, setLoading] = useState(true)

  const baseLow = result.estimated_range.low
  const baseHigh = result.estimated_range.high
  const minPrice = Math.round(baseLow * 0.95)
  const maxPrice = Math.round((baseHigh + extraBudget) * 1.05)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    api.phones
      .search(
        {
          min_price: minPrice,
          max_price: maxPrice,
          sort_by: 'antutu_score',
          sort_order: 'desc',
          page_size: 6,
        },
        controller.signal,
      )
      .then((res) => {
        if (!controller.signal.aborted) setRecs(res.results)
      })
      .catch(() => {
        if (!controller.signal.aborted) setRecs([])
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minPrice, maxPrice])

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault()
    const n = Number(extraBudgetInput)
    setExtraBudget(Number.isFinite(n) && n > 0 ? n : 0)
  }

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 14,
  }

  return (
    <section
      style={{
        marginTop: space['4xl'],
        maxWidth: 1080,
        marginLeft: 'auto',
        marginRight: 'auto',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: space.xl }}>
        <h2
          style={{
            fontFamily: f.serif,
            fontSize: 24,
            color: c.text1,
            marginBottom: space.sm,
          }}
        >
          Phones you could get instead
        </h2>
        <p style={{ fontSize: 13, color: c.text3 }}>
          ${minPrice.toLocaleString()}–${maxPrice.toLocaleString()} range, based on your estimate
          {extraBudget > 0
            ? ` plus $${extraBudget.toLocaleString()} you're adding`
            : ''}
          .
        </p>
      </div>

      <form
        onSubmit={handleApply}
        className="budget-add-form"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 10,
          marginBottom: space.xl,
        }}
      >
        <span style={{ fontSize: 13, color: c.text2 }}>
          Willing to add on top:
        </span>
        <div style={{ position: 'relative' }}>
          <span
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: c.text3,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            $
          </span>
          <input
            type="number"
            min={0}
            value={extraBudgetInput}
            onChange={(e) => setExtraBudgetInput(e.target.value)}
            placeholder="0"
            style={{
              width: 120,
              height: 40,
              padding: '0 12px 0 22px',
              border: `1px solid ${c.border}`,
              borderRadius: r.md,
              fontSize: 13,
              color: c.text1,
              background: c.surface,
              outline: 'none',
            }}
          />
        </div>
        <button
          type="submit"
          style={{
            padding: '0 18px',
            height: 40,
            background: c.primary,
            color: '#fff',
            borderRadius: r.md,
            fontSize: 13,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.12s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--primary-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = c.primary
          }}
        >
          Apply
        </button>
      </form>

      {loading ? (
        <div style={gridStyle}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{
                height: 280,
                borderRadius: r.lg,
                background: c.surface,
                border: `1px solid ${c.border}`,
              }}
            />
          ))}
        </div>
      ) : recs.length === 0 ? (
        <p
          style={{
            textAlign: 'center',
            fontSize: 13,
            color: c.text3,
            padding: `${space.xl}px`,
            background: c.surface,
            border: `1px solid ${c.border}`,
            borderRadius: r.lg,
          }}
        >
          No phones found in this range.
        </p>
      ) : (
        <div style={gridStyle}>
          {recs.map((p) => (
            <RecommendationCard key={p.id} original={phone} phone={p} />
          ))}
        </div>
      )}
    </section>
  )
}

// ─── results view ───────────────────────────────────────────────────────────
function ResultsView({
  phone,
  result,
  onBack,
}: {
  phone: Phone
  result: TradeInResponse
  onBack: () => void
}) {
  const b = result.score_breakdown
  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Value header */}
      <div style={{ textAlign: 'center', marginBottom: space['2xl'] }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: c.text3,
            marginBottom: space.md,
          }}
        >
          Estimated trade-in value
        </div>
        <div
          style={{
            fontFamily: f.serif,
            fontSize: 'clamp(40px, 6vw, 56px)',
            color: c.text1,
            letterSpacing: '-1.5px',
            lineHeight: 1,
            marginBottom: space.md,
          }}
        >
          ${result.estimated_range.low.toLocaleString()} –{' '}
          ${result.estimated_range.high.toLocaleString()}
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            background: c.bg,
            border: `1px solid ${c.border}`,
            borderRadius: r.full,
            fontSize: 12,
            fontWeight: 700,
            color: c.text2,
            textTransform: 'capitalize',
          }}
        >
          {CONDITION_LABEL[result.condition_tier]} condition
        </div>
      </div>

      {/* Score breakdown card */}
      <div
        style={{
          background: c.surface,
          border: `1px solid ${c.border}`,
          borderRadius: r.lg,
          padding: `${space.xl}px ${space['2xl']}px`,
          marginBottom: space.xl,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: c.text3,
            marginBottom: space.lg,
          }}
        >
          Score breakdown ({b.normalized}/100)
        </div>
        <ScoreBar label="Screen" value={b.screen} max={30} />
        <ScoreBar label="Body and frame" value={b.body} max={20} />
        <ScoreBar label="Battery" value={b.battery} max={25} />
        <ScoreBar label="Functional checklist" value={b.functional} max={25} />
        {b.brand_bonus > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: space.md,
              padding: `${space.sm}px ${space.md}px`,
              background: 'var(--green-light)',
              border: '1px solid var(--green-border)',
              borderRadius: r.md,
              fontSize: 12,
              fontWeight: 600,
              color: c.green,
              width: 'fit-content',
            }}
          >
            +{b.brand_bonus} points brand residual-value bonus
          </div>
        )}
      </div>

      {/* Back button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: space.xl }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 22px',
            borderRadius: r.md,
            fontSize: 14,
            fontWeight: 500,
            color: c.text2,
            border: `1px solid ${c.border}`,
            background: 'transparent',
            cursor: 'pointer',
            transition: 'all 0.12s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = c.primary
            e.currentTarget.style.color = c.text1
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = c.border
            e.currentTarget.style.color = c.text2
          }}
        >
          <ArrowLeft size={14} /> Edit condition
        </button>
      </div>
    </div>
  )
}

// ─── main content ───────────────────────────────────────────────────────────
function TradeInContent() {
  const { toast } = useToast()
  const [phone, setPhone] = useState<Phone | null>(null)
  const [result, setResult] = useState<TradeInResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const hasStarted = phone !== null

  const handleSubmit = async (
    payload: Omit<TradeInRequest, 'phone_id'>,
  ) => {
    if (!phone) return
    setSubmitting(true)
    try {
      const res = await api.tradein.estimate({
        phone_id: phone.id,
        ...payload,
      })
      setResult(res)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      toast('Could not calculate a trade-in estimate', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const changePhone = () => {
    setPhone(null)
    setResult(null)
  }
  const backFromForm = () => setPhone(null)
  const backFromResults = () => setResult(null)

  return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <CustomStyles />

      <Navbar />

      <Hero hasStarted={hasStarted} />

      <main
        style={{
          maxWidth: result ? 1100 : 900,
          margin: '0 auto',
          padding: hasStarted ? '48px 24px 80px' : '0 24px 80px',
        }}
      >
        {!hasStarted && <StepsGuide hasStarted={hasStarted} />}

        {/* Search */}
        {!hasStarted && (
          <div
            style={{
              maxWidth: 520,
              margin: '0 auto',
              padding: `${space['2xl']}px 0 ${space['4xl']}px`,
            }}
          >
            <PhonePicker onSelect={setPhone} />
          </div>
        )}

        {/* Selected chip */}
        {phone && (
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <SelectedPhoneChip phone={phone} onChange={changePhone} />
          </div>
        )}

        {/* Condition form */}
        {phone && !result && (
          <ConditionForm
            onSubmit={handleSubmit}
            submitting={submitting}
            onBack={backFromForm}
          />
        )}

        {/* Results */}
        {phone && result && (
          <>
            <ResultsView
              phone={phone}
              result={result}
              onBack={backFromResults}
            />
            <BudgetRecommendations phone={phone} result={result} />
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default function TradeInPage() {
  return (
    <Suspense fallback={null}>
      <TradeInContent />
    </Suspense>
  )
}
