# Test results

Real command output, run on 2026-09-26 on Windows, Node v24.19.0, Chrome 153.0.8010.54 (headless).
Every count below comes from a command that was actually executed in this session; none is estimated.

## 1. Lint

```
npm run lint
```
**Result: PASS.** 0 problems across `src/`, `server/`, `tests/`, `e2e/`, `scripts/`, `.claude/hooks/`.

## 2. Build

```
npm run build
```
**Result: PASS.** `tsc -b` then `vite build`. Output: `index-*.js` 278.68 kB (85.84 kB gzip), `index-*.css` 31.42 kB (7.23 kB gzip). No TypeScript errors.

## 3. Unit / integration tests (`npm test`, fake Groq server)

**Result: 104 passed, 0 failed** (8 files, 20 suites, ~4.1s).

| File | Tests | Covers |
|---|---:|---|
| `tests/data.test.js` | 19 | `data/portfolio.json` structure and derivability from `docs/PORTFOLIO-SOURCE-OF-TRUTH.md`: project shape, skill/track project-id references, numbers and technologies present in the source, pipeline order preserved, no invented rationale/causation/judgement wording, no unsourced percentages, contact fields null until verified |
| `tests/twin-api.test.js` | 33 | `POST /api/twin/chat`: valid requests, history, repeats; invalid input (missing/empty/non-string/too-long message, malformed JSON, bad history shapes, oversized body, wrong method); provider failures (401/403/429/500/503/timeout/unreachable/garbage body) mapped to typed errors without leaking the key, provider body or the question; rate limiting; security headers |
| `tests/twin-context.test.js` | 8 | The rendered system prompt contains every project and verified number, states the anti-hallucination rules, lists what is unknown, marks Memory of a City as demo data, is deterministic; user text never enters the system prompt; related-project detection from an answer |
| `tests/twin-guard.test.js` | 9 | Output guard: withholds invented percentages/years/counts/decimals/links/e-mails, allows every verified figure through, does not mistake list numbering for data, a forged assistant-history figure cannot legitimise a number; truncated (`finish_reason: length`) answers are trimmed to a full sentence and flagged, `content_filter` and non-recoverable truncation are rejected |
| `tests/twin-provider.test.js` | 9 | Provider errors classified by cause (400/404/413/422 = misconfigured, not "try again"); only allow-listed provider fields (`code`, `type`) are logged, never the message; a key with illegal header characters is reported without leaking it; a stalled body times out and logs the duration; odd 200 shapes (array/null content, error object, empty object) are rejected; Retry-After is bounded 1-120 and non-numeric values are ignored; the configured model and fixed generation settings are sent; `x-request-id` matches the body |
| `tests/twin-limits.test.js` | 10 | Invisible-Unicode-only input counts as empty; invisible characters stripped from real text; history over the 8,000-character total cap and `history: null` are rejected; forged `assistant` history reaches the provider only as labelled user text with extra fields stripped; a site-wide ceiling counts only requests that reach Groq; the provider call is cancelled when the visitor disconnects; `X-Forwarded-For` without `TRUST_PROXY` warns once; a missing `dist/` warns instead of failing silently; bad portfolio data fails at `createApp()`, not on the first request |
| `tests/twin-units.test.js` | 13 | `readConfig`: defaults, trimming, strict positive-integer parsing (rejects `15s`, `1.5e4`, `0`, negative, non-numeric with a warning), https-only base URL (localhost http allowed) without echoing a rejected URL; `clientKey`: IPv4, IPv4-mapped IPv6, IPv6 grouped by /64; `createRateLimiter`: window behaviour, Retry-After, per-client counting, table cleanup at scale |
| `tests/server-start.test.js` | 3 | A real child process: exits 1 with `EADDRINUSE` (not "listening" + exit 0) when the port is taken; exits 1 for an invalid `PORT`; on a clean start, logs the effective configuration and any config warnings and actually serves a request |

