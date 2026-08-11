'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { Smartphone, Search, ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import { useToast } from '@/app/components/Toast'
import { api } from '@/lib/api'
import { ROUTES, brandSlug, phoneSlug } from '@/lib/config'
import { c, f, r } from '@/lib/tokens'
import { formatDisplayPrice } from '@/lib/price'
import { valueScoreColor } from '@/lib/valueScore'
import { SimilarCard } from '@/app/components/phone-detail/PhoneOverview'
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

function PhonePicker({ onSelect }: { onSelect: (p: Phone) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Phone[]>([])
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    clearTimeout(timer.current)
    if (query.trim().length < 2) { setResults([]); return }
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
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: c.text3 }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search your phone..."
          autoFocus
          style={{ width: '100%', height: 46, padding: '0 16px 0 40px', border: `1px solid ${c.border}`, borderRadius: r.full, fontSize: 14, color: c.text1, background: c.surface }}
        />
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: c.text3 }} />
        </div>
      )}

      {!loading && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {results.map(p => (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.md, cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ width: 36, height: 36, background: c.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {p.main_image_url
                  ? <img src={p.main_image_url} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                  : <Smartphone size={16} color={c.border} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: c.text1 }}>{p.model_name}</div>
                <div style={{ fontSize: 11, color: c.text3 }}>{p.brand} · {formatDisplayPrice(p)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function OptionGroup<T extends string>({
  options, selected, onSelect,
}: {
  options: readonly { id: T; label: string; desc: string }[]
  selected: T | null
  onSelect: (id: T) => void
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
      {options.map(opt => {
        const active = selected === opt.id
        return (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            style={{
              textAlign: 'left', padding: '14px 16px', borderRadius: r.md, cursor: 'pointer',
              border: `2px solid ${active ? c.primary : c.border}`,
              background: active ? 'rgba(26,26,46,0.04)' : c.surface,
              display: 'flex', flexDirection: 'column', gap: 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: c.text1 }}>{opt.label}</span>
              {active && <Check size={14} color={c.primary} strokeWidth={3} />}
            </div>
            {opt.desc && <span style={{ fontSize: 11, color: c.text3 }}>{opt.desc}</span>}
          </button>
        )
      })}
    </div>
  )
}

function ConditionForm({
  phone, onBack, onSubmit, submitting,
}: {
  phone: Phone
  onBack: () => void
  onSubmit: (payload: Omit<TradeInRequest, 'phone_id'>) => void
  submitting: boolean
}) {
  const [screen, setScreen] = useState<TradeInRequest['screen_condition'] | null>(null)
  const [body, setBody] = useState<TradeInRequest['body_condition'] | null>(null)
  const [batteryHealth, setBatteryHealth] = useState(8)
  const [nonOriginal, setNonOriginal] = useState(false)
  const [broken, setBroken] = useState<Set<string>>(new Set())

  const toggleBroken = (id: string) => {
    setBroken(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const canSubmit = screen !== null && body !== null

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32, padding: '14px 18px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.md }}>
        <div style={{ width: 44, height: 44, background: c.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {phone.main_image_url
            ? <img src={phone.main_image_url} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            : <Smartphone size={20} color={c.border} />}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: c.text1 }}>{phone.model_name}</div>
          <div style={{ fontSize: 12, color: c.text3 }}>{phone.brand} · Tracked price: {formatDisplayPrice(phone)}</div>
        </div>
      </div>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontFamily: f.serif, fontSize: 18, color: c.text1, marginBottom: 12 }}>Screen condition</h3>
        <OptionGroup options={SCREEN_OPTIONS} selected={screen} onSelect={setScreen} />
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontFamily: f.serif, fontSize: 18, color: c.text1, marginBottom: 12 }}>Body and frame</h3>
        <OptionGroup options={BODY_OPTIONS} selected={body} onSelect={setBody} />
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontFamily: f.serif, fontSize: 18, color: c.text1, marginBottom: 12 }}>Battery</h3>
        <div style={{ padding: '16px 18px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.md }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: c.text2 }}>
            <span>Battery health</span>
            <span style={{ fontWeight: 600, color: c.text1 }}>{batteryHealth}/10</span>
          </div>
          <input
            type="range" min={1} max={10} value={batteryHealth}
            onChange={e => setBatteryHealth(Number(e.target.value))}
            style={{ width: '100%', marginBottom: 14 }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: c.text2, cursor: 'pointer' }}>
            <input type="checkbox" checked={nonOriginal} onChange={e => setNonOriginal(e.target.checked)} />
            Battery has been replaced with a non-original part
          </label>
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontFamily: f.serif, fontSize: 18, color: c.text1, marginBottom: 12 }}>Functional issues</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {FUNCTIONAL_ITEMS.map(item => (
            <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.md, fontSize: 13, color: c.text2, cursor: 'pointer' }}>
              <input type="checkbox" checked={broken.has(item.id)} onChange={() => toggleBroken(item.id)} />
              {item.label}
            </label>
          ))}
        </div>
      </section>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 20px', border: `1px solid ${c.border}`, borderRadius: r.full, background: 'transparent', color: c.text2, fontSize: 14, cursor: 'pointer' }}>
          <ArrowLeft size={15} /> Change phone
        </button>
        <button
          disabled={!canSubmit || submitting}
          onClick={() => onSubmit({
            screen_condition: screen!,
            body_condition: body!,
            battery_health: batteryHealth,
            battery_non_original: nonOriginal,
            broken_components: Array.from(broken),
          })}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '11px 26px', borderRadius: r.full,
            border: 'none', fontSize: 14, fontWeight: 600, color: '#fff',
            background: canSubmit ? c.primary : c.border, cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          {submitting ? 'Calculating...' : 'Get my estimate'} <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: c.text2, marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 600, color: c.text1 }}>{value}/{max}</span>
      </div>
      <div style={{ height: 6, background: c.bg, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: c.accent, borderRadius: 3 }} />
      </div>
    </div>
  )
}

