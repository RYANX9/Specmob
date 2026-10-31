import { SITE_URL } from '@/lib/config'
import { mainPaths } from '@/lib/sitemap-main'
import { respond, xml } from '@/lib/sitemap-xml'

export const revalidate = 3600

export async function GET() {
  const base = SITE_URL.replace(/\/$/, '')
  const paths = await mainPaths()
  return respond(xml(paths.map(path => ({ loc: `${base}${path}` }))))
}
