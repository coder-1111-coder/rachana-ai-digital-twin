import { errors } from './errors.js'

export const LIMITS = {
  maxMessageChars: 600,
  maxHistoryItems: 8,
  maxUserHistoryChars: 600,
  maxAssistantHistoryChars: 3000,
  maxHistoryTotalChars: 8000,
}

// Control characters (other than tab/newline), zero-width, bidi-override and tag characters are stripped, so invisible-only input counts as empty.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF\u{E0000}-\u{E007F}]/gu

function cleanText(value) {
  return value.replace(CONTROL_CHARS, '').trim()
}

function validateHistory(history) {
  if (history === undefined) return []
  if (!Array.isArray(history)) throw errors.invalidRequest('history must be an array.')
  if (history.length > LIMITS.maxHistoryItems) {
    throw errors.invalidRequest(`history can contain at most ${LIMITS.maxHistoryItems} messages.`)
  }
  const items = history.map((item, i) => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      throw errors.invalidRequest(`history[${i}] must be an object.`)
    }
    const { role, content } = item
    if (role !== 'user' && role !== 'assistant') {
      throw errors.invalidRequest(`history[${i}].role must be "user" or "assistant".`)
    }
    if (typeof content !== 'string') {
      throw errors.invalidRequest(`history[${i}].content must be a string.`)
    }
    const text = cleanText(content)
    const max = role === 'user' ? LIMITS.maxUserHistoryChars : LIMITS.maxAssistantHistoryChars
    if (text.length === 0 || text.length > max) {
      throw errors.invalidRequest(`history[${i}].content must be 1-${max} characters.`)
    }
    return { role, content: text }
  })
  if (items.reduce((sum, item) => sum + item.content.length, 0) > LIMITS.maxHistoryTotalChars) {
    throw errors.invalidRequest(`history can contain at most ${LIMITS.maxHistoryTotalChars} characters in total.`)
  }
  return items
}

/**
 * Validates and normalises the POST /api/twin/chat body.
 * Throws a TwinError (HTTP 400) on any problem.
 * @param {unknown} body
 * @returns {{ message: string, history: { role: 'user' | 'assistant', content: string }[] }}
 */
export function validateChatBody(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw errors.invalidRequest('Send a JSON object like {"message": "..."} with Content-Type: application/json.')
  }
  if (!('message' in body)) throw errors.invalidRequest('"message" is required.')
  if (typeof body.message !== 'string') throw errors.invalidRequest('"message" must be a string.')

  const message = cleanText(body.message)
  if (message.length === 0) throw errors.emptyMessage()
  if (message.length > LIMITS.maxMessageChars) throw errors.messageTooLong(LIMITS.maxMessageChars)

  return { message, history: validateHistory(body.history) }
}
