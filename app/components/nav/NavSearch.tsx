'use client'

import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ArrowRight, Clock, Search, X, type LucideIcon } from 'lucide-react'

import { api } from '@/lib/api'
import { ROUTES } from '@/lib/config'
import { loadSearchIndex, searchIndex, type SuggestPhone } from '@/lib/searchIndex'
import { resolveSearchIntent } from '@/lib/searchIntent'
import { formatUsd } from '@/lib/price'
import { analytics } from '@/lib/analytics'
import { QUICK_LINKS } from './navConfig'

/* ------------------------------------------------------------------ */
/* Recent searches (localStorage, max 5, never leaves the device)      */
/* ------------------------------------------------------------------ */

const RECENT_KEY = 'specmob:recent-searches'
const RECENT_MAX = 5

function readRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string').slice(0, RECENT_MAX) : []
  } catch {
    return []
  }
}

function writeRecents(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list))
  } catch {
    /* storage unavailable: recents simply won't persist */
  }
}

/* ------------------------------------------------------------------ */

type Item =
  | { kind: 'phone'; key: string; phone: SuggestPhone }
  | { kind: 'intent'; key: string; label: string; href: string }
  | { kind: 'quick'; key: string; label: string; href: string; icon: LucideIcon }
  | { kind: 'recent'; key: string; label: string }
  | { kind: 'all'; key: string; label: string }

interface Props {
  /** 'bar' floats its suggestions under the input; 'sheet' renders them in the page flow (mobile). */
  variant?: 'bar' | 'sheet'
  autoFocus?: boolean
  /** Lets the shell focus the input from the / and Cmd+K shortcuts. */
  inputRef?: RefObject<HTMLInputElement | null>
  /** Called after any navigation the search triggers (used to close the mobile sheet). */
  onNavigate?: () => void
  /** Reports whether suggestions are showing (the sheet hides its other content while true). */
  onOpenChange?: (open: boolean) => void
}