**Mutation checks** (confirming these tests can fail, not just pass):
- `data.test.js`: 6 mutations tried (crediting ROC-AUC to attrition, an unverified rationale word, an un-sourced number, a repo URL not in the source doc, a contact value not in the source doc, an invented performance number) — **all 6 caught**, then the data was restored.
- Hook tests: verified directly by breaking the probed file (a real `TS2322` type error, a real lint error) and confirming the hook reports FAIL with the right check named first.

## 4. Hook tests (`npm run test:hook`)

**Result: 14 passed, 0 failed** (~48s; each PASS/FAIL case runs real `eslint`/`tsc` subprocesses). Covers: PASS on a clean file; SKIP on unchanged content; FAIL on a type error and on a lint error (with the right check reported first); `.mjs` files are verified; the 5th consecutive failure exits 2 with an explicit STOP message; after that it stops blocking and adds a note via `additionalContext`; re-entrancy is a no-op; real lock contention waits instead of skipping; a lock held past the wait is skipped and recorded; a lock from a dead process or past its TTL is cleared immediately; an unparsable payload or one without a file path is recorded as SKIP with a reason; a log-write failure (EISDIR) still reports the real FAIL; ignored paths are never logged.

The hook also fired for real during this session: it caught a genuine `TS2322` in a probe file created with the Write tool, then passed once the probe was fixed. That run is in `.claude/state/verification-log.jsonl` (git-ignored).

## 5. Browser end-to-end tests (`npm run test:e2e`)

Builds the project, starts the real Express app against a fake Groq server, and drives real Chrome via `puppeteer-core`.

**Result: 72 passed, 0 failed.**

| Suite | Tests | Pass |
|---|---:|---:|
| Responsive layout (360/390/768/1440) | 16 | 16 |
| Navigation | 5 | 5 |
| Project interactions | 11 | 11 |
| Digital Twin UI, part 1 | 5 | 5 |
| Digital Twin UI, part 2 | 5 | 5 |
| Digital Twin failure handling | 7 | 7 |
| Review-fix regression checks | 7 | 7 |
| Twin: output guard, truncation, busy state | 7 | 7 |
| Keyboard accessibility | 4 | 4 |
| Security, console health, motion | 5 | 5 |

Full list of the 72 test names and outcomes: `e2e/output/results.json` (git-ignored; regenerate with `npm run test:e2e`).

**A vacuous test was found and fixed.** The original "full motion" test called `openPage(browser, url, viewport, { reducedMotion: false })`, but `openPage` takes one options object, so the fourth argument was silently ignored and the page always loaded with reduced motion. The test therefore passed without ever exercising full motion. Fixed to `openPage(browser, url, { ...viewport, reducedMotion: false })`, and the test now asserts `matchMedia('(prefers-reduced-motion: reduce)').matches === false` as a precondition. Mutation-checked: reverting the CSS fix (making `.reveal.is-visible` transparent) makes this specific test fail while "reduced motion" still passes, confirming it now tests something real.

## 6. Live Digital Twin evaluation (`npm run twin:eval`)

**Result: NOT RUN.** No `GROQ_API_KEY` was available in this environment. The script correctly reports:
```
SKIPPED: backend not reachable at http://127.0.0.1:8787
No live-model results were produced. This is NOT a pass.
```
(`e2e/output/twin-eval.json`, `skipped: true`.) All twin behaviour above was verified against a fake Groq server, which proves the surrounding code — validation, error handling, the output guard, history handling, prompt construction — but says nothing about how the real model answers. See `docs/DIGITAL-TWIN-TESTS.md` for exactly which scenarios that leaves unverified, and run `npm run twin:eval` with a real key before relying on the twin's answers.

## Known test gaps

- No real screen reader (NVDA/VoiceOver) was used; the e2e suite checks landmarks, labels and focus order programmatically, not perceived announcement.
- Only Chrome was exercised; Firefox and Safari are untested.
- No physical phone; 360/390/768 are emulated viewports.
- The rate limiter's IPv6 grouping and the global ceiling are unit- and integration-tested, not load-tested.

## Dark redesign + live Digital Twin evaluation (second session)

Real command output, this session, same Windows/Node/Chrome environment. Covers the dark editorial
redesign, the contact/repository content addition, and — for the first time in this repository — a
**live** run of `npm run twin:eval` against real Groq.

