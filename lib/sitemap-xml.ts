import { api } from '@/lib/api'
import type { SitemapEntry, SitemapSection } from '@/lib/types'

export type U = { loc: string; lastmod?: string }

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const xml = (urls: U[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls
    .map(u => `<url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`)
    .join('\n') +
  `\n</urlset>`

export const respond = (body: string) =>
  new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })

export async function collect(section: SitemapSection['section']): Promise<SitemapEntry[]> {
  const out: SitemapEntry[] = []
  try {
    const first = await api.seo.sitemap(section, 1, 5000)
    out.push(...first.entries)
    for (let p = 2; p <= first.pages; p++) {
      out.push(...(await api.seo.sitemap(section, p, 5000)).entries)
    }
  } catch {
    /* return whatever we got */
  }
  return out
}

// Bump only when templates/content really change.
export const today = () => '2026-10-28'

// Same selection logic for main and rest, so they never overlap.
// Newest by lastmod is only a proxy. If your API exposes release date, sort by that.
const NEWEST = 100
const PROVEN = ['/brand/xiaomi/redmi-turbo-3', '/brand/xiaomi/redmi-15c']

export function splitPhones(phones: SitemapEntry[]) {
  const sorted = [...phones].sort((a, b) => +new Date(b.lastmod ?? 0) - +new Date(a.lastmod ?? 0))
  const main = new Map<string, SitemapEntry>()
  for (const p of sorted.slice(0, NEWEST)) main.set(p.path, p)
  for (const p of phones) if (PROVEN.includes(p.path)) main.set(p.path, p)
  const rest = phones.filter(p => !main.has(p.path))
  return { main: [...main.values()], rest }
}
