import type { MetadataRoute } from 'next'
import { api } from '@/lib/api'
import { ROUTES, SITE_URL } from '@/lib/config'
import type { SitemapEntry, SitemapSection } from '@/lib/types'

export const revalidate = 3600

const PAGE_SIZE = 5000

// Bump this only when page content, templates or metadata really change.
// Do not use new Date(): the sitemap revalidates hourly, so every page would
// report as modified every hour and Bing would learn to ignore lastmod.
const CONTENT_UPDATED = new Date('2026-10-11T00:00:00Z')

async function collect(section: SitemapSection['section']): Promise<SitemapEntry[]> {
  const entries: SitemapEntry[] = []
  try {
    const first = await api.seo.sitemap(section, 1, PAGE_SIZE)
    entries.push(...first.entries)
    for (let page = 2; page <= first.pages; page++) {
      const next = await api.seo.sitemap(section, page, PAGE_SIZE)
      entries.push(...next.entries)
    }
  } catch {
    return entries
  }
  return entries
}

function toEntry(
  e: SitemapEntry,
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
  priority: number,
): MetadataRoute.Sitemap[number] {
  // Later of the real data change and the last template/metadata change.
  const dataDate = e.lastmod ? new Date(e.lastmod) : null
  const lastModified =
    dataDate && !Number.isNaN(dataDate.getTime()) && dataDate > CONTENT_UPDATED
      ? dataDate
      : CONTENT_UPDATED

  return {
    url: `${SITE_URL}${e.path}`,
    lastModified,
    changeFrequency,
    priority,
    ...(e.image && { images: [e.image] }),
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [phones, brands, categories, compares] = await Promise.all([
    collect('phones'),
    collect('brands'),
    collect('categories'),
    collect('compares'),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: CONTENT_UPDATED, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}${ROUTES.best}`, lastModified: CONTENT_UPDATED, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}${ROUTES.brands}`, lastModified: CONTENT_UPDATED, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}${ROUTES.compare}`, lastModified: CONTENT_UPDATED, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}${ROUTES.pick}`, lastModified: CONTENT_UPDATED, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}${ROUTES.tradein}`, lastModified: CONTENT_UPDATED, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}${ROUTES.methodology}`, lastModified: CONTENT_UPDATED, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}${ROUTES.about}`, lastModified: CONTENT_UPDATED, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}${ROUTES.contact}`, lastModified: CONTENT_UPDATED, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}${ROUTES.support}`, lastModified: CONTENT_UPDATED, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}${ROUTES.privacy}`, lastModified: CONTENT_UPDATED, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}${ROUTES.terms}`, lastModified: CONTENT_UPDATED, changeFrequency: 'yearly', priority: 0.2 },
  ]

  return [
    ...staticRoutes,
    ...categories.map(e => toEntry(e, 'daily', 0.9)),
    ...brands.map(e => toEntry(e, 'weekly', 0.8)),
    ...phones.map(e => toEntry(e, 'weekly', 0.7)),
    ...compares.map(e => toEntry(e, 'weekly', 0.5)),
  ]
}
