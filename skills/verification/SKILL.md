---
name: verification
description: The verification ladder for this project, when to run each rung, how the PostToolUse hook fits in, and the rules for reporting results honestly. Use before saying any work is done, and when writing docs/TEST-RESULTS.md or docs/DIGITAL-TWIN-TESTS.md.
---

# Verification

Nothing is "done" until the relevant rung has actually run and its real output has been read.

## The ladder (cheapest first)
| Rung | Command | Proves | Time |
|---|---|---|---|
| 1. Per-edit hook | automatic on Write/Edit of .ts .tsx .js .jsx .css | that file lints, type-checks / builds | 2-5 s |
| 2. Lint | `npm run lint` | whole repo passes ESLint | 3 s |
| 3. Build | `npm run build` | `tsc -b` + production bundle | 5 s |
| 4. API and data tests | `npm test` | validation, failures, grounding prompt, data matches source | 3 s |
| 5. Hook tests | `npm run test:hook` | the hook PASSes, FAILs, skips, and cannot loop | 25 s |
| 6. Browser e2e | `npm run test:e2e` | responsive, navigation, projects, keyboard, twin UI and failure UI, security, motion in real Chrome | 60 s |
| 7. Live twin | `npm run twin:eval` (server + key) | real model refuses to invent | 40 s |

Order to run before finishing a change: 2, 3, 4, then 5 or 6 if hooks or UI changed. Rung 7 whenever the prompt, source or model changes.

## The PostToolUse hook
`.claude/hooks/verify-on-edit.mjs`, wired in `.claude/settings.json` for `Write|Edit|MultiEdit`. Every run appends PASS / FAIL / SKIP to `.claude/state/verification-log.jsonl` (git-ignored). FAIL exits 2 so the error comes back to the agent. It cannot loop: child processes run with `TWIN_VERIFY_ACTIVE=1`, it never edits files, a lock (with dead-owner detection) serialises runs and waits on real contention instead of skipping, identical passed content is skipped, and on the 5th consecutive FAIL for a file it exits 2 once more with an explicit STOP-and-ask-the-user message the agent will see, then stops blocking. Unreadable payloads and log-write failures are recorded or warned about, never swallowed. It also verifies `.mjs` files.
Limits: edits made through shell commands (heredocs, `sed`) do not trigger it. Rungs 2-3 are the backstop.

## Honesty rules
1. Report the command, the real counts and the date. Never round a failure into a pass.
2. A test that has never failed proves little. After writing a check, break the thing it guards and confirm it fails (see the mutation checks in `docs/TEST-RESULTS.md`). This is not theoretical: on this project a "full motion" e2e test passed for hours while never enabling motion, because its option was silently ignored. A reviewer found it; a mutation check would have.
3. Fake-server tests prove plumbing. They say nothing about model quality. Label them.
4. SKIPPED is not PASS. If `twin:eval` cannot run (no key), the document says "not run".
5. Distinguish product bugs from test bugs when a check fails, and record both.
6. Keep a list of what was not tested (real screen readers, real phones, other browsers, production deploy).

## Recording results
`docs/TEST-RESULTS.md`: one table per rung with command, counts, result, and notes on failures found and how they were resolved. `docs/DIGITAL-TWIN-TESTS.md`: one row per twin scenario with how it was tested (unit, fake-server e2e, live) and the observed result.
