#!/usr/bin/env node
/**
 * PostToolUse hook: verifies every .ts/.tsx/.js/.jsx/.mjs/.css file Claude writes or edits.
 * (.mjs is an addition to the brief's list: this repo's scripts, e2e suites and this hook are .mjs.)
 *
 *   src/**\/*.ts(x), vite.config.ts  -> eslint <file> + tsc -b
 *   src/**\/*.css                    -> vite build (compiles Tailwind + CSS)
 *   other .js/.mjs                   -> eslint <file> + node --check <file>  (server/** also runs the API tests)
 *
 * Every outcome is appended to .claude/state/verification-log.jsonl as PASS / FAIL / SKIP, including
 * payloads it could not read. FAIL exits 2, which returns the output to the agent so it fixes the file.
 *
 * Loop prevention (a verification hook must never trap the agent):
 *   1. TWIN_VERIFY_ACTIVE is set for child processes, so nothing the hook runs can re-trigger it.
 *   2. The hook never modifies files (no --fix), so it cannot cause an edit that triggers itself.
 *   3. A lock file (with dead-owner detection) stops overlapping runs; contention waits, it does not skip.
 *   4. An identical, already-passed file is skipped (content hash).
 *   5. On the 5th consecutive FAIL for a file the hook says STOP and ask the user (exit 2, so the agent
 *      sees it); later failures no longer block.
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const SOURCE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.css'])
const IGNORED = /(^|\/)(node_modules|dist|docs\/screenshots|\.claude\/state)(\/|$)/
const MAX_CONSECUTIVE_FAILS = 5
const LOCK_TTL_MS = 3 * 60_000
const LOCK_WAIT_MS = Number(process.env.TWIN_VERIFY_LOCK_WAIT_MS) || 20_000
const PASS_CACHE_MS = 10 * 60_000
// 3 checks x 50 s + the lock wait stays under the 180 s hook timeout in .claude/settings.json.
const CHECK_TIMEOUT_MS = 50_000

const projectDir = path.resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd())
const stateDir = path.resolve(process.env.TWIN_VERIFY_STATE_DIR || path.join(projectDir, '.claude', 'state'))
const paths = {
  log: path.join(stateDir, 'verification-log.jsonl'),
  last: path.join(stateDir, 'last-verification.json'),
  state: path.join(stateDir, 'verify-state.json'),
  lock: path.join(stateDir, 'verify.lock'),
}

const bin = (rel) => path.join(projectDir, 'node_modules', rel)
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

/** Runs a persistence step. A full disk or an antivirus lock must not hide a real verification result. */
function safely(what, step) {
  try {
    step()
  } catch (err) {
    console.error(`verify-on-edit: WARNING could not ${what} (${err.code ?? err.name}); the verification result below is still valid.`)
  }
}

function record(entry) {
  safely('write the verification log', () => {
    mkdirSync(stateDir, { recursive: true })
    const line = { ts: new Date().toISOString(), ...entry }
    appendFileSync(paths.log, JSON.stringify(line) + '\n')
    writeFileSync(paths.last, JSON.stringify(line, null, 2))
  })
}

function skip(file, reason) {
  record({ file, result: 'SKIP', reason })
  console.error(`verify-on-edit: SKIP ${file ?? '(no file)'} (${reason})`)
}

function plan(rel) {
  const ext = path.extname(rel)
  const eslint = { name: 'eslint', args: [bin('eslint/bin/eslint.js'), rel] }
  const tsc = { name: 'tsc -b', args: [bin('typescript/bin/tsc'), '-b'] }
  if (rel === 'eslint.config.js') return [{ name: 'eslint .', args: [bin('eslint/bin/eslint.js'), '.'] }]
  if (rel.startsWith('src/') && ext === '.css') return [{ name: 'vite build', args: [bin('vite/bin/vite.js'), 'build'] }]
  if (rel.startsWith('src/') || rel === 'vite.config.ts') return [eslint, tsc]
  const checks = [eslint]
  if (ext === '.js' || ext === '.mjs') checks.push({ name: 'node --check', args: ['--check', rel] })
  if (rel.startsWith('server/')) checks.push({ name: 'npm test (node --test)', args: ['--test', 'tests/*.test.js'] })
  if (/^tests\/[^/]+\.test\.js$/.test(rel)) checks.push({ name: 'node --test (this file)', args: ['--test', rel] })
  return checks
}

function run(check) {
  const started = Date.now()
  const res = spawnSync(process.execPath, check.args, {
    cwd: projectDir,
    env: { ...process.env, TWIN_VERIFY_ACTIVE: '1' },
    encoding: 'utf8',
    timeout: CHECK_TIMEOUT_MS,
  })
  const ok = res.status === 0 && !res.error && !res.signal
  const why = res.error ? String(res.error) : res.signal ? `killed by ${res.signal} (timeout ${CHECK_TIMEOUT_MS} ms?)` : ''
  return { name: check.name, ok, ms: Date.now() - started, output: ok ? '' : `${res.stdout ?? ''}${res.stderr ?? ''}${why}`.trim() }
}

