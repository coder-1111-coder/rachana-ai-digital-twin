import { createApp } from '../../server/app.js'

export const TEST_KEY = 'gsk_test_key_do_not_leak_1234567890'

/**
 * Starts the real Express app on an ephemeral port. Returns helpers for posting to
 * /api/twin/chat and the captured server logs.
 * @param {{ env?: Record<string, string>, fetchImpl?: typeof fetch }} [options]
 */
export async function startTwin({ env = {}, fetchImpl } = {}) {
  const logs = []
  const warnings = []
  const logger = { error: (...args) => logs.push(args.join(' ')), warn: (...args) => warnings.push(args.join(' ')) }
  const app = createApp({ env: { GROQ_API_KEY: TEST_KEY, ...env }, logger, fetchImpl, distDir: '/nonexistent' })
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  const base = `http://127.0.0.1:${server.address().port}`

  async function post(body, { contentType = 'application/json', path = '/api/twin/chat', headers = {} } = {}) {
    const res = await fetch(base + path, {
      method: 'POST',
      headers: { ...(contentType ? { 'content-type': contentType } : {}), ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
    const text = await res.text()
    let json = null
    try {
      json = JSON.parse(text)
    } catch {
      /* non-JSON body */
    }
    return { status: res.status, headers: res.headers, text, json }
  }

  return {
    base,
    logs,
    warnings,
    post,
    get: (path) => fetch(base + path),
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections?.()
        server.close(resolve)
      }),
  }
}
