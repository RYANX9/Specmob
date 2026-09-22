// app/brand/[brand]/[model]/page.tsx

import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { ROUTES, brandSlug, phoneSlug, stripBrandWord, stripBrandFromDisplayName } from '@/lib/config'
import { resolveDisplayPrice } from '@/lib/price'
import PhoneDetailClient from '@/app/components/phone-detail/PhoneDetailClient'
import type { Phone } from '@/lib/types'
import { api, getPhone } from '@/lib/api'

export const revalidate = 86400

interface PageProps {
  params: Promise<{ brand: string; model: string }>
}

function buildDescription(phone: Phone): string {
  const modelDisplayName = stripBrandFromDisplayName(phone.model_name, phone.brand)
  const fullDisplayName = `${phone.brand} ${modelDisplayName}`
  
  const parts = [
    phone.main_camera_mp ? `${phone.main_camera_mp}MP main camera` : null,
    phone.battery_capacity ? `${phone.battery_capacity.toLocaleString()}mAh battery` : null,
    phone.chipset,
    phone.screen_size ? `${phone.screen_size}" display` : null,
  ].filter(Boolean)
  const specLine = parts.length ? parts.join(', ') : `${fullDisplayName} specifications`
  return `${fullDisplayName}: ${specLine}. Compare prices, specs, and alternatives on Specmob.`
}

function buildProductJsonLd(phone: Phone, displayPrice: number | null): object {
  const modelDisplayName = stripBrandFromDisplayName(phone.model_name, phone.brand)
  const fullDisplayName = `${phone.brand} ${modelDisplayName}`

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: fullDisplayName,
    brand: { '@type': 'Brand', name: phone.brand },
    description: buildDescription(phone),
    ...(displayPrice != null && {
      offers: {
        '@type': 'Offer',
        price: displayPrice,
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: `https://specmob.vercel.app${ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone))}`,
      },
    }),
    ...(phone.main_image_url && { image: phone.main_image_url }),
  }
}

function buildBreadcrumbJsonLd(phone: Phone): object {
  const brandHref = `https://specmob.vercel.app${ROUTES.brand(brandSlug(phone.brand))}`
  const phoneHref = `https://specmob.vercel.app${ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone))}`
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://specmob.vercel.app' },
      { '@type': 'ListItem', position: 2, name: phone.brand, item: brandHref },
      { '@type': 'ListItem', position: 3, name: phone.model_name, item: phoneHref },
    ],
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brand, model } = await params
  const phone = await getPhone(`${brand}-${model}`)
  if (!phone) return { title: 'Phone not found' }

  const modelDisplayName = stripBrandFromDisplayName(phone.model_name, phone.brand)
  const fullDisplayName = `${phone.brand} ${modelDisplayName}`

  const title = `${fullDisplayName} — Specs & Price`
  const description = buildDescription(phone)

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: 'summary_large_image', title, description },
    alternates: {
      canonical: ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone)),
    },
  }
}

export default async function PhoneDetailPage({ params }: PageProps) {
  const { brand, model } = await params
  const phone = await getPhone(`${brand}-${model}`)
  if (!phone) notFound()

  const canonicalBrand = brandSlug(phone.brand)
  const canonicalModel = stripBrandWord(phoneSlug(phone), canonicalBrand)
  if (brand !== canonicalBrand || model !== canonicalModel) {
    permanentRedirect(ROUTES.phone(canonicalBrand, phoneSlug(phone)))
  }

  const [similarRes, fullSpecsRes] = await Promise.all([
    api.phones.similar(phone.id, 12).catch(() => ({ phones: [] as Phone[] })),
    api.phones.fullSpecs(phone.id).catch(() => ({ phone_id: phone.id, full_specifications: null })),
  ])

  const displayPrice = resolveDisplayPrice(phone)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildProductJsonLd(phone, displayPrice)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd(phone)) }}
      />
      <PhoneDetailClient
        key={phone.id}
        phone={phone}
        similar={similarRes.phones}
        initialFullSpecs={fullSpecsRes.full_specifications}
      />
    </>
  )
}
