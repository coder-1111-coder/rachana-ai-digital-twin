const DEFAULT_MODEL = 'llama-3.3-70b-versatile'
const DEFAULT_BASE_URL = 'https://api.groq.com/openai/v1'
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

/** Strict positive integer: "15s", "1.5e4", "0" and "-3" are rejected with a warning, never silently misread. */
function positiveInt(name, value, fallback, warnings) {
  const text = (value ?? '').trim()
  if (text === '') return fallback
  if (!/^\d+$/.test(text) || Number(text) <= 0) {
    warnings.push(`${name}="${text}" is not a positive whole number; using ${fallback}.`)
    return fallback
  }
  return Number(text)
}

/** The bearer key is sent to this URL, so it must be https (plain http only for localhost, used by tests). */
function baseUrl(raw, warnings) {
  const value = (raw ?? '').trim()
  if (value === '') return DEFAULT_BASE_URL
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' || (url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname))) {
      return value.replace(/\/+$/, '')
    }
  } catch {
    /* fall through to the warning */
  }
  warnings.push('GROQ_BASE_URL must be an https URL (http is allowed only for localhost); using the default.')
  return DEFAULT_BASE_URL
}

/**
 * Reads Digital Twin settings from an env-like object. `warnings` lists anything that was
 * invalid and replaced by a default, so the operator sees it at startup.
 * @param {Record<string, string | undefined>} env
 */
export function readConfig(env) {
  const warnings = []
  return {
    apiKey: (env.GROQ_API_KEY ?? '').trim(),
    model: (env.GROQ_MODEL ?? '').trim() || DEFAULT_MODEL,
    baseUrl: baseUrl(env.GROQ_BASE_URL, warnings),
    timeoutMs: positiveInt('TWIN_TIMEOUT_MS', env.TWIN_TIMEOUT_MS, 15000, warnings),
    rateLimitPerMin: positiveInt('TWIN_RATE_LIMIT_PER_MIN', env.TWIN_RATE_LIMIT_PER_MIN, 20, warnings),
    globalLimitPerHour: positiveInt('TWIN_GLOBAL_LIMIT_PER_HOUR', env.TWIN_GLOBAL_LIMIT_PER_HOUR, 300, warnings),
    warnings,
  }
}
