import type { MetadataRoute } from 'next'
import { api } from '@/lib/api'
import { SITE_URL, ROUTES, brandSlug, phoneSlug, CATEGORY_META } from '@/lib/config'

export const revalidate = 86400

const PHONE_PAGE_SIZE = 100
const MAX_PHONE_PAGES = 100

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '/',          priority: 1.0, changeFrequency: 'daily' },
  { path: '/compare',   priority: 0.6, changeFrequency: 'weekly' },
  { path: '/pick',      priority: 0.7, changeFrequency: 'weekly' },
  { path: '/trade-in',  priority: 0.5, changeFrequency: 'weekly' },
  { path: '/about',     priority: 0.3, changeFrequency: 'monthly' },
  { path: '/contact',   priority: 0.2, changeFrequency: 'monthly' },
  { path: '/support',   priority: 0.2, changeFrequency: 'monthly' },
  { path: '/privacy',   priority: 0.1, changeFrequency: 'yearly' },
  { path: '/terms',     priority: 0.1, changeFrequency: 'yearly' },
]

async function getPhoneEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const first = await api.phones.search({
      page: 1, page_size: PHONE_PAGE_SIZE,
      sort_by: 'release_ts', sort_order: 'desc',
    })

    const totalPages = Math.min(Math.ceil(first.total / PHONE_PAGE_SIZE), MAX_PHONE_PAGES)
    const remainingPages = Array.from({ length: Math.max(totalPages - 1, 0) }, (_, i) => i + 2)

    const rest = await Promise.all(
      remainingPages.map(page =>
        api.phones
          .search({ page, page_size: PHONE_PAGE_SIZE, sort_by: 'release_ts', sort_order: 'desc' })
          .then(res => res.results)
          .catch(() => [])
      )
    )

    const allPhones = [...first.results, ...rest.flat()]
    return allPhones.map(phone => ({
      url: `${SITE_URL}${ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone))}`,
      lastModified: phone.price_updated_at ?? undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  } catch (err) {
    console.error('[sitemap] getPhoneEntries failed:', err)
    return []
  }
}

async function getBrandEntries(): Promise<MetadataRoute.Sitemap> {
  const { brands } = await api.brands.list()
  return brands.map(b => ({
    url: `${SITE_URL}${ROUTES.brand(brandSlug(b.brand))}`,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))
}

function getCategoryEntries(): MetadataRoute.Sitemap {
  return Object.keys(CATEGORY_META).map(slug => ({
    url: `${SITE_URL}${ROUTES.category(slug)}`,
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [phoneEntries, brandEntries] = await Promise.all([
    getPhoneEntries(),
    getBrandEntries().catch(() => []),
  ])


  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(r => ({
    url: `${SITE_URL}${r.path}`,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))

  return [...staticEntries, ...getCategoryEntries(), ...brandEntries, ...phoneEntries]
}
