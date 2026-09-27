import type { FullstackStudy as FullstackStudyData, LayerName } from '../types'
import { Row, BulletList } from './Row'
import { StackChips } from './Diagrams'

const TIERS: { key: LayerName; label: string }[] = [
  { key: 'frontend', label: 'Frontend' },
  { key: 'backend', label: 'Backend' },
  { key: 'database', label: 'Database' },
]

export function FullstackStudy({ study }: { study: FullstackStudyData }) {
  const { layers } = study
  const aiItems = [...layers.ai.stack, ...layers.ai.notes]
  return (
    <div className="border-t border-ink">
      <Row label="Problem">
        <p className="font-display text-[1.6rem] leading-[1.2] md:text-[2rem]">{study.problem}</p>
      </Row>

      <Row label="Architecture">
        <div className="max-w-2xl">
          {TIERS.map((tier) => (
            <div key={tier.key} className="mb-2">
              <div className="border border-ink p-4">
                <p className="eyebrow mb-3">{tier.label}</p>
                <StackChips items={layers[tier.key].stack} />
              </div>
            </div>
          ))}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="border border-dashed border-accent-ink p-4">
              <p className="eyebrow mb-3">Auth</p>
              {layers.auth.stack.length > 0 ? <StackChips items={layers.auth.stack} /> : <p className="text-sm text-ink-3">None listed.</p>}
            </div>
            <div className="border border-dashed border-accent-ink p-4">
              <p className="eyebrow mb-3">AI</p>
              {aiItems.length > 0 ? <StackChips items={aiItems} /> : <p className="text-sm text-ink-3">None listed in the verified notes.</p>}
            </div>
          </div>
          <p className="mt-4 font-mono text-xs text-ink-3">Grouped by tier for readability. My verified notes list these technologies without tiers, so this grouping is inferred from what each technology is.</p>
        </div>
      </Row>

      <Row label="Frontend">
        <BulletList items={layers.frontend.notes} />
      </Row>
      <Row label="Backend">
        <BulletList items={layers.backend.notes} />
      </Row>
      <Row label="Database">
        <BulletList items={layers.database.notes} empty="What is stored is not specified in my verified notes." />
      </Row>
      <Row label="AI & auth">
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <p className="eyebrow mb-3">AI</p>
            <BulletList items={layers.ai.notes} empty="No AI feature is listed in my verified notes." />
          </div>
          <div>
            <p className="eyebrow mb-3">Auth</p>
            <BulletList items={layers.auth.notes} />
          </div>
        </div>
      </Row>

      <Row label="All features">
        <div className="space-y-5">
          {study.featureGroups.map((group) => (
            <div key={group.label}>
              <p className="eyebrow mb-2">{group.label}</p>
              <ul className="flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <li key={item} className="chip">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 border-l-2 border-rule pl-4">
          <p className="eyebrow">Not in my verified notes</p>
          <ul className="mt-2 space-y-1 text-sm text-ink-2">
            {study.notSpecified.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </Row>
    </div>
  )
}
