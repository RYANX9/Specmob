// app/search/page.tsx
import type { Metadata } from 'next'
import { api } from '@/lib/api'
import { noindexMetadata, pageParam, pickSearchParam } from '@/lib/seo'
import SearchResultsClient from '@/app/components/search/SearchResultsClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const q = pickSearchParam(await searchParams, 'q')?.trim()
  return noindexMetadata('/search', q ? `Search results for "${q}"` : 'Search phones')
}

export default async function SearchPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const q = (pickSearchParam(sp, 'q') ?? '').trim().slice(0, 100)
  const page = pageParam(sp)

  const data = q
    ? await api.phones.search({ q, page, page_size: 24 }).catch(() => null)
    : null

  return <SearchResultsClient q={q} page={page} data={data} failed={!!q && !data} />
}
