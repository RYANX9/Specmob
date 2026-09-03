'use client'

import { useEffect, useState } from 'react'

export function useAdBlockDetected(): boolean | null {
  const [blocked, setBlocked] = useState<boolean | null>(null)

  useEffect(() => {
    const bait = document.createElement('div')
    bait.className = 'adsbox ad-banner ads'
    bait.style.cssText = 'position:absolute; height:1px; width:1px; left:-9999px; top:-9999px;'
    document.body.appendChild(bait)

    const timer = setTimeout(() => {
      setBlocked(bait.offsetHeight === 0 || getComputedStyle(bait).display === 'none')
      bait.remove()
    }, 100)

    return () => { clearTimeout(timer); bait.remove() }
  }, [])

  return blocked
}
