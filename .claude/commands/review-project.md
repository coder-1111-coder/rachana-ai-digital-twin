---
description: Full pre-completion review: build check, then independent reviewers (design, content, twin, verification) plus the pr-review-toolkit plugin, then fix and re-verify
argument-hint: "[focus: design | content | twin | verification | all]"
allowed-tools: Bash(npm run lint), Bash(npm run build), Bash(npm test), Bash(npm run test:e2e), Bash(npm run test:hook), Bash(git diff:*), Bash(git status:*), Agent, Read, Edit
---

Use this once, near the end, not after every edit. Reviewers cost time; spawn one only if its scope changed.

## 1. Baseline
Run the `/build-check` steps (lint, build, `npm test`). Do not spawn reviewers on a red build.

## 2. Independent reviews (run in parallel, read-only)
Pick from $ARGUMENTS (default all):
- `design-reviewer`: reads real screenshots, judges the visual rubric.
- `portfolio-content-reviewer`: every visible word against `docs/PORTFOLIO-SOURCE-OF-TRUTH.md`.
- `digital-twin-reviewer`: grounding, injection, secrets, failure paths in `server/` and the Twin UI.
- `verification-reviewer`: re-runs everything and audits what the docs claim. Run this last, after fixes and after the docs are written.

Plugin (pr-review-toolkit, already installed): when code changed, also run
- `pr-review-toolkit:silent-failure-hunter` on `server/` and `src/lib/twinClient.ts`,
- `pr-review-toolkit:code-reviewer` against `CLAUDE.md` for the diff (`git status --short` to list files),
- `pr-review-toolkit:pr-test-analyzer` on `tests/` and `e2e/` when tests changed.
Record what each plugin agent found and did in `docs/PLUGIN-USAGE.md`.

## 3. Triage
Merge findings, drop duplicates, and verify each HIGH/MEDIUM one yourself before acting: reviewers can be wrong. Fix real issues with the smallest change. Do not chase LOW or stylistic items.

## 4. Re-verify
Re-run the rungs affected by the fixes (`skills/verification/SKILL.md`). Update `docs/TEST-RESULTS.md`, `docs/DESIGN-REVIEW.md`, `docs/DIGITAL-TWIN-TESTS.md` with real output.

## 5. Report
Findings by reviewer, what was fixed, what was rejected and why, what remains, and anything not verified. Never call the project complete while a HIGH finding is open.
