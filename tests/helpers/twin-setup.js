import { afterEach } from 'node:test'
import { startFakeGroq } from './fake-groq.js'
import { startTwin } from './twin-harness.js'

/**
 * Call once at the top of a test file. Returns `setup(handler, env)`, which starts a fake Groq and the
 * real app wired to it, and registers cleanup after each test.
 */
export function useTwinSetup() {
  const cleanups = []
  afterEach(async () => {
    while (cleanups.length) await cleanups.pop()()
  })
  return async function setup(handler, env = {}) {
    const groq = await startFakeGroq(handler)
    const twin = await startTwin({ env: { GROQ_BASE_URL: groq.baseUrl, ...env } })
    cleanups.push(twin.close, groq.close)
    return { groq, twin }
  }
}

export const ask = (message, extra = {}) => ({ message, ...extra })
