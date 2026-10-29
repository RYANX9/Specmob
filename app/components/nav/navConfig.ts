import {
  BatteryFull,
  BookOpen,
  Camera,
  DollarSign,
  Feather,
  Gamepad2,
  Minimize2,
  RotateCcw,
  Scale,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import { ROUTES } from '@/lib/config'

/** Must match the breakpoint used in navStyles.ts (it is interpolated from here). */
export const MOBILE_BREAKPOINT = 900

export interface NavLinkItem {
  label: string
  href: string
  icon?: LucideIcon
}

export interface NavGroup {
  title: string
  columns?: number
  items: NavLinkItem[]
}

/** Mirrors the two ranking groups the API exposes. Static so the menu costs zero requests. */
export const BEST_GROUPS: NavGroup[] = [
  {
    title: 'By what matters to you',
    columns: 2,
    items: [
      { label: 'Camera', href: ROUTES.category('camera-phones'), icon: Camera },
      { label: 'Battery life', href: ROUTES.category('battery-life'), icon: BatteryFull },
      { label: 'Gaming', href: ROUTES.category('gaming-phones'), icon: Gamepad2 },
      { label: 'Fast charging', href: ROUTES.category('fast-charging'), icon: Zap },
      { label: 'Lightweight', href: ROUTES.category('lightweight'), icon: Feather },
      { label: 'Foldables', href: ROUTES.category('foldables'), icon: BookOpen },
      { label: 'Compact', href: ROUTES.category('compact-phones'), icon: Minimize2 },
    ],
  },
  {
    title: 'By budget',
    columns: 1,
    items: [
      { label: 'Under $300', href: ROUTES.category('under-300'), icon: DollarSign },
      { label: 'Under $500', href: ROUTES.category('under-500'), icon: DollarSign },
      { label: 'Under $700', href: ROUTES.category('under-700'), icon: DollarSign },
    ],
  },
]

export const BEST_ALL: NavLinkItem = { label: 'All rankings', href: ROUTES.best }
export const TRADE_IN: NavLinkItem = { label: 'Trade-in value', href: ROUTES.tradein, icon: RotateCcw }

/** Shown in the search box when it is focused and empty. */
export const QUICK_LINKS: (NavLinkItem & { icon: LucideIcon })[] = [
  { label: 'Phones under $500', href: ROUTES.category('under-500'), icon: DollarSign },
  { label: 'Best camera phones', href: ROUTES.category('camera-phones'), icon: Camera },
  { label: 'Compare two phones', href: '/compare', icon: Scale },
]

export function isActivePath(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  const path = href.split(/[?#]/)[0]
  if (path === '/') return pathname === '/'
  return pathname === path || pathname.startsWith(path + '/')
}

export function buildCompareHref(slugs: string[]): string {
  return slugs.length >= 2 ? ROUTES.comparePair(...slugs) : '/compare'
}

export function compareLabel(count: number): string {
  return count > 0 ? `Compare, ${count} phone${count === 1 ? '' : 's'} selected` : 'Compare'
}
