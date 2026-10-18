import type { Metadata } from 'next'
import { SITE_NAME, SITE_URL } from './config'

export function absoluteUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  if (path.startsWith('//')) return `https:${path}`
  if (path.startsWith('/')) return `${SITE_URL}${path}`
  return null
}

export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,.;:\s]+$/, '')}…`
}

export function firstSentence(text: string | null | undefined): string | null {
  if (!text) return null
  const clean = text.replace(/\s+/g, ' ').trim()
  const match = clean.match(/^(.+?[.!?])(\s|$)/)
  return (match ? match[1] : clean) || null
}

export interface PageMetaInput {
  title: string
  description: string
  path: string
  image?: string | null
  imageAlt?: string
  noindex?: boolean
  absoluteTitle?: boolean
  type?: 'website' | 'article'
}

export function buildMetadata(input: PageMetaInput): Metadata {
  const description = truncate(input.description, 158)
  const canonical = input.path
  const image = absoluteUrl(input.image) ?? `${SITE_URL}/og-image.png`
  const fullTitle = input.absoluteTitle ? input.title : `${input.title} | ${SITE_NAME}`

  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description,
    alternates: { canonical },
    robots: input.noindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      type: input.type ?? 'website',
      url: `${SITE_URL}${canonical}`,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      images: [{ url: image, alt: input.imageAlt ?? input.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image],
    },
  }
}

export function noindexMetadata(path: string, title: string): Metadata {
  return {
    title,
    alternates: { canonical: path },
    robots: { index: false, follow: true },
  }
}

export function pickSearchParam(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = sp[key]
  return Array.isArray(v) ? v[0] : v
}

export function pageParam(sp: Record<string, string | string[] | undefined>): number {
  const n = parseInt(pickSearchParam(sp, 'page') ?? '1', 10)
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 500) : 1
}
