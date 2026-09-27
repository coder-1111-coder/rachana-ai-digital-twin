/**
 * Deterministic output guard. The prompt asks the model not to invent figures, but a prompt is a
 * request, not a guarantee. This check does not depend on the model: an answer containing a number,
 * percentage, e-mail address or link that is in neither the verified source nor the visitor's own
 * words is withheld and replaced with an explicit refusal. It errs on the safe side: correct
 * arithmetic on source numbers (a derived total, say) is withheld too.
 */

const NUMBER = /\d[\d,]*(?:\.\d+)?%?/g
const LIST_MARKER = /^\s*\d+[.)]\s+/gm
// Captures the actual link/e-mail token (not just "one exists somewhere"), so a real, verified
// link in the source (now that portfolio.json has some) cannot blanket-authorise every other one.
const LINK_OR_EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+|https?:\/\/[^\s)"'<>]+|www\.[^\s)"'<>]+/gi

export const WITHHELD_ANSWER =
  "I can't show that answer: it contained a figure or link that isn't in Rachana's verified portfolio notes. Please rephrase the question, or open the related case study."

const normalise = (token) => token.replace(/,/g, '').replace(/%$/, '').replace(/\.$/, '')

/** Single digits ("2 tasks", "9 people") are too common in prose to police; longer numbers are not. */
const isTrivial = (token) => /^\d$/.test(token)

const normaliseLink = (token) => token.toLowerCase().replace(/[.,;:)\]}'"]+$/, '')

/**
 * @param {string} answer model output
 * @param {string} allowedText the verified source plus everything the visitor typed
 * @returns {{ ok: true } | { ok: false, reason: 'number' | 'link' }}
 */
export function checkAnswer(answer, allowedText) {
  const allowed = new Set((allowedText.match(NUMBER) ?? []).map(normalise))
  const body = answer.replace(LIST_MARKER, '')
  for (const raw of body.match(NUMBER) ?? []) {
    const token = normalise(raw)
    if (!isTrivial(token) && !allowed.has(token)) return { ok: false, reason: 'number' }
  }
  const allowedLinks = new Set((allowedText.match(LINK_OR_EMAIL) ?? []).map(normaliseLink))
  for (const raw of body.match(LINK_OR_EMAIL) ?? []) {
    if (!allowedLinks.has(normaliseLink(raw))) return { ok: false, reason: 'link' }
  }
  return { ok: true }
}
