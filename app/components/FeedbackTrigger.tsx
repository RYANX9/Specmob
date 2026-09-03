'use client'

import { feedbackStore } from '@/lib/feedback-store'
import { c, r, f } from '@/lib/tokens'

export default function FeedbackTrigger({
  variant = 'nav',
}: {
  variant?: 'nav' | 'footer'
}) {
  if (variant === 'footer') {
    return (
      <button
        onClick={() => feedbackStore.open()}
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#fff',
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: r.full,
          padding: '8px 16px',
          cursor: 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.5)'
          ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.25)'
          ;(e.currentTarget as HTMLElement).style.background = 'transparent'
        }}
      >
        Send feedback
      </button>
    )
  }

  // Nav variant: reads as a normal nav item, same visual weight as your
  // other links — deliberately not a button, not an icon-only bubble.
  return (
    <button
      onClick={() => feedbackStore.open()}
      style={{
        fontSize: 13.5,
        fontWeight: 500,
        color: c.text2,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        fontFamily: f.sans,
        transition: 'color 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = c.text1 }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = c.text2 }}
    >
      Feedback
    </button>
  )
}
