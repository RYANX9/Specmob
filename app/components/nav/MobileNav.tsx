import { ROUTES } from '@/lib/config'

export interface SearchIntent {
  label: string
  href: string
}

interface Topic {
  /** Ranking slug under ROUTES.category() */
  slug: string
  /** Value passed to /pick as the priority */
  pick: string
  /** Wording used in the suggestion label */
  name: string
  re: RegExp
}

const TOPICS: Topic[] = [
  { slug: 'camera-phones', pick: 'camera', name: 'camera', re: /\b(cameras?|photos?|photography)\b/ },
  { slug: 'battery-life', pick: 'battery', name: 'battery life', re: /\b(batter(y|ies)|battery life)\b/ },
  { slug: 'gaming-phones', pick: 'gaming', name: 'gaming', re: /\b(gaming|gamers?)\b/ },
  { slug: 'fast-charging', pick: 'charging', name: 'fast charging', re: /\b(fast charg(e|ing)|charging)\b/ },
  { slug: 'lightweight', pick: 'lightweight', name: 'lightweight', re: /\b(lightweight|lightest|light)\b/ },
  { slug: 'foldables', pick: 'foldable', name: 'foldable', re: /\b(foldables?|folding|flip|fold)\b/ },
  { slug: 'compact-phones', pick: 'compact', name: 'compact', re: /\b(compact|smallest|small|mini)\b/ },
]

/** Budgets that already have a dedicated ranking page. */
const BUDGET_PAGES = new Set([300, 500, 700])

/** Words that signal "I want a recommendation", so plain model searches are never hijacked. */
const RANKING_WORDS = /\b(best|top|good|great|cheap|cheapest|budget|under|below|less than|up to|max)\b/

const BUDGET_RE = /(?:under|below|less than|up to|max|budget(?: of)?|<)\s*\$?\s*(\d{2,4})\b|\$\s*(\d{2,4})\b/

function parseBudget(q: string): number | null {
  const m = q.match(BUDGET_RE)
  const n = m ? Number(m[1] ?? m[2]) : NaN
  return Number.isFinite(n) && n >= 50 ? n : null
}

function withParams(path: string, params: Record<string, string | number>): string {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()
  return `${path}${path.includes('?') ? '&' : '?'}${qs}`
}

/**
 * Turns phrases like "best camera under 500" into a destination.
 * Returns null for anything that looks like a normal phone-name search.
 *
 * NOTE: the /pick query parameter names (budget, priority) are defined here and
 * nowhere else. Adjust them if the Help Me Choose page reads different ones.
 */
export function resolveSearchIntent(raw: string): SearchIntent | null {
  const q = raw.trim().toLowerCase()
  if (q.length < 4) return null

  if (/^compare\b/.test(q) && !RANKING_WORDS.test(q)) {
    return { label: 'Compare phones', href: '/compare' }
  }

  const budget = parseBudget(q)
  const topic = TOPICS.find(t => t.re.test(q))
  const wantsRanking = RANKING_WORDS.test(q)

  if (!wantsRanking && budget === null) return null

  if (topic && budget !== null) {
    return {
      label: `Best ${topic.name} phones under $${budget}`,
      href: withParams(ROUTES.pick, { budget, priority: topic.pick }),
    }
  }

  if (budget !== null) {
    if (BUDGET_PAGES.has(budget)) {
      return { label: `Phones under $${budget}`, href: ROUTES.category(`under-${budget}`) }
    }
    return { label: `Best phones under $${budget}`, href: withParams(ROUTES.pick, { budget }) }
  }

  if (topic) {
    return { label: `Best ${topic.name} phones`, href: ROUTES.category(topic.slug) }
  }

  if (/^(best|top)\b/.test(q)) {
    return { label: 'Best phones, all rankings', href: ROUTES.best }
  }

  return null
}
