import { SITE_URL } from '@/lib/config'
import { isDuplicateBrandPath } from '@/lib/dupes'
import { mainPaths } from '@/lib/sitemap-main'
import { collect, respond, xml } from '@/lib/sitemap-xml'

export const revalidate = 3600

export async function GET() {
  const [main, phones, brands, compares] = await Promise.all([
    mainPaths(),
    collect('phones'),
    collect('brands'),
    collect('compares'),
  ])

  const inMain = new Set(main)
  const paths = new Set<string>()
  for (const e of [...phones, ...brands, ...compares]) {
    if (!inMain.has(e.path) && !isDuplicateBrandPath(e.path)) paths.add(e.path)
  }

  const base = SITE_URL.replace(/\/$/, '')
  return respond(xml([...paths].map(path => ({ loc: `${base}${path}` }))))
}
