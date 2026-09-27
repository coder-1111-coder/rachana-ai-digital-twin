# SPEC: Rachana S, Portfolio + AI Digital Twin

Status legend used in sections 13-15: **Verified** = a command was run and its output read; **Implemented** = code exists but its behaviour is not independently proven; **Not done** = pending.

## 1. Project goal
A polished, personal technical portfolio for Rachana S (Year 3 Digital Transformation / AI-ML student) that doubles as an **AI Digital Twin**: a visitor can ask questions about her real projects and get answers grounded only in a verified source file, with honest "not in my notes" answers where the facts do not exist.

Success means a recruiter can, within ten seconds, say what she builds; within two minutes, understand the technical depth of any one project; and can interrogate the twin without ever being told something false about her.

Non-goals: a blog, a CMS, user accounts, analytics, a database, multi-language support, dark mode.

## 2. Target audience
1. **Recruiters and hiring managers** skimming for depth and honesty.
2. **Engineers / interviewers** who will read a case study and probe with the twin.
3. **Course instructor** assessing spec-driven, AI-augmented engineering: CLAUDE.md, spec, skills, commands, hook, subagents, plugin, tests.
4. **Rachana** as maintainer: adding a project must be a data change, not a redesign.

## 3. User journeys
| # | Journey | Path |
|---|---|---|
| J1 | Recruiter skim | Hero (name, positioning, counts) -> Selected Work list -> opens one case study |
| J2 | Depth check | Case study tab -> Problem -> Dataset -> Pipeline -> Models -> Evaluation -> Key decisions (ML), or Architecture -> Frontend -> Backend -> Database -> AI/Auth (full-stack) |
| J3 | Ask before scrolling | Hero question box or suggested question -> jumps to the twin -> grounded answer -> related case-study chips |
| J4 | Trap the twin | Asks about GPA, employers, accuracy, algorithm names -> gets an explicit "not in the verified notes" |
| J5 | Skills to evidence | Skills -> filter by project -> sees which projects used which technology |
| J6 | Mobile | Any of the above at 360-390px with the menu, 2x3 project tabs, stacked case-study rows |
| J7 | Keyboard-only | Skip link -> nav -> tabs (arrow keys) -> twin form (Enter to send) |
| J8 | Failure | Backend down / no key / provider error -> clear message and retry; the rest of the site unaffected |

