---
name: portfolio-design
description: Design system and review rubric for Rachana's editorial technical portfolio. Use before changing any layout, colour, type, motion or diagram, and when reviewing how the site looks. Encodes the tokens, the case-study layouts, what to avoid, and how to run a visual review.
---

# Portfolio design

Direction: dark, editorial, technical, personal, restrained. It should read like a well-set article, not a template. One layered dark ground, one ink, one accent.

## Tokens (defined in `src/index.css`, `@theme`)
| Role | Value | Notes |
|---|---|---|
| paper | `#0d0d0c` | page background |
| paper-2 | `#151513` | secondary surface: header once scrolled, footer |
| surface | `#1c1a17` | elevated warm surface: the Twin section, nothing else |
| ink / ink-2 / ink-3 | `#f1ece3` / `#a9a39a` / `#8c8880` | text; ink-3 is the weakest allowed text colour (~4.9:1 on surface, higher elsewhere) |
| rule | `#2a2722` | hairlines, chip borders |
| accent | `#d65a2a` | dots, rules, large marks (~5.0:1 on the page background) |
| accent-ink | `#e4784a` | accent text, links and buttons (~6.6:1 on the page background) |
| demo-bg / demo-ink | `#3a2a12` / `#f0c878` | DEMO DATA notice only |

Every section now sits on the dark ground; there is no separate light theme and no `on-dark`/`accent-dark` token pair any more — `bg-ink`/`text-paper` is used as the inverted (light-pill, dark-text) treatment for selected/active states (tabs, filter chips, the skip link), which now reads correctly because `ink` is the light token and `paper` is the dark one. Do not add colours. If a new one seems necessary, check contrast first (`node` snippet in `docs/DESIGN-REVIEW.md`).

## Type
- Display: Instrument Serif (h1-h3, big numerals, pull quotes). Never bold it; use size and italic.
- Body: IBM Plex Sans Variable. Labels and data: IBM Plex Mono, uppercase `.eyebrow` for section labels.
- The latin font subset has no `→` (U+2192). Draw arrows with Lucide icons, never with the glyph.

## Layout
- Container 1240px, gutters 20 / 32 / 48px. 12-column grid from `md`. Section label in columns 1-3, content from column 4.
- Sections are separated by hairlines, not boxes. Avoid cards: prefer rows, rules and whitespace. The only section on a distinct surface is the Twin section (`bg-surface`, one step lighter than the page).
- Selected Work rows alternate which side carries the per-project motif (`ProjectMotif` in `src/case/Diagrams.tsx`) so the six rows read as asymmetric compositions, not one repeated card.
- Case studies use different layouts by kind, never one card template:
  - ML: Problem, Dataset, Pipeline, Models, Evaluation, Key decisions, Repository.
  - Full-stack: Problem, Architecture, Frontend, Backend, Database, AI and auth, All features, Repository.
  - Interactive: Problem, Data (with DEMO DATA notice), Flow, AI Change Story, Repository (Memory of a City also keeps its own "Not in my verified notes" row for the stack).
  - Every case study ends with a Repository row: a real link only for the four projects with a verified GitHub URL (`data/portfolio.json` project `repoUrl`), otherwise "Not supplied in my verified notes."

## Visuals must be true
Every *data* diagram is drawn from verified data: `SplitGrid` (9 people x 50 images, 60/40; captioned as a schematic because the source does not say which images went where), `ClassBar` (approximately 9.7%), `NetworkDiagram` (units 128/64/9). Numerals mean projects and page sections only; case-study block labels carry none. Never add a chart, badge, score or progress bar that the source does not support. No proficiency bars, no invented statistics.

`ProjectMotif` (Selected Work, case-study headers) is the one deliberate exception: six small `aria-hidden` line-art SVGs, one per project, that carry no numeric or factual claim (a grid, an orbit, bars, a helix, a constellation, a dotted map) — ornament, not evidence. Keep it that way; if a motif ever needs to represent a real number, it moves into the data-diagram rule above and gets a caption.

## Motion
CSS only, all inside `@media (prefers-reduced-motion: no-preference)`, driven by `useReveal`/`Reveal.tsx` (`IntersectionObserver`, fires once): `reveal` (fade + rise, the default), `reveal-stagger` (same, staggered via the `--i` CSS var — Selected Work rows), `reveal-clip` and `scale-in` (available for a future large opener/numeral), plus the existing hero entrance stagger, scroll reveal, panel fade and typing dots. The hero's orbital motif also drifts a few px on scroll (a plain scroll-listener transform, gated on `matchMedia('(prefers-reduced-motion: reduce)')`, not a scroll library). GSAP is still deliberately not used: nothing here needs orchestration CSS and `IntersectionObserver` cannot do. Add motion only if it explains something.

## Avoid
Gradients, glassmorphism, neon, floating blobs, meaningless 3D, robot imagery, testimonial strips, big-numeral statistic strips (the hero shows its project counts as one plain mono line derived from the data), icon-in-a-circle feature grids, dark mode toggles that were not verified.

## Visual review (do once before declaring done)
1. `npm run build`, then `node scripts/shoot.mjs 1440` and `node scripts/shoot.mjs 390`; read the PNGs in `docs/screenshots/`.
2. Answer: Does it look generic? Is typography strong? Is whitespace intentional? Is every animation purposeful? Too many cards? Gradients restrained? Does the Twin feel integrated? Does mobile look designed? Can a recruiter say what Rachana does in ten seconds?
3. Fix real problems only. Element screenshots may show the sticky header mid-image: that is a capture artefact.
4. Record the outcome in `docs/DESIGN-REVIEW.md`.
