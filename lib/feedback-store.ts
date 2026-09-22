'use client'

// Minimal external store so the Navbar trigger, Footer trigger, and the
// modal itself can all stay independent components — no context provider
// wrapping required, no prop drilling through layout.tsx.

type Listener = () => void

let isOpen = false
const listeners = new Set<Listener>()

function emitChange() {
  listeners.forEach(l => l())
}

export const feedbackStore = {
  getSnapshot: () => isOpen,
  open: () => { isOpen = true; emitChange() },
  close: () => { isOpen = false; emitChange() },
  subscribe: (listener: Listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
