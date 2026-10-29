'use client'

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronDown } from 'lucide-react'

import { ROUTES } from '@/lib/config'
import { BEST_ALL, BEST_GROUPS, TRADE_IN, compareLabel, isActivePath, type NavLinkItem } from './navConfig'
import { prefetchBrands, useBrands } from './useBrands'

type MenuId = 'best' | 'brands'

const HOVER_OPEN_MS = 140 // pointer must rest on a trigger this long before it opens
const HOVER_SWITCH_MS = 60 // switching between already-open panels feels instant
const HOVER_CLOSE_MS = 220 // grace period when the pointer leaves the nav + panel

/* ------------------------------------------------------------------ */
/* Shared pieces (also used by MobileNav)                              */
/* ------------------------------------------------------------------ */

export function CompareBadge({ count }: { count: number }) {
  return (
    <span className="nb-badge" aria-hidden="true">
      {count}
    </span>
  )
}

export function NavItem({
  item,
  pathname,
  onNavigate,
}: {
  item: NavLinkItem
  pathname: string | null
  onNavigate?: () => void
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className="nb-item"
      data-nav-item
      aria-current={isActivePath(pathname, item.href) ? 'page' : undefined}
      onClick={onNavigate}
    >
      {Icon && (
        <span className="nb-item-icon">
          <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
        </span>
      )}
      <span>{item.label}</span>
    </Link>
  )
}

