---
description: Run the full non-browser verification (lint, type-check, build, API/data tests, hook tests) and report real results
argument-hint: "[--fast to skip hook tests]"
allowed-tools: Bash(npm run lint), Bash(npm run build), Bash(npm test), Bash(npm run test:hook), Bash(git status:*), Read
---

Read `skills/verification/SKILL.md` first.

Run these in order and stop at the first failure so it can be fixed before continuing. Capture the real output of each.

1. `npm run lint`
2. `npm run build` (this runs `tsc -b` then `vite build`; note the JS and CSS sizes it prints)
3. `npm test` (node:test: API, twin grounding, data-vs-source)
4. `npm run test:hook` (skip only if $ARGUMENTS contains `--fast`; say that it was skipped)

Then report, in this shape:

| Step | Result | Detail |
|---|---|---|
| lint | PASS/FAIL | error count |
| build | PASS/FAIL | bundle sizes |
| npm test | PASS/FAIL | passed/failed counts |
| test:hook | PASS/FAIL/SKIPPED | passed/failed counts |

If anything failed: quote the failing output, say whether it is a product bug or a test bug and why, propose the smallest fix, and do not mark the work complete. Also run `git status --short` and list any untracked files that look accidental (screenshots, `.env`, `dist/`).
Never claim a step passed unless you saw its output in this run.
