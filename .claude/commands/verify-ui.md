---
description: Build the site, run the browser e2e suite at 360/390/768/1440, capture screenshots, and check them visually
argument-hint: "[width to screenshot: 360|390|768|1440, default 1440 and 390]"
allowed-tools: Bash(npm run test:e2e), Bash(node scripts/shoot.mjs:*), Read
---

Read `skills/portfolio-design/SKILL.md` and `skills/accessibility/SKILL.md`.

1. Run `npm run test:e2e`. It builds, starts the real server against a fake Groq, and drives Chrome/Edge through its checks: overflow at 360/390/768/1440 (all 6 case studies, mobile menu, long unbroken text), navigation, tab keyboard pattern, skills filter, twin UI and failure states, tab-order and focus indicators, CSP/console/third-party requests, reduced motion. Report the exact `E2E: N passed, M failed` line and every FAIL with its message.
2. For each FAIL decide: product bug or test bug. Fix product bugs; fix a test only if it is wrong, and say why.
3. Capture screenshots: `node scripts/shoot.mjs $ARGUMENTS` (or run it for 1440 and 390 if no argument). They land in `docs/screenshots/`.
4. Read at least: `top`, `case-studies`, `twin` for each width, with the Read tool. Judge them with the rubric in the design skill: generic look, typography, whitespace, purposeful motion, card count, gradients, twin integration, mobile design, recruiter comprehension.
5. Report: e2e counts, a bullet per visual issue with the screenshot that shows it, and what you changed. Element screenshots may show the sticky header floating mid-image; ignore that artefact.

If Chrome or Edge is not found, say so and set `CHROME_PATH`; do not report the UI as verified.
