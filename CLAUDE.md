# CLAUDE.md

Guidance for Claude Code (and any contributor) working in this repository. Read it fully before editing. `SPEC.md` holds the product spec and status; `skills/` hold deeper how-tos.

## 1. Purpose
A personal technical portfolio for **Rachana S** (Year 3 Digital Transformation / AI-ML student) that is also an **AI Digital Twin**: "Ask Rachana" answers questions about her real projects using only a verified source file. It must look editorial and personal, not like a generic AI-generated template, and it must never state anything about her that is not verified.

## 2. Architecture
```
data/portfolio.json ──► src/ (React + TS + Vite + Tailwind v4)      one static bundle
        │                     │  POST /api/twin/chat
        └──────────────► server/ (Express) ──► Groq chat completions   key stays server-side
docs/PORTFOLIO-SOURCE-OF-TRUTH.md  = human-readable truth; tests keep the JSON derivable from it
```
- One Node process in production: `npm start` serves `dist/` and the API. In development `npm run dev` runs Express (:8787) and Vite (:5173, proxies `/api`).
- No database, no auth, no state library, no router: none is needed. Do not add them.
- Backend files: `server/app.js` (app factory, headers, errors), `server/twin/{config,validate,context,groq,errors,rate-limit}.js`, `server/portfolio.js`.
- Frontend: `src/components/*` (page sections), `src/case/*` (case-study layouts and diagrams), `src/lib/twinClient.ts`, `src/hooks/*`.

## 3. Source-of-truth rules
1. `docs/PORTFOLIO-SOURCE-OF-TRUTH.md` contains only facts the owner supplied. Never add to it on your own initiative.
2. `data/portfolio.json` must be derivable from it. `tests/data.test.js` fails when a number, technology, skill attribution or pipeline order is not supported.
3. Anything absent is **unknown**: no employers, dates, chronology, grades, awards, certifications, salary, contact details, performance numbers, algorithm names, or unstated rationale. Say "not in my verified notes" instead.
4. Memory of a City historical metrics are **DEMO DATA** everywhere they appear. Never present them as measurements.
5. Contact links and `site.repoUrl` stay `null` in the JSON until the owner supplies them (a test requires any set value to appear in the source document). Do not copy an email address, a GitHub handle or a repository URL from git, config or chat into the site.
6. Copy states what the notes list, not why. No causation ("because", "so that", "which is why"), no judgement ("honest", "trusted"), no ordering ("then", "builds on"). A test scans for these words; reviewers found the rest by reading.

## 4. AI grounding rules
See `skills/ai-digital-twin/SKILL.md`. In short: the whole verified source is placed in the system prompt; user text and history never enter the system message; the twin speaks about Rachana in the third person and is labelled as AI; unknowns are enumerated so it can refuse; errors are typed and never expose keys, provider bodies or the user's question; the browser never sees the key. A deterministic output guard withholds any answer with a number, percentage, e-mail or link that is not in the source or the visitor's own words; client-supplied `assistant` history is demoted to labelled user text; truncated answers are trimmed to a full sentence. Changing the prompt requires a matching test and a live-eval case.

## 5. Design rules
See `skills/portfolio-design/SKILL.md`. Editorial, restrained, one accent. Instrument Serif + IBM Plex. Rows and rules, not cards. No gradients, glassmorphism, neon, blobs, robots, fake statistics or testimonials. Motion is CSS-only, purposeful and disabled under `prefers-reduced-motion`. Every diagram is drawn from verified data. Do not introduce colours or fonts without checking contrast and this file.

## 6. Coding rules
- TypeScript strict in `src/`; JS (ESM) with JSDoc in `server/`. No `any`, no `@ts-ignore`, no `eslint-disable` without a written reason.
- Match surrounding style: small function components, named exports, comments only where the code cannot say why.
- New dependency = written justification here first. Current runtime deps: react, react-dom, lucide-react, express, three `@fontsource*` font packages. Dev: vite, tailwind, typescript, eslint stack, puppeteer-core (browser tests only). GSAP is intentionally absent.
- Errors: never swallow silently. Server errors are `TwinError` with a stable `code`; the UI shows `message`.
- Secrets: only in `.env` (git-ignored). `.env.example` documents them. Never log keys or user questions.
- CSP is `script-src 'self'`: no inline scripts.

## 7. Testing
Ladder and honesty rules: `skills/verification/SKILL.md`.

