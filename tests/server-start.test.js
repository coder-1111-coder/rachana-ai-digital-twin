import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'

const ENTRY = fileURLToPath(new URL('../server/index.js', import.meta.url))
const ROOT = fileURLToPath(new URL('..', import.meta.url))

function run(env, timeout = 15_000) {
  return spawnSync(process.execPath, [ENTRY], { cwd: ROOT, env: { ...process.env, GROQ_API_KEY: '', ...env }, encoding: 'utf8', timeout })
}

describe('server/index.js startup', () => {
  it('exits 1 with a clear message when the port is already taken (it used to print "listening" and exit 0)', async () => {
    const blocker = createServer()
    await new Promise((resolve) => blocker.listen(0, '127.0.0.1', resolve))
    const { port } = blocker.address()
    try {
      const res = run({ PORT: String(port), HOST: '127.0.0.1' })
      assert.equal(res.status, 1, res.stdout + res.stderr)
      assert.match(res.stderr, /Could not listen on 127\.0\.0\.1:\d+: EADDRINUSE/)
      assert.ok(!res.stdout.includes('listening'))
    } finally {
      await new Promise((resolve) => blocker.close(resolve))
    }
  })

  it('exits 1 for an invalid PORT instead of silently using 8787', () => {
    for (const bad of ['abc', '0', '70000', '80.5']) {
      const res = run({ PORT: bad })
      assert.equal(res.status, 1, bad)
      assert.match(res.stderr, /not a valid port/)
    }
  })

  it('starts, reports the effective configuration and config warnings, and serves requests', async () => {
    const child = spawn(process.execPath, [ENTRY], {
      cwd: ROOT,
      // GROQ_MODEL is pinned here (not left to whatever a developer's local .env sets) so this
      // assertion stays deterministic regardless of the machine's own Groq account/model choice.
      env: { ...process.env, GROQ_API_KEY: 'k', GROQ_MODEL: 'llama-3.3-70b-versatile', PORT: '8799', TWIN_TIMEOUT_MS: '15s' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (err += d))
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`no start after 10s: ${out}${err}`)), 10_000)
        const poll = setInterval(() => {
          if (/listening/.test(out)) {
            clearTimeout(timer)
            clearInterval(poll)
            resolve()
          }
        }, 50)
      })
      assert.match(out, /Digital Twin: configured \(model llama-3\.3-70b-versatile, timeout 15000 ms, 20\/min per client, 300\/hour site-wide\)/)
      assert.match(err, /\[config\] TWIN_TIMEOUT_MS="15s" is not a positive whole number; using 15000/)
      const res = await fetch('http://127.0.0.1:8799/api/twin/chat')
      assert.equal(res.status, 405)
    } finally {
      child.kill()
    }
  })
})
