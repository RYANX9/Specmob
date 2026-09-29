// app/brand/[brand]/[model]/page.tsx
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { ROUTES, SITE_URL, brandSlug, phoneSlug, stripBrandWord, buildFullDisplayName } from '@/lib/config'
import PhoneDetailClient from '@/app/components/phone-detail/PhoneDetailClient'
import JsonLd from '@/app/components/JsonLd'
import { api, getPhone } from '@/lib/api'
import { buildBreadcrumbList, buildPhoneDescription, buildProductNode, phoneUrl } from '@/lib/structuredData'
import type { Phone } from '@/lib/types'

export const revalidate = 86400

const SITE_NAME = 'Specmob'

interface PageProps {
  params: Promise<{ brand: string; model: string }>
}

interface ResolvedPhone {
  phone: Phone
  isCanonicalSlug: boolean
}

async function resolvePhone(brand: string, model: string): Promise<ResolvedPhone | null> {
  const phone = await getPhone(`${brand}-${model}`)
  if (phone) return { phone, isCanonicalSlug: true }

  if (model.startsWith(`${brand}-`)) {
    const legacyPhone = await getPhone(model)
    if (legacyPhone) return { phone: legacyPhone, isCanonicalSlug: false }
  }

  return null
}

function buildProductJsonLd(phone: Phone) {
  const gallery = (phone.images ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(img => img.image_url)

  return {
    '@context': 'https://schema.org',
    ...buildProductNode(phone, {
      images: gallery,
      availabilityStatus: phone.availability_status,
    }),
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brand, model } = await params
  const resolved = await resolvePhone(brand, model)
  if (!resolved) return { title: 'Phone not found' }

  const { phone } = resolved
  const titleSuffix = phone.smart_score ? 'Specs, Price & Score' : 'Specs & Price'
  const title = `${buildFullDisplayName(phone)} — ${titleSuffix}`
  const description = buildPhoneDescription(phone)

  return {
    title,
    description,
    openGraph: { title, description, siteName: SITE_NAME },
    twitter: { card: 'summary_large_image', title, description },
    alternates: {
      canonical: ROUTES.phone(brandSlug(phone.brand), phoneSlug(phone)),
    },
  }
}

export default async function PhoneDetailPage({ params }: PageProps) {
  const { brand, model } = await params
  const resolved = await resolvePhone(brand, model)
  if (!resolved) notFound()

  const { phone, isCanonicalSlug } = resolved
  const canonicalBrand = brandSlug(phone.brand)
  const canonicalModel = stripBrandWord(phoneSlug(phone), canonicalBrand)

  if (!isCanonicalSlug || brand !== canonicalBrand || model !== canonicalModel) {
    permanentRedirect(ROUTES.phone(canonicalBrand, phoneSlug(phone)))
  }

  const [similarRes, fullSpecsRes] = await Promise.all([
    api.phones.similar(phone.id, 12).catch(() => ({ phones: [] as Phone[] })),
    api.phones.fullSpecs(phone.id).catch(() => ({ phone_id: phone.id, full_specifications: null })),
  ])

  return (
    <>
      <JsonLd data={buildProductJsonLd(phone)} />
      <JsonLd
        data={buildBreadcrumbList([
          { name: 'Home', url: SITE_URL },
          { name: phone.brand, url: `${SITE_URL}${ROUTES.brand(canonicalBrand)}` },
          { name: buildFullDisplayName(phone), url: phoneUrl(phone) },
        ])}
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
