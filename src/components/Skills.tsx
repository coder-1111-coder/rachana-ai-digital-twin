import { useState } from 'react'
import { Section } from './Section'
import { Reveal } from './Reveal'
import { portfolio, projectById, projects } from '../portfolio'

export function Skills() {
  const [active, setActive] = useState<string | null>(null)
  const activeProject = active ? projectById(active) : undefined
  const numberOf = (id: string) => projectById(id)?.number ?? id

  const filterClass = (on: boolean) =>
    `chip min-h-9 cursor-pointer transition-colors ${on ? '!border-ink !bg-ink !text-paper' : 'hover:border-ink hover:text-ink'}`

  return (
    <Section id="skills" index="05" label="Skills" title="What I used, and where.">
      <Reveal>
        <p className="max-w-2xl text-[1.0625rem] leading-relaxed text-ink-2">
          Every skill points back to the projects that used it. There are no proficiency bars; proficiency is not in my notes.
        </p>

        <div role="group" aria-label="Filter skills by project" className="mt-8 flex flex-wrap gap-2">
          <button type="button" className={filterClass(active === null)} aria-pressed={active === null} onClick={() => setActive(null)}>
            All projects
          </button>
          {projects.map((p) => (
            <button key={p.id} type="button" className={filterClass(active === p.id)} aria-pressed={active === p.id} onClick={() => setActive(active === p.id ? null : p.id)}>
              {p.number} {p.shortTitle}
            </button>
          ))}
        </div>
        <p className="mt-3 min-h-5 font-mono text-xs text-ink-3" aria-live="polite">
          {activeProject ? `Highlighting skills used in ${activeProject.title}.` : 'Showing all skills.'}
        </p>

        <dl className="mt-6 border-t border-ink">
          {portfolio.skills.map((group) => (
            <div key={group.group} className="grid gap-3 border-b border-rule py-6 md:grid-cols-12 md:gap-8">
              <dt className="eyebrow pt-1.5 md:col-span-3">{group.group}</dt>
              <dd className="md:col-span-9">
                <ul className="flex flex-wrap gap-2">
                  {group.items.map((item) => {
                    const match = !active || item.projects.includes(active)
                    const numbers = item.projects.map(numberOf).join(' ')
                    // Non-matching skills stay readable (ink-3 is AA-contrast); a dashed border marks them instead of fading.
                    const state = match ? (active ? '!border-ink !text-ink' : '') : '!border-dashed !text-ink-3'
                    return (
                      <li key={item.name} className={`chip gap-2 ${state}`} data-match={match}>
                        {item.name}
                        <span aria-hidden="true" className="text-[0.625rem] text-accent-ink">
                          {numbers}
                        </span>
                        <span className="sr-only">, used in projects {item.projects.map(numberOf).join(', ')}</span>
                      </li>
                    )
                  })}
                </ul>
              </dd>
            </div>
          ))}
        </dl>
      </Reveal>
    </Section>
  )
}
