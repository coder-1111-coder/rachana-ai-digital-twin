import { useEffect, useRef, useState } from 'react'
import { askTwin, TwinRequestError, type TwinTurn } from '../lib/twinClient'

export const MAX_CHARS = 600
const HISTORY_TURNS = 3
const MAX_HISTORY_ANSWER_CHARS = 3000

export interface Turn {
  id: number
  question: string
  state: 'pending' | 'done' | 'error'
  answer?: string
  related?: string[]
  truncated?: boolean
  error?: string
}

function historyFrom(turns: Turn[]): TwinTurn[] {
  return turns
    .filter((t) => t.state === 'done' && t.answer)
    .slice(-HISTORY_TURNS)
    .flatMap((t): TwinTurn[] => [
      { role: 'user', content: t.question },
      { role: 'assistant', content: (t.answer ?? '').slice(0, MAX_HISTORY_ANSWER_CHARS) },
    ])
}

/** Conversation state for the Digital Twin: one question in flight at a time, and every refusal explains itself. */
export function useTwinChat() {
  const [turns, setTurns] = useState<Turn[]>([])
  const [notice, setNotice] = useState('')
  const nextId = useRef(1)
  const inFlight = useRef<AbortController | null>(null)
  const busy = turns.some((t) => t.state === 'pending')

  useEffect(() => () => inFlight.current?.abort(), [])

  async function run(id: number, question: string, history: TwinTurn[], abort: AbortController) {
    try {
      const result = await askTwin(question, history, abort.signal)
      setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, state: 'done', answer: result.answer, related: result.related, truncated: result.truncated } : t)))
    } catch (err) {
      if (abort.signal.aborted) return
      if (!(err instanceof TwinRequestError)) console.error('[twin] unexpected error', err)
      const message = err instanceof TwinRequestError ? err.message : 'Something went wrong. Please try again.'
      setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, state: 'error', error: message } : t)))
    } finally {
      // Only release the slot if a newer request (after Clear) has not taken it.
      if (inFlight.current === abort) inFlight.current = null
    }
  }

  /** Starts a question. Returns false, with the reason in `notice`, when it is not accepted. */
  function send(raw: string): boolean {
    const question = raw.trim()
    if (!question) {
      setNotice('Please type a question first.')
      return false
    }
    if (question.length > MAX_CHARS) {
      setNotice(`Please keep the question under ${MAX_CHARS} characters.`)
      return false
    }
    if (inFlight.current) {
      setNotice('Still answering the previous question. Please wait a moment.')
      return false
    }
    const id = nextId.current++
    const abort = new AbortController()
    inFlight.current = abort
    setNotice('')
    setTurns((prev) => [...prev, { id, question, state: 'pending' }])
    void run(id, question, historyFrom(turns), abort)
    return true
  }

  function retry(turn: Turn) {
    if (inFlight.current) {
      setNotice('Still answering the previous question. Please wait a moment.')
      return
    }
    setTurns((prev) => prev.filter((t) => t.id !== turn.id))
    send(turn.question)
  }

  function clear() {
    inFlight.current?.abort()
    inFlight.current = null
    setTurns([])
    setNotice('')
  }

  return { turns, busy, notice, setNotice, send, retry, clear }
}
