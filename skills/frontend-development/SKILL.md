---
name: frontend-development
description: Conventions, workflow and known gotchas for the React + TypeScript + Vite + Tailwind v4 frontend and Express backend of this portfolio. Use before adding components, projects, dependencies or styles.
---

# Frontend development

## Layout of the repo
`src/` React app. `data/portfolio.json` is the single content file. `server/` Express API. `tests/` node:test (API, grounding, data, `tests/hook/` for the hook). `e2e/` puppeteer-core suites. `skills/`, `.claude/` agent tooling.

## Rules
1. Content lives in `data/portfolio.json`, typed by `src/types.ts`. Components read it through `src/portfolio.ts`. Copy hard-coded in a component must still be traceable to `docs/PORTFOLIO-SOURCE-OF-TRUTH.md`.
2. **Adding or changing a project fact:** edit the source-of-truth doc first (only with facts the owner supplied), then the JSON, then run `npm test`. `tests/data.test.js` fails if a number or technology is not in the source doc.
3. No new dependency without a reason written in `CLAUDE.md`. Current runtime deps: react, react-dom, lucide-react, express, three font packages. There is no state library, router, animation library or CSS-in-JS.
4. Tailwind v4: tokens are `--color-*`/`--font-*` in `@theme`; use utilities like `bg-paper text-ink font-display`. Shared patterns (`.eyebrow`, `.chip`, `.btn`, `.link`) live in `@layer components`.
5. Components are function components with named exports (`export function App`, no default exports). React 19: `ref` is a normal prop (see `Twin`). Keep files under about 150 lines; split by responsibility.
6. Interactive elements are real `<button>`/`<a>`; icons get `aria-hidden`; icon-only buttons get `aria-label`.

## Commands
`npm run dev` (API :8787 + Vite :5173, proxy for `/api`), `npm run build`, `npm start` (serves `dist/` + API), `npm run lint`, `npm test`, `npm run test:hook`, `npm run test:e2e`.

## Gotchas learned on this project
- `lucide-react` v1 has no brand icons (`Github`, `Linkedin`). Use `ArrowUpRight`.
- `react-hooks` v7 lint forbids writing refs during render and flags `set-state-in-effect`; expose imperative actions via `useImperativeHandle` instead.
- `react-refresh` lint: a component file must export only components. Constants go in their own module (`src/nav.ts`).
- The CSP is `script-src 'self'`: no inline `<script>`; anything that must run early goes in `src/main.tsx`.
- Text that overflows its own box does not change the box's rect; the e2e overflow helper measures text ranges for this reason. Long unbroken strings need `overflow-wrap:anywhere`.
- Vite binds `localhost` (IPv6 on some machines); probe `http://localhost:5173`, not `127.0.0.1`.
- Files written through shell heredocs bypass the PostToolUse hook (it matches Write/Edit/MultiEdit). Run `npm run lint && npm run build` before finishing.
- In shell heredocs a double backslash collapses to one, and shell commands of roughly 9 KB or more can fail with a quoting error; keep writes small, avoid backslashes (build them with `String.fromCharCode(92)` in scripts), and use forward slashes in paths.
- `String.prototype.replace` treats `$$`, `$&` and `$1` in the replacement text specially: use `s.replace(from, () => to)` when patching code that contains `page.$$(...)`.
- A test option that is silently ignored makes the test vacuous (the "full motion" test passed without enabling motion). Assert the precondition inside the test, for example with `matchMedia(...)`.
