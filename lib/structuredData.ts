import { SITE_URL, ROUTES, brandSlug, phoneSlug, buildFullDisplayName } from '@/lib/config'
import { resolveDisplayPrice } from '@/lib/price'
import type { Phone } from '@/lib/types'

function absoluteUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('//')) return `https:${url}`
  if (url.startsWith('/')) return `${SITE_URL}${url}`
  return null
}

function roundPrice(value: number): number {
  return Math.round(value * 100) / 100
}

export function phoneUrl(phone: Pick<Phone, 'brand' | 'id' | 'model_name' | 'slug'>): string {
  return `${SITE_URL}${ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone))}`
}

export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export function schemaAvailability(status: string | null | undefined): string | undefined {
  if (!status) return undefined
  const s = status.toLowerCase()
  if (/discontinu|no longer|out of stock|unavailable/.test(s)) return 'https://schema.org/OutOfStock'
  if (/coming soon|upcoming|announced|pre-?order|rumou?r/.test(s)) return 'https://schema.org/PreOrder'
  if (/^available$|in stock|available now/.test(s)) return 'https://schema.org/InStock'
  return undefined
}

export function buildPhoneDescription(phone: Partial<Phone> & { brand: string; model_name: string }): string {
  const name = buildFullDisplayName(phone)
  const parts = [
    phone.main_camera_mp ? `${phone.main_camera_mp}MP main camera` : null,
    phone.battery_capacity ? `${phone.battery_capacity.toLocaleString('en-US')}mAh battery` : null,
    phone.chipset,
    phone.screen_size ? `${phone.screen_size}" display` : null,
  ].filter(Boolean)
  const specLine = parts.length ? parts.join(', ') : 'specifications'
  return `${name}: ${specLine}. Compare prices, specs, and alternatives on Specmob.`
}

interface ProductNodeOptions {
  images?: (string | null | undefined)[]
  availabilityStatus?: string | null
}

export function buildProductNode(phone: Phone, opts: ProductNodeOptions = {}) {
  const url = phoneUrl(phone)
  const images = Array.from(
    new Set(
      [phone.main_image_url, ...(opts.images ?? [])]
        .map(absoluteUrl)
        .filter((u): u is string => !!u),
    ),
  )
  const price = resolveDisplayPrice(phone)
  const availability = schemaAvailability(opts.availabilityStatus ?? phone.availability_status)

  return {
    '@type': 'Product',
    name: buildFullDisplayName(phone),
    url,
    description: buildPhoneDescription(phone),
    brand: { '@type': 'Brand', name: phone.brand },
    ...(images.length > 0 && { image: images }),
    ...(price != null && price > 0 && {
      offers: {
        '@type': 'Offer',
        url,
        price: roundPrice(price),
        priceCurrency: 'USD',
        ...(availability && { availability }),
      },
    }),
  }
}

export function buildProductItemList(name: string, phones: Phone[], description?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    ...(description && { description }),
    numberOfItems: phones.length,
    itemListElement: phones.map((phone, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: phoneUrl(phone),
      item: buildProductNode(phone),
    })),
  }
}

export function buildBreadcrumbList(crumbs: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  }
}