function BudgetRecommendations({ result }: { result: TradeInResponse }) {
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
    api.phones.search(
      {
        min_price: minPrice,
        max_price: maxPrice,
        sort_by: 'antutu_score',
        sort_order: 'desc',
        page_size: 6,
      },
      controller.signal,
    )
      .then(res => { if (!controller.signal.aborted) setRecs(res.results) })
      .catch(() => { if (!controller.signal.aborted) setRecs([]) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minPrice, maxPrice])

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault()
    const n = Number(extraBudgetInput)
    setExtraBudget(Number.isFinite(n) && n > 0 ? n : 0)
  }

  return (
    <section style={{ marginTop: 44, maxWidth: 900, marginLeft: 'auto', marginRight: 'auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <h2 style={{ fontFamily: f.serif, fontSize: 22, color: c.text1, marginBottom: 6 }}>
          Phones you could get instead
        </h2>
        <p style={{ fontSize: 13, color: c.text3 }}>
          ${minPrice.toLocaleString()}–${maxPrice.toLocaleString()} range, based on your estimate
          {extraBudget > 0 ? ` plus $${extraBudget.toLocaleString()} you're adding` : ''}.
        </p>
      </div>

      <form onSubmit={handleApply} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <span style={{ fontSize: 13, color: c.text2 }}>Willing to add on top:</span>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: c.text3, fontSize: 13 }}>$</span>
          <input
            type="number"
            min={0}
            value={extraBudgetInput}
            onChange={e => setExtraBudgetInput(e.target.value)}
            placeholder="0"
            style={{ width: 120, height: 38, padding: '0 12px 0 22px', border: `1px solid ${c.border}`, borderRadius: r.sm, fontSize: 13, color: c.text1 }}
          />
        </div>
        <button
          type="submit"
          style={{ padding: '0 18px', height: 38, background: c.primary, color: '#fff', borderRadius: r.sm, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}
        >
          Apply
        </button>
      </form>

      {loading ? (
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ width: 156, height: 200, borderRadius: r.md }} />
          ))}
        </div>
      ) : recs.length === 0 ? (
        <p style={{ textAlign: 'center', fontSize: 13, color: c.text3 }}>No phones found in this range.</p>
      ) : (
        <div
          className="scrollbar-none"
          style={{ display: 'flex', gap: 14, overflowX: 'auto', justifyContent: recs.length <= 4 ? 'center' : 'flex-start', paddingBottom: 4 }}
        >
          {recs.map(p => <SimilarCard key={p.id} phone={p} />)}
        </div>
      )}
    </section>
  )
}

