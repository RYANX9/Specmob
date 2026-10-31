import type { CategoryDetail } from './types'

interface CategoryCopy {
  lead: string
  topic: string
  basis: string
}

const COPY: Record<string, CategoryCopy> = {
  'camera-phones': { lead: 'Best camera phone', topic: 'best camera phone', basis: 'camera hardware' },
  'battery-life': { lead: 'Longest battery life', topic: 'phone with the longest battery life', basis: 'estimated battery life' },
  'gaming-phones': { lead: 'Best gaming phone', topic: 'best gaming phone', basis: 'gaming performance' },
  'fast-charging': { lead: 'Fastest charging', topic: 'fastest-charging phone', basis: 'estimated charging speed' },
  lightweight: { lead: 'Lightest phone', topic: 'lightest smartphone', basis: 'weight and overall score' },
  'compact-phones': { lead: 'Best compact phone', topic: 'best compact phone', basis: 'size and quality' },
  foldables: { lead: 'Best foldable', topic: 'best foldable phone', basis: 'overall score' },
  'water-resistant': { lead: 'Best water-resistant phone', topic: 'best water-resistant phone', basis: 'overall score' },
  'under-300': { lead: 'Best phone under $300', topic: 'best phone under $300', basis: 'performance, battery, display and build' },
  'under-500': { lead: 'Best phone under $500', topic: 'best phone under $500', basis: 'performance, battery, display and build' },
  'under-700': { lead: 'Best phone under $700', topic: 'best phone under $700', basis: 'performance, battery, display and build' },
}

const TITLE_BUDGET = 50
const DESCRIPTION_BUDGET = 155

const firstFit = (candidates: string[], budget: number): string =>
  candidates.find(c => c.length <= budget) ?? candidates[candidates.length - 1]

function copyFor(data: CategoryDetail): CategoryCopy {
  const lower = data.title.toLowerCase()
  return COPY[data.slug] ?? { lead: data.title, topic: '', basis: 'our scoring' }
}

export function categoryTitle(data: CategoryDetail, year: number): string {
  const n = data.phones.length
  return firstFit(
    [
      ...(n >= 3 ? [`${data.title} (${year}): Top ${n} Ranked`] : []),
      `${data.title} (${year})`,
    ],
    TITLE_BUDGET,
  )
}

function leaderClause(names: string[], topic: string, title: string): string {
  const [first, second, third] = names
  const head = topic ? `${first} is the ${topic} right now` : `${first} is #1 in our ${title} ranking`
  if (third) return `${head}, followed by ${second} and ${third}`
  if (second) return `${head}, followed by ${second}`
  return head
}

export function categoryLede(data: CategoryDetail): string {
  const names = data.phones.slice(0, 3).map(p => p.display_name)
  if (!names.length) return ''
  const { topic, basis } = copyFor(data)
  return `${leaderClause(names, topic, data.title)}. All ${data.phones.length} phones are ranked below on ${basis}, with current prices.`
}

export function categoryDescription(data: CategoryDetail): string {
  const names = data.phones.slice(0, 3).map(p => p.display_name)
  const n = data.phones.length
  const { lead, basis } = copyFor(data)
  if (!names.length) return `${data.title}: ranked on specifications, never on sponsors.`

  const [t1, t2, t3] = names
  const all = n >= 5 ? `All ${n} ranked` : 'Full ranking'
  const seeAll = n >= 5 ? `See all ${n}` : 'See the full ranking'
  return firstFit(
    [
      ...(t3 ? [`${lead}: ${t1}. Then ${t2} and ${t3}. ${all} on ${basis}, with prices.`] : []),
      ...(t3 ? [`${lead}: ${t1}. Then ${t2} and ${t3}. ${seeAll}, with prices.`] : []),
      ...(t2 ? [`${lead}: ${t1}. Then ${t2}. ${seeAll}, with prices.`] : []),
      `${lead}: ${t1}. ${seeAll}, with prices.`,
    ],
    DESCRIPTION_BUDGET,
  )
}
