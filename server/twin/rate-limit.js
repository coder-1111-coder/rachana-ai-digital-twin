import { errors } from './errors.js'

/** Expands an IPv6 address and keeps its /64 prefix, so one client cannot mint endless addresses. */
function ipv6Prefix(ip) {
  const [head, tail] = ip.split('%')[0].split('::')
  const first = head ? head.split(':') : []
  const last = tail ? tail.split(':') : []
  const fill = tail === undefined ? [] : Array(Math.max(0, 8 - first.length - last.length)).fill('0')
  return [...first, ...fill, ...last]
    .slice(0, 4)
    .map((group) => group.toLowerCase().padStart(4, '0'))
    .join(':')
}

/** One bucket per client: the IPv4 address, or the /64 prefix of an IPv6 address. */
export function clientKey(req) {
  const ip = req.ip ?? 'unknown'
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip)
  if (mapped) return mapped[1]
  return ip.includes(':') ? ipv6Prefix(ip) : ip
}

/**
 * Fixed-window limiter. In-memory, so it is per process and resets on restart; enough to stop
 * one client (or the whole internet, via the global instance) from draining the Groq quota.
 * @param {{ limit: number, windowMs?: number, now?: () => number, key?: (req: object) => string, onLimit?: (key: string) => void }} options
 */
export function createRateLimiter({ limit, windowMs = 60_000, now = Date.now, key = clientKey, onLimit }) {
  /** @type {Map<string, { count: number, resetAt: number }>} */
  const hits = new Map()

  return function rateLimit(req, _res, next) {
    const t = now()
    if (hits.size > 5000) {
      for (const [k, entry] of hits) if (entry.resetAt <= t) hits.delete(k)
    }
    const id = key(req)
    let entry = hits.get(id)
    if (!entry || entry.resetAt <= t) {
      entry = { count: 0, resetAt: t + windowMs }
      hits.set(id, entry)
    }
    entry.count += 1
    if (entry.count > limit) {
      onLimit?.(id)
      return next(errors.rateLimited(Math.max(1, Math.ceil((entry.resetAt - t) / 1000))))
    }
    next()
  }
}
