import { Section } from './Section'
import { Reveal } from './Reveal'
import { portfolio } from '../portfolio'

export function About() {
  const [lead, ...rest] = portfolio.about.paragraphs
  return (
    <Section id="about" index="01" label="About" title="Machine-learning and full-stack projects.">
      <Reveal className="grid gap-10 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-8 md:col-start-4">
          <p className="font-display text-[1.65rem] leading-[1.25] sm:text-3xl md:text-[2rem]">{lead}</p>
          {rest.map((p) => (
            <p key={p} className="mt-6 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-2">
              {p}
            </p>
          ))}
          <aside className="mt-10 max-w-2xl border-l-2 border-accent pl-5" aria-label="What is not published">
            <p className="eyebrow">Not published</p>
            <p className="mt-2 text-ink-2">{portfolio.about.notPublished}</p>
          </aside>
        </div>
      </Reveal>
    </Section>
  )
}
