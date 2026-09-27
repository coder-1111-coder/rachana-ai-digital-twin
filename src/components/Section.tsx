import type { ReactNode } from 'react'

interface SectionProps {
  id: string
  index: string
  label: string
  title: ReactNode
  children: ReactNode
  dark?: boolean
}

export const CONTAINER = 'mx-auto w-full max-w-[1240px] px-5 sm:px-8 lg:px-12'

export function Section({ id, index, label, title, children, dark = false }: SectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={dark ? 'bg-surface' : 'border-t border-rule'}>
      <div className={`${CONTAINER} py-20 md:py-28`}>
        <header className="mb-10 grid gap-3 md:mb-14 md:grid-cols-12 md:gap-8">
          <p className="eyebrow pt-2 md:col-span-3">
            <span className="text-accent-ink">{index}</span> / {label}
          </p>
          <h2 id={`${id}-title`} className="font-display text-4xl leading-[1.05] sm:text-5xl md:col-span-9 md:text-6xl">
            {title}
          </h2>
        </header>
        {children}
      </div>
    </section>
  )
}
