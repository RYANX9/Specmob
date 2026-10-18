import { serializeJsonLd } from '@/lib/structuredData'

export default function JsonLd({ data }: { data: object | null | undefined }) {
  if (!data) return null
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}