function ResultsView({ phone, result, onRestart }: { phone: Phone; result: TradeInResponse; onRestart: () => void }) {
  const b = result.score_breakdown
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: c.text3, marginBottom: 8 }}>
            Estimated trade-in value
          </div>
          <div style={{ fontFamily: f.serif, fontSize: 44, color: c.text1, letterSpacing: '-1px' }}>
            ${result.estimated_range.low.toLocaleString()} – ${result.estimated_range.high.toLocaleString()}
          </div>
          <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', borderRadius: r.full, fontSize: 12, fontWeight: 600, color: c.accent }}>
            {CONDITION_LABEL[result.condition_tier]} condition
          </div>
        </div>

        <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.lg, padding: '22px 24px', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: c.text3, marginBottom: 14 }}>
            Score breakdown ({b.normalized}/100)
          </div>
          <ScoreBar label="Screen" value={b.screen} max={30} />
          <ScoreBar label="Body and frame" value={b.body} max={20} />
          <ScoreBar label="Battery" value={b.battery} max={25} />
          <ScoreBar label="Functional checklist" value={b.functional} max={25} />
          {b.brand_bonus > 0 && (
            <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 8 }}>
              + {b.brand_bonus} points brand residual-value bonus
            </div>
          )}
        </div>

        <div style={{ fontSize: 12, color: c.text3, textAlign: 'center', marginBottom: 28, lineHeight: 1.6 }}>
          Based on a tracked price of {formatDisplayPrice(phone)} for this model, with a {Math.round(result.deduction_range.low_pct * 100)}–{Math.round(result.deduction_range.high_pct * 100)}% deduction applied for {CONDITION_LABEL[result.condition_tier].toLowerCase()} condition.
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onRestart} style={{ padding: '10px 22px', border: `1px solid ${c.border}`, borderRadius: r.full, background: 'transparent', color: c.text2, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            Value another phone
          </button>
          <Link href={ROUTES.pick} style={{ padding: '10px 22px', background: c.primary, color: '#fff', borderRadius: r.full, fontSize: 13, fontWeight: 600 }}>
            Shop upgrades
          </Link>
        </div>
      </div>

      <BudgetRecommendations result={result} />
    </div>
  )
}

function TradeInContent() {
  const { toast } = useToast()
  const [phone, setPhone] = useState<Phone | null>(null)
  const [result, setResult] = useState<TradeInResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (payload: Omit<TradeInRequest, 'phone_id'>) => {
    if (!phone) return
    setSubmitting(true)
    try {
      const res = await api.tradein.estimate({ phone_id: phone.id, ...payload })
      setResult(res)
    } catch {
      toast('Could not calculate a trade-in estimate', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const restart = () => { setPhone(null); setResult(null) }

  return (
    <div style={{ minHeight: '100vh', background: c.bg }}>
      <Navbar />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '48px 20px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontFamily: f.serif, fontSize: 'clamp(28px, 5vw, 40px)', color: c.text1, letterSpacing: '-0.5px', marginBottom: 8 }}>
            What's your phone worth?
          </h1>
          <p style={{ fontSize: 15, color: c.text3 }}>Search your model, describe its condition, get an estimated range.</p>
        </div>

        {!phone && <PhonePicker onSelect={setPhone} />}

        {phone && !result && (
          <ConditionForm phone={phone} onBack={restart} onSubmit={handleSubmit} submitting={submitting} />
        )}

        {phone && result && (
          <ResultsView phone={phone} result={result} onRestart={restart} />
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