1. **`npm run lint`** — PASS, 0 problems, after every change in this session.
2. **`npm run build`** — PASS, no TypeScript errors, throughout.
3. **`npm test`** — grew from 105 to **108 passed, 0 failed**, confirmed on 4 separate runs. The 3 new
   tests (`tests/twin-context.test.js`, `tests/twin-guard.test.js`) were added to cover a real
   regression found and fixed in this session (next section). One run, taken while a background server
   and the live `twin:eval` were both also running, saw `tests/server-start.test.js`'s startup-log
   assertion fail on a timing race (the child process hadn't flushed its second log line inside the
   test's polling window); 3 immediate re-runs under normal load all passed cleanly, so this is
   recorded as an observed flake under contention, not a fixed defect.
4. **`npm run test:hook`** — PASS, 14/14, unchanged.
5. **`npm run test:e2e`** — PASS, **72/72**, re-run twice (once after the visual redesign, once after
   the backend grounding/guard fixes below) with 0 regressions either time.
6. **`npm run twin:eval` — actually run, with a real Groq key.** First attempt: `SKIPPED`, HTTP 502
   `provider_misconfigured` — the account's default model (`llama-3.3-70b-versatile`) no longer exists
   on Groq's catalog for this key (`model_not_found`, confirmed by probing `/v1/models` directly).
   Fixed by adding `GROQ_MODEL=openai/gpt-oss-120b` to the local, git-ignored `.env` (the code default
   in `server/twin/config.js` was left untouched). Second attempt hit a real account-level constraint:
   an 8,000 token-per-minute cap, which a single grounded request (≈14k-char system prompt) mostly
   exhausts by itself — `scripts/twin-eval.mjs` only retried our own site's 429s, not Groq's 503
   `provider_rate_limited`, so it failed almost every question. Fixed the eval script to also retry on
   that code, honouring the server's own `Retry-After` (already unit-tested server-side). Third run,
   with that fix and a running production server (`npm run build && node server/index.js`):
   **25 passed, 1 failed** of 26 questions (22 original + 4 added after the grounding fix below).
   The one failure was read from `e2e/output/twin-eval.json`: the model correctly answered "Resize
   every image to 100 × 100 pixels" (using the "×" character); the eval's regex only matched a literal
   "x". Fixed the regex (`/100\s?[x×]\s?100/i`); not re-run again afterward to avoid another ~10-minute
   rate-limited pass for a already-diagnosed heuristic miss — this is recorded here, not claimed as a
   re-verified 26/26.
7. **Visual review**: `node scripts/shoot.mjs 1440`, `390`, and `360` (re-shot after fixes), read
   directly. Full findings and dispositions in `docs/DESIGN-REVIEW.md` ("Dark editorial redesign,
   second pass").

### A real regression found and fixed mid-session (not by testing alone — by an independent review)

Adding `contact` and per-project `repoUrl` facts to `data/portfolio.json` (through the proper
source-of-truth-first workflow — see `docs/PORTFOLIO-SOURCE-OF-TRUTH.md`) silently broke two things
that no existing test caught, found by a `digital-twin-reviewer` subagent pass:

- **Grounding gap**: `server/twin/context.js` never read `portfolio.contact` or `project.repoUrl`, so
  the twin would have wrongly refused to state an email/LinkedIn/repo link that the site itself shows
  on the same page. Fixed by adding a `CONTACT` section and a `Repository:` line to the prompt.
- **Guard bypass**: `server/twin/guard.js`'s link/e-mail check used to ask only "does any link exist
  anywhere in the source?" — true the moment any real link exists — instead of "is this specific link
  in the source?". Once the source legitimately contained real links, the check stopped firing for
  *any* link, fabricated or not. Fixed to compare the actual link/e-mail token, the same way the
  number check already worked; regression-tested in `tests/twin-guard.test.js`.

Both fixes are covered by new unit tests and were confirmed live in the `twin:eval` run above (the
four new cases — real email/LinkedIn, a real repo link, a correctly-refused missing repo link, and a
CGPA-echo attempt — all passed against the real model).
