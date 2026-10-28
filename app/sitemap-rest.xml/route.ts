import { SITE_URL } from '@/lib/config'
import { isDuplicateBrandPath } from '@/lib/dupes'
import { collect, respond, splitPhones, today, xml } from '@/lib/sitemap-xml'

export const revalidate = 3600

export async function GET() {
  const d = today()
  const [phones, brands, compares] = await Promise.all([
    collect('phones'),
    collect('brands'),
    collect('compares'),
  ])
  const { rest } = splitPhones(phones.filter(p => !isDuplicateBrandPath(p.path)))

  return respond(
    xml([
      ...rest.map(e => ({ loc: `${SITE_URL}${e.path}`, lastmod: d })),
      ...brands.map(e => ({ loc: `${SITE_URL}${e.path}`, lastmod: d })),
      ...compares.map(e => ({ loc: `${SITE_URL}${e.path}`, lastmod: d })),
    ]),
  )
}
