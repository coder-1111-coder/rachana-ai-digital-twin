import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const HOOK = path.join(ROOT, '.claude', 'hooks', 'verify-on-edit.mjs')
const PROBE_REL = 'src/__hook_probe__.ts'
const PROBE_ABS = path.join(ROOT, PROBE_REL)
const APP = path.join(ROOT, 'src/App.tsx')

let stateDir
const logIn = (dir) => {
  const file = path.join(dir, 'verification-log.jsonl')
  return existsSync(file) ? readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []
}
const logLines = () => logIn(stateDir)

/** Runs the real hook with a simulated Claude Code PostToolUse payload. */
function runHook(filePath, { env = {}, toolInput, raw, dir } = {}) {
  const payload = { hook_event_name: 'PostToolUse', tool_name: 'Edit', tool_input: toolInput ?? { file_path: filePath } }
  return spawnSync(process.execPath, [HOOK], {
    cwd: ROOT,
    input: raw ?? JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: ROOT, TWIN_VERIFY_STATE_DIR: dir ?? stateDir, TWIN_VERIFY_ACTIVE: '', ...env },
    timeout: 170_000,
  })
}

const seedState = (fails) =>
  writeFileSync(path.join(stateDir, 'verify-state.json'), JSON.stringify({ files: { [PROBE_REL]: { hash: 'old', consecutiveFails: fails, lastResult: 'FAIL', ts: Date.now() } } }))

before(() => {
  stateDir = mkdtempSync(path.join(tmpdir(), 'twin-hook-'))
})
after(() => {
  rmSync(PROBE_ABS, { force: true })
  rmSync(stateDir, { recursive: true, force: true })
})

describe('verify-on-edit hook: results', () => {
  it('PASS: a clean source file runs eslint + tsc and records PASS', () => {
    const res = runHook(APP)
    assert.equal(res.status, 0, res.stderr)
    assert.match(res.stdout, /PASS src\/App\.tsx \(eslint, tsc -b\)/)
    const entry = logLines().at(-1)
    assert.equal(entry.result, 'PASS')
    assert.deepEqual(entry.checks.map((c) => c.name), ['eslint', 'tsc -b'])
    assert.ok(entry.checks.every((c) => c.ok))
  })

  it('SKIP: the same unchanged file is not re-verified, and the skip is recorded', () => {
    const res = runHook(APP)
    assert.equal(res.status, 0)
    assert.match(res.stderr, /SKIP src\/App\.tsx \(identical content already passed\)/)
    assert.equal(logLines().at(-1).result, 'SKIP')
  })

  it('FAIL: a type error exits 2, names the failing check, and records FAIL', () => {
    writeFileSync(PROBE_ABS, "export const answer: number = 'not a number'\n")
    try {
      const res = runHook(PROBE_ABS)
      assert.equal(res.status, 2)
      assert.match(res.stderr, /FAIL src\/__hook_probe__\.ts - tsc -b failed/)
      assert.match(res.stderr, /TS2322/)
      const entry = logLines().at(-1)
      assert.equal(entry.result, 'FAIL')
      assert.equal(entry.consecutiveFails, 1)
    } finally {
      rmSync(PROBE_ABS, { force: true })
    }
  })

  it('FAIL: a lint error is caught before the type check runs', () => {
    writeFileSync(PROBE_ABS, 'const unused = 1\nexport const ok = 2\n')
    try {
      const res = runHook(PROBE_ABS)
      assert.equal(res.status, 2)
      assert.match(res.stderr, /eslint failed/)
      assert.deepEqual(logLines().at(-1).checks.map((c) => c.name), ['eslint'])
    } finally {
      rmSync(PROBE_ABS, { force: true })
    }
  })

  it('.mjs files are verified too (eslint + node --check)', () => {
    const res = runHook(path.join(ROOT, 'scripts/dev.mjs'))
    assert.equal(res.status, 0, res.stderr)
    assert.match(res.stdout, /PASS scripts\/dev\.mjs \(eslint, node --check\)/)
  })
})

describe('verify-on-edit hook: loop guards', () => {
  it('the 5th consecutive failure exits 2 with an explicit STOP instruction the agent will see', () => {
    writeFileSync(PROBE_ABS, "export const answer: number = 'still broken'\n")
    seedState(4)
    try {
      const res = runHook(PROBE_ABS)
      assert.equal(res.status, 2, 'must reach the agent through stderr')
      assert.match(res.stderr, /5th time in a row\. STOP retrying/)
      assert.match(res.stderr, /ask for help/)
      assert.equal(logLines().at(-1).consecutiveFails, 5)
    } finally {
      rmSync(PROBE_ABS, { force: true })
    }
  })

  it('after that it stops blocking, and adds a note to the agent context as JSON', () => {
    writeFileSync(PROBE_ABS, "export const answer: number = 'still broken again'\n")
    seedState(5)
    try {
      const res = runHook(PROBE_ABS)
      assert.equal(res.status, 0, 'no longer blocking')
      const out = JSON.parse(res.stdout)
      assert.equal(out.hookSpecificOutput.hookEventName, 'PostToolUse')
      assert.match(out.hookSpecificOutput.additionalContext, /still failing tsc -b \(6 times in a row\)/)
    } finally {
      rmSync(PROBE_ABS, { force: true })
    }
  })

  it('re-entrancy guard: does nothing when launched from inside another verification', () => {
    const count = logLines().length
    const res = runHook(APP, { env: { TWIN_VERIFY_ACTIVE: '1' } })
    assert.equal(res.status, 0)
    assert.equal(res.stdout + res.stderr, '')
    assert.equal(logLines().length, count)
  })
})

