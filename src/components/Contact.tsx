import { ArrowUpRight, Mail, type LucideIcon } from 'lucide-react'
import { Section } from './Section'
import { Reveal } from './Reveal'
import { portfolio } from '../portfolio'

export function Contact({ onAsk }: { onAsk: () => void }) {
  const { contact, site } = portfolio
  const direct: { href: string; label: string; Icon: LucideIcon; external: boolean }[] = []
  if (contact.email) direct.push({ href: `mailto:${contact.email}`, label: contact.email, Icon: Mail, external: false })
  if (contact.linkedin) direct.push({ href: contact.linkedin, label: 'LinkedIn', Icon: ArrowUpRight, external: true })
  if (contact.github) direct.push({ href: contact.github, label: 'GitHub', Icon: ArrowUpRight, external: true })

  return (
    <Section id="contact" index="07" label="Contact" title="Contact.">
      <Reveal className="grid gap-8 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-7 md:col-start-4">
          {direct.length === 0 && (
            <p className="max-w-xl font-display text-[1.65rem] leading-[1.25] sm:text-3xl">
              No public email or profile links are listed in my verified notes, so none are shown here. You can ask the twin about my projects.
            </p>
          )}
          <ul className="mt-2 flex flex-col items-start gap-1">
            {direct.map(({ href, label, Icon, external }) => (
              <li key={href}>
                <a
                  href={href}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noopener noreferrer' : undefined}
                  className="inline-flex min-h-11 items-center gap-3 font-display text-3xl hover:text-accent-text"
                >
                  <Icon size={22} aria-hidden="true" />
                  {label}
                  {external && <span className="sr-only"> (opens in a new tab)</span>}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" className="btn" onClick={onAsk}>
              Ask the twin
            </button>
            {site.repoUrl && (
              <a className="btn btn-quiet" href={site.repoUrl} target="_blank" rel="noreferrer noopener">
                Source for this site
                <ArrowUpRight size={16} aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
          </div>
        </div>
      </Reveal>
    </Section>
  )
}
