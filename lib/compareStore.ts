'use client'

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import type { Phone } from '@/lib/types'

interface CompareContextType {
  phones: Phone[]
  ids: (string | number)[]
  add: (phone: Phone) => void
  remove: (id: string | number) => void
  clear: () => void
}

const CompareContext = createContext<CompareContextType | undefined>(undefined)

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [phones, setPhones] = useState<Phone[]>([])

  const add = useCallback((phone: Phone) => {
    setPhones((prev) => {
      if (prev.some((p) => p.id === phone.id)) return prev
      return [...prev, phone]
    })
  }, [])

  const remove = useCallback((id: string | number) => {
    setPhones((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const clear = useCallback(() => {
    setPhones([])
  }, [])

  const ids = useMemo(() => phones.map((p) => p.id), [phones])

  const value = useMemo(
    () => ({ phones, ids, add, remove, clear }),
    [phones, ids, add, remove, clear]
  )

  return React.createElement(CompareContext.Provider, { value }, children)
}

export function useCompare() {
  const context = useContext(CompareContext)
  if (!context) {
    throw new Error('useCompare must be used within a CompareProvider')
  }
  return context
}
