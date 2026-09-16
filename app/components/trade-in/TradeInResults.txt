// components/trade-in/TradeInResults.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Scale, Smartphone } from 'lucide-react'

import { api } from '@/lib/api'
import { ROUTES, phoneSlug, formatPrice } from '@/lib/config'
import { c, f, r, space } from '@/lib/tokens'
import { formatDisplayPrice } from '@/lib/price'
import type { Phone, TradeInResponse } from '@/lib/types'

const CONDITION_LABEL: Record<TradeInResponse['condition_tier'], string> = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
}

// ─── score bar ──────────────────────────────────────────────────────────────

function ScoreBar({
  label,
  value,
  max,
}: {
  label: string
  value: number
  max: number
}) {
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

// ─── recommendation card ───────────────────────────────────────────────────

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
            style={{
              maxHeight: '100%',
              maxWidth: '100%',
              objectFit: 'contain',
            }}
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

      <div
        style={{
          fontSize: 17,
          fontWeight: 800,
          color: c.text1,
          marginBottom: 4,
        }}
      >
        {formatDisplayPrice(phone)}
      </div>
    </div>
  )
}

// ─── recommendation card with compare link ─────────────────────────────────

function RecommendationCard({
  original,
  phone,
}: {
  original: Phone
  phone: Phone
}) {
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
          <Scale size={12} strokeWidth={1.5} />

          compare vs {original.model_name.split(' ').slice(-1)[0]}
        </Link>
      </div>
    </div>
  )
}

// ─── budget recommendations ────────────────────────────────────────────────

function BudgetRecommendations({
  phone,
  result,
}: {
  phone: Phone
  result: TradeInResponse
}) {
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
        if (!controller.signal.aborted) {
          setRecs(res.results)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRecs([])
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()

    // These values intentionally control the search range.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minPrice, maxPrice])

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault()

    const n = Number(extraBudgetInput)

    setExtraBudget(
      Number.isFinite(n) && n > 0 ? n : 0,
    )
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
      <div
        style={{
          textAlign: 'center',
          marginBottom: space.xl,
        }}
      >
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

        <p
          style={{
            fontSize: 13,
            color: c.text3,
          }}
        >
          ${minPrice.toLocaleString()}–${maxPrice.toLocaleString()} range,
          based on your estimate
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
        <span
          style={{
            fontSize: 13,
            color: c.text2,
          }}
        >
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
            e.currentTarget.style.background =
              'var(--primary-hover)'
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
            <RecommendationCard
              key={p.id}
              original={phone}
              phone={p}
            />
          ))}
        </div>
      )}
    </section>
  )
}

// ─── results view ───────────────────────────────────────────────────────────

export function ResultsView({
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
    <div
      style={{
        maxWidth: 720,
        margin: '0 auto',
      }}
    >
      {/* Value header */}

      <div
        style={{
          textAlign: 'center',
          marginBottom: space['2xl'],
        }}
      >
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

      {/* Score breakdown */}

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

        <ScoreBar
          label="Screen"
          value={b.screen}
          max={30}
        />

        <ScoreBar
          label="Body and frame"
          value={b.body}
          max={20}
        />

        <ScoreBar
          label="Battery"
          value={b.battery}
          max={25}
        />

        <ScoreBar
          label="Functional checklist"
          value={b.functional}
          max={25}
        />

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

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: space.xl,
        }}
      >
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
          <ArrowLeft size={14} />
          Edit condition
        </button>
      </div>
    </div>
  )
}

export default ResultsView
