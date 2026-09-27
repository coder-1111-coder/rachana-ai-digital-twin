import { useState, type CSSProperties, type FormEvent } from 'react'
import { ArrowRight } from 'lucide-react'
import { CONTAINER } from './Section'
import { countByKind, portfolio } from '../portfolio'

const stagger = (i: number) => ({ '--i': i }) as CSSProperties
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six']

/** "Year 3 Digital Transformation / AI-ML student" without stranding "ML" on its own line. */
function Status({ text }: { text: string }) {
  const [before, after] = text.split('AI-ML')
  if (after === undefined) return <>{text}</>
  return (
    <>
      {before}
      <span className="whitespace-nowrap">AI-ML</span>
      {after}
    </>
  )
}

/** Faint orbital line-art, purely decorative. Static: motion here stays CSS-only, per the design rule. */
function HeroMotif() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 600 600"
      className="pointer-events-none absolute -right-24 -top-20 h-[420px] w-[420px] text-rule sm:h-[560px] sm:w-[560px] md:-right-16 md:-top-10"
    >
      <circle cx="420" cy="220" r="120" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="420" cy="220" r="190" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="420" cy="220" r="260" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="420" cy="220" r="4" fill="currentColor" className="text-accent" />
      <circle cx="300" cy="90" r="3" fill="currentColor" />
      <circle cx="590" cy="340" r="3" fill="currentColor" />
      <line x1="420" y1="220" x2="300" y2="90" stroke="currentColor" strokeWidth="1" />
      <line x1="420" y1="220" x2="590" y2="340" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

export function Hero({ onAsk }: { onAsk: (question: string) => boolean }) {
  const [question, setQuestion] = useState('')
  const { owner, twin } = portfolio

  function submit(e: FormEvent) {
    e.preventDefault()
    const q = question.trim()
    if (!q) return
    // Keep what the visitor typed unless the twin actually accepted it.
    if (onAsk(q)) setQuestion('')
  }

  const kinds = [
    `${WORDS[countByKind('ml')]} ML projects`,
    `${WORDS[countByKind('fullstack')]} full-stack apps`,
    `${WORDS[countByKind('interactive')]} interactive explorer`,
  ]

  return (
    <section id="top" aria-labelledby="hero-title" className="relative overflow-hidden">
      <HeroMotif />
      <div className={`${CONTAINER} relative pb-16 pt-12 md:pb-24 md:pt-20`}>
        <p className="eyebrow hero-in" style={stagger(0)}>
          <Status text={owner.status} />
        </p>
        <h1
          id="hero-title"
          className="hero-in mt-5 font-display text-[clamp(4.25rem,17.5vw,14rem)] leading-[0.84] tracking-[-0.03em]"
          style={stagger(1)}
        >
          Rachana <span className="text-accent-ink">S</span>
        </h1>

        <div className="mt-10 grid gap-10 md:mt-14 md:grid-cols-12 md:gap-8">
          <p className="hero-in font-display text-[1.9rem] leading-[1.12] sm:text-4xl md:col-span-7 md:text-5xl" style={stagger(2)}>
            {owner.headline}
          </p>

          <div className="hero-in md:col-span-5" style={stagger(3)}>
            <p className="max-w-lg text-[1.0625rem] leading-relaxed text-ink-2">{owner.lede}</p>

            <form onSubmit={submit} className="mt-8" aria-label="Ask the Digital Twin">
              <label htmlFor="hero-ask" className="eyebrow block">
                Ask the twin
              </label>
              <div className="mt-2 flex items-center border-b border-ink">
                <input
                  id="hero-ask"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  autoComplete="off"
                  placeholder="How did she handle class imbalance?"
                  className="min-h-12 w-full min-w-0 bg-transparent py-2 font-display text-lg placeholder:text-ink-3 sm:text-2xl"
                />
                <button type="submit" className="btn -mb-px h-11 shrink-0 px-3" aria-label="Ask the twin">
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              </div>
            </form>
            <ul className="mt-4 flex flex-col items-start gap-1">
              {twin.suggestedQuestions.slice(1, 4).map((q) => (
                <li key={q}>
                  <button type="button" onClick={() => onAsk(q)} className="min-h-9 text-left font-mono text-xs text-accent-ink underline underline-offset-4 hover:decoration-2">
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="hero-in mt-16 border-t border-ink pt-4 font-mono text-xs uppercase leading-relaxed tracking-[0.1em] text-ink-2 md:mt-24" style={stagger(4)}>
          {kinds.join('  ·  ')}
        </p>
      </div>
    </section>
  )
}
