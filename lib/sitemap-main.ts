import { api } from '@/lib/api'
import { ROUTES } from '@/lib/config'
import { isDuplicateBrandPath } from '@/lib/dupes'
import type { BestHubTile, ComparePair, HomeBlock, Phone } from '@/lib/types'

const MAX_URLS = 100
const MAX_COMPARES = 25
const MAX_UPCOMING = 8
const PROVEN = ['/brand/xiaomi/redmi-turbo-3', '/brand/xiaomi/redmi-15c']

function blockItems<T>(blocks: HomeBlock[], id: HomeBlock['id']): T[] {
  return (blocks.find(b => b.id === id)?.items ?? []) as unknown as T[]
}

/** The curated first-submission list. The rest sitemap uses it to avoid overlap. */
export async function mainPaths(): Promise<string[]> {
  const [home, landing, latest, trending] = await Promise.all([
    api.discover.home(),
    api.discover.compareLanding(),
    api.phones.latest(30),
    api.phones.trending(30),
  ])

  const blocks = home.blocks
  const paths = new Set<string>()
  const add = (path: string | null | undefined) => {
    if (path && paths.size < MAX_URLS && !isDuplicateBrandPath(path)) paths.add(path)
  }

  ;[ROUTES.home, ROUTES.best, ROUTES.pick, ROUTES.compare, ROUTES.brands, ROUTES.tradein, ROUTES.methodology, ROUTES.about].forEach(add)

  blockItems<BestHubTile>(blocks, 'categories')
    .filter(t => t.indexable)
    .forEach(t => add(t.path))

  const pairs = new Map<string, ComparePair>()
  for (const p of [...blockItems<ComparePair>(blocks, 'most_compared'), ...landing.most_compared]) pairs.set(p.path, p)
  ;[...pairs.keys()].slice(0, MAX_COMPARES).forEach(add)

  PROVEN.forEach(add)

  const phones: (Phone | { path: string })[] = [
    ...blockItems<Phone>(blocks, 'most_viewed'),
    ...trending.phones,
    ...blockItems<Phone>(blocks, 'new_releases'),
    ...latest.phones,
    ...blockItems<Phone>(blocks, 'coming_soon').slice(0, MAX_UPCOMING),
  ]
  phones.forEach(p => add(p.path))

  return [...paths]
}
