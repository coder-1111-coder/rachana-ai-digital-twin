import { useRef, type KeyboardEvent } from 'react'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Section } from './Section'
import { MlStudy } from '../case/MlStudy'
import { FullstackStudy } from '../case/FullstackStudy'
import { InteractiveStudy } from '../case/InteractiveStudy'
import { StackChips } from '../case/Diagrams'
import { Row } from '../case/Row'
import { projects } from '../portfolio'

interface Props {
  selectedId: string
  onSelect: (id: string) => void
  onAsk: (question: string) => void
}

export function CaseStudies({ selectedId, onSelect, onAsk }: Props) {
  const tabs = useRef<Record<string, HTMLButtonElement | null>>({})
  const selected = projects.find((p) => p.id === selectedId) ?? projects[0]

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const current = projects.findIndex((p) => p.id === selected.id)
    const last = projects.length - 1
    const targets: Record<string, number> = {
      ArrowDown: (current + 1) % projects.length,
      ArrowRight: (current + 1) % projects.length,
      ArrowUp: (current - 1 + projects.length) % projects.length,
      ArrowLeft: (current - 1 + projects.length) % projects.length,
      Home: 0,
      End: last,
    }
    const next = targets[e.key]
    if (next === undefined) return
    e.preventDefault()
    onSelect(projects[next].id)
    tabs.current[projects[next].id]?.focus()
  }

  const next = projects[(projects.findIndex((p) => p.id === selected.id) + 1) % projects.length]

  function goNext() {
    onSelect(next.id)
    tabs.current[next.id]?.focus({ preventScroll: true })
    document.getElementById('case-studies')?.scrollIntoView({ block: 'start' })
  }

  return (
    <Section id="case-studies" index="03" label="Case studies" title="Each project in detail.">
      <div className="grid gap-8 md:grid-cols-12 md:gap-10">
        <div className="md:col-span-3">
          <div
            role="tablist"
            aria-label="Projects"
            aria-orientation="vertical"
            onKeyDown={onKeyDown}
            className="grid grid-cols-2 gap-2 md:sticky md:top-24 md:flex md:flex-col md:gap-0 md:border-t md:border-ink"
          >
            {projects.map((p) => {
              const isSelected = p.id === selected.id
              return (
                <button
                  key={p.id}
                  ref={(el) => {
                    tabs.current[p.id] = el
                  }}
                  type="button"
                  role="tab"
                  id={`tab-${p.id}`}
                  aria-selected={isSelected}
                  aria-controls={isSelected ? `panel-${p.id}` : undefined}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => onSelect(p.id)}
                  className={`min-h-14 border px-3 py-2.5 text-left transition-colors md:border-x-0 md:border-t-0 md:px-2 md:py-3.5 ${
                    isSelected ? 'border-ink bg-ink text-paper' : 'border-rule hover:border-ink md:hover:bg-paper-2'
                  }`}
                >
                  <span className={`block font-mono text-[0.6875rem] ${isSelected ? 'text-paper/60' : 'text-accent-ink'}`}>{p.number}</span>
                  <span className="block font-display text-[1.2rem] leading-tight md:text-[1.35rem]">{p.shortTitle}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div
          key={selected.id}
          role="tabpanel"
          id={`panel-${selected.id}`}
          aria-labelledby={`tab-${selected.id}`}
          tabIndex={0}
          className="panel-in min-w-0 md:col-span-9"
        >
          <header>
            <p className="eyebrow">
              {selected.number} / {selected.kindLabel}
            </p>
            <h3 className="mt-3 font-display text-[2.5rem] leading-[1.02] md:text-5xl">{selected.title}</h3>
            <p className="mt-4 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-2">{selected.summary}</p>
            <div className="mt-5">
              {selected.stack.length > 0 ? (
                <StackChips items={selected.stack} />
              ) : (
                <p className="text-sm text-ink-3">Technology stack: not listed in my verified notes.</p>
              )}
            </div>
            <button type="button" className="btn btn-quiet mt-6" onClick={() => onAsk(`Explain the ${selected.title} project.`)}>
              Ask the twin about this project
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </header>

          <div className="mt-10">
            {selected.kind === 'ml' && <MlStudy study={selected.study} id={selected.id} />}
            {selected.kind === 'fullstack' && <FullstackStudy study={selected.study} />}
            {selected.kind === 'interactive' && <InteractiveStudy study={selected.study} />}
            {selected.driveUrl && (
              <Row label="Project materials">
                <a href={selected.driveUrl} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1.5">
                  View project materials on Google Drive
                  <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              </Row>
            )}
            <Row label="Repository">
              {selected.repoUrl ? (
                <a href={selected.repoUrl} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1.5">
                  View source on GitHub
                  <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              ) : (
                <p className="text-ink-3">Not supplied in my verified notes.</p>
              )}
            </Row>
          </div>

          <div className="mt-10 border-t border-rule pt-6">
            <button type="button" className="btn btn-quiet" onClick={goNext}>
              Next case study: {next.shortTitle}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </Section>
  )
}
