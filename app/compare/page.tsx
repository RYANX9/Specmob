// app/compare/page.tsx
import CompareClient, { type PairCard } from '@/app/components/compare/CompareClient'
import JsonLd from '@/app/components/JsonLd'
import { api } from '@/lib/api'
import { ROUTES } from '@/lib/config'
import { buildBreadcrumbList, buildItemList } from '@/lib/structuredData'
import type { CompareLandingResponse } from '@/lib/types'

export const revalidate = 900

async function getLanding(): Promise<CompareLandingResponse | null> {
  try {
    return await api.discover.compareLanding()
  } catch {
    return null
  }
}

export default async function ComparePage() {
  const landing = await getLanding()

  const suggested: PairCard[] = (landing?.most_compared ?? []).map(p => ({ path: p.path, phones: p.phones }))
  const matchups: PairCard[] = (landing?.category_matchups ?? [])
    .filter(m => m.phones.length >= 2)
    .map(m => {
      const top = m.phones.slice(0, 2)
      return { path: ROUTES.comparePair(...top.map(p => p.full_slug)), phones: top, label: m.category.title }
    })

  return (
    <>
      <JsonLd data={buildBreadcrumbList([{ name: 'Home', path: ROUTES.home }, { name: 'Compare', path: ROUTES.compare }])} />
      <JsonLd data={suggested.length ? buildItemList('Most compared phones', suggested.map(s => ({ path: s.path, name: s.phones.map(p => p.display_name).join(' vs ') }))) : null} />
      <CompareClient initialPhones={[]} suggested={suggested} matchups={matchups} nextSteps={landing?.next_steps ?? []} />
    </>
  )
}
