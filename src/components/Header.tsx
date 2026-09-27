import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { CONTAINER } from './Section'
import { portfolio } from '../portfolio'
import { NAV } from '../nav'

export function Header({ active }: { active: string }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const linkClass = (id: string) =>
    `inline-flex min-h-10 items-center font-mono text-[0.8125rem] tracking-wide transition-colors hover:text-accent-ink ${
      active === id ? 'text-accent-ink underline decoration-1 underline-offset-8' : 'text-ink-2'
    }`

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors duration-300 ${
        scrolled ? 'border-rule bg-paper-2' : 'border-transparent bg-paper'
      }`}
    >
      <div className={`${CONTAINER} flex items-center justify-between transition-[height] duration-300 ${scrolled ? 'h-14' : 'h-16'}`}>
        <a href="#top" className="font-display text-2xl leading-none tracking-tight" aria-label={`${portfolio.owner.name}, back to top`}>
          Rachana S<span className="text-accent">.</span>
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
          {NAV.map((item) => (
            <a key={item.id} href={`#${item.id}`} className={linkClass(item.id)} aria-current={active === item.id ? 'location' : undefined}>
              {item.label}
            </a>
          ))}
        </nav>

        <button
          type="button"
          className="-mr-2 inline-flex h-11 items-center gap-2 px-2 font-mono text-[0.8125rem] lg:hidden"
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          <span>{open ? 'Close' : 'Menu'}</span>
        </button>
      </div>

      {open && (
        <nav id="site-menu" aria-label="Primary mobile" className="border-t border-rule bg-paper lg:hidden">
          <ul className={`${CONTAINER} py-2`}>
            {NAV.map((item) => (
              <li key={item.id} className="border-b border-rule last:border-b-0">
                <a href={`#${item.id}`} onClick={() => setOpen(false)} className="flex min-h-12 items-center justify-between py-2 font-display text-2xl">
                  {item.label}
                  {item.id === 'twin' && <span className="eyebrow text-accent-ink">AI</span>}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}
