'use client'

import { useCallback, useEffect, useState } from 'react'

import { api } from '@/lib/api'
import type { BrandCompact } from '@/lib/types'

const TTL = 60 * 60 * 1000
const LIMIT = 24

let cache: { data: BrandCompact[]; ts: number } | null = null
let inflight: Promise<BrandCompact[]> | null = null

function fresh(): BrandCompact[] | null {
  return cache && Date.now() - cache.ts < TTL ? cache.data : null
}

/** One shared request per hour. Safe to call from hover/focus handlers to warm the cache. */
export function loadBrands(): Promise<BrandCompact[]> {
  const hit = fresh()
  if (hit) return Promise.resolve(hit)

  inflight ??= api.brands
    .compact()
    .then(d => {
      const data = d.brands.slice(0, LIMIT)
      cache = { data, ts: Date.now() }
      return data
    })
    .finally(() => {
      inflight = null
    })

  return inflight
}

export function prefetchBrands(): void {
  loadBrands().catch(() => {})
}

export type BrandsStatus = 'loading' | 'ready' | 'error'

export function useBrands() {
  const [brands, setBrands] = useState<BrandCompact[]>(() => fresh() ?? [])
  const [status, setStatus] = useState<BrandsStatus>(() => (fresh() ? 'ready' : 'loading'))
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    if (!fresh()) setStatus('loading')

    loadBrands()
      .then(data => {
        if (!alive) return
        setBrands(data)
        setStatus('ready')
      })
      .catch(() => {
        if (alive) setStatus('error')
      })

    return () => {
      alive = false
    }
  }, [attempt])

  const retry = useCallback(() => setAttempt(n => n + 1), [])

  return { brands, status, retry }
}