| Command | Covers |
|---|---|
| `npm run lint` | ESLint over src, server, tests, e2e, scripts, hook |
| `npm run build` | `tsc -b` then production bundle |
| `npm test` | API (valid, missing, malformed, provider failure, missing key, timeout, rate limit, no key leak), grounding prompt, data-vs-source. Fake Groq server |
| `npm run test:hook` | the PostToolUse hook: PASS, FAIL, SKIP, loop guards |
| `npm run test:e2e` | real Chrome: 360/390/768/1440 overflow, navigation, project tabs, keyboard, twin UI + failure states, CSP/console/third-party, reduced motion |
| `npm run twin:eval` | live hallucination evaluation. Needs a real key; prints SKIPPED otherwise. SKIPPED is not a pass |

Fake-server tests prove plumbing, not model quality. Never claim a live result you did not obtain.

## 8. Accessibility
See `skills/accessibility/SKILL.md`. WCAG 2.2 AA target: skip link, landmarks, heading order, WAI-ARIA tabs, visible focus, 24px+ targets, AA contrast, reduced motion, `role="log"` for the twin, labelled inputs, text-only answers.

## 9. Responsive requirements
No horizontal overflow at 360, 390, 768 and 1440px (the e2e suite checks the page, all six case studies, the open mobile menu, and long unbroken twin text). Mobile is designed, not squeezed: 2x3 tab grid, stacked rows, wrapping pipeline, menu disclosure.

## 10. Development workflow (SDD)
UNDERSTAND (read the source of truth, this file, the relevant skill) -> PLAN (state the change and what will prove it) -> IMPLEMENT (smallest change) -> TEST (rungs in the verification skill) -> REVIEW (subagents only when their scope changed) -> REFINE -> VERIFY (run the commands, read the output, then report).
- Skills (`skills/`): portfolio-design, frontend-development, ai-digital-twin, accessibility, verification. They are plain files: agents and commands read them by path.
- Commands (`.claude/commands/`): `/build-check`, `/verify-ui`, `/test-twin`, `/review-project`.
- Subagents (`.claude/agents/`, read-only): `design-reviewer`, `portfolio-content-reviewer`, `digital-twin-reviewer`, `verification-reviewer`. Spawn one only for independent work that its scope covers; not for trivial edits.
- Plugin: `pr-review-toolkit` (user scope, already installed) is used in review; evidence in `docs/PLUGIN-USAGE.md`.
- Do not push or merge automatically. Commit only when the owner asks.

## 11. Hook
`.claude/settings.json` registers a **PostToolUse** hook for `Write|Edit|MultiEdit` running `.claude/hooks/verify-on-edit.mjs`. For `.ts .tsx .js .jsx .css` (and `.mjs`, since this repo's scripts and tests are `.mjs`) it runs the real checks (`eslint` + `tsc -b` for `src/` and `vite.config.ts`; `vite build` for CSS; `eslint` + `node --check` (+ the API tests for `server/`) for JS) and records PASS/FAIL/SKIP in `.claude/state/verification-log.jsonl`. FAIL exits 2 and returns the output to you: fix the file and save again.
Loop prevention: child processes get `TWIN_VERIFY_ACTIVE=1` (no re-entry); the hook never edits files; a lock file (dead owners detected; real contention waits, it does not skip) serialises runs; unchanged passed content is skipped; on the 5th consecutive FAIL for a file it exits 2 once more with an explicit "STOP, ask the user" message, then stops blocking. Unreadable payloads and log-write failures are recorded or warned about, never swallowed. Files written through shell commands do not trigger it, so run `npm run lint && npm run build` before finishing.

## 12. Prohibited
- Inventing or "improving" facts, numbers, dates, employers, technologies, testimonials or achievements.
- Presenting demo data as real; presenting derived numbers as supplied ones.
- Putting the Groq key, a real email address, or personal data in code, docs, logs, or the bundle.
- Weakening a test, the hook, or a lint rule to get green; deleting a failing test without understanding it.
- Reporting a check as passed that was not run in this session; calling SKIPPED a pass.
- Adding decorative gradients, glass, neon, robots, blobs, fake stats; adding a library "just in case".
- `git push`, merges, force operations, or amending history without the owner's explicit instruction.

## 13. Environment notes
Windows + Git Bash. Node >= 22.12 (developed on 24). `GROQ_API_KEY` is not required for anything except the live twin. E2E needs Chrome or Edge (`CHROME_PATH` to override). Shell-heredoc quirks and other lessons are in `skills/frontend-development/SKILL.md`.
