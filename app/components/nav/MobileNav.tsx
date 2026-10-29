'use client'

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import Link from 'next/link'
import { ChevronDown, CircleHelp } from 'lucide-react'

import { ROUTES } from '@/lib/config'
import { c, z } from '@/lib/tokens'
import NavSearch from './NavSearch'
import { BrandsGrid, CompareBadge, NavItem } from './NavMenus'
import { BEST_ALL, BEST_GROUPS, TRADE_IN, compareLabel, isActivePath } from './navConfig'

type Section = 'best' | 'brands' | null

interface Props {
  /** Distance from the top of the viewport to the bottom of the navbar, measured when the sheet opened. */
  top: number
  autoFocusSearch: boolean
  pathname: string | null
  compareCount: number
  compareHref: string
  onClose: () => void
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled])'

/**
 * Full-height sheet: search first, then the primary action, then accordions.
 * `top` is measured from the real navbar position, so it stays correct when a
 * banner (e.g. the data notice) pushes the navbar down the page.
*/

 
export default function MobileNav({ top, autoFocusSearch, pathname, compareCount, compareHref, onClose }: Props) {
  const [section, setSection] = useState<Section>('best')
  const [searchOpen, setSearchOpen] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  // Lock page scroll behind the sheet and close on Escape.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  // Keep Tab inside the sheet.
  const trapTab = (e: ReactKeyboardEvent) => {
    if (e.key !== 'Tab') return
    const nodes = Array.from(sheetRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
      el => el.offsetParent !== null,
    )
    if (!nodes.length) return
    const first = nodes[0]
    const last = nodes[nodes.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const toggle = (s: Exclude<Section, null>) => setSection(cur => (cur === s ? null : s))

  const accordion = (id: Exclude<Section, null>, label: string) => (
    <button
      type="button"
      id={`nb-acc-${id}-btn`}
      className="nb-acc-btn"
      aria-expanded={section === id}
      aria-controls={`nb-acc-${id}`}
      onClick={() => toggle(id)}
    >
      {label}
      <ChevronDown size={16} className="nb-chev" aria-hidden="true" />
    </button>
  )

  return (
    <div
      ref={sheetRef}
      id="nb-mobile"
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      className="nb-sheet"
      onKeyDown={trapTab}
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        top,
        zIndex: z.drawer,
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        background: c.surface,
      }}
    >
      <div
        style={{
          padding: '16px var(--page-px) calc(32px + env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <NavSearch variant="sheet" autoFocus={autoFocusSearch} onNavigate={onClose} onOpenChange={setSearchOpen} />

        {!searchOpen && (
          <>
            <Link href={ROUTES.pick} className="nb-cta nb-cta--block" onClick={onClose}>
              <CircleHelp size={16} strokeWidth={2} aria-hidden="true" />
              Help Me Choose
            </Link>

            <div>
              {accordion('best', 'Best')}
              {section === 'best' && (
                <div id="nb-acc-best" role="region" aria-labelledby="nb-acc-best-btn" style={{ paddingBottom: 12 }}>
                  {BEST_GROUPS.map(group => (
                    <div key={group.title} style={{ marginBottom: 10 }}>
                      <h3 className="nb-group-title" style={{ marginLeft: 8 }}>
                        {group.title}
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 2 }}>
                        {group.items.map(item => (
                          <NavItem key={item.href} item={item} pathname={pathname} onNavigate={onClose} />
                        ))}
                      </div>
                    </div>
                  ))}
                  <NavItem item={BEST_ALL} pathname={pathname} onNavigate={onClose} />
                </div>
              )}

              {accordion('brands', 'Brands')}
              {section === 'brands' && (
                <div id="nb-acc-brands" role="region" aria-labelledby="nb-acc-brands-btn" style={{ paddingBottom: 12 }}>
                  <BrandsGrid pathname={pathname} onNavigate={onClose} cols={2} />
                  <Link href={ROUTES.brands} className="nb-foot-link nb-foot-link--strong" style={{ marginTop: 8 }} onClick={onClose}>
                    View all brands
                  </Link>
                </div>
              )}

              <Link
                href={compareHref}
                className="nb-acc-btn"
                aria-label={compareLabel(compareCount)}
                aria-current={isActivePath(pathname, '/compare') ? 'page' : undefined}
                onClick={onClose}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  Compare
                  {compareCount > 0 && <CompareBadge count={compareCount} />}
                </span>
              </Link>

              <Link
                href={TRADE_IN.href}
                className="nb-acc-btn"
                aria-current={isActivePath(pathname, TRADE_IN.href) ? 'page' : undefined}
                onClick={onClose}
                style={{ borderBottom: `1px solid ${c.border}` }}
              >
                {TRADE_IN.label}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

