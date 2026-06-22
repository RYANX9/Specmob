'use client'

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { Check, X, AlertCircle } from 'lucide-react'
import { c, r, sh, z, motion } from '@/lib/tokens'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

const MAX_VISIBLE_TOASTS = 4
const TOAST_DURATION = 3200

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const remaining = useRef<Map<number, number>>(new Map())
  const startedAt = useRef<Map<number, number>>(new Map())

  useEffect(() => {
    const activeTimers = timers.current
    return () => {
      activeTimers.forEach(timer => clearTimeout(timer))
    }
  }, [])

  const clearTracking = (id: number) => {
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
    remaining.current.delete(id)
    startedAt.current.delete(id)
  }

  const dismiss = useCallback((id: number) => {
    clearTracking(id)
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const scheduleDismiss = useCallback((id: number, duration: number) => {
    startedAt.current.set(id, Date.now())
    remaining.current.set(id, duration)
    timers.current.set(id, setTimeout(() => dismiss(id), duration))
  }, [dismiss])

  const pause = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (!timer) return
    clearTimeout(timer)
    const started = startedAt.current.get(id) ?? Date.now()
    const left = remaining.current.get(id) ?? TOAST_DURATION
    remaining.current.set(id, Math.max(left - (Date.now() - started), 600))
  }, [])

  const resume = useCallback((id: number) => {
    const left = remaining.current.get(id)
    if (left == null) return
    scheduleDismiss(id, left)
  }, [scheduleDismiss])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++counter.current
    setToasts(prev => {
      const next = [...prev, { id, message, type }]
      if (next.length <= MAX_VISIBLE_TOASTS) return next
      const overflow = next.slice(0, next.length - MAX_VISIBLE_TOASTS)
      overflow.forEach(o => clearTracking(o.id))
      return next.slice(next.length - MAX_VISIBLE_TOASTS)
    })
    scheduleDismiss(id, TOAST_DURATION)
  }, [scheduleDismiss])

  const bgMap: Record<ToastType, string> = {
    success: c.primary,
    error: c.accent,
    info: c.green,
  }

  const iconMap: Record<ToastType, React.ReactNode> = {
    success: <Check size={14} strokeWidth={2.5} />,
    error: <AlertCircle size={14} strokeWidth={2} />,
    info: <Check size={14} strokeWidth={2.5} />,
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        style={{
          position: 'fixed',
          top: 'calc(var(--nav-h) + 12px)',
          right: 20,
          zIndex: z.toast,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {toasts.map(t => (
          <div
            key={t.id}
            onMouseEnter={() => pause(t.id)}
            onMouseLeave={() => resume(t.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '11px 16px',
              background: bgMap[t.type],
              color: '#fff',
              borderRadius: r.md,
              fontSize: 13,
              fontWeight: 500,
              boxShadow: sh.lg,
              animation: `toastIn ${motion.slow}ms ease`,
              pointerEvents: 'auto',
              maxWidth: 320,
            }}
          >
            {iconMap[t.type]}
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              style={{ color: 'rgba(255,255,255,0.6)', display: 'flex', marginLeft: 4, transition: 'color 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)' }}
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
