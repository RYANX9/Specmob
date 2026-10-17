'use client'

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { resolveInitialRegion, setStoredRegion } from '@/lib/region'

interface RegionContextType {
  region: string
  setRegion: (region: string) => void
}

const RegionContext = createContext<RegionContextType | undefined>(undefined)

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const [region, setRegionState] = useState<string>(() => resolveInitialRegion())

  const setRegion = useCallback((next: string) => {
    const upper = next.toUpperCase()
    setRegionState(upper)
    setStoredRegion(upper)
  }, [])

  const value = useMemo(() => ({ region, setRegion }), [region, setRegion])

  return React.createElement(RegionContext.Provider, { value }, children)
}

export function useRegion() {
  const context = useContext(RegionContext)
  if (!context) {
    throw new Error('useRegion must be used within a RegionProvider')
  }
  return context
}