'use client'

import { useEffect, useRef, useState } from 'react'
import { c, f } from '@/lib/tokens'
import { DIAL_MAX, DIAL_MIN, dialRatioFromValue, dialValueFromRatio, stepDial } from '@/lib/priceTiers'

// Rolls the displayed number toward the target ~22% of the remaining distance per frame,
// so $1 steps and fast drags both feel smooth. Reduced-motion users get the value directly.
function useAnimatedNumber(target: number): number {
  const [shown, setShown] = useState(target)
  const current = useRef(target)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      current.current = target
      setShown(target)
      return
    }
    let raf = 0
    const tick = () => {
      const diff = target - current.current
      if (Math.abs(diff) < 0.5) {
        current.current = target
        setShown(target)
        return
      }
      current.current += diff * 0.22
      setShown(current.current)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])

  return Math.round(shown)
}

export default function BudgetDial({ value, onChange, big = false, disabled = false }: { value: number; onChange: (v: number) => void; big?: boolean; disabled?: boolean }) {
  const track = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const pct = dialRatioFromValue(value) * 100
  const uncapped = value >= DIAL_MAX
  const shownValue = useAnimatedNumber(value)

  const fromX = (x: number) => {
    const el = track.current
    if (!el || disabled) return
    const r = el.getBoundingClientRect()
    onChange(dialValueFromRatio((x - r.left) / r.width))
  }

  return (
    <div style={{ opacity: disabled ? 0.35 : 1, pointerEvents: disabled ? 'none' : 'auto', transition: 'opacity 0.15s' }} aria-disabled={disabled}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontVariantNumeric: 'tabular-nums', userSelect: 'none' }}>
        {!uncapped && <span style={{ fontSize: 15, color: c.text3, fontWeight: 500 }}>Up to</span>}
        <span style={{ fontFamily: f.serif, fontSize: big ? 'clamp(54px,9vw,96px)' : 'clamp(44px,7vw,64px)', lineHeight: 1, letterSpacing: '-2px', color: c.text1 }}>
          <span style={{ fontSize: '0.42em', fontFamily: 'var(--font-sans)', fontWeight: 300, color: c.text3, marginRight: 3 }}>$</span>
          {uncapped ? '2,000+' : shownValue.toLocaleString('en-US')}
        </span>
      </div>

      <div
        ref={track}
        className="bd-slider"
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="Budget"
        aria-disabled={disabled}
        aria-valuemin={DIAL_MIN}
        aria-valuemax={DIAL_MAX}
        aria-valuenow={value}
        aria-valuetext={uncapped ? '$2,000 and above' : `Up to $${value}`}
        onPointerDown={e => { if (disabled) return; e.currentTarget.setPointerCapture(e.pointerId); dragging.current = true; fromX(e.clientX) }}
        onPointerMove={e => { if (dragging.current) fromX(e.clientX) }}
        onPointerUp={() => { dragging.current = false }}
        onPointerCancel={() => { dragging.current = false }}
        onKeyDown={e => {
          if (disabled) return
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChange(stepDial(value, 1, e.shiftKey ? 10 : 1)) }
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChange(stepDial(value, -1, e.shiftKey ? 10 : 1)) }
        }}
      >
        <div className="bd-rail"><div className="bd-fill" style={{ width: `${pct}%` }} /></div>
        <div className="bd-thumb" style={{ left: `${pct}%` }} />
        <span className="bd-min">$100</span>
        <span className="bd-max">$2,000+</span>
      </div>
      <style>{`
        .bd-slider{position:relative;height:52px;margin-top:14px;touch-action:none;cursor:pointer;max-width:560px}
        .bd-rail{position:absolute;left:0;right:0;top:20px;height:6px;border-radius:3px;background:var(--border);overflow:hidden}
        .bd-fill{height:100%;background:var(--primary)}
        .bd-thumb{position:absolute;top:23px;width:26px;height:26px;border-radius:50%;background:var(--surface);border:3px solid var(--primary);transform:translate(-50%,-50%);box-shadow:var(--shadow-md)}
        .bd-min,.bd-max{position:absolute;top:36px;font-size:11px;color:var(--text-3)}
        .bd-max{right:0}
      `}</style>
    </div>
  )
}