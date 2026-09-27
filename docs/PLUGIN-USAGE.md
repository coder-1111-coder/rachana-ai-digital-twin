# Plugin usage

## Plugin selected

**`pr-review-toolkit@claude-plugins-official`** (already installed at user scope; not installed for this
task specifically). It was chosen over the other marketplace plugins because this project's actual risk was
never "does it look good" alone — it was silent error handling and rule adherence in a backend that talks to
an external LLM and a portfolio that must never overstate facts. `pr-review-toolkit`'s agents target exactly
that: `silent-failure-hunter` for swallowed errors and bad fallbacks, `code-reviewer` for adherence to
project-specific rules (here, `CLAUDE.md`), and `pr-test-analyzer` for coverage quality. No other candidate
plugin (`frontend-design`, `security-guidance`, etc.) matched the work as closely, and `frontend-design` was
explicitly not used because the visual direction is fixed by `skills/portfolio-design/SKILL.md` and adding a
second design system would contradict "restrained, no template look".

## What it did

### `pr-review-toolkit:silent-failure-hunter`
**Why:** the server proxies every question to a third-party LLM; a swallowed error there either hangs a
request or, worse, returns a wrong answer as if it were correct.
**Scope given:** `server/app.js`, `server/twin/*.js`, `src/lib/twinClient.ts`, `src/components/Twin.tsx`,
`.claude/hooks/verify-on-edit.mjs`.
**Result:** 15 real defects, 3 minor, most reproduced by running the code, not just reading it. The most
consequential:
- `server/index.js`: a failed `listen()` (port in use) printed "listening" and exited 0 — nothing was serving,
  and a process manager would see a clean exit.
- `src/lib/twinClient.ts`: `AbortSignal.any` is unsupported on Safari 17.3 and earlier / Chrome 115 and
  earlier; every question there would fail as "check your connection" with nothing logged.
- `server/twin/groq.js`: `finish_reason` was never read, so a token-limit truncation was served as a complete
  200 answer.
- Every non-401/403/429 provider status (400, 404, 413, ...) was reported as "try again in a moment" with no
  distinguishing log line, and the provider's own error body was never consumed or classified.
- Config parsing used `Number.parseInt`, so `TWIN_TIMEOUT_MS=15s` silently became 15 milliseconds.
- The hook's own "stop after 5 failures" message was written to stdout on an exit-0 path, which Claude Code
  does not surface to the agent — the promised behaviour in `CLAUDE.md` never actually reached anyone.

**Evidence:** all six are now covered by tests and fixed. See `server/twin/groq.js` (`finish_reason`,
provider-status classification), `server/twin/config.js` (strict integer parsing with warnings),
`server/index.js` (`listen` error handling), `.claude/hooks/verify-on-edit.mjs` (STOP message now exits 2),
`tests/twin-provider.test.js`, `tests/twin-units.test.js`, `tests/server-start.test.js`.

### `pr-review-toolkit:code-reviewer`
**Why:** the project has an explicit rulebook (`CLAUDE.md`); a generic review would miss project-specific
violations like invented rationale in copy or a repo link that is not in the verified source.
**Scope given:** the whole authored tree (`src/**`, `server/**`, `tests/**`, `e2e/**`, `scripts/*.mjs`,
`.claude/hooks/*.mjs`, config files), checked against `CLAUDE.md`.
**Result:** 13 findings. The one rated Critical was a genuine test bug, not a product bug: the "full motion"
e2e test called `openPage(browser, url, viewport, options)`, but the function takes one options object, so
the motion setting was silently ignored and the test always ran under reduced motion — it had been passing
without testing anything. Also found: the hero's stat strip conflicted with the design skill's own "avoid
statistic strips" rule; the dev proxy never read `PORT` from `.env`; a skill ("F1 / ROC-AUC") was attributed
to a project whose source section didn't support half of it; several copy lines implied a rationale or an
order the source doesn't state; the skills-filter dimmed state relied on `opacity-40`, which fails WCAG AA
for content text; and two style-guide breaches (a default export, a 281-line component).

**Evidence:** the vacuous test is fixed (see `docs/TEST-RESULTS.md` §5, mutation-checked); the stat strip is
replaced with a plain derived-count line; `vite.config.ts` now reads `.env` via `loadEnv`; the skill entry was
split into `F1`/`ROC-AUC`/`AUC` per project (`tests/data.test.js` now checks every term, not just one);
rationale wording was rewritten and is now regex-checked in `tests/data.test.js`; the dimmed skill state uses
a dashed border and ink-3 text (5.1:1) instead of opacity; `App.tsx` uses a named export; `Twin.tsx` was split
into `Twin.tsx`, `TwinTurns.tsx` and the `useTwinChat` hook.

### `pr-review-toolkit:pr-test-analyzer`
**Why:** to independently judge whether the test suite actually covers the brief's required categories
(UI, Digital Twin, API) with meaningful assertions, not just high counts.
**Scope given:** `tests/**`, `e2e/**`, told which requirement categories to check coverage against.
**Result: the run failed.** The agent stalled mid-task ("no progress for 600s, stream watchdog did not
recover") while rewriting its own test harness, and produced no findings. It was not retried, because the
same ground — test coverage against the brief's categories — is independently covered by
`docs/DIGITAL-TWIN-TESTS.md` (built by hand from the actual test files) and by the `verification-reviewer`
subagent's audit. This is recorded here rather than hidden: the attempt is real, its failure is real, and no
result from it is claimed.

## Not used

`pr-review-toolkit:code-simplifier`, `comment-analyzer` and `type-design-analyzer` were available but not
run: simplification and comment-quality passes were judged lower-value than the correctness and coverage
work above given the review budget, and the codebase has no complex custom types for `type-design-analyzer`
to usefully analyse (it is mostly plain JSON-derived shapes, already checked structurally by
`tests/data.test.js`).
