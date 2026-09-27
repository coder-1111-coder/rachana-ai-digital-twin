import type { NetworkLayer } from '../types'

/** 9 people x 50 images. Filled = 60% train, outlined = 40% test, per person (stratified). */
export function SplitGrid() {
  const people = 9
  const perPerson = 50
  const trainPerPerson = Math.round(perPerson * 0.6)
  const step = 6
  return (
    <figure className="mt-6">
      <svg
        viewBox={`0 0 ${perPerson * step - 2} ${people * step - 2}`}
        className="w-full max-w-xl"
        role="img"
        aria-label="Schematic of the 450-image dataset: 9 people with 50 images each, split 60/40 and stratified. It does not show which images went where."
      >
        {Array.from({ length: people }, (_, row) =>
          Array.from({ length: perPerson }, (_, col) => (
            <rect
              key={`${row}-${col}`}
              x={col * step}
              y={row * step}
              width={4}
              height={4}
              fill={col < trainPerPerson ? 'var(--color-ink)' : 'none'}
              stroke="var(--color-ink)"
              strokeWidth={col < trainPerPerson ? 0 : 0.7}
            />
          )),
        )}
      </svg>
      <figcaption className="mt-3 font-mono text-xs text-ink-3">
        Schematic: each row is one person (50 images), shaded 60% and outlined 40% to show the 60/40 stratified split. It does not show which images went where.
      </figcaption>
    </figure>
  )
}

export function ClassBar({ label, percent, approximate }: { label: string; percent: number; approximate: boolean }) {
  const text = `${approximate ? 'approximately ' : ''}${percent}%`
  return (
    <figure className="mt-6 max-w-xl">
      <div
        className="flex h-4 w-full border border-ink"
        role="img"
        aria-label={`${label} class share: ${text} of records; the rest are non-hazardous.`}
      >
        <div className="bg-accent" style={{ width: `${percent}%` }} />
      </div>
      <figcaption className="mt-2 flex justify-between gap-4 font-mono text-xs text-ink-3">
        <span className="text-accent-ink">{label}: {text}</span>
        <span>Non-hazardous: the rest</span>
      </figcaption>
      
    </figure>
  )
}