function readPayload() {
  try {
    return { payload: JSON.parse(readFileSync(0, 'utf8')) }
  } catch {
    return { payload: null }
  }
}

function isAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    return err.code === 'EPERM' // exists, but owned by someone else
  }
}

/** Returns 'acquired', 'busy' (another live run held it for the whole wait) or 'error:<code>' (cannot lock at all). */
function acquireLock() {
  const deadline = Date.now() + LOCK_WAIT_MS
  try {
    mkdirSync(stateDir, { recursive: true })
  } catch (err) {
    return `error:${err.code ?? err.name}`
  }
  for (let attempt = 0; attempt < 400; attempt += 1) {
    try {
      writeFileSync(paths.lock, JSON.stringify({ pid: process.pid, ts: Date.now() }), { flag: 'wx' })
      return 'acquired'
    } catch (err) {
      if (err.code !== 'EEXIST') return `error:${err.code ?? err.name}`
      const held = readJson(paths.lock, { ts: 0, pid: 0 })
      const stale = Date.now() - held.ts > LOCK_TTL_MS || (held.pid && !isAlive(held.pid))
      if (stale) {
        try {
          rmSync(paths.lock, { force: true })
        } catch (rmErr) {
          return `error:${rmErr.code ?? rmErr.name}`
        }
        continue
      }
      if (Date.now() >= deadline) return 'busy'
      sleep(250) // real contention (parallel edits): wait for the other run instead of skipping this file
    }
  }
  return 'busy'
}

function main() {
  if (process.env.TWIN_VERIFY_ACTIVE === '1') return 0 // guard 1: never re-enter

  const { payload } = readPayload()
  if (!payload) {
    skip(null, 'unparsable hook payload')
    return 0
  }
  const target = payload.tool_input?.file_path ?? payload.tool_input?.notebook_path
  if (!target) {
    skip(null, 'no file path in the hook payload (tool_input.file_path)')
    return 0
  }
  const abs = path.resolve(projectDir, target)
  const rel = path.relative(projectDir, abs).split(path.sep).join('/')
  if (rel.startsWith('..') || path.isAbsolute(rel) || IGNORED.test(rel)) return 0
  if (!SOURCE_EXT.has(path.extname(rel)) || !existsSync(abs)) return 0

  const hash = createHash('sha1').update(readFileSync(abs)).digest('hex')
  const state = readJson(paths.state, { files: {} })
  const previous = state.files[rel] ?? { hash: '', consecutiveFails: 0, lastResult: '', ts: 0 }

  if (previous.lastResult === 'PASS' && previous.hash === hash && Date.now() - previous.ts < PASS_CACHE_MS) {
    skip(rel, 'identical content already passed')
    return 0
  }
  const lock = acquireLock()
  if (lock === 'busy') {
    skip(rel, 'another verification is still running')
    return 0
  }
  if (lock.startsWith('error:')) console.error(`verify-on-edit: WARNING could not take the lock (${lock.slice(6)}); verifying without it.`)

  try {
    const checks = []
    for (const check of plan(rel)) {
      const result = run(check)
      checks.push(result)
      if (!result.ok) break // the first failing check already tells Claude what to fix
    }
    const failed = checks.find((c) => !c.ok)
    const result = failed ? 'FAIL' : 'PASS'
    const consecutiveFails = failed ? previous.consecutiveFails + 1 : 0
    state.files[rel] = { hash, consecutiveFails, lastResult: result, ts: Date.now() }
    safely('save the verification state', () => {
      mkdirSync(stateDir, { recursive: true })
      writeFileSync(paths.state, JSON.stringify(state, null, 2))
    })
    record({ file: rel, result, consecutiveFails, checks: checks.map(({ name, ok, ms }) => ({ name, ok, ms })) })

    if (!failed) {
      console.log(`verify-on-edit: PASS ${rel} (${checks.map((c) => c.name).join(', ')})`)
      return 0
    }
    const detail = failed.output.split('\n').slice(0, 40).join('\n')
    if (consecutiveFails === MAX_CONSECUTIVE_FAILS) {
      // guard 5: exit 2 one last time so the agent actually sees the instruction to stop (stdout on exit 0 does not reach it)
      console.error(`verify-on-edit: FAIL ${rel} - ${failed.name} failed for the ${MAX_CONSECUTIVE_FAILS}th time in a row. STOP retrying: tell the user what is failing and ask for help before editing this file again. This hook will not block this file any further.\n${detail}`)
      return 2
    }
    if (consecutiveFails > MAX_CONSECUTIVE_FAILS) {
      const note = `verify-on-edit: ${rel} is still failing ${failed.name} (${consecutiveFails} times in a row). Not blocking; the user has been asked to step in.\n${detail}`
      console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: note } }))
      return 0
    }
    console.error(`verify-on-edit: FAIL ${rel} - ${failed.name} failed. Fix this, then re-save the file.\n${detail}`)
    return 2
  } finally {
    if (lock === 'acquired') rmSync(paths.lock, { force: true })
  }
}

process.exitCode = main()
