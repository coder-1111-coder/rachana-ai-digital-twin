# Design review

One independent visual review (`design-reviewer` subagent, read-only, from real screenshots at 1440 and
390px), plus a second look after the fixes below. Screenshots are in `docs/screenshots/`
(regenerate with `node scripts/shoot.mjs 1440` and `node scripts/shoot.mjs 390` after `npm run build`).

## Contrast (WCAG AA, computed against the actual token values)

| Pair | Ratio | AA (4.5:1 text / 3:1 large) |
|---|---:|---|
| ink on paper | 16.30 | pass |
| ink-2 on paper | 8.17 | pass |
| ink-3 on paper (weakest body text) | 5.12 | pass |
| ink-3 on paper-2 | 4.72 | pass |
| accent (`#c2410c`) on paper | 4.51 | pass (large/decorative use only) |
| accent-ink on paper / paper-2 | 5.96 / 5.49 | pass |
| paper on ink (dark section) | 16.30 | pass |
| on-dark-2 on ink | 8.95 | pass |
| accent-dark on ink | 7.52 | pass |
| demo-ink on demo-bg | 8.28 | pass |
| paper on accent-ink (button) | 5.96 | pass |

Every text pair in the palette clears AA; nothing needed to change here.

## Rubric verdict (first pass, before fixes)

No HIGH defects were found. Summary of the MEDIUM/LOW items and their disposition:

