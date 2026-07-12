import type { Phone } from './types'

export function stripHtml(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&deg;/g, '°')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&times;/g, '×')
    .replace(/&copy;/g, '©')
    .replace(/&reg;/g, '®')
    .replace(/&trade;/g, '™')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function specValueToString(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'string') return stripHtml(v) || '—'
  if (Array.isArray(v)) return v.map(specValueToString).filter(s => s !== '—').join(', ') || '—'
  if (typeof v === 'object') {
    return Object.entries(v as Record<string, unknown>)
      .filter(([, val]) => {
        const s = String(val ?? '')
        return !s.startsWith('http') && s !== 'null' && s !== ''
      })
      .map(([k, val]) => `${k}: ${specValueToString(val)}`)
      .join(' · ') || '—'
  }
  return String(v)
}

function specRoot(phone: { full_specifications?: any }): Record<string, any> | null {
  const fs = phone.full_specifications as any
  if (!fs || typeof fs !== 'object') return null
  return fs.specifications && typeof fs.specifications === 'object' ? fs.specifications : fs
}

/** Searches spec groups by name (substring match); within matched groups tries
 * each field name in priority order, returns the first hit. */
export function findSpecValue(
  phone: { full_specifications?: any },
  groupNames: string[],
  fieldNames: string[],
): string | null {
  const root = specRoot(phone)
  if (!root) return null

  const matchedGroups = Object.entries(root).filter(
    ([groupName, groupVal]) =>
      groupVal && typeof groupVal === 'object' && !Array.isArray(groupVal) &&
      groupNames.some(g => groupName.toLowerCase().includes(g.toLowerCase())),
  ) as [string, Record<string, unknown>][]

  for (const wanted of fieldNames) {
    for (const [, groupVal] of matchedGroups) {
      const entry = Object.entries(groupVal).find(([fieldName]) =>
        fieldName.toLowerCase().includes(wanted.toLowerCase()),
      )
      if (entry) {
        const str = specValueToString(entry[1])
        if (str && str !== '—') return str
      }
    }
  }
  return null
}

export function getPanelType(phone: Phone): string {
  const qs = (phone.full_specifications as any)?.quick_specs?.displaytype
  if (qs) return stripHtml(String(qs))
  return findSpecValue(phone, ['Display', 'Screen'], ['Type', 'Panel']) ?? '—'
}

export function getFrontCamera(phone: Phone): string {
  const qs = (phone.full_specifications as any)?.quick_specs?.cam2modules
  if (qs) return stripHtml(String(qs))
  return findSpecValue(
    phone,
    ['Selfie Camera', 'Front Camera', 'Secondary Camera'],
    ['Single', 'Dual', 'Triple', 'Quad'],
  ) ?? '—'
}
