import { api } from './api'

export interface SuggestPhone {
  id: number
  brand: string
  name: string
  display_name: string
  path: string
  price_usd: number | null
  main_image_url: string | null
}

interface Entry {
  phone: SuggestPhone
  hay: string
  lname: string
}

let pending: Promise<Entry[]> | null = null

export function loadSearchIndex(): Promise<Entry[]> {
  pending ??= api.phones.searchIndex().then(res =>
    res.phones.map(r => {
      const prefix = r.b.toLowerCase() + ' '
      const name = r.n.toLowerCase().startsWith(prefix) ? r.n.slice(prefix.length) : r.n
      const lname = r.n.toLowerCase()
      return {
        phone: { id: r.id, brand: r.b, name, display_name: r.n, path: r.p, price_usd: r.u, main_image_url: r.i },
        hay: `${r.b} ${r.n}`.toLowerCase(),
        lname,
      }
    }),
  ).catch(err => {
    pending = null
    throw err
  })
  return pending
}

export function searchIndex(entries: Entry[], query: string, limit = 6): SuggestPhone[] {
  const q = query.trim().toLowerCase()
  const tokens = q.split(/[^a-z0-9+]+/).filter(Boolean)
  if (!tokens.length) return []
  const hits: { phone: SuggestPhone; rank: number; i: number }[] = []
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    if (!tokens.every(t => e.hay.includes(t))) continue
    const rank = e.lname === q ? 3 : e.lname.startsWith(q) ? 2 : 1
    hits.push({ phone: e.phone, rank, i })
  }
  hits.sort((a, b) => b.rank - a.rank || a.i - b.i)
  return hits.slice(0, limit).map(h => h.phone)
}
