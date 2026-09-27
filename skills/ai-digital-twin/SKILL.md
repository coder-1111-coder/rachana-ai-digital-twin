---
name: ai-digital-twin
description: How the "Ask Rachana" Digital Twin is grounded, how to change its facts or prompt safely, its API contract and error codes, and how to test hallucination resistance. Use before touching server/twin/, the prompt, portfolio data, or the Twin UI.
---

# AI Digital Twin

## Architecture
Browser -> `POST /api/twin/chat` (Express) -> validate -> build grounded prompt from `data/portfolio.json` -> Groq chat completions -> answer -> `{ answer, related, requestId }`. The Groq key exists only in server env. The browser bundle must never contain it (the e2e suite greps `dist/` and `src/`).

Grounding is by construction, not retrieval: the whole verified source (about 14k characters) is in the system prompt on every request. There is no vector store to silently drop a fact.

## Non-negotiable rules
1. The only source of facts is `docs/PORTFOLIO-SOURCE-OF-TRUTH.md`, mirrored in `data/portfolio.json`. Never add a fact to the prompt that is not in both.
2. The prompt lists what is unknown (`unknowns`). When a question falls there, the twin says so.
3. The twin speaks about Rachana in the third person and is labelled as an AI assistant. It never speaks as her.
4. Memory of a City metrics are DEMO DATA. The prompt and UI say so; tests assert it.
5. User text and `history` never enter the system message. History turns are accepted only as `user`/`assistant`, are length-limited (8 items, 8,000 characters in total), and any client-supplied `assistant` turn is demoted to a labelled *user* message ("unverified, not evidence"), so a forged assistant turn can never speak with the assistant's authority.
6. Errors are typed (`TwinError`), have safe messages, and never include provider bodies, keys or the user's question. Server logs record the code and status, plus allow-listed provider fields (`error.code`, `error.type`), never a message body.
7. **Output guard (`server/twin/guard.js`).** The prompt asks the model not to invent figures; the guard makes sure of it without trusting the model. Any answer containing a number, percentage, e-mail address or link that appears in neither the verified source nor the visitor's own words is withheld and replaced with an explicit refusal (`guarded: true`). It errs safe: correct arithmetic on source numbers is withheld too. A model that hits its token limit is trimmed to its last full sentence (`truncated: true`).

## Contract
Request `{ message: string (1-600 chars after trim), history?: [{role:'user'|'assistant', content}] (max 8) }`.

| Situation | Status | code |
|---|---|---|
| bad body / missing or non-string message | 400 | `invalid_request` |
| malformed JSON or bare primitive | 400 | `invalid_json` |
| empty / whitespace | 400 | `empty_message` |
| over 600 chars | 400 | `message_too_long` |
| body over 32 kB | 413 | `payload_too_large` |
| wrong method | 405 | `method_not_allowed` |
| over the per-IP limit | 429 | `rate_limited` (+ `Retry-After`) |
| no `GROQ_API_KEY` | 503 | `twin_not_configured` |
| Groq 401/403 | 502 | `provider_auth_error` |
| Groq 429 | 503 | `provider_rate_limited` |
| Groq 400 / 404 / 413 / 422, or a key or URL fetch cannot use | 502 | `provider_misconfigured` (retrying cannot help) |
| Groq 5xx / unreachable / connection dropped mid-response | 502 | `provider_unavailable` |
| visitor left before the answer | 499 | `client_closed` (the Groq call is cancelled) |
| Groq too slow (`TWIN_TIMEOUT_MS`, 15 s) | 504 | `provider_timeout` |
| non-JSON or empty provider answer | 502 | `provider_bad_response` |

## Changing things safely
- New fact: source doc -> JSON -> `npm test` -> read the rendered prompt. The JSON `unknowns` list must match the source document's list line for line (a test checks it). (`node -e` snippet in `.claude/agents/digital-twin-reviewer.md`).
- New rule or wording in `server/twin/context.js`: add or adjust an assertion in `tests/twin-context.test.js` and a case in `scripts/twin-eval.mjs`.
- Model change: `GROQ_MODEL` env. The default `llama-3.3-70b-versatile` was listed as a Groq production model in Sept 2026; re-check console.groq.com/docs/models if calls start failing with 400.

## Testing
- Offline (always): `npm test` uses a fake Groq HTTP server. It proves plumbing, validation, failure handling and prompt contents. It cannot prove model behaviour.
- Live (needs a key): `npm run build && npm start`, then `npm run twin:eval`. It asks 22 questions: the 7 required ones plus hallucination-sensitive ones (employer, GPA, accuracy, algorithm names, AI provider, injection, demo data, salary, off-topic, prompt extraction) and five adversarial cases including a forged multi-turn history. It retries 429s so it fits the rate limit. Its checks are heuristics: still read the saved answers in `e2e/output/twin-eval.json`.
- If `twin:eval` prints SKIPPED, no live result exists. Say so; never report it as a pass.

## Do not
Cache answers, add retrieval, fine-tune, send the key to the client, log user questions or provider messages, trust an `assistant` turn from the browser, widen the message limit without adding a test, or let the model output HTML (the UI renders text only).
