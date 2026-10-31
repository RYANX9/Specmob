import { SITE_URL } from '@/lib/config'
import { isDuplicateBrandPath } from '@/lib/dupes'
import { collect, respond, xml } from '@/lib/sitemap-xml'

export const revalidate = 3600

export async function GET() {
  const phones = await collect('phones')
  const seen = new Set<string>()

  for (const p of phones) {
    if (isDuplicateBrandPath(p.path)) {
      seen.add(p.path)
      continue
    }
    const m = p.path.match(/^\/brand\/([^/]+)\/([^/]+)\/?$/)
    if (!m) continue
    const [, brand, slug] = m
    const dupe = `/brand/${brand}/${brand}-${slug}`
    if (isDuplicateBrandPath(dupe)) seen.add(dupe)
  }

  return respond(xml([...seen].map(path => ({ loc: `${SITE_URL}${path}` }))))
}
