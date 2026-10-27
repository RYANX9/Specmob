'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { X, Check } from 'lucide-react'
import { feedbackStore } from '@/lib/feedback-store'
import { api } from '@/lib/api'
import { c, f, r, sh, space, z, motion, ease } from '@/lib/tokens'

type Status = 'idle' | 'submitting' | 'sent' | 'error'

export default function FeedbackModal() {
  const isOpen = useSyncExternalStore(
    feedbackStore.subscribe,
    feedbackStore.getSnapshot,
    () => false,
  )

  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [status, setStatus] = useState<Status>('idle')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => textareaRef.current?.focus(), 50)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
      clearTimeout(t)
    }
  }, [isOpen])

  function close() {
    feedbackStore.close()
    // reset a beat after the close animation so it doesn't flash empty
    setTimeout(() => {
      setMessage('')
      setEmail('')
      setWebsite('')
      setStatus('idle')
    }, motion.slow)
  }

  async function submit() {
    if (!message.trim() || status === 'submitting') return
    setStatus('submitting')
    try {
      await api.feedback.submit({
        message: message.trim(),
        email: email.trim() || undefined,
        page_url: typeof window !== 'undefined' ? window.location.href : undefined,
        website,
      })
      setStatus('sent')
      setTimeout(close, 1800)
    } catch {
      setStatus('error')
    }
  }

  if (!isOpen) return null

  return (
    <div
      role="presentation"
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: z.toast,
        background: 'rgba(21,21,31,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: space.lg,
        animation: `feedback-fade ${motion.base}ms ${ease.standard}`,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Send feedback"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 440,
          background: c.surface,
          borderRadius: r.xl,
          boxShadow: sh.xl,
          padding: space['3xl'],
          animation: `feedback-pop ${motion.slow}ms ${ease.spring}`,
        }}
      >
        {status === 'sent' ? (
          <div style={{ textAlign: 'center', padding: `${space.xl}px 0` }}>
            <div style={{
              width: 40, height: 40, borderRadius: r.full, background: c.greenLight,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Check size={20} color="var(--green)" />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: c.text1 }}>Got it — thanks.</div>
            <div style={{ fontSize: 13, color: c.text3, marginTop: 4 }}>
              It goes straight to a real inbox.
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div style={{ fontFamily: f.serif, fontStyle: 'italic', fontSize: 20, color: c.text1 }}>
                Got something to say?
              </div>
              <button
                onClick={close}
                aria-label="Close"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text3, padding: 4, marginTop: -4, marginRight: -4 }}
              >
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: c.text3, marginBottom: space.xl, lineHeight: 1.5 }}>
              Bug, idea, complaint, whatever — no account needed.
            </p>

            <textarea
              ref={textareaRef}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type here..."
              rows={5}
              style={{
                width: '100%',
                border: `1px solid ${c.border}`,
                borderRadius: r.md,
                padding: '12px 14px',
                fontSize: 14,
                fontFamily: f.sans,
                color: c.text1,
                resize: 'vertical',
                marginBottom: space.md,
                outline: 'none',
              }}
            />

            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email (optional — only if you want a reply)"
              style={{
                width: '100%',
                border: `1px solid ${c.border}`,
                borderRadius: r.md,
                padding: '10px 14px',
                fontSize: 13.5,
                fontFamily: f.sans,
                color: c.text1,
                marginBottom: space.lg,
                outline: 'none',
              }}
            />

            {/* Honeypot — real users never see or fill this in. */}
            <input
              type="text"
              name="website"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }}
              aria-hidden="true"
            />

            {status === 'error' && (
              <div style={{ fontSize: 12.5, color: 'var(--accent)', marginBottom: space.md }}>
                Something went wrong — try again in a moment.
              </div>
            )}

            <button
              onClick={submit}
              disabled={!message.trim() || status === 'submitting'}
              style={{
                width: '100%',
                background: message.trim() ? c.accent : c.border,
                color: message.trim() ? '#fff' : c.text3,
                border: 'none',
                borderRadius: r.md,
                padding: '12px 0',
                fontSize: 14,
                fontWeight: 600,
                cursor: message.trim() ? 'pointer' : 'not-allowed',
                transition: `background ${motion.fast}ms ${ease.standard}`,
              }}
            >
              {status === 'submitting' ? 'Sending…' : 'Send'}
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes feedback-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes feedback-pop { from { opacity: 0; transform: translateY(8px) scale(0.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  )
}
