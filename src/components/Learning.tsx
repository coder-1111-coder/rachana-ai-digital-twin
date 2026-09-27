import { Section } from './Section'
import { Reveal } from './Reveal'
import { portfolio, projectById } from '../portfolio'

export function Learning({ onOpen }: { onOpen: (id: string) => void }) {
  const { learning } = portfolio
  return (
    <Section id="learning" index="04" label="Learning" title="The projects, grouped by theme.">
      <Reveal>
        <p className="max-w-2xl text-[1.0625rem] leading-relaxed text-ink-2">{learning.note}</p>

        <ul className="mt-12 grid gap-10 md:grid-cols-4 md:grid-rows-[auto_auto_1fr_auto] md:gap-x-6 md:gap-y-0">
          {learning.tracks.map((track) => (
            <li key={track.id} className="flex flex-col border-t border-ink pt-5 md:row-span-4 md:grid md:grid-rows-subgrid">
              <p className="eyebrow">{track.label}</p>
              <h3 className="mt-2 text-[1.75rem] leading-[1.1]">{track.title}</h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-2">{track.text}</p>
              <ul className="flex flex-wrap content-end gap-2 pt-5">
                {track.projects.map((id) => {
                  const project = projectById(id)
                  if (!project) return null
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => onOpen(id)}
                        className="chip min-h-9 cursor-pointer transition-colors hover:border-ink hover:text-ink"
                        aria-label={`Open case study: ${project.title}`}
                      >
                        {project.number} {project.shortTitle}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      </Reveal>
    </Section>
  )
}
