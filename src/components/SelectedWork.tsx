import { ArrowUpRight } from 'lucide-react'
import { Section } from './Section'
import { Reveal } from './Reveal'
import { ProjectMotif } from '../case/Diagrams'
import { projects } from '../portfolio'

export function SelectedWork({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <Section id="work" index="02" label="Selected work" title="Six projects. Pick one to open its case study.">
      <ol className="border-t border-ink">
        {projects.map((p, i) => {
          const motifFirst = i % 2 === 1
          return (
            <li key={p.id} className="border-b border-rule">
              <Reveal effect="reveal-stagger" index={i}>
                <button
                  type="button"
                  onClick={() => onOpen(p.id)}
                  aria-label={`Open case study: ${p.title}`}
                  className="group grid w-full items-center gap-6 py-10 text-left md:grid-cols-12 md:gap-10 md:py-14"
                >
                  <span
                    className={`hidden shrink-0 items-center justify-center md:col-span-4 md:flex ${
                      motifFirst ? 'md:order-1 md:col-start-1' : 'md:order-2 md:col-start-9'
                    }`}
                  >
                    <ProjectMotif id={p.id} className="h-44 w-44 opacity-70 transition-opacity duration-300 group-hover:opacity-100 lg:h-52 lg:w-52" />
                  </span>

                  <span className={`min-w-0 md:col-span-8 ${motifFirst ? 'md:order-2 md:col-start-5' : 'md:order-1 md:col-start-1'}`}>
                    <span className="flex items-baseline gap-4">
                      <span className="font-mono text-sm text-accent-ink">{p.number}</span>
                      <span className="eyebrow">{p.kindLabel}</span>
                    </span>
                    <span className="mt-3 block font-display text-[2rem] leading-[1.05] transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none sm:text-[2.5rem] md:text-5xl">
                      {p.title}
                    </span>
                    <span className="mt-3 block max-w-xl text-[0.9375rem] leading-relaxed text-ink-2">{p.summary}</span>
                    {p.stack.length > 0 && (
                      <span className="mt-4 block font-mono text-xs leading-relaxed text-ink-3">{p.stack.slice(0, 6).join(' · ')}</span>
                    )}
                    <span className="mt-5 inline-flex items-center gap-1.5 font-mono text-xs text-ink-3 transition-colors group-hover:text-accent-ink">
                      Open case study
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </span>
                  </span>
                </button>
              </Reveal>
            </li>
          )
        })}
      </ol>
    </Section>
  )
}
