import { ROUTES, SITE_URL } from '@/lib/config'
import { isDuplicateBrandPath } from '@/lib/dupes'
import { collect, respond, splitPhones, today, xml, type U } from '@/lib/sitemap-xml'

export const revalidate = 3600

export async function GET() {
  const d = today()
  const [phones, cats] = await Promise.all([collect('phones'), collect('categories')])
  const { main } = splitPhones(phones.filter(p => !isDuplicateBrandPath(p.path)))

  const statics = [ROUTES.best, ROUTES.compare, ROUTES.pick, ROUTES.tradein, ROUTES.methodology, ROUTES.about]

  const urls: U[] = [
    { loc: SITE_URL, lastmod: d },
    ...statics.map(p => ({ loc: `${SITE_URL}${p}`, lastmod: d })),
    ...cats.map(e => ({ loc: `${SITE_URL}${e.path}`, lastmod: d })),
    ...main.map(e => ({ loc: `${SITE_URL}${e.path}`, lastmod: d })),
  ]
  return respond(xml(urls))
}
