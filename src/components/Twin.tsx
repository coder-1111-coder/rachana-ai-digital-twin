import { useEffect, useImperativeHandle, useRef, useState, type FormEvent, type KeyboardEvent, type Ref } from 'react'
import { ArrowUpRight, Send, Trash2 } from 'lucide-react'
import { Section } from './Section'
import { TwinTurns } from './TwinTurns'
import { MAX_CHARS, useTwinChat } from '../hooks/useTwinChat'
import { portfolio } from '../portfolio'

export interface TwinHandle {
  /** Returns false when the question was not accepted (for example while another answer is pending). */
  ask: (question: string) => boolean
}

const RULES = [
  'Answers come from my verified project notes.',
  "When something isn't in the notes, it says so instead of guessing.",
  'It is an AI assistant, not me, and it never speaks for me.',
]

export function Twin({ ref, onOpenProject }: { ref?: Ref<TwinHandle>; onOpenProject: (id: string) => void }) {
  const chat = useTwinChat()
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const over = draft.length > MAX_CHARS
  const { twin } = portfolio

  useImperativeHandle(ref, () => ({ ask: (question) => chat.send(question) }))

  useEffect(() => {
    if (chat.turns.length === 0) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' })
  }, [chat.turns])

  function submit(e?: FormEvent) {
    e?.preventDefault()
    if (chat.send(draft)) setDraft('')
    else if (!draft.trim()) inputRef.current?.focus()
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <Section
      id="twin"
      dark
      index="06"
      label="Ask Rachana"
      title={
        <>
          Ask the twin. <em className="text-accent-ink">It answers from what I verified.</em>
        </>
      }
    >
      <div className="grid gap-12 md:grid-cols-12 md:gap-10">
        <div className="md:col-span-4">
          <p className="text-[1.0625rem] leading-relaxed text-ink-2">{twin.intro}</p>
          <ul className="mt-6 space-y-3 border-l border-ink-2/50 pl-4 text-[0.9375rem] leading-relaxed">
            {RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>

          <p className="eyebrow mt-10">Try asking</p>
          <ul className="mt-3 border-t border-ink-2/40">
            {twin.suggestedQuestions.map((q) => (
              <li key={q} className="border-b border-ink-2/40">
                <button
                  type="button"
                  disabled={chat.busy}
                  onClick={() => chat.send(q)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left font-display text-xl leading-snug transition-colors hover:text-accent-ink disabled:opacity-50 disabled:hover:text-ink"
                >
                  {q}
                  <ArrowUpRight size={16} aria-hidden="true" className="shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 md:col-span-8">
          <div
            id="twin-log"
            role="log"
            tabIndex={0}
            aria-live="polite"
            aria-relevant="additions text"
            aria-busy={chat.busy}
            aria-label="Conversation with the Digital Twin"
            className="min-h-32 border-t border-ink-2/40 pt-6 [overflow-wrap:anywhere] md:max-h-[34rem] md:overflow-y-auto md:pr-3"
          >
            {chat.turns.length === 0 ? (
              <p className="text-ink-2">Answers appear here. Pick a suggested question or write your own below.</p>
            ) : (
              <TwinTurns turns={chat.turns} busy={chat.busy} onRetry={chat.retry} onOpenProject={onOpenProject} />
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={submit} className="mt-6 border-t border-ink-2/40 pt-6" aria-label="Ask the Digital Twin a question">
            <label htmlFor="twin-input" className="eyebrow block">
              Your question
            </label>
            <textarea
              id="twin-input"
              ref={inputRef}
              rows={3}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                chat.setNotice('')
              }}
              onKeyDown={onKeyDown}
              aria-describedby="twin-count twin-notice"
              placeholder="e.g. How did she handle class imbalance?"
              className="mt-2 w-full resize-none border border-ink-2 bg-transparent p-3 text-[1.0625rem] leading-relaxed text-ink placeholder:text-ink-2"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-xs">
                <span id="twin-count" className={over ? 'text-accent-ink' : 'text-ink-2'}>
                  {draft.length}/{MAX_CHARS}
                </span>
                <span id="twin-notice" role="status" className="ml-3 text-accent-ink">
                  {chat.notice}
                </span>
              </p>
              <div className="flex gap-3">
                {chat.turns.length > 0 && (
                  <button type="button" className="btn btn-quiet" onClick={chat.clear}>
                    <Trash2 size={14} aria-hidden="true" />
                    Clear
                  </button>
                )}
                <button type="submit" className="btn" disabled={chat.busy}>
                  {chat.busy ? 'Thinking…' : 'Ask'}
                  <Send size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Section>
  )
}
