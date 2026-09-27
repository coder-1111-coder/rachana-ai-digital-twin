import type { InteractiveStudy as InteractiveStudyData } from '../types'
import { Row } from './Row'
import { FlowSteps } from './Diagrams'

const PART_STYLE = ['border-ink', 'border-dashed border-accent-ink', 'border-dotted border-ink']

export function InteractiveStudy({ study }: { study: InteractiveStudyData }) {
  return (
    <div className="border-t border-ink">
      <Row label="Problem">
        <p className="font-display text-[1.6rem] leading-[1.2] md:text-[2rem]">{study.problem}</p>
      </Row>

      <Row label="Data">
        <div className="max-w-2xl border-2 border-demo-ink bg-demo-bg p-5 text-demo-ink" role="note">
          <p className="font-mono text-xs font-medium tracking-[0.18em]">DEMO DATA</p>
          <p className="mt-2 leading-relaxed">{study.dataNotice}</p>
        </div>
        <p className="mt-5 max-w-2xl leading-relaxed">{study.geography}</p>
      </Row>

      <Row label="Flow">
        <FlowSteps steps={study.flow} ordered />
      </Row>

      <Row label="AI Change Story">
        <p className="mb-5 max-w-2xl text-ink-2">The story distinguishes three things.</p>
        <ol className="grid gap-4 md:grid-cols-3">
          {study.story.map((part, i) => (
            <li key={part.label} className={`border p-5 ${PART_STYLE[i] ?? 'border-ink'}`}>
              <p className="eyebrow">Part {i + 1}</p>
              <h5 className="mt-2 font-display text-2xl leading-tight">{part.label}</h5>
            </li>
          ))}
        </ol>
      </Row>

      <Row label="Not in my verified notes">
        <ul className="space-y-1 text-ink-2">
          {study.notSpecified.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Row>
    </div>
  )
}
