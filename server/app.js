import express from 'express'
import { existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadPortfolio } from './portfolio.js'
import { readConfig } from './twin/config.js'
import { TwinError, errors } from './twin/errors.js'
import { validateChatBody } from './twin/validate.js'
import { buildMessages, buildSourceText, findRelatedProjects } from './twin/context.js'
import { askGroq } from './twin/groq.js'
import { checkAnswer, WITHHELD_ANSWER } from './twin/guard.js'
import { createRateLimiter } from './twin/rate-limit.js'

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

/** Runs an Express-style middleware from inside an async handler. */
const applyLimiter = (limiter, req, res) =>
  new Promise((resolve, reject) => limiter(req, res, (err) => (err ? reject(err) : resolve())))

/** First "at ..." frame of an error: says where it happened without echoing its message. */
const topFrame = (err) => String(err?.stack ?? '').split('\n').find((line) => line.trim().startsWith('at ')) ?? 'no stack'

/**
 * Builds the Express app. Everything environment-specific is injectable so tests can run it against
 * a fake Groq server without touching real credentials.
 * @param {{ env?: Record<string, string | undefined>, fetchImpl?: typeof fetch,
 *   logger?: { error: (...args: unknown[]) => void, warn?: (...args: unknown[]) => void },
 *   portfolio?: import('./portfolio.js').Portfolio, distDir?: string }} [options]
 */
export function createApp({ env = process.env, fetchImpl = fetch, logger = console, portfolio = loadPortfolio(), distDir } = {}) {
  const config = readConfig(env)
  // Build the source text once, here: bad data fails at startup instead of on a visitor's first question.
  const sourceText = buildSourceText(portfolio)
  const app = express()
  app.disable('x-powered-by')
  if (env.TRUST_PROXY === '1') app.set('trust proxy', 1)

  let proxyWarned = false
  app.use((req, res, next) => {
    req.id = randomUUID().slice(0, 8)
    res.setHeader('x-request-id', req.id)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Content-Security-Policy', CSP)
    if (!proxyWarned && env.TRUST_PROXY !== '1' && req.headers['x-forwarded-for']) {
      proxyWarned = true
      logger.warn?.('[server] X-Forwarded-For seen but TRUST_PROXY is not 1: behind a proxy every visitor shares one rate-limit bucket.')
    }
    next()
  })

  const twin = express.Router()
  const perClient = createRateLimiter({ limit: config.rateLimitPerMin })
  const site = createRateLimiter({ limit: config.globalLimitPerHour, windowMs: 3_600_000, key: () => 'site' })

  twin.post('/chat', perClient, express.json({ limit: '32kb' }), async (req, res) => {
    const { message, history } = validateChatBody(req.body)
    if (!config.apiKey) throw errors.notConfigured()
    await applyLimiter(site, req, res) // only requests that would reach Groq count against the site-wide ceiling

    const gone = new AbortController()
    res.on('close', () => {
      if (!res.writableFinished) gone.abort() // the visitor left: stop spending quota
    })
    const { text, truncated } = await askGroq({
      apiKey: config.apiKey,
      model: config.model,
      baseUrl: config.baseUrl,
      timeoutMs: config.timeoutMs,
      messages: buildMessages(portfolio, message, history),
      fetchImpl,
      logger,
      requestId: req.id,
      signal: gone.signal,
    })

    const allowed = [sourceText, message, ...history.filter((h) => h.role === 'user').map((h) => h.content)].join('\n')
    const verdict = checkAnswer(text, allowed)
    if (!verdict.ok) {
      logger.error(`[twin ${req.id}] answer withheld by the output guard (${verdict.reason})`)
      return res.json({ answer: WITHHELD_ANSWER, related: [], guarded: true, requestId: req.id })
    }
    res.json({ answer: text, related: findRelatedProjects(text, portfolio.projects), truncated, requestId: req.id })
  })
  twin.all('/chat', (_req, res, next) => {
    res.setHeader('Allow', 'POST')
    next(new TwinError('method_not_allowed', 405, 'Use POST for /api/twin/chat.'))
  })

  app.use('/api/twin', twin)
  app.use('/api', (_req, _res, next) => next(new TwinError('not_found', 404, 'No such API route.')))

  const dist = distDir ?? fileURLToPath(new URL('../dist', import.meta.url))
  if (existsSync(path.join(dist, 'index.html'))) {
    app.use(
      express.static(dist, {
        setHeaders(res, file) {
          if (file.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
          }
        },
      }),
    )
  } else {
    logger.warn?.(`[server] ${path.join(dist, 'index.html')} not found: run "npm run build". Serving the API only; the site will 404.`)
  }
  app.use((_req, res) => res.status(404).type('text/plain').send('Not found'))

  // Express identifies an error handler by its four parameters, so the unused `_next` must stay.
  // eslint-disable-next-line no-unused-vars -- see the comment above
  app.use((err, req, res, _next) => {
    let failure = err
    if (err instanceof TwinError) {
      const worthLogging = err.code === 'rate_limited' || (err.status >= 500 && !err.code.startsWith('provider_'))
      if (worthLogging) logger.error(`[server ${req.id}] ${err.code} (${err.status})`)
    } else if (err?.type === 'entity.parse.failed') failure = errors.invalidJson()
    else if (err?.type === 'entity.too.large') failure = errors.payloadTooLarge()
    else if (err?.type === 'encoding.unsupported' || err?.type === 'charset.unsupported') {
      failure = errors.invalidRequest('Unsupported text encoding.')
    } else {
      logger.error(`[server ${req.id}] unexpected ${err?.name ?? 'error'}${err?.code ? ` ${err.code}` : ''} ${topFrame(err)}`)
      failure = new TwinError('internal_error', 500, 'Something went wrong on the server.')
    }
    if (res.headersSent) return
    if (failure.retryAfterSeconds) res.setHeader('Retry-After', String(failure.retryAfterSeconds))
    res.status(failure.status).json({ error: { code: failure.code, message: failure.message, requestId: req.id } })
  })

  return app
}