| # | Finding | Disposition |
|---|---|---|
| M1 | Contact gives no way to reach her | Not a design bug — no contact details exist in the verified source. Kept honest; documented as a limitation and a to-do for the owner. |
| M2 | Empty-state copy said "on the left", wrong on mobile | Fixed: "Pick a suggested question or write your own below." |
| M3 | Learning columns misaligned (titles wrapped to different heights, chips ragged) | Fixed: CSS subgrid rows so title/text/chips share row lines across all four columns. e2e-verified. |
| M4 | Case-study h3 same size as section h2; 01-06 numerals used for five different things | Fixed: h3 reduced below h2 size; numerals removed from block labels (Problem, Pipeline, Key decisions), kept only for projects and page sections. e2e-verified. |
| L1 | "AI-ML" wrapped across lines on mobile | Fixed: wrapped in a `whitespace-nowrap` span. e2e-verified at 390px. |
| L2 | Hero stat strip resembled a generic "statistic strip" | Replaced the three big numerals with one plain mono line of real, derived counts ("Three ML projects · Two full-stack apps · One interactive explorer"). |
| L3 | Hero micro-typography (lede line breaks, suggestion wrapping) | Fixed: widened the lede column (`max-w-md` → `max-w-lg`). |
| L4 | "Ask Rachana" (nav) vs "Ask the twin" (CTA) naming | Kept: "Ask Rachana" is the feature's name per the brief; "the twin" is what it is. Not a defect. |
| L5 | Empty twin state repeats itself; dead space; visible resize grip | Fixed: `resize-none` on the textarea. The intro/rule-list duplication was judged acceptable (reinforces the one message that matters: it only knows what's verified) and left as is. |
| L6 | Dangling pipeline chevrons at line breaks | Fixed: replaced the chevron-separated flow with plain numbered chips (no dangling separators possible). |
| L7 | Learning said "not by date" twice | Reduced to one disclaimer line under the section intro. |
| L8 | Skills section is chip-dense | Not changed — flagged as optional by the reviewer; the chips carry real information (each project's number) and reducing them further would require inventing a new visual language for what is, in the end, a list. |
| L9 | No way to the next project on mobile (long panel, non-sticky switcher) | Fixed: added a "Next case study" link at the end of every panel, keyboard-focusable, wraps after the sixth project. e2e-verified. |

## Re-verified after fixes

- `npm run test:e2e`, suite "Review fixes: layout polish and honesty of the UI" (7 tests, all pass): Learning
  column alignment, dimmed-skill contrast (no opacity fade, ink-3 kept at 5.1:1), AI-ML non-wrapping, nav
  highlight clearing on scroll-to-top, no invented contact/repo link, "Next case study" behaviour, h3 < h2
  sizing and numeral-free block labels.
- Screenshots re-captured at 1440 and 390px after the fixes, including one with a twin conversation open
  (`*-twin-with-fixture-answer.png`) — the empty and filled states were both reviewed, not just the empty one
  the first pass saw.

## What was not re-reviewed by a second subagent pass

The fixes were verified by re-running the e2e suite and by reading the regenerated screenshots directly
(`1440-case-studies.png` confirms the h3/h2 sizing, numeral-free block labels and the new "Next case study"
link; `1440-learning.png` confirms the four columns now share a baseline), not by spawning a second
`design-reviewer` subagent pass. A fully independent second look is reasonable further follow-up.

## Dark editorial redesign (second pass)

Full visual transformation from the light "paper" theme above to a dark layered theme
(`--color-paper #0d0d0c`, `--color-surface #1c1a17`, `--color-ink #f1ece3`, `--color-accent #d65a2a`;
see `skills/portfolio-design/SKILL.md` for the full table), new per-project decorative SVG motifs
(`ProjectMotif` in `src/case/Diagrams.tsx`), an asymmetric alternating Selected Work layout, and new
CSS-only motion primitives (`reveal-stagger`, `reveal-clip`, `scale-in` alongside the existing `reveal`).
GSAP was deliberately not introduced; see CLAUDE.md/SPEC.md for why.

### Contrast (recomputed against the new dark tokens)
| Pair | Ratio | AA (4.5:1 text / 3:1 large) |
|---|---:|---|
| ink on paper | 16.5 | pass |
| ink-2 on paper | 7.8 | pass |
| ink-3 on paper (weakest body text) | 5.0 | pass |
| ink-3 on surface (weakest, worst case) | 4.5–4.9 | pass |
| accent (`#d65a2a`) on paper | 5.0 | pass (large/decorative use only) |
| accent-ink on paper / surface | 6.6 / 5.9 | pass |
| demo-ink on demo-bg | 8.7 | pass |

### `design-reviewer` findings and disposition
| # | Finding | Disposition |
|---|---|---|
| H1 | Hero's orbital motif was JS-driven (a scroll listener writing `transform` directly), contradicting the CSS-only motion rule | Fixed: removed the scroll listener; the motif is now a static decorative SVG. |
| H2 | The `memory-of-a-city` motif (dotted grid) was functionally invisible — tiny radius + low opacity on the hairline `rule` colour against a near-black background | Fixed: switched to `ink-3` colour, raised dot radius and opacity so the grid reads at thumbnail size. Re-verified in `1440-work.png`. |
| M1 | Hero's "Ask the twin" placeholder text was clipped by the submit button at 360px | Fixed: the input drops to `text-lg` below `sm`, giving enough width for the full placeholder to clear the button. Re-verified in `360-hero-viewport.png`. |
| L1 | The orbital motif itself is the visual element closest to a generic "AI/tech" trope (concentric circles + dots) | Not changed — thin-stroke, single-accent, thematically tied to the asteroid-orbit project; judged the weakest link in an otherwise distinctive system, not a defect. |

All four HIGH/MEDIUM items were fixed and re-verified by rebuilding, re-running the full e2e suite (72/72
pass) and re-capturing screenshots. Re-read `1440-top.png`, `1440-work.png`, `1440-case-studies.png`,
`1440-twin-with-fixture-answer.png`, `1440-contact.png`, `360-hero-viewport.png`, `390-top.png` and
`390-work.png` to confirm: strong typography hierarchy, intentional whitespace, no gradients/glass/neon/
blobs, the Twin section now reads as one section among several dark ones rather than a bolted-on widget,
and mobile hides the per-project motifs (they're `md:flex`) rather than squeezing them in.

### A separate, more serious finding from the `digital-twin-reviewer` pass
Adding `contact` and per-project `repoUrl` facts to `data/portfolio.json` (see the source-of-truth
section of the final report) initially created a real grounding gap — those facts never reached the
system prompt (`server/twin/context.js`), so the twin would have wrongly refused questions about an
email/LinkedIn/repo link shown on the very same page. Worse, it silently broke the output guard's
link/e-mail check (`server/twin/guard.js`), which previously withheld any answer containing a link
*only if the source contained no link at all* — once the source legitimately contained real links,
that check stopped firing for anything. Both are now fixed (prompt gained a CONTACT section and a
`Repository:` line per project; the guard now compares the specific link/e-mail token, not just
"does any link exist anywhere") and covered by new tests (`tests/twin-context.test.js`,
`tests/twin-guard.test.js`) — see the final report for detail. This is recorded here because it was
caught through this session's design-and-content redesign work, not a separate twin-only change.
