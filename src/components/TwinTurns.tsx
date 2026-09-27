import { RotateCcw } from 'lucide-react'
import { AnswerText } from './AnswerText'
import type { Turn } from '../hooks/useTwinChat'
import { projectById } from '../portfolio'

interface Props {
  turns: Turn[]
  busy: boolean
  onRetry: (turn: Turn) => void
  onOpenProject: (id: string) => void
}

function Dots() {
  return (
    <span aria-hidden="true" className="flex gap-1">
      <span className="typing-dot size-1.5 rounded-full bg-accent-ink" />
      <span className="typing-dot size-1.5 rounded-full bg-accent-ink" />
      <span className="typing-dot size-1.5 rounded-full bg-accent-ink" />
    </span>
  )
}

/** The conversation: each question, then its pending / answered / failed state. Answers render as text only. */
export function TwinTurns({ turns, busy, onRetry, onOpenProject }: Props) {
  return (
    <ol className="space-y-10">
      {turns.map((turn) => (
        <li key={turn.id}>
          <p className="eyebrow">You asked</p>
          <p className="mt-1 font-display text-[1.6rem] italic leading-snug">{turn.question}</p>
          <div className="mt-4 border-l-2 border-accent-ink pl-4">
            <p className="eyebrow mb-2">AI answer. It can be wrong: check the case study.</p>
            {turn.state === 'pending' && (
              <p className="flex items-center gap-3 text-ink-2">
                <Dots />
                Reading the notes…
              </p>
            )}
            {turn.state === 'done' && (
              <>
                <AnswerText text={turn.answer ?? ''} />
                {turn.truncated && <p className="mt-3 font-mono text-xs text-ink-2">This answer was cut short. Ask a narrower question for the rest.</p>}
                {turn.related && turn.related.length > 0 && (
                  <div className="mt-4">
                    <p className="eyebrow mb-2">Related case studies</p>
                    <ul className="flex flex-wrap gap-2">
                      {turn.related.map((id) => {
                        const project = projectById(id)
                        if (!project) return null
                        return (
                          <li key={id}>
                            <button
                              type="button"
                              onClick={() => onOpenProject(id)}
                              className="chip min-h-9 cursor-pointer border-ink-2 text-ink hover:border-ink hover:bg-ink hover:text-paper"
                            >
                              {project.number} {project.shortTitle}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </>
            )}
            {turn.state === 'error' && (
              <div role="alert">
                <p>{turn.error}</p>
                <button type="button" onClick={() => onRetry(turn)} disabled={busy} className="btn btn-quiet mt-3">
                  <RotateCcw size={14} aria-hidden="true" />
                  Try again
                </button>
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
