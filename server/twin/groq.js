import { errors } from './errors.js'

const PERMANENT_STATUSES = new Set([400, 404, 413, 422])

/** Seconds from a numeric Retry-After header, clamped to 1-120. HTTP-date values are ignored. */
function retryAfter(res) {
  const seconds = Number.parseInt(res.headers.get('retry-after') ?? '', 10)
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 120) : undefined
}

/**
 * Reads a provider error body and returns only allow-listed fields (error.code, error.type), so the log
 * says why a request was rejected without ever recording the provider's message or any user text.
 * Consuming the body also releases the socket.
 */
async function errorDetail(res) {
  try {
    const body = JSON.parse((await res.text()).slice(0, 2000))
    const pick = (value) => (typeof value === 'string' && /^[\w.-]{1,64}$/.test(value) ? value : null)
    const code = pick(body?.error?.code)
    const type = pick(body?.error?.type)
    return `${code ? ` code=${code}` : ''}${type ? ` type=${type}` : ''}`
  } catch {
    return ''
  }
}

/** Cuts an answer that hit the token limit back to its last complete sentence (null if nothing usable is left). */
function trimToSentence(text) {
  const match = /^[\s\S]*[.!?](?=\s|$)/.exec(text)
  const trimmed = match ? match[0].trim() : ''
  return trimmed.length >= 40 ? trimmed : null
}

/**
 * Calls Groq's OpenAI-compatible chat completions endpoint.
 * Resolves to `{ text, truncated }` or throws a TwinError. Keys, provider bodies and user text never
 * reach a log line or an error message.
 * @param {{ apiKey: string, model: string, baseUrl: string, timeoutMs: number, messages: object[],
 *   fetchImpl?: typeof fetch, logger?: { error: (...args: unknown[]) => void }, requestId?: string,
 *   signal?: AbortSignal }} options `signal` aborts the call when the visitor's request is cancelled.
 */
export async function askGroq({ apiKey, model, baseUrl, timeoutMs, messages, fetchImpl = fetch, logger = console, requestId = '-', signal }) {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const onClientGone = () => controller.abort()
  if (signal?.aborted) controller.abort()
  else signal?.addEventListener('abort', onClientGone, { once: true })
  const log = (message) => logger.error(`[twin ${requestId}] ${message}`)

  /** A dead call is either our timeout, a cancelled visitor, or a real failure: name each accurately. */
  function interrupted() {
    if (timedOut) {
      log(`provider timeout after ${timeoutMs}ms`)
      return errors.providerTimeout()
    }
    return signal?.aborted ? errors.clientClosed() : null
  }

  try {
    let res
    try {
      res = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: 700, stream: false }),
        signal: controller.signal,
      })
    } catch (err) {
      const stopped = interrupted()
      if (stopped) throw stopped
      // A TypeError with no network cause is fetch rejecting our own request (for example a key with
      // illegal characters), which retrying cannot fix. The error message is never logged: it may echo input.
      if (err instanceof TypeError && (!err.cause || err.cause.code === 'ERR_INVALID_URL')) {
        log(`request could not be built (${err.name}${err.cause?.code ? `, ${err.cause.code}` : ''})`)
        throw errors.providerMisconfigured()
      }
      log(`provider unreachable (${err?.cause?.code ?? err?.name ?? 'error'})`)
      throw errors.providerUnavailable()
    }

    if (!res.ok) {
      log(`provider status ${res.status}${await errorDetail(res)}`)
      if (res.status === 401 || res.status === 403) throw errors.providerAuth()
      if (res.status === 429) throw errors.providerRateLimited(retryAfter(res))
      if (PERMANENT_STATUSES.has(res.status)) throw errors.providerMisconfigured()
      throw errors.providerUnavailable()
    }

    let payload
    try {
      payload = await res.json()
    } catch (err) {
      const stopped = interrupted()
      if (stopped) throw stopped
      if (err instanceof SyntaxError) {
        log('provider sent a non-JSON body')
        throw errors.providerBadResponse()
      }
      log(`provider connection failed mid-response (${err?.cause?.code ?? err?.name ?? 'error'})`)
      throw errors.providerUnavailable()
    }

    const choice = payload?.choices?.[0]
    const text = choice?.message?.content
    if (typeof text !== 'string' || text.trim() === '') {
      log('provider sent no answer text')
      throw errors.providerBadResponse()
    }
    if (choice.finish_reason === 'content_filter') {
      log('provider withheld the answer (content_filter)')
      throw errors.providerBadResponse()
    }
    if (choice.finish_reason === 'length') {
      const trimmed = trimToSentence(text)
      if (!trimmed) {
        log('answer hit the token limit with no complete sentence')
        throw errors.providerBadResponse()
      }
      log('answer hit the token limit and was cut to its last full sentence')
      return { text: trimmed, truncated: true }
    }
    return { text: text.trim(), truncated: false }
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onClientGone)
  }
}
