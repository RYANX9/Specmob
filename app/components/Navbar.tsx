'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CircleHelp, Menu, Search, X } from 'lucide-react'

import { ROUTES } from '@/lib/config'
import { c, f, z } from '@/lib/tokens'
import { useCompare } from '@/lib/compareStore'

import MobileNav from './nav/MobileNav'
import NavMenus from './nav/NavMenus'
import NavSearch from './nav/NavSearch'
import { MOBILE_BREAKPOINT, buildCompareHref } from './nav/navConfig'
import { NAV_CSS } from './nav/navStyles'

type MobileMode = 'menu' | 'search'

/**
 * Navbar shell. Layout, shortcuts, and mobile sheet state live here;
 * search, menus, and the sheet are in ./nav/.
 *
 * Keeps: the italic wordmark, token colours/radii, and the --nav-h height.
 */
export default function Navbar() {
  const pathname = usePathname()

  const { phones: comparePhones } = useCompare()
  const compareCount = comparePhones.length
  const compareHref = buildCompareHref(comparePhones.map(p => p.full_slug))

  const [mobile, setMobile] = useState<MobileMode | null>(null)
  const [sheetTop, setSheetTop] = useState(64)

  const navRef = useRef<HTMLElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const searchBtnRef = useRef<HTMLButtonElement>(null)
  const opener = useRef<MobileMode>('menu')

  const openMobile = useCallback((mode: MobileMode) => {
    // Measure the real navbar position so the sheet sits flush under it,
    // even when a banner above the navbar pushes it down the page.
    const bottom = navRef.current?.getBoundingClientRect().bottom ?? 64
    setSheetTop(Math.max(0, Math.round(bottom)))
    opener.current = mode
    setMobile(mode)
  }, [])

  const closeMobile = useCallback(() => {
    setMobile(null)
    const target = opener.current === 'search' ? searchBtnRef.current : menuBtnRef.current
    target?.focus()
  }, [])

  // Route change closes the sheet.
  useEffect(() => {
    setMobile(null)
  }, [pathname])

  // Growing past the mobile breakpoint closes the sheet.
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
    const onChange = () => {
      if (!mq.matches) setMobile(null)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // "/" or Cmd/Ctrl+K jumps to search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'
      const isSlash = e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey
      if (!isCmdK && !isSlash) return

      if (isSlash) {
        const el = e.target as HTMLElement | null
        if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return
      }

      e.preventDefault()
      if (window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches) {
        openMobile('search')
      } else {
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [openMobile])

  return (
    <>
      <nav
        ref={navRef}
        aria-label="Main"
        className="nb"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: z.nav,
          height: 'var(--nav-h)',
          background: 'rgba(247,245,240,0.9)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${c.border}`,
        }}
      >
        <div className="nb-row">
          <Link prefetch={false}
            href={ROUTES.home}
            style={{
              fontFamily: f.wordmark,
              fontStyle: 'italic',
              fontSize: 23,
              color: c.text1,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              letterSpacing: '-0.3px',
              textDecoration: 'none',
            }}
          >
            Specmob
            <span style={{ color: c.accent, fontStyle: 'normal' }}>.</span>
          </Link>

          <div className="nb-search-slot">
            <NavSearch inputRef={searchRef} />
          </div>

          <div className="nb-right">
            <NavMenus pathname={pathname} compareCount={compareCount} compareHref={compareHref} />
            <Link prefetch={false} href={ROUTES.pick} className="nb-cta">
              <CircleHelp size={14} strokeWidth={2} aria-hidden="true" />
              Help Me Choose
            </Link>
          </div>

          <div className="nb-mobile-actions">
            {!mobile && (
              <button
                ref={searchBtnRef}
                type="button"
                className="nb-icon-btn"
                aria-label="Search phones"
                onClick={() => openMobile('search')}
              >
                <Search size={20} aria-hidden="true" />
              </button>
            )}
            <button
              ref={menuBtnRef}
              type="button"
              className="nb-icon-btn"
              aria-label={mobile ? 'Close menu' : 'Open menu'}
              aria-expanded={mobile !== null}
              aria-controls="nb-mobile"
              onClick={() => (mobile ? closeMobile() : openMobile('menu'))}
            >
              {mobile ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </nav>

      {mobile && (
        <MobileNav
          top={sheetTop}
          autoFocusSearch={mobile === 'search'}
          pathname={pathname}
          compareCount={compareCount}
          compareHref={compareHref}
          onClose={closeMobile}
        />
      )}

      <style>{NAV_CSS}</style>
    </>
  )
}
