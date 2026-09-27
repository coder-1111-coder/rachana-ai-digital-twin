import { useEffect, useState } from 'react'

/** Tracks which section sits in the middle band of the viewport, for nav highlighting. The hero clears it. */
export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string>('')
  const key = ids.join('|')

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id === 'top' ? '' : entry.target.id)
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    for (const id of ['top', ...key.split('|')]) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [key])

  return active
}
