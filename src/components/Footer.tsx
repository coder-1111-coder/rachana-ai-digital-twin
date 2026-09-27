import { CONTAINER } from './Section'
import { portfolio } from '../portfolio'

export function Footer() {
  const { site } = portfolio
  return (
    <footer className="border-t border-rule bg-paper-2">
      <div className={`${CONTAINER} grid gap-6 py-14 md:grid-cols-12 md:gap-8`}>
        <p className="font-display text-[2.75rem] leading-none tracking-tight sm:text-6xl md:col-span-5">Rachana S.</p>
        <p className="max-w-xl font-mono text-xs leading-relaxed text-ink-3 md:col-span-7 md:self-end">
          Built with {site.stack.slice(0, -1).join(', ')} and {site.stack.at(-1)}. The twin calls Groq through the Express backend. Project facts on this page are drawn from a single source-of-truth document.
        </p>
      </div>
    </footer>
  )
}