export default function NavSearch({ variant = 'bar', autoFocus = false, inputRef, onNavigate, onOpenChange }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const listId = useId()

  const localRef = useRef<HTMLInputElement>(null)
  const ref = (inputRef ?? localRef) as RefObject<HTMLInputElement>
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const latestQuery = useRef('')

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SuggestPhone[]>([])
  const [searching, setSearching] = useState(false)
  const [focused, setFocused] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [recents, setRecents] = useState<string[]>([])

  const trimmed = query.trim()
  const optId = (i: number) => `${listId}-opt-${i}`

  // Read ?q= on the client; useSearchParams() would force a CSR bailout during prerender.
  useEffect(() => {
    setQuery(new URLSearchParams(window.location.search).get('q') ?? '')
  }, [pathname])

  useEffect(() => {
    setRecents(readRecents())
  }, [])

  useEffect(() => {
    if (!autoFocus) return
    const t = setTimeout(() => ref.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [autoFocus, ref])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  useEffect(() => {
    setActiveIdx(-1)
  }, [results, query])

  /* ---------- searching ---------- */

  const runSearch = useCallback((q: string) => {
    clearTimeout(timerRef.current)
    latestQuery.current = q

    if (!q.trim()) {
      setResults([])
      setSearching(false)
      return
    }

    setSearching(true)

    loadSearchIndex()
      .then(entries => {
        if (latestQuery.current !== q) return
        setResults(searchIndex(entries, q))
        setSearching(false)
      })
      .catch(() => {
        timerRef.current = setTimeout(async () => {
          try {
            const data = await api.phones.search({ q, page_size: 6 })
            if (latestQuery.current === q) setResults(data.results)
          } catch {
            if (latestQuery.current === q) setResults([])
          } finally {
            if (latestQuery.current === q) setSearching(false)
          }
        }, 280)
      })
  }, [])

  const intent = useMemo(() => resolveSearchIntent(query), [query])

  const items = useMemo<Item[]>(() => {
    if (!trimmed) {
      return [
        ...recents.map<Item>(r => ({ kind: 'recent', key: `r:${r}`, label: r })),
        ...QUICK_LINKS.map<Item>(q => ({ kind: 'quick', key: `q:${q.href}`, label: q.label, href: q.href, icon: q.icon })),
      ]
    }
    const list: Item[] = []
    if (intent) list.push({ kind: 'intent', key: 'intent', label: intent.label, href: intent.href })
    for (const phone of results) list.push({ kind: 'phone', key: `p:${phone.id}`, phone })
    list.push({ kind: 'all', key: 'all', label: trimmed })
    return list
  }, [trimmed, recents, intent, results])

  const expanded = variant === 'sheet' ? focused || trimmed.length > 0 : focused && items.length > 0

  useEffect(() => {
    onOpenChange?.(expanded)
  }, [expanded, onOpenChange])

  useEffect(() => {
    if (activeIdx < 0) return
    document.getElementById(optId(activeIdx))?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  /* ---------- actions ---------- */

  const remember = (text: string) => {
    const value = text.trim()
    if (!value) return
    const next = [value, ...recents.filter(r => r.toLowerCase() !== value.toLowerCase())].slice(0, RECENT_MAX)
    setRecents(next)
    writeRecents(next)
  }

  const clearRecents = () => {
    setRecents([])
    writeRecents([])
  }

  const go = (href: string) => {
    setFocused(false)
    setActiveIdx(-1)
    if (variant === 'bar') ref.current?.blur()
    onNavigate?.()
    router.push(href)
  }

  const searchAll = (text = trimmed) => {
    analytics.search(text, results.length)
    remember(text)
    go(ROUTES.search(text))
  }

  const activate = (item: Item) => {
    switch (item.kind) {
      case 'phone':
        analytics.searchSelect(query, item.phone)
        remember(item.phone.display_name)
        setQuery('')
        setResults([])
        go(item.phone.path)
        break
      case 'intent':
      case 'quick':
        go(item.href)
        break
      case 'recent':
        setQuery(item.label)
        searchAll(item.label)
        break
      case 'all':
        searchAll()
        break
    }
  }

  const submit = () => {
    const item = activeIdx >= 0 ? items[activeIdx] : undefined
    if (item) return activate(item)
    if (!trimmed) return
    // A phrase like "best camera under 500" never matches phone names, so jump straight to its page.
    if (intent && results.length === 0) return go(intent.href)
    searchAll()
  }

  const handleChange = (value: string) => {
    setQuery(value)
    setFocused(true)
    runSearch(value)
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setSearching(false)
    latestQuery.current = ''
    ref.current?.focus()
    if (pathname === '/') router.replace('/')
  }

  const handleBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setFocused(false)
      setActiveIdx(-1)
    }
  }

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        if (!items.length) return
        e.preventDefault()
        setFocused(true)
        setActiveIdx(i => (i + 1) % items.length)
        break
      case 'ArrowUp':
        if (!items.length) return
        e.preventDefault()
        setFocused(true)
        setActiveIdx(i => (i <= 0 ? items.length - 1 : i - 1))
        break
      case 'Escape':
        // In the mobile sheet Escape bubbles up and closes the whole sheet.
        if (variant !== 'bar') break
        if (expanded) {
          setFocused(false)
          setActiveIdx(-1)
        } else {
          ref.current?.blur()
        }
        break
    }
  }

  const status = searching
    ? 'Searching'
    : trimmed
      ? `${results.length} phone${results.length === 1 ? '' : 's'} found`
      : ''

  /* ---------- render ---------- */

  return (
    <div style={{ position: 'relative', width: '100%' }} onBlur={handleBlur}>
      <form
        role="search"
        style={{ margin: 0 }}
        onSubmit={e => {
          e.preventDefault()
          submit()
        }}
      >
        <div style={{ position: 'relative' }}>
          <Search size={15} className="nb-search-icon" aria-hidden="true" />

          <input
            ref={ref}
            type="search"
            role="combobox"
            aria-label="Search phones"
            aria-expanded={expanded}
            aria-controls={expanded ? listId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={expanded && activeIdx >= 0 ? optId(activeIdx) : undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            className="nb-input"
            value={query}
            placeholder={variant === 'bar' ? 'Search phones, or try “best camera under 500”' : 'Search phones'}
            onChange={e => handleChange(e.target.value)}
            onFocus={() => {
              setFocused(true)
              loadSearchIndex().catch(() => {})
            }}
            onKeyDown={handleKeyDown}
          />

          {query ? (
            <button
              type="button"
              className="nb-clear"
              aria-label="Clear search"
              onMouseDown={e => e.preventDefault()}
              onClick={handleClear}
            >
              <X size={14} aria-hidden="true" />
            </button>
          ) : (
            variant === 'bar' &&
            !focused && (
              <kbd className="nb-kbd" aria-hidden="true">
                /
              </kbd>
            )
          )}
        </div>
      </form>

      {expanded && (
        <div
          id={listId}
          role="listbox"
          aria-label="Search suggestions"
          className={`nb-listbox nb-listbox--${variant}`}
        >
          {items.map((item, i) => {
            const prev = items[i - 1]
            const header =
              item.kind === 'recent' && prev?.kind !== 'recent'
                ? 'Recent searches'
                : item.kind === 'quick' && prev?.kind !== 'quick'
                  ? 'Quick links'
                  : null
            const emptyMsg =
              item.kind === 'all' && results.length === 0
                ? searching
                  ? 'Searching…'
                  : trimmed.length > 1 && !intent
                    ? `No phones match “${trimmed}”`
                    : null
                : null

            return (
              <Fragment key={item.key}>
                {header && (
                  <div role="presentation" className="nb-opt-head">
                    <span>{header}</span>
                    {item.kind === 'recent' && (
                      <button
                        type="button"
                        className="nb-opt-clear"
                        onMouseDown={e => e.preventDefault()}
                        onClick={clearRecents}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}

                {emptyMsg && (
                  <div role="presentation" className="nb-opt-msg">
                    {emptyMsg}
                  </div>
                )}

                <div
                  id={optId(i)}
                  role="option"
                  aria-selected={i === activeIdx}
                  className="nb-opt"
                  onMouseDown={e => e.preventDefault()}
                  onMouseMove={() => activeIdx !== i && setActiveIdx(i)}
                  onClick={() => activate(item)}
                >
                  <OptionBody item={item} />
                </div>
              </Fragment>
            )
          })}
        </div>
      )}

      <div className="nb-sr" role="status" aria-live="polite">
        {status}
      </div>
    </div>
  )
}

function IconBox({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="nb-opt-icon">
      <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
    </span>
  )
}

function OptionBody({ item }: { item: Item }) {
  switch (item.kind) {
    case 'phone': {
      const { phone } = item
      return (
        <>
          <span className="nb-opt-icon">
            {phone.main_image_url && (
              <img
                src={phone.main_image_url}
                alt=""
                loading="lazy"
                decoding="async"
                style={{ width: 30, height: 30, objectFit: 'contain' }}
              />
            )}
          </span>
          <span className="nb-opt-text">
            <div className="nb-opt-sub">{phone.brand}</div>
            <div className="nb-opt-title">{phone.name}</div>
          </span>
          {phone.price_usd ? <span className="nb-opt-price">{formatUsd(phone.price_usd)}</span> : null}
        </>
      )
    }
    case 'intent':
      return (
        <>
          <IconBox icon={ArrowRight} />
          <span className="nb-opt-text">
            <div className="nb-opt-title">{item.label}</div>
            <div className="nb-opt-sub">Open this list</div>
          </span>
        </>
      )
    case 'quick':
      return (
        <>
          <IconBox icon={item.icon} />
          <span className="nb-opt-text">
            <div className="nb-opt-title">{item.label}</div>
          </span>
        </>
      )
    case 'recent':
      return (
        <>
          <IconBox icon={Clock} />
          <span className="nb-opt-text">
            <div className="nb-opt-title">{item.label}</div>
          </span>
        </>
      )
    case 'all':
      return (
        <>
          <IconBox icon={Search} />
          <span className="nb-opt-text">
            <div className="nb-opt-title">See all results for “{item.label}”</div>
          </span>
        </>
      )
  }
}
