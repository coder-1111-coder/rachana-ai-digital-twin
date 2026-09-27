import type { CSSProperties, ReactNode } from 'react'
import { useReveal } from '../hooks/useReveal'

interface RevealProps {
  children: ReactNode
  className?: string
  /** Which scroll-triggered CSS effect to apply; see the matching class in index.css. */
  effect?: 'reveal' | 'reveal-stagger' | 'reveal-clip' | 'scale-in'
  /** Stagger index, applied as the --i CSS var consumed by .reveal-stagger. */
  index?: number
}

export function Reveal({ children, className = '', effect = 'reveal', index }: RevealProps) {
  const { ref, visible } = useReveal<HTMLDivElement>()
  const style = index !== undefined ? ({ '--i': index } as CSSProperties) : undefined
  return (
    <div ref={ref} style={style} className={`${effect} ${visible ? 'is-visible' : ''} ${className}`}>
      {children}
    </div>
  )
}