export function BrandsGrid({
  pathname,
  onNavigate,
  cols,
}: {
  pathname: string | null
  onNavigate?: () => void
  cols: number
}) {
  const { brands, status, retry } = useBrands()
  const grid = { display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 2 } as const

  if (status === 'loading') {
    return (
      <div style={grid} aria-busy="true" aria-label="Loading brands">
        {Array.from({ length: cols * 3 }, (_, i) => (
          <div key={i} className="nb-skel" style={{ height: 38 }} />
        ))}
      </div>
    )
  }

  if (status === 'error') {
    return (
      <p style={{ margin: 0, padding: '8px 10px', fontSize: 13.5 }}>
        Couldn’t load brands.
        <button type="button" className="nb-retry" data-nav-item onClick={retry}>
          Try again
        </button>
      </p>
    )
  }

  return (
    <div style={grid}>
      {brands.map(b => (
        <Link
          key={b.brand}
          href={b.path}
          className="nb-item nb-item--brand"
          data-nav-item
          aria-current={isActivePath(pathname, b.path) ? 'page' : undefined}
          onClick={onNavigate}
        >
          <span>{b.brand}</span>
          <span className="nb-count">{b.phone_count}</span>
        </Link>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Panels                                                              */
/* ------------------------------------------------------------------ */

interface PanelProps {
  pathname: string | null
  onNavigate: () => void
}

function BestPanel({ pathname, onNavigate }: PanelProps) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)', gap: 40 }}>
        {BEST_GROUPS.map(group => (
          <section key={group.title}>
            <h3 className="nb-group-title">{group.title}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${group.columns ?? 1}, minmax(0, 1fr))`, gap: 2 }}>
              {group.items.map(item => (
                <NavItem key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="nb-panel-foot">
        <Link href={BEST_ALL.href} className="nb-foot-link nb-foot-link--strong" data-nav-item onClick={onNavigate}>
          {BEST_ALL.label}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
        <Link href={TRADE_IN.href} className="nb-foot-link" data-nav-item onClick={onNavigate}>
          {TRADE_IN.label}
        </Link>
      </div>
    </>
  )
}

function BrandsPanel({ pathname, onNavigate }: PanelProps) {
  return (
    <>
      <BrandsGrid pathname={pathname} onNavigate={onNavigate} cols={4} />
      <div className="nb-panel-foot">
        <Link href={ROUTES.brands} className="nb-foot-link nb-foot-link--strong" data-nav-item onClick={onNavigate}>
          View all brands
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Desktop menus: Best, Brands, Compare                                */
/* ------------------------------------------------------------------ */

interface Props {
  pathname: string | null
  compareCount: number
  compareHref: string
}

/**
 * The panel is position:absolute against the <nav> (the nearest positioned ancestor),
 * never against a button, so it always spans the content width and cannot jump.
 * Do not add `position` to any wrapper between this component and the <nav>.
 */
export default function NavMenus({ pathname, compareCount, compareHref }: Props) {
  const [open, setOpen] = useState<MenuId | null>(null)

  const openRef = useRef<MenuId | null>(null)
  openRef.current = open

  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggers = useRef<Record<MenuId, HTMLButtonElement | null>>({ best: null, brands: null })
  const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const focusOnOpen = useRef(false)

  const clearTimers = () => {
    clearTimeout(openTimer.current)
    clearTimeout(closeTimer.current)
  }

  const close = useCallback((returnFocus = false) => {
    clearTimeout(openTimer.current)
    clearTimeout(closeTimer.current)
    const current = openRef.current
    setOpen(null)
    if (returnFocus && current) triggers.current[current]?.focus()
  }, [])

  useEffect(() => close(), [pathname, close])
  useEffect(() => () => clearTimers(), [])

  // Outside click, Escape, and focus leaving the menu all close the panel.
  useEffect(() => {
    if (!open) return
    const root = rootRef.current

    const onPointerDown = (e: PointerEvent) => {
      if (root && !root.contains(e.target as Node)) close()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      close(!!root?.contains(document.activeElement))
    }
    const onFocusIn = (e: FocusEvent) => {
      if (root && !root.contains(e.target as Node)) close()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('focusin', onFocusIn)
    }
  }, [open, close])

  // After ArrowDown opens a panel, move focus to its first link once it has rendered.
  useEffect(() => {
    if (open && focusOnOpen.current) {
      focusOnOpen.current = false
      panelRef.current?.querySelector<HTMLElement>('[data-nav-item]')?.focus()
    }
  }, [open])

  const toggle = (id: MenuId) => {
    clearTimers()
    if (id === 'brands') prefetchBrands()
    setOpen(cur => (cur === id ? null : id))
  }

  /* ---------- hover intent (mouse only; touch and keyboard use click/arrows) ---------- */

  const onTriggerEnter = (e: ReactPointerEvent, id: MenuId) => {
    if (e.pointerType !== 'mouse') return
    if (id === 'brands') prefetchBrands()
    clearTimeout(closeTimer.current)
    clearTimeout(openTimer.current)
    if (openRef.current === id) return
    openTimer.current = setTimeout(() => setOpen(id), openRef.current ? HOVER_SWITCH_MS : HOVER_OPEN_MS)
  }

  const onTriggerLeave = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse') clearTimeout(openTimer.current)
  }

  const onRootEnter = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse') clearTimeout(closeTimer.current)
  }

  const onRootLeave = (e: ReactPointerEvent) => {
    if (e.pointerType !== 'mouse') return
    clearTimeout(openTimer.current)
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => {
      // Never yank the panel away from someone navigating it with the keyboard.
      if (panelRef.current?.contains(document.activeElement)) return
      setOpen(null)
    }, HOVER_CLOSE_MS)
  }

  /* ---------- keyboard ---------- */

  const onTriggerKeyDown = (e: ReactKeyboardEvent, id: MenuId) => {
    if (e.key !== 'ArrowDown') return
    e.preventDefault()
    if (id === 'brands') prefetchBrands()
    if (openRef.current === id) {
      panelRef.current?.querySelector<HTMLElement>('[data-nav-item]')?.focus()
    } else {
      focusOnOpen.current = true
      setOpen(id)
    }
  }

  const onPanelKeyDown = (e: ReactKeyboardEvent) => {
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('[data-nav-item]') ?? [])
    if (!items.length) return
    const i = items.indexOf(document.activeElement as HTMLElement)

    let next: number
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        next = i < 0 ? 0 : (i + 1) % items.length
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        if (i === 0 && openRef.current) {
          e.preventDefault()
          triggers.current[openRef.current]?.focus()
          return
        }
        next = i <= 0 ? items.length - 1 : i - 1
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = items.length - 1
        break
      default:
        return
    }
    e.preventDefault()
    items[next].focus()
  }

  /* ---------- render ---------- */

  const bestCurrent = isActivePath(pathname, ROUTES.best)
  const brandsCurrent = isActivePath(pathname, ROUTES.brands)
  const compareCurrent = isActivePath(pathname, '/compare')

  const trigger = (id: MenuId, label: string, current: boolean) => (
    <button
      ref={el => {
        triggers.current[id] = el
      }}
      type="button"
      className="nb-trigger"
      aria-expanded={open === id}
      aria-controls={open === id ? `nb-panel-${id}` : undefined}
      data-current={current || undefined}
      onClick={() => toggle(id)}
      onKeyDown={e => onTriggerKeyDown(e, id)}
      onPointerEnter={e => onTriggerEnter(e, id)}
      onPointerLeave={onTriggerLeave}
      onFocus={() => id === 'brands' && prefetchBrands()}
    >
      {label}
      <ChevronDown size={12} className="nb-chev" aria-hidden="true" />
    </button>
  )

  return (
    <div ref={rootRef} className="nb-menus" style={{ display: 'flex', alignItems: 'center', height: '100%' }} onPointerEnter={onRootEnter} onPointerLeave={onRootLeave}>
      {trigger('best', 'Best', bestCurrent)}
      {trigger('brands', 'Brands', brandsCurrent)}

      {open && (
        <div
          ref={panelRef}
          id={`nb-panel-${open}`}
          role="region"
          aria-label={open === 'best' ? 'Best phones' : 'Browse by brand'}
          className="nb-panel"
          onKeyDown={onPanelKeyDown}
        >
          <div className="nb-panel-inner">
            {open === 'best' ? (
              <BestPanel pathname={pathname} onNavigate={() => close()} />
            ) : (
              <BrandsPanel pathname={pathname} onNavigate={() => close()} />
            )}
          </div>
        </div>
      )}

      <Link
        href={compareHref}
        className="nb-trigger"
        aria-label={compareLabel(compareCount)}
        aria-current={compareCurrent ? 'page' : undefined}
        data-current={compareCurrent || undefined}
        onPointerEnter={e => {
          if (e.pointerType !== 'mouse' || !openRef.current) return
          clearTimeout(openTimer.current)
          clearTimeout(closeTimer.current)
          closeTimer.current = setTimeout(() => close(), HOVER_SWITCH_MS)
        }}
      >
        Compare
        {compareCount > 0 && <CompareBadge count={compareCount} />}
      </Link>
    </div>
  )
}
