import type { MetadataRoute } from 'next'
import { api } from '@/lib/api'
import { SITE_URL, ROUTES, brandSlug, phoneSlug, CATEGORY_META } from '@/lib/config'

export const revalidate = 86400

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

function safeDate(dateStr?: string | null): Date {
  if (dateStr) {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) return d
  }
  return new Date() // Fallback to current date if missing/invalid
}

async function getPhoneEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const { phones } = await api.phones.slugs()
    if (!Array.isArray(phones)) return []

    return phones.map(phone => {
      const rawPath = ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone))
      const cleanUrl = `${SITE_URL}${rawPath}`

      return {
        url: encodeURI(cleanUrl),
        lastModified: safeDate(phone.price_updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }
    })
  } catch (err) {
    console.error('[sitemap] getPhoneEntries failed:', err)
    return []
  }
}

async function getBrandEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const { brands } = await api.brands.list()
    if (!Array.isArray(brands)) return []

    return brands.map(b => ({
      url: encodeURI(`${SITE_URL}${ROUTES.brand(brandSlug(b.brand))}`),
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))
  } catch (err) {
    console.error('[sitemap] getBrandEntries failed:', err)
    return []
  }
}

function getCategoryEntries(): MetadataRoute.Sitemap {
  return Object.keys(CATEGORY_META).map(slug => ({
    url: encodeURI(`${SITE_URL}${ROUTES.category(slug)}`),
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [phoneEntries, brandEntries] = await Promise.all([
    getPhoneEntries(),
    getBrandEntries(),
  ])

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(r => ({
    url: encodeURI(`${SITE_URL}${r.path}`),
    lastModified: new Date(),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))

  return [...staticEntries, ...getCategoryEntries(), ...brandEntries, ...phoneEntries]
}