describe('verify-on-edit hook: locking', () => {
  const lockFile = () => path.join(stateDir, 'verify.lock')
  const NAV = path.join(ROOT, 'src/nav.ts')

  it('real contention waits for the other run, then verifies (it used to skip and hide the file)', () => {
    mkdirSync(stateDir, { recursive: true })
    writeFileSync(lockFile(), JSON.stringify({ pid: process.pid, ts: Date.now() }))
    const releaser = spawn(process.execPath, ['-e', "setTimeout(() => require('node:fs').rmSync(process.env.LOCK, { force: true }), 1500)"], {
      env: { ...process.env, LOCK: lockFile() },
      stdio: 'ignore',
    })
    try {
      const res = runHook(NAV, { env: { TWIN_VERIFY_LOCK_WAIT_MS: '10000' } })
      assert.equal(res.status, 0, res.stderr)
      assert.match(res.stdout, /PASS src\/nav\.ts/)
    } finally {
      releaser.kill()
      rmSync(lockFile(), { force: true })
    }
  })

  it('a lock that stays held past the wait is skipped, and recorded as such', () => {
    writeFileSync(lockFile(), JSON.stringify({ pid: process.pid, ts: Date.now() }))
    try {
      const res = runHook(path.join(ROOT, 'src/portfolio.ts'), { env: { TWIN_VERIFY_LOCK_WAIT_MS: '400' } })
      assert.equal(res.status, 0)
      assert.match(res.stderr, /another verification is still running/)
      assert.equal(logLines().at(-1).result, 'SKIP')
    } finally {
      rmSync(lockFile(), { force: true })
    }
  })

  it('a lock owned by a dead process, or older than the TTL, is cleared immediately', () => {
    for (const held of [{ pid: 2_000_000_000, ts: Date.now() }, { pid: process.pid, ts: Date.now() - 10 * 60_000 }]) {
      writeFileSync(lockFile(), JSON.stringify(held))
      const started = Date.now()
      const res = runHook(path.join(ROOT, 'src/main.tsx'), { env: { TWIN_VERIFY_LOCK_WAIT_MS: '30000' } })
      assert.equal(res.status, 0, res.stderr)
      assert.match(res.stdout, /PASS src\/main\.tsx|SKIP/, res.stdout + res.stderr)
      assert.ok(Date.now() - started < 25_000, 'must not wait on a dead owner')
      assert.equal(existsSync(lockFile()), false, 'lock is released')
      rmSync(path.join(stateDir, 'verify-state.json'), { force: true })
    }
  })
})

describe('verify-on-edit hook: things that used to fail silently', () => {
  it('an unparsable payload and a payload without a file path are recorded as SKIP with a reason', () => {
    const before = logLines().length
    const bad = runHook(undefined, { raw: 'not json at all' })
    assert.equal(bad.status, 0)
    assert.match(bad.stderr, /SKIP .*unparsable hook payload/)
    const none = runHook(undefined, { toolInput: { path: 'src/App.tsx' } })
    assert.equal(none.status, 0)
    assert.match(none.stderr, /no file path in the hook payload/)
    const added = logLines().slice(before)
    assert.deepEqual(added.map((e) => e.result), ['SKIP', 'SKIP'])
    assert.match(added[0].reason, /unparsable/)
  })

  it('a failing verification is still reported (exit 2) when the log cannot be written', () => {
    const brokenDir = mkdtempSync(path.join(tmpdir(), 'twin-hook-broken-'))
    mkdirSync(path.join(brokenDir, 'verification-log.jsonl')) // appending to a directory fails with EISDIR
    writeFileSync(PROBE_ABS, "export const answer: number = 'broken'\n")
    try {
      const res = runHook(PROBE_ABS, { dir: brokenDir })
      assert.equal(res.status, 2, res.stderr)
      assert.match(res.stderr, /WARNING could not write the verification log \(EISDIR\)/)
      assert.match(res.stderr, /FAIL src\/__hook_probe__\.ts - tsc -b failed/)
    } finally {
      rmSync(PROBE_ABS, { force: true })
      rmSync(brokenDir, { recursive: true, force: true })
    }
  })

  it('ignores files it should not verify, without logging them', () => {
    const count = logLines().length
    for (const target of ['README.md', 'docs/SPEC.md', 'data/portfolio.json', 'dist/assets/x.js', 'node_modules/x/index.js', path.join(tmpdir(), 'outside.ts')]) {
      const res = runHook(target)
      assert.equal(res.status, 0, target)
      assert.equal(res.stdout + res.stderr, '', target)
    }
    assert.equal(logLines().length, count, 'nothing should be logged for ignored files')
  })
})
