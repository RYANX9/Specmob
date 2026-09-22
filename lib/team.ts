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
    role: 'Co-Creator, Specmob',
    bio: 'Built Specmob’s full-stack architecture — core platform, comparison engines, and scoring infrastructure.',
    avatarUrl: null,
    highlights: ['Next.js frontend', 'FastAPI backend', 'Postgres + AI scoring pipeline', 'Built and shipped'],
    links: [
      { label: 'GitHub', url: 'https://github.com/RYANX9' },
      { label: 'Portfolio', url: 'https://ahmed-messaad.vercel.app/' },
      { label: 'LinkedIn', url: 'https://linkedin.com/in/ahmedmessaad' },
    ],
  },
]

export const CONTACT_EMAIL = 'ahmed.messaad.ml@gmail.com'
