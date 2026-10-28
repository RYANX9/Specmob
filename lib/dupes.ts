// Real slugs that legitimately start with their brand name, as 'brand/slug'.
// Anything NOT listed here and shaped /brand/X/X-... is treated as a dead duplicate.
export const KEEP = new Set<string>(['honor/honor-x9b'])

export function isDuplicateBrandPath(pathname: string): boolean {
  const m = pathname.match(/^\/brand\/([^/]+)\/([^/]+)\/?$/)
  if (!m) return false
  const [, brand, slug] = m
  return slug.startsWith(brand + '-') && !KEEP.has(`${brand}/${slug}`)
}
