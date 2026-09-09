'use client'

import { useEffect, useState, Suspense } from 'react'

import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import { useToast } from '@/app/components/Toast'

import { api } from '@/lib/api'
import { c } from '@/lib/tokens'
import type {
  Phone,
  TradeInRequest,
  TradeInResponse,
} from '@/lib/types'

import type { PhoneVariant } from '@/app/components/phone-detail/PhoneSpecs'

import {
  CustomStyles,
  Hero,
  StepsGuide,
  PhonePicker,
  SelectedPhoneChip,
  VariantStep,
  ConditionForm,
} from '@/app/components/trade-in/TradeInFlow'

import {
  ResultsView,
} from '@/app/components/trade-in/TradeInResults'

import { analytics } from '@/lib/analytics'

// ─── main trade-in flow ─────────────────────────────────────────────────────

function TradeInContent() {
  const { toast } = useToast()

  const [phone, setPhone] = useState<Phone | null>(null)

  const [variants, setVariants] = useState<PhoneVariant[]>([])
  const [variantsLoading, setVariantsLoading] = useState(false)
  const [variant, setVariant] = useState<PhoneVariant | null>(null)

  const [result, setResult] =
    useState<TradeInResponse | null>(null)

  const [submitting, setSubmitting] = useState(false)

  const hasStarted = phone !== null

  // ─── fetch variants when phone changes ───────────────────────────────────

  useEffect(() => {
    if (!phone) {
      setVariants([])
      setVariant(null)
      return
    }

    let cancelled = false

    setVariantsLoading(true)

    api.phones
      .variants(phone.id)
      .then((res) => {
        if (cancelled) return

        setVariants(res.variants)

        // If there is only one configuration, select it
        // automatically and skip the variant picker.
        if (res.variants.length <= 1) {
          setVariant(res.variants[0] ?? null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVariants([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setVariantsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [phone])

  // Show the storage picker only when:
  // - a phone is selected
  // - no variant has been selected yet
  // - variants are still loading OR there are multiple variants
  const showVariantStep =
    hasStarted &&
    variant === null &&
    (variantsLoading || variants.length > 1)

  // ─── submit trade-in estimate ───────────────────────────────────────────

  const handleSubmit = async (
    payload: Omit<
      TradeInRequest,
      'phone_id' | 'variant_id'
    >,
  ) => {
    if (!phone) return

    setSubmitting(true)

    try {
      const res = await api.tradein.estimate({
        phone_id: phone.id,

        // IMPORTANT:
        // Send the selected configuration to the backend.
        variant_id: variant?.id,

        ...payload,
      })

      setResult(res)

      analytics.tradeinComplete({
        phone_id: phone.id,
        estimated_low: res.estimated_range.low,
        estimated_high: res.estimated_range.high,
      })

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    } catch {
      toast(
        'Could not calculate a trade-in estimate',
        'error',
      )
    } finally {
      setSubmitting(false)
    }
  }

  // ─── navigation ─────────────────────────────────────────────────────────

  const changePhone = () => {
    setPhone(null)
    setVariants([])
    setVariant(null)
    setResult(null)
  }

  const changeVariant = () => {
    setVariant(null)
  }

  const backFromVariant = () => {
    setPhone(null)
    setVariants([])
    setVariant(null)
  }

  const backFromForm = () => {
    if (variants.length > 1) {
      setVariant(null)
    } else {
      setPhone(null)
    }
  }

  const backFromResults = () => {
    setResult(null)
  }

  // ─── render ─────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: '100vh',
        background: c.bg,
      }}
    >
      <CustomStyles />

      <Navbar />

      <Hero hasStarted={hasStarted} />

      <main
        style={{
          maxWidth: result ? 1100 : 900,
          margin: '0 auto',
          padding: hasStarted
            ? '48px 24px 80px'
            : '0 24px 80px',
        }}
      >
        {/* Initial three-step explanation */}

        {!hasStarted && (
          <StepsGuide hasStarted={hasStarted} />
        )}

        {/* Phone search */}

        {!hasStarted && (
          <div
            style={{
              maxWidth: 520,
              margin: '0 auto',
              padding: '48px 0 96px',
            }}
          >
            <PhonePicker
              onSelect={(p) => {
                analytics.tradeinStart({
                  id: p.id,
                  brand: p.brand,
                  model_name: p.model_name,
                })

                setPhone(p)
              }}
            />
          </div>
        )}

        {/* Selected phone */}

        {phone && (
          <div
            style={{
              maxWidth: 720,
              margin: '0 auto',
            }}
          >
            <SelectedPhoneChip
              phone={phone}
              variant={variant}
              onChangePhone={changePhone}
              onChangeVariant={
                variants.length > 1
                  ? changeVariant
                  : undefined
              }
            />
          </div>
        )}

        {/* Storage / RAM variant */}

        {showVariantStep && phone && (
          <VariantStep
            phone={phone}
            variants={variants}
            loading={variantsLoading}
            onSelect={setVariant}
            onBack={backFromVariant}
          />
        )}

        {/* Condition form */}

        {phone &&
          !showVariantStep &&
          !result && (
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
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}

// ─── page ───────────────────────────────────────────────────────────────────

export default function TradeInPage() {
  return (
    <Suspense fallback={null}>
      <TradeInContent />
    </Suspense>
  )
}
