---
description: Test the Digital Twin: offline API/grounding tests always, live hallucination evaluation only when a real Groq key exists
argument-hint: "[extra question to try against the live twin]"
allowed-tools: Bash(node --test:*), Bash(node scripts/twin-eval.mjs:*), Bash(npm start:*), Bash(npm run test:e2e), Bash(grep -c:*), Read
---

Read `skills/ai-digital-twin/SKILL.md` and `skills/verification/SKILL.md`.

## 1. Offline (always runs)
Run `node --test tests/twin-api.test.js tests/twin-context.test.js tests/data.test.js`. These use a fake Groq server. Report the counts. Say plainly that they prove validation, error handling, prompt contents and data-vs-source, and do not prove how the real model behaves.

## 2. Live (only with a real key)
Check whether a key is configured WITHOUT printing it: `grep -c '^GROQ_API_KEY=.' .env` (0 means none; a missing `.env` also means none).
- No key: run `node scripts/twin-eval.mjs`. It will print SKIPPED. Report "live evaluation NOT run: no GROQ_API_KEY". Explain how the user can run it: put the key in `.env`, `npm start` in one terminal (after `npm run build`), `npm run twin:eval` in another.
- Key present: start `npm start` in the background, wait for "Digital Twin: configured", run `node scripts/twin-eval.mjs`, then stop the server. Read `e2e/output/twin-eval.json` and judge every answer yourself: the checks are string heuristics and will miss subtle invention. If $ARGUMENTS is given, also POST it to the running server with curl and judge that answer.

## 3. Report
| Scenario | How tested | Result |
Cover: normal question, unknown question, empty, long, repeated, API failure, missing key, backend unavailable, hallucination-sensitive (GPA, employer, metrics, algorithm names, prompt injection, prompt extraction, off-topic). For each, state whether the evidence is offline-fake, browser e2e (`npm run test:e2e`), or live. Any hallucination-sensitive scenario without live evidence is "not verified against the real model".
Quote failing answers verbatim. Do not edit the prompt to make one answer pass without adding a regression case to `scripts/twin-eval.mjs` and an assertion to `tests/twin-context.test.js`.