/** Bar width is proportional to units, so the funnel 128 -> 64 -> 9 is visible at any screen width. */
export function NetworkDiagram({ layers }: { layers: NetworkLayer[] }) {
  const maxUnits = Math.max(...layers.map((l) => (l.type === 'dense' ? l.units : 0)))
  return (
    <ol className="mt-2 max-w-xl space-y-2" aria-label="Neural network layers, in order">
      {layers.map((layer, i) => {
        if (layer.type === 'input') {
          return (
            <li key={i} className="flex items-center gap-3">
              <span className="w-24 shrink-0 font-mono text-xs text-ink-3">Input</span>
              <span className="chip border-dashed">{layer.label}</span>
            </li>
          )
        }
        if (layer.type === 'dropout') {
          return (
            <li key={i} className="flex items-center gap-3">
              <span className="w-24 shrink-0 font-mono text-xs text-ink-3">Dropout</span>
              <span className="h-px flex-1 border-t border-dashed border-ink-3" aria-hidden="true" />
              <span className="font-mono text-xs text-ink-2">{layer.rate}</span>
            </li>
          )
        }
        const width = Math.max(6, (layer.units / maxUnits) * 100)
        return (
          <li key={i} className="flex items-center gap-3">
            <span className="w-24 shrink-0 font-mono text-xs text-ink">Dense {layer.units}</span>
            <span className="flex flex-1 items-center gap-3">
              <span className="block h-6 bg-ink" style={{ width: `${width}%` }} aria-hidden="true" />
              <span className="font-mono text-xs text-ink-2">{layer.activation}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

interface FlowStepsProps {
  steps: string[]
  ordered: boolean
  highlights?: number[]
}

export function FlowSteps({ steps, ordered, highlights = [] }: FlowStepsProps) {
  return (
    <ol className="flex flex-wrap gap-2" aria-label={ordered ? 'Steps, in order' : 'Steps, listed without a stated order'}>
      {steps.map((step, i) => {
        const marked = highlights.includes(i)
        return (
          <li key={step} className={`chip gap-2 py-1.5 text-[0.8125rem] ${marked ? '!border-accent-ink !text-ink' : ''}`}>
            {ordered && <span className="text-ink-3">{String(i + 1).padStart(2, '0')}</span>}
            {step}
            {marked && <span className="sr-only"> (discussed under Key decisions)</span>}
          </li>
        )
      })}
    </ol>
  )
}

/**
 * A small decorative line-art motif per project, purely ornamental (aria-hidden, no data claim).
 * Used as a visual anchor in Selected Work and atop each case study; never a substitute for the
 * verified diagrams above, which remain the only place numbers are drawn.
 */
export function ProjectMotif({ id, className = '' }: { id: string; className?: string }) {
  const common = 'text-rule'
  switch (id) {
    case 'face-recognition':
      return (
        <svg aria-hidden="true" viewBox="0 0 200 200" className={`${common} ${className}`}>
          {Array.from({ length: 8 }, (_, row) =>
            Array.from({ length: 8 }, (_, col) => {
              const shade = (row * 7 + col * 3) % 5
              return (
                <rect
                  key={`${row}-${col}`}
                  x={col * 25 + 2}
                  y={row * 25 + 2}
                  width={19}
                  height={19}
                  fill={shade === 0 ? 'var(--color-accent)' : 'none'}
                  stroke="currentColor"
                  strokeOpacity={shade === 0 ? 0 : 0.4 + shade * 0.1}
                  fillOpacity={shade === 0 ? 0.85 : 1}
                />
              )
            }),
          )}
        </svg>
      )
    case 'asteroid':
      return (
        <svg aria-hidden="true" viewBox="0 0 200 200" className={`${common} ${className}`}>
          <ellipse cx="100" cy="100" rx="90" ry="34" fill="none" stroke="currentColor" transform="rotate(-18 100 100)" />
          <ellipse cx="100" cy="100" rx="60" ry="60" fill="none" stroke="currentColor" transform="rotate(12 100 100)" />
          <ellipse cx="100" cy="100" rx="30" ry="86" fill="none" stroke="currentColor" transform="rotate(8 100 100)" />
          <circle cx="100" cy="100" r="6" fill="var(--color-accent)" />
          <circle cx="168" cy="82" r="3" fill="currentColor" />
          <circle cx="42" cy="140" r="2.5" fill="currentColor" />
        </svg>
      )
    case 'attrition':
      return (
        <svg aria-hidden="true" viewBox="0 0 200 200" className={`${common} ${className}`}>
          <line x1="10" y1="170" x2="190" y2="170" stroke="currentColor" />
          {[54, 92, 68, 120, 40, 100, 76].map((h, i) => (
            <rect key={i} x={16 + i * 24} y={170 - h} width={14} height={h} fill={i === 3 ? 'var(--color-accent)' : 'currentColor'} fillOpacity={i === 3 ? 0.85 : 0.35} />
          ))}
        </svg>
      )
    case 'symbio-nlm':
      return (
        <svg aria-hidden="true" viewBox="0 0 200 200" className={`${common} ${className}`}>
          <path d="M40 10 C 90 45, 90 75, 40 100 C -10 125, -10 155, 40 190" fill="none" stroke="currentColor" transform="translate(60 0)" />
          <path d="M40 10 C -10 45, -10 75, 40 100 C 90 125, 90 155, 40 190" fill="none" stroke="currentColor" transform="translate(60 0)" />
          {[20, 55, 90, 125, 160].map((y, i) => (
            <line key={y} x1={100 - 28 + (i % 2 ? 6 : -6)} y1={y} x2={100 + 28 - (i % 2 ? 6 : -6)} y2={y} stroke={i === 2 ? 'var(--color-accent)' : 'currentColor'} strokeOpacity={i === 2 ? 0.9 : 0.5} />
          ))}
        </svg>
      )
    case 'space-atlas':
      return (
        <svg aria-hidden="true" viewBox="0 0 200 200" className={`${common} ${className}`}>
          <line x1="24" y1="150" x2="86" y2="60" stroke="currentColor" strokeOpacity="0.6" />
          <line x1="86" y1="60" x2="150" y2="100" stroke="currentColor" strokeOpacity="0.6" />
          <line x1="86" y1="60" x2="120" y2="30" stroke="currentColor" strokeOpacity="0.6" />
          <line x1="150" y1="100" x2="176" y2="164" stroke="currentColor" strokeOpacity="0.6" />
          {[[24, 150, 3], [86, 60, 4], [120, 30, 2.5], [150, 100, 3], [176, 164, 2.5]].map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill={i === 1 ? 'var(--color-accent)' : 'currentColor'} />
          ))}
        </svg>
      )
    case 'memory-of-a-city':
      return (
        <svg aria-hidden="true" viewBox="0 0 200 200" className={`text-ink-3 ${className}`}>
          {Array.from({ length: 10 }, (_, row) =>
            Array.from({ length: 10 }, (_, col) => (
              <circle
                key={`${row}-${col}`}
                cx={col * 20 + 10}
                cy={row * 20 + 10}
                r={row === 4 && col === 6 ? 3.6 : 2.2}
                fill={row === 4 && col === 6 ? 'var(--color-accent)' : 'currentColor'}
                fillOpacity={row === 4 && col === 6 ? 0.95 : 0.75}
              />
            )),
          )}
        </svg>
      )
    default:
      return null
  }
}

export function StackChips({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Tools and techniques">
      {items.map((item) => (
        <li key={item} className="chip">
          {item}
        </li>
      ))}
    </ul>
  )
}
