import { SITE_NAME, SITE_URL } from './config'
import { absoluteUrl } from './seo'
import type { PhoneDetail, PhoneMini } from './types'

export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export function pageUrl(path: string): string {
  return `${SITE_URL}${path}`
}

export function buildBreadcrumbList(crumbs: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: pageUrl(c.path),
    })),
  }
}

export interface ListEntry {
  path: string
  name: string
}

export function buildItemList(name: string, entries: ListEntry[], description?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    ...(description && { description }),
    numberOfItems: entries.length,
    itemListElement: entries.map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: pageUrl(e.path),
      name: e.name,
    })),
  }
}

export function phoneEntries(phones: Pick<PhoneMini, 'path' | 'display_name'>[]): ListEntry[] {
  return phones.map(p => ({ path: p.path, name: p.display_name }))
}

export function buildCollectionPage(name: string, path: string, description: string, entries: ListEntry[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url: pageUrl(path),
    description,
    mainEntity: buildItemList(name, entries),
  }
}

export function buildWebSite() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
  }
}

export function buildOrganization(logoPath = '/logored.svg') {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl(logoPath),
  }
}

export function buildProductNode(phone: PhoneDetail, description: string) {
  const images = Array.from(
    new Set(
      [phone.main_image_url, ...phone.images.map(i => i.url)]
        .map(u => absoluteUrl(u))
        .filter((u): u is string => !!u),
    ),
  )
  const aggregate = phone.seo.aggregate_offer

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: phone.display_name,
    url: pageUrl(phone.path),
    description,
    brand: { '@type': 'Brand', name: phone.brand },
    ...(images.length > 0 && { image: images }),
    ...(aggregate && { offers: { ...aggregate, url: pageUrl(phone.path) } }),
  }
}
