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
  openToWork: boolean
  links: TeamLink[]
}

// Add entries here as people join — the page below renders any length
// of this array without layout changes.
export const TEAM: TeamMember[] = [
  {
    slug: 'you',
    name: 'Your Name',
    role: 'Founder & Full-Stack Developer',
    bio: 'Built Specmob end to end: Next.js frontend, FastAPI backend, Postgres schema, and the AI scoring pipeline. Open to freelance and contract work.',
    avatarUrl: null,
    openToWork: true,
    links: [
      { label: 'GitHub', url: 'https://github.com/yourhandle' },
      { label: 'Portfolio', url: 'https://yourportfolio.com' },
      { label: 'LinkedIn', url: 'https://linkedin.com/in/yourhandle' },
    ],
  },
]

export const CONTACT_EMAIL = 'hello@specmob.com'
