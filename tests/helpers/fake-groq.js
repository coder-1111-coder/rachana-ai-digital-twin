import { createServer } from 'node:http'

/**
 * A stand-in for Groq's chat completions endpoint. `handler(record, res)` decides the
 * reply; every request it receives is recorded so tests can inspect what was sent.
 */
export async function startFakeGroq(handler) {
  const requests = []
  const server = createServer((req, res) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', async () => {
      let body = null
      try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      } catch {
        /* leave body null */
      }
      const record = { method: req.method, url: req.url, headers: req.headers, body }
      requests.push(record)
      await handler(record, res)
    })
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return {
    baseUrl: `http://127.0.0.1:${port}/openai/v1`,
    requests,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections?.()
        server.close(resolve)
      }),
  }
}

export const reply = {
  text: (text) => (_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: text } }] }))
  },
  status: (code, body = '{"error":{"message":"upstream detail that must never reach the client"}}', headers = {}) =>
    (_req, res) => {
      res.writeHead(code, { 'content-type': 'application/json', ...headers })
      res.end(body)
    },
  raw: (body) => (_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(body)
  },
  hang: () => () => {},
  /** A 200 with a chosen finish_reason. */
  finish: (text, reason) => (_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: text }, finish_reason: reason }] }))
  },
  json: (payload) => (_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify(payload))
  },
  /** Sends headers and part of a body, then never finishes (a stalled provider). */
  stall: () => (_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.write('{"choices":[')
  },
}
