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
    slug: 'you',
    name: 'Your Name',
    role: 'Creator, Specmob',
    bio: 'Designed and built Specmob end to end — the catalog, the comparison and recommendation engines, the AI scoring pipeline, and the infrastructure running all of it.',
    avatarUrl: null,
    highlights: ['Next.js frontend', 'FastAPI backend', 'Postgres + AI scoring pipeline', 'Built and shipped solo'],
    links: [
      { label: 'GitHub', url: 'https://github.com/yourhandle' },
      { label: 'Portfolio', url: 'https://yourportfolio.com' },
      { label: 'LinkedIn', url: 'https://linkedin.com/in/yourhandle' },
    ],
  },
]

export const CONTACT_EMAIL = 'hello@specmob.com'
