// app/brand/[brand]/[model]/page.tsx
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import PhoneDetailClient from '@/app/components/phone-detail/PhoneDetailClient'
import JsonLd from '@/app/components/JsonLd'
import { APIError, api, getPhoneBySlug } from '@/lib/api'
import { buildMetadata, firstSentence } from '@/lib/seo'
import { buildBreadcrumbList, buildProductNode } from '@/lib/structuredData'
import { tierLabel } from '@/lib/tiers'
import { ROUTES, SITE_URL } from '@/lib/config'
import type { PhoneDetail, RelatedResponse } from '@/lib/types'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ brand: string; model: string }>
}

async function resolveLegacyPath(brand: string, model: string): Promise<string | null> {
  for (const candidate of [model, `${brand}-${model}`]) {
    try {
      const found = await api.phones.resolve(candidate)
      return found.path
    } catch (err) {
      if (!(err instanceof APIError && err.isNotFound)) throw err
    }
  }
  return null
}

function phoneDescription(phone: PhoneDetail): string {
  const sentence = firstSentence(phone.analysis?.reasoning)
  const tier = tierLabel(phone.tier)
  if (phone.overall_score != null && sentence) {
    return `${phone.display_name}: Smart Score ${phone.overall_score.toFixed(1)}/10${tier ? ` (${tier})` : ''}. ${sentence}`
  }
  const parts = [
    phone.main_camera_mp ? `${phone.main_camera_mp}MP main camera` : null,
    phone.battery_capacity ? `${phone.battery_capacity.toLocaleString('en-US')}mAh battery` : null,
    phone.chipset,
    phone.screen_size ? `${phone.screen_size}" display` : null,
  ].filter(Boolean)
  const specLine = parts.length ? parts.join(', ') : 'full specifications'
  const score = phone.overall_score != null ? ` Smart Score ${phone.overall_score.toFixed(1)}/10.` : ''
  return `${phone.display_name}: ${specLine}.${score} Compare price and alternatives on Specmob.`
}

// Social previews truncate around 125 characters, so keep the meta description
// short. The full text is still used for the JSON-LD below.
function clip(text: string, max = 125): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  const base = lastSpace > 60 ? cut.slice(0, lastSpace) : cut
  return `${base.replace(/[\s,;:.\-\u2013]+$/, '')}\u2026`
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brand, model } = await params
  const phone = await getPhoneBySlug(brand, model)
  if (!phone) return { title: 'Phone not found', robots: { index: false, follow: true } }

  const title = `${phone.display_name}: ${phone.overall_score != null ? 'Specs, Price & Score' : 'Specs & Price'}`
  return buildMetadata({
    title,
    description: clip(phoneDescription(phone)),
    path: phone.path,
    // The generated 1200x630 card (./opengraph-image.tsx), NOT the raw phone
    // photo. A raw 160x212 photo is what showed up as og:image before.
    image: `${SITE_URL.replace(/\/$/, '')}${phone.path}/opengraph-image`,
    imageAlt: `${phone.display_name} specs, price and score`,
    noindex: !phone.seo.indexable,
  })
}

export default async function PhoneDetailPage({ params }: PageProps) {
  const { brand, model } = await params
  const phone = await getPhoneBySlug(brand, model)

  if (!phone) {
    const legacy = await resolveLegacyPath(brand, model)
    if (legacy) permanentRedirect(legacy)
    notFound()
  }

  if (phone.path !== ROUTES.phone(brand, model)) permanentRedirect(phone.path)

  const empty: RelatedResponse = { similar: [], compare_with: [], next_steps: [] }
  const [related, specsRes] = await Promise.all([
    api.phones.related(phone.id, 14).catch(() => empty),
    api.phones.fullSpecs(phone.id).catch(() => ({ phone_id: phone.id, full_specifications: null })),
  ])

  return (
    <>
      <JsonLd data={buildProductNode(phone, phoneDescription(phone))} />
      <JsonLd
        data={buildBreadcrumbList([
          { name: 'Home', path: ROUTES.home },
          { name: phone.brand, path: phone.brand_path },
          { name: phone.name, path: phone.path },
        ])}
      />
      <PhoneDetailClient
        key={phone.id}
        phone={phone}
        similar={related.similar}
        compareWith={related.compare_with}
        nextSteps={related.next_steps}
        fullSpecs={specsRes.full_specifications}
      />
    </>
  )
}
