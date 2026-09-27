---
name: accessibility
description: Accessibility requirements and the exact checks for this portfolio: keyboard, focus, landmarks, tab pattern, target size, contrast, reduced motion and live regions for the twin. Use when adding any interactive element or changing colour, motion or headings.
---

# Accessibility

Target: WCAG 2.2 AA for what an automated browser suite and contrast maths can prove. Screen-reader testing with real assistive tech has not been done (see Known limitations in `README.md`).

## Requirements
- **Structure:** `lang="en"`; one `h1`; headings descend (h1, h2 per section, h3 project title, h4 case-study row labels); one `<main id="main" tabindex="-1">`; every `nav` and `section` labelled; a first-tab "Skip to content" link that becomes visible on focus and moves focus to main.
- **Keyboard:** everything reachable and operable. The case-study tabs follow the WAI-ARIA tabs pattern: roving `tabindex`, Arrow keys, Home/End, wrap-around, `aria-selected`, `aria-controls` only on the selected tab. Mobile menu is a disclosure button with `aria-expanded`/`aria-controls`, closes on Escape.
- **Focus:** never remove an outline without replacing it. Global `:focus-visible` is a 2px accent-ink outline (accent-dark on the dark section).
- **Targets:** buttons, tabs and nav links are at least 24px tall (the suite asserts it; most are 36-44px).
- **Contrast:** all text pairs are at least 4.5:1 (table in `docs/DESIGN-REVIEW.md`). ink-3 is the weakest text colour. Accent `#c2410c` is decorative or large only; use accent-ink for text.
- **Not colour alone:** DEMO DATA has a text badge; pipeline highlights add "(a key decision)" for screen readers; chips show project numbers as text.
- **Motion:** every animation is inside `prefers-reduced-motion: no-preference`. With reduce, nothing may stay hidden waiting for a scroll trigger.
- **Forms:** every input has a real `<label>`; the counter and notice are announced (`aria-describedby`, `role="status"`).
- **Twin:** the conversation is `role="log"` with `aria-live="polite"`, `aria-busy` while waiting, focusable so it can be scrolled by keyboard; errors are `role="alert"`; the answer is rendered as text, never HTML.
- **Reflow:** no horizontal scroll at 360px, including with a long unbroken word in a twin answer.

## Verify
`npm run test:e2e` runs: focus reachability and visible indicator on every tabbable element (desktop and 390px), skip link, focus order, ARIA tab keys, landmark and label checks, target sizes, reduced-motion visibility, overflow at 360/390/768/1440.

Manual checks worth doing before a real launch: NVDA or VoiceOver pass over the twin log, 200% browser zoom, Windows forced-colours mode.
