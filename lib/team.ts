// lib/team.ts
export interface TeamLink {
  label: string
  url: string
}

export interface TeamMember {
  slug: string
  name: string
  role: string
  bio: string
  avatarUrl: string | null
  highlights: string[]
  links: TeamLink[]
}

// Add entries here as people join — the page below renders any length
// of this array without layout changes.
export const TEAM: TeamMember[] = [
  {
    slug: 'Ryan',
    name: 'Ahmed Ryan Messaad',
    role: 'Creator, Specmob',
    bio: 'Designed and built Specmob end to end — the catalog, the comparison and recommendation engines, the AI scoring pipeline, and the infrastructure running all of it.',
    avatarUrl: null,
    highlights: ['Next.js frontend', 'FastAPI backend', 'Postgres + AI scoring pipeline', 'Built and shipped'],
    links: [
      { label: 'GitHub', url: 'https://github.com/RYANX9' },
      { label: 'Portfolio', url: 'https://ahmed-messaad.vercel.app/' },
      { label: 'LinkedIn', url: 'https://linkedin.com/in/ahmedmessaad' },
    ],
  },
    {
    slug: 'Zayd',
    name: 'Zaid Saad',
    name: 'Zaid Saad',
    role: 'Co-Creator, Specmob',
    bio: 'Full-stack & mobile developer driving Specmob’s app architecture, real-time cloud systems, and data-driven features.',
    avatarUrl: null,
    highlights: ['Flutter & Cross-Platform', 'Firebase & Cloud Systems', 'Data & Analytics', 'Built and shipped'],
    links: [
      { label: 'GitHub', url: 'https://github.com/saadzayd' },
      { label: 'Portfolio', url: 'https://zaid-saad.vercel.app/' },
      { label: 'LinkedIn', url: 'https://linkedin.com/in/saadzayd' },
    ],
  },
]

export const CONTACT_EMAIL = 'hello@specmob.com'