## 4. Core features
1. **Hero**: name, one-line positioning, lede, inline "Ask the twin" box with suggestions, verified counts (3 ML, 2 full-stack, 1 interactive).
2. **About**: what the projects have in common, and an explicit "Not published" note.
3. **Selected Work**: editorial index of the six projects.
4. **Project Case Studies**: keyboard-accessible tabs with a "Next case study" link. ML layout, full-stack layout and an interactive-explorer layout, each with data-true diagrams: 450-image split grid, 9.7% class bar, ANN funnel, pipeline with highlighted decisions, tier stack.
5. **Experience / Learning**: four thematic groups (no dates, no order, no employment history are claimed), aligned on a subgrid.
6. **Skills**: grouped, each linked to the projects that used it, with a project filter. No proficiency bars.
7. **AI Digital Twin ("Ask Rachana")**: dark, integrated section; suggested questions; history-aware follow-ups; related case-study chips; Clear; retry.
8. **Contact**: renders only contact links the owner has supplied. Email and LinkedIn are now verified and shown; `site.repoUrl` (this codebase's own repository) is still `null`, not in the verified source. Each project's own GitHub repository link (verified for 4 of 6) appears at the end of its case study instead.
9. **Backend**: `POST /api/twin/chat`, security headers/CSP, per-IP rate limit, static hosting of the build.

## 5. Digital Twin requirements
| ID | Requirement |
|---|---|
| T1 | Answers only from `docs/PORTFOLIO-SOURCE-OF-TRUTH.md` (mirrored in `data/portfolio.json`) |
| T2 | If information is unavailable, say so; unknowns are enumerated in the prompt |
| T3 | Never invent employers, achievements, certifications, GPA, salary, metrics, dates, technologies or results |
| T4 | Memory of a City metrics are always DEMO DATA |
| T5 | `POST /api/twin/chat` validates input (object body, message 1-600 chars, history <= 8 well-formed turns, body <= 32 kB) |
| T6 | Constructs grounded context server-side; user text and history never enter the system message |
| T7 | Calls Groq from the backend; key only in server env; never in responses, logs, or the bundle |
| T8 | Typed error for every failure: provider 401/403/429/5xx/400, timeout, unreachable, non-JSON, empty answer, missing key, rate limit |
| T9 | Third-person voice; labelled as an AI assistant, not Rachana |
| T10 | Answers rendered as text only (no HTML injection) |
| T12 | **Output guard:** an answer containing a number, percentage, e-mail or link not present in the source or the visitor's own words is withheld and replaced by an explicit refusal, independent of the model |
| T13 | Client-supplied `assistant` history is demoted to labelled user text; a model that hits its token limit is trimmed to its last full sentence and flagged; the provider call is cancelled when the visitor leaves |
| T14 | Abuse limits: per-client (IPv6 by /64) and site-wide ceilings, 8-item / 8,000-character history cap, invisible-Unicode stripping; invalid config is rejected with a startup warning |
| T11 | Must handle: "What projects has Rachana built?", "Explain the asteroid project.", "What ML techniques has she used?", "Explain the face recognition pipeline.", "What full-stack projects has she built?", "Which projects use authentication?", "How did she handle class imbalance?" |

## 6. Tech stack
Frontend: React 19, TypeScript (strict), Vite, Tailwind CSS v4, Lucide React; fonts Instrument Serif, IBM Plex Sans, IBM Plex Mono (self-hosted via `@fontsource*`). Backend: Node.js >= 22.12, Express 5. AI: Groq chat completions (default `llama-3.3-70b-versatile`, configurable). Data: TypeScript-typed JSON. Tests: `node:test`, `puppeteer-core` driving the installed Chrome/Edge. **Deliberately not used:** database, router, state library, GSAP, CSS-in-JS, UI kit, test framework beyond the above.

## 7. Architecture
```
Browser ── static bundle (dist/) ────────────────────────────┐
   │  POST /api/twin/chat {message, history}                 │ served by
   ▼                                                         ▼
Express (server/app.js): headers+CSP -> rate limit -> JSON(32kB) -> validate -> [key?] -> build prompt -> Groq -> {answer, related}
                                                 │                         ▲
                       data/portfolio.json ──────┘   fake Groq in tests ───┘ (GROQ_BASE_URL)
```
- `server/twin/context.js` renders the verified source (owner, six projects, skills with evidence, learning tracks, site facts, unknowns) into the system prompt (~14k chars), preceded by eight explicit rules.
- `findRelatedProjects` maps project titles/aliases in an answer back to case studies (deterministic; not a model output).
- One process in production; `HOST`, `PORT`, `TRUST_PROXY` configure hosting. See `README.md`.

## 8. Skills
Plain markdown in `skills/<name>/SKILL.md` (path chosen by the course brief). They carry the project-specific decisions and gotchas; agents and commands read them by path. They are not in `.claude/skills/`, so Claude Code does not auto-load them as slash skills (see Pending).

| Skill | Purpose |
|---|---|
| `portfolio-design` | Tokens, type, layout formulas per project kind, what to avoid, visual-review rubric and procedure |
| `frontend-development` | Repo layout, rules for adding projects/deps, commands, gotchas hit on this build |
| `ai-digital-twin` | Grounding design, non-negotiable rules, API contract and error-code table, safe-change checklist, offline vs live testing |
| `accessibility` | WCAG 2.2 AA requirements specific to this UI and how each is verified |
| `verification` | The 7-rung verification ladder, hook description and limits, honesty rules for reporting |

## 9. Commands
`.claude/commands/*.md` (live as `/build-check` etc.):

| Command | What it does |
|---|---|
| `/build-check` | lint -> build -> `npm test` -> `npm run test:hook`, stops at first failure, reports a results table and stray files |
| `/verify-ui` | `npm run test:e2e` (real Chrome, 360/390/768/1440), triages failures as product vs test bugs, captures and reads screenshots against the design rubric |
| `/test-twin` | offline twin tests always; live `twin:eval` only if a real key exists (else reports "not run"); scenario table with evidence type per row |
| `/review-project` | build check, then the four project reviewers and the plugin agents in parallel, triage, fix, re-verify, report |

## 10. Hooks
One **PostToolUse** hook (`.claude/settings.json`, matcher `Write|Edit|MultiEdit`) running `.claude/hooks/verify-on-edit.mjs`.
- Trigger: a written/edited file with extension `.ts .tsx .js .jsx .css` (plus `.mjs`, an addition to the brief because this repo's scripts, e2e suites and the hook itself are `.mjs`) inside the project (not `node_modules`, `dist`, screenshots, `.claude/state`).
- Real checks, chosen by path: `src/**/*.ts(x)` and `vite.config.ts` -> `eslint <file>` then `tsc -b`; `src/**/*.css` -> `vite build`; JS -> `eslint <file>` and `node --check <file>`; `server/**` additionally `node --test tests/*.test.js`; `eslint.config.js` -> `eslint .`. Stops at the first failing check.
- Records PASS / FAIL / SKIP as JSON lines in `.claude/state/verification-log.jsonl` and the latest in `last-verification.json` (git-ignored).
- FAIL exits 2, so Claude Code returns the tool output to the agent.
- **Loop prevention:** `TWIN_VERIFY_ACTIVE=1` for child processes (no re-entry), never edits files, lock file with dead-owner detection and a 3-minute TTL (real contention waits up to 20 s instead of skipping), identical already-passed content is skipped for 10 minutes, and on the 5th consecutive FAIL for a file it exits 2 once more with an explicit STOP-and-ask message (so the agent sees it) and then stops blocking.
- **Never silent:** unparsable payloads and payloads without a file path are recorded as SKIP with a reason; a log or state write failure prints a warning and the verification result is still returned.
- Known limit: shell-written files (heredoc, `sed`) do not trigger it.

## 11. Plugins
`pr-review-toolkit@claude-plugins-official` (user scope; already installed and enabled). Relevant because this project's risk is silent error handling and rule adherence, both of which the plugin's agents target. Used: `silent-failure-hunter`, `code-reviewer`, `pr-test-analyzer` (see `docs/PLUGIN-USAGE.md` for what each found and what changed). No other plugin was installed: `frontend-design` was considered and rejected because the design direction is fixed by `skills/portfolio-design`.

## 12. Testing strategy
Rungs, cheapest first (details in `skills/verification/SKILL.md`): per-edit hook -> `npm run lint` -> `npm run build` -> `npm test` (API/grounding/data, fake Groq) -> `npm run test:hook` -> `npm run test:e2e` (real Chrome) -> `npm run twin:eval` (live model, needs key).
- **UI:** navigation, project interactions, ARIA tabs, skills filter, responsive at 360/390/768/1440 with no horizontal overflow (page, each case study, open menu, long unbroken text), keyboard reachability/focus indicators/order, landmarks, target size, reduced motion, CSP/console/third-party requests.
- **Twin:** normal, unknown, empty, long, repeated, API failure, missing key, backend unavailable, malformed backend response, rate limit, markup injection in an answer (fake Groq); hallucination-sensitive questions (live only).
- **API:** valid, missing message, malformed JSON, wrong types/content-type, oversized body, bad history, provider 4xx/5xx/429/timeout/refused/garbage, missing key, rate limit, secret non-leakage.
- **Data:** every number, technology, skill attribution and pipeline order in the JSON is derivable from the source document; mutation-checked.
- **Reporting rule:** fake-server tests are labelled as plumbing evidence; live results are claimed only if `twin:eval` actually ran.

## 13. Acceptance criteria

| Criterion | Status | Evidence |
|---|---|---|
| Site builds and lints clean | Met | `npm run lint`, `npm run build` — 0 problems (`docs/TEST-RESULTS.md` §1-2) |
| All 8 sections present and reachable by keyboard | Met | `e2e` Navigation + Keyboard suites, 9 tests |
| Every fact traceable to `docs/PORTFOLIO-SOURCE-OF-TRUTH.md` | Met | `tests/data.test.js` (19 tests, 6 mutation-checked); portfolio-content-reviewer audit fixes applied |
| No horizontal overflow at 360/390/768/1440 | Met | `e2e` Responsive suite, 16 tests |
| `POST /api/twin/chat` implemented with validation, grounding, error handling, no key exposure | Met | `tests/twin-api.test.js`, `twin-provider.test.js`, `twin-limits.test.js` (61 tests); `e2e` Security suite |
| Twin refuses ungrounded questions | Partly met | Prompt rules + deterministic output guard verified against a fake model (`twin-guard.test.js`, e2e); **real-model behaviour unverified (no key)** |
| CLAUDE.md, SPEC.md, 5 skills, 4 commands, hook, 4 subagents, 1 plugin used | Met | This repository; `docs/PLUGIN-USAGE.md` |
| Design is not generic; visual review performed | Met | `docs/DESIGN-REVIEW.md`; independent design-reviewer pass with fixes applied and re-verified |
| Tests cover the required categories (UI/Twin/API) | Mostly met | `docs/DIGITAL-TWIN-TESTS.md`; one planned independent test-coverage review (`pr-test-analyzer`) stalled and was not retried |
| No invented information anywhere on the site | Met, to the limit of review | 5 independent reviews found ~35 wording/data issues; all were fixed and are now regression-tested (`tests/data.test.js`'s rationale/causation scan, skill-attribution `every()` check) |

## 14. Completed work

- Full site: Hero, About, Selected Work, Case Studies (3 layouts by project kind), Learning, Skills (with
  project filter), Ask Rachana, Contact, Footer. Responsive 360-1440px, WAI-ARIA tabs, skip link, reduced
  motion support.
- Backend: Express app factory, typed errors, input validation (including invisible-Unicode stripping and a
  total history-size cap), strict env-config parsing with startup warnings, a fixed-window rate limiter
  (per-client by /64 for IPv6, plus a site-wide ceiling), a deterministic output guard independent of the
  model, provider-error classification (permanent vs transient), answer truncation handling, client-disconnect
  cancellation, security headers/CSP.
- Data: `docs/PORTFOLIO-SOURCE-OF-TRUTH.md`, `data/portfolio.json`, and tests that keep them in sync,
  including a scan for unsupported rationale/causation/ordering language.
- Claude Code tooling: `CLAUDE.md`, this `SPEC.md`, 5 skills, 4 commands, 4 read-only reviewer subagents, a
  real PostToolUse verification hook with loop guards, `pr-review-toolkit` plugin usage.
- Testing: 104 unit/integration tests, 14 hook tests, 72 browser e2e tests, all passing; 6 data mutations and
  1 CSS mutation confirmed to make the relevant test fail; a live-eval script for the twin (`scripts/twin-eval.mjs`, 22 questions).
- Independent review: 5 subagent/plugin reviews completed (design, portfolio content, digital twin,
  silent-failure-hunter, code-reviewer against CLAUDE.md) and every finding triaged; the ones that were real
  defects were fixed and re-verified; the ones rejected are recorded with a reason in `docs/DESIGN-REVIEW.md`
  and `docs/PLUGIN-USAGE.md`.

## 15. Pending work

- **Live Digital Twin evaluation.** No `GROQ_API_KEY` was available in this environment. `npm run twin:eval`
  must be run with a real key before the twin's actual hallucination resistance is known. See
  `docs/DIGITAL-TWIN-TESTS.md`.
- **`pr-test-analyzer` re-run.** It stalled once and was not retried; its ground (test-coverage quality) is
  covered by hand in `docs/DIGITAL-TWIN-TESTS.md` and by the `verification-reviewer` subagent, but a
  successful automated run would be a useful independent check.
- **Second design pass.** The Learning-subgrid fix and the new "Next case study" control were checked by
  re-running e2e and by direct screenshot review, not by a second `design-reviewer` subagent pass.
- **Contact details.** `contact.email` and `contact.linkedin` are now owner-verified and set; `contact.github`
  (a personal profile) and `site.repoUrl` (this codebase's own repository) remain `null` — not in the verified
  source. Any value added must also appear in `docs/PORTFOLIO-SOURCE-OF-TRUTH.md`, or a test fails.
- **Project repository links.** Each project has a `repoUrl` (`src/types.ts`, `data/portfolio.json`), verified
  for Employee Attrition, Symbio-NLM, Space Atlas and Memory of a City; `null` for Face Recognition and
  Hazardous Asteroid Prediction, which have no verified repository. Shown as the last row of each case study.
- **Cross-browser and assistive-technology testing.** Only headless Chrome was used; no Firefox, Safari, real
  mobile device, or screen reader pass has been done.
- **Voice/tone pass by the owner.** Copy was drafted from the verified facts and corrected for factual
  overreach by review, but has not been read by Rachana for voice.
