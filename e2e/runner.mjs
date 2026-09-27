import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const OUT = fileURLToPath(new URL('./output/', import.meta.url))

/** Tiny test runner: every test is recorded with its real outcome. Nothing is skipped silently. */
export class Runner {
  constructor() {
    this.results = []
    this.suite = ''
  }

  section(name) {
    this.suite = name
    console.log(`\n${name}`)
  }

  async test(name, fn) {
    const started = Date.now()
    try {
      await fn()
      this.results.push({ suite: this.suite, name, ok: true, ms: Date.now() - started })
      console.log(`  PASS  ${name}`)
    } catch (err) {
      const message = String(err?.message ?? err).split('\n').slice(0, 6).join('\n        ')
      this.results.push({ suite: this.suite, name, ok: false, ms: Date.now() - started, error: message })
      console.log(`  FAIL  ${name}\n        ${message}`)
    }
  }

  finish() {
    const passed = this.results.filter((r) => r.ok).length
    const failed = this.results.length - passed
    mkdirSync(OUT, { recursive: true })
    writeFileSync(`${OUT}results.json`, JSON.stringify({ ranAt: new Date().toISOString(), passed, failed, results: this.results }, null, 2))
    console.log(`\nE2E: ${passed} passed, ${failed} failed, ${this.results.length} total`)
    return failed
  }
}
