export interface TwinTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface TwinAnswer {
  answer: string
  related: string[]
  /** The model hit its length limit; the server trimmed the answer to its last full sentence. */
  truncated: boolean
}

/** A failure the UI can show as-is: `message` is already written for end users. */
export class TwinRequestError extends Error {
  code: string
  requestId?: string
  constructor(code: string, message: string, requestId?: string) {
    super(message)
    this.name = 'TwinRequestError'
    this.code = code
    this.requestId = requestId
  }
}

const CLIENT_TIMEOUT_MS = 25_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export async function askTwin(message: string, history: TwinTurn[], signal?: AbortSignal): Promise<TwinAnswer> {
  // One controller for both the caller's cancellation and our timeout (AbortSignal.any is not available in older browsers).
  const controller = new AbortController()
  let timedOut = false
  const onCallerAbort = () => controller.abort()
  if (signal?.aborted) controller.abort()
  signal?.addEventListener('abort', onCallerAbort)
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, CLIENT_TIMEOUT_MS)

  /** Maps a failed fetch/body read to a user-facing error, keeping the original for the console. */
  const transportFailure = (err: unknown): Error => {
    if (signal?.aborted) return err instanceof Error ? err : new Error('aborted')
    if (timedOut) return new TwinRequestError('timeout', 'The twin took too long to answer. Please try again.')
    console.error('[twin] request failed', err)
    return new TwinRequestError('network', "Couldn't reach the Digital Twin service. Check your connection and try again.")
  }

  try {
    let res: Response
    let text: string
    try {
      res = await fetch('/api/twin/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message, history }),
        signal: controller.signal,
      })
      text = await res.text()
    } catch (err) {
      throw transportFailure(err)
    }

    const body = parseJson(text)
    if (!res.ok) {
      const error = isRecord(body) && isRecord(body.error) ? body.error : null
      if (error && typeof error.message === 'string') {
        const requestId = typeof error.requestId === 'string' ? error.requestId : undefined
        throw new TwinRequestError(typeof error.code === 'string' ? error.code : 'error', error.message, requestId)
      }
      throw new TwinRequestError('backend_unavailable', "The Digital Twin backend isn't reachable right now.")
    }

    if (!isRecord(body) || typeof body.answer !== 'string' || body.answer.trim() === '') {
      throw new TwinRequestError('bad_response', 'The twin returned an answer the page could not read. Please try again.')
    }
    const related = Array.isArray(body.related) ? body.related.filter((id): id is string => typeof id === 'string') : []
    return { answer: body.answer, related, truncated: body.truncated === true }
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onCallerAbort)
  }
}
