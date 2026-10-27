import {
  Camera, Battery, Zap, Tag, Feather, Bolt, Smartphone, Layers, Droplets, BarChart3,
} from 'lucide-react'

export interface CategoryPalette {
  bg: string
  iconBg: string
  iconColor: string
}

const PALETTE: CategoryPalette[] = [
  { bg: '#FCEAEA', iconBg: '#F6C9CC', iconColor: '#B32A38' },
  { bg: '#EAF3ED', iconBg: '#C9E3D2', iconColor: '#1F7A56' },
  { bg: '#EEEAF7', iconBg: '#D6CCEF', iconColor: '#5B3FA6' },
  { bg: '#F6EEE0', iconBg: '#EAD8B4', iconColor: '#A97A2F' },
  { bg: '#EAEDFA', iconBg: '#C9D2F2', iconColor: '#3457C7' },
  { bg: '#EAF6F5', iconBg: '#C6E8E5', iconColor: '#1F7A75' },
  { bg: '#F7EFEA', iconBg: '#EED9C9', iconColor: '#B0562E' },
  { bg: '#F0EEE7', iconBg: '#DAD5C6', iconColor: '#5C574A' },
  { bg: '#EDF2F7', iconBg: '#CADAE8', iconColor: '#2E6390' },
  { bg: '#F3EAF4', iconBg: '#E3C9E8', iconColor: '#8A3F9B' },
]

const ORDER = [
  'camera-phones', 'battery-life', 'gaming-phones', 'fast-charging', 'lightweight',
  'compact-phones', 'foldables', 'water-resistant', 'under-300', 'under-500', 'under-700',
]

export function paletteFor(slug: string): CategoryPalette {
  const idx = ORDER.indexOf(slug)
  return PALETTE[(idx === -1 ? ORDER.length : idx) % PALETTE.length]
}

export function categoryIcon(slug: string, size = 16): React.ReactNode {
  const p = { size, strokeWidth: 1.5 }
  switch (slug) {
    case 'camera-phones': return <Camera {...p} />
    case 'battery-life': return <Battery {...p} />
    case 'gaming-phones': return <Zap {...p} />
    case 'fast-charging': return <Bolt {...p} />
    case 'lightweight': return <Feather {...p} />
    case 'compact-phones': return <Smartphone {...p} />
    case 'foldables': return <Layers {...p} />
    case 'water-resistant': return <Droplets {...p} />
    case 'under-300':
    case 'under-500':
    case 'under-700': return <Tag {...p} />
    default: return <BarChart3 {...p} />
  }
}

export function shortLabel(title: string): string {
  if (/^Lightest\b/i.test(title)) return 'Lightweight'
  if (/^Fastest Charging/i.test(title)) return 'Fast Charging'
  const under = title.match(/Under \$[\d,]+/i)
  if (under) return under[0]
  return (
    title
      .replace(/^Best\s+/i, '')
      .replace(/\s+(Smartphones|Phones?)$/i, '')
      .trim() || title
  )
}
