import type { MlStudy as MlStudyData } from '../types'
import { Row, BulletList } from './Row'
import { ClassBar, FlowSteps, NetworkDiagram, SplitGrid } from './Diagrams'

export function MlStudy({ study, id }: { study: MlStudyData; id: string }) {
  return (
    <div className="border-t border-ink">
      <Row label="Problem">
        <p className="font-display text-[1.6rem] leading-[1.2] md:text-[2rem]">{study.problem}</p>
      </Row>

      <Row label="Dataset">
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {study.dataset.map((fact) => (
            <div key={fact.label} className="border-t border-rule pt-2">
              <dt className="eyebrow">{fact.label}</dt>
              <dd className="mt-1 text-[1.0625rem]">{fact.value}</dd>
            </div>
          ))}
        </dl>
        {id === 'face-recognition' && <SplitGrid />}
        {study.classBalance && <ClassBar {...study.classBalance} />}
      </Row>

      <Row label={study.pipelineLabel ?? (study.pipelineOrdered ? 'Pipeline' : 'Methods')}>
        <FlowSteps steps={study.pipeline} ordered={study.pipelineOrdered} highlights={study.pipelineHighlights} />
        {study.pipelineHighlights && (
          <p className="mt-4 font-mono text-xs text-ink-3">Outlined steps are discussed under Key decisions.</p>
        )}
      </Row>

      <Row label="Models">
        {study.network ? (
          <>
            <NetworkDiagram layers={study.network} />
            <p className="mt-4 font-mono text-xs text-ink-3">Bar width is proportional to layer units.</p>
          </>
        ) : (
          <BulletList items={study.models} />
        )}
      </Row>

      <Row label="Evaluation">
        <ul className="flex flex-wrap gap-2" aria-label="Evaluation measures">
          {study.evaluation.map((item) => (
            <li key={item} className="chip">
              {item}
            </li>
          ))}
        </ul>
        {study.outputs.length > 0 && (
          <div className="mt-5">
            <p className="eyebrow">Also includes</p>
            <div className="mt-2">
              <BulletList items={study.outputs} />
            </div>
          </div>
        )}
        <p className="mt-5 font-mono text-xs text-ink-3">{study.resultsNote ?? 'No performance numbers are published for this project.'}</p>
      </Row>

      <Row label="Key decisions">
        <BulletList items={study.decisions} />
      </Row>
    </div>
  )
}
