import type { ReactNode } from 'react'

/** One labelled row of a case study: "01 Problem" on the left, content on the right. */
export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-4 border-b border-rule py-8 md:grid-cols-12 md:gap-8 md:py-10">
      <h4 className="eyebrow pt-1.5 md:col-span-3">{label}</h4>
      <div className="min-w-0 md:col-span-9">{children}</div>
    </div>
  )
}

export function BulletList({ items, empty = 'Nothing further is listed in my verified notes.' }: { items: string[]; empty?: string }) {
  if (items.length === 0) return <p className="text-ink-3">{empty}</p>
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-3 leading-relaxed">
          <span aria-hidden="true" className="mt-[0.7em] h-px w-3 shrink-0 bg-ink" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
