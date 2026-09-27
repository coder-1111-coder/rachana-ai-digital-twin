import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readConfig } from '../server/twin/config.js'
import { clientKey, createRateLimiter } from '../server/twin/rate-limit.js'

describe('readConfig', () => {
  it('uses defaults when nothing is set', () => {
    const c = readConfig({})
    assert.deepEqual([c.apiKey, c.model, c.timeoutMs, c.rateLimitPerMin, c.globalLimitPerHour], ['', 'llama-3.3-70b-versatile', 15000, 20, 300])
    assert.equal(c.baseUrl, 'https://api.groq.com/openai/v1')
    assert.deepEqual(c.warnings, [])
  })

  it('trims the key and model, and strips a trailing slash from the base URL', () => {
    const c = readConfig({ GROQ_API_KEY: '  gsk_abc  ', GROQ_MODEL: ' openai/gpt-oss-20b ', GROQ_BASE_URL: 'https://example.test/v1//' })
    assert.deepEqual([c.apiKey, c.model, c.baseUrl], ['gsk_abc', 'openai/gpt-oss-20b', 'https://example.test/v1'])
  })

  it('a whitespace-only key counts as no key', () => {
    assert.equal(readConfig({ GROQ_API_KEY: '   ' }).apiKey, '')
  })

  it('rejects partial, exponent, zero and negative numbers with a warning instead of misreading them', () => {
    for (const bad of ['15s', '1.5e4', '0', '-3', 'abc', '2.5']) {
      const c = readConfig({ TWIN_TIMEOUT_MS: bad })
      assert.equal(c.timeoutMs, 15000, bad)
      assert.equal(c.warnings.length, 1, bad)
      assert.match(c.warnings[0], /TWIN_TIMEOUT_MS/)
    }
  })

  it('accepts a padded positive integer', () => {
    const c = readConfig({ TWIN_RATE_LIMIT_PER_MIN: ' 45 ', TWIN_GLOBAL_LIMIT_PER_HOUR: '1000' })
    assert.deepEqual([c.rateLimitPerMin, c.globalLimitPerHour, c.warnings.length], [45, 1000, 0])
  })

  it('accepts https and localhost http base URLs, and rejects plain http elsewhere without echoing it', () => {
    assert.equal(readConfig({ GROQ_BASE_URL: 'http://127.0.0.1:9999/v1' }).warnings.length, 0)
    assert.equal(readConfig({ GROQ_BASE_URL: 'http://localhost:9999/v1' }).warnings.length, 0)
    for (const bad of ['http://evil.example/v1', 'ftp://x', 'not a url']) {
      const c = readConfig({ GROQ_BASE_URL: bad })
      assert.equal(c.baseUrl, 'https://api.groq.com/openai/v1', bad)
      assert.equal(c.warnings.length, 1, bad)
      assert.ok(!c.warnings[0].includes(bad), 'the URL is not echoed')
    }
  })
})

describe('clientKey', () => {
  const key = (ip) => clientKey({ ip })
  it('keeps IPv4 as is and unwraps IPv4-mapped IPv6', () => {
    assert.equal(key('203.0.113.7'), '203.0.113.7')
    assert.equal(key('::ffff:203.0.113.7'), '203.0.113.7')
  })
  it('buckets IPv6 by /64, so rotating the low 64 bits does not mint new buckets', () => {
    assert.equal(key('2001:db8:1:2:aaaa:bbbb:cccc:dddd'), key('2001:db8:1:2::1'))
    assert.notEqual(key('2001:db8:1:2::1'), key('2001:db8:1:3::1'))
    assert.equal(key('2001:DB8:0:0::5'), '2001:0db8:0000:0000')
    assert.equal(key('::1'), '0000:0000:0000:0000')
  })
  it('falls back when there is no address', () => {
    assert.equal(clientKey({}), 'unknown')
  })
})

describe('createRateLimiter', () => {
  function drive(limiter, req) {
    let result = 'ok'
    limiter(req, {}, (err) => {
      if (err) result = err
    })
    return result
  }

  it('allows up to the limit, then rejects with a Retry-After in seconds', () => {
    let t = 1_000
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, now: () => t })
    const req = { ip: '198.51.100.1' }
    assert.equal(drive(limiter, req), 'ok')
    assert.equal(drive(limiter, req), 'ok')
    t += 10_000
    const blocked = drive(limiter, req)
    assert.equal(blocked.code, 'rate_limited')
    assert.equal(blocked.status, 429)
    // window opened at t=1000 and lasts 60s, so at t=11000 exactly 50s remain
    assert.equal(blocked.retryAfterSeconds, 50)
  })

  it('starts a fresh window after windowMs', () => {
    let t = 0
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => t })
    const req = { ip: '198.51.100.1' }
    assert.equal(drive(limiter, req), 'ok')
    assert.notEqual(drive(limiter, req), 'ok')
    t = 1000
    assert.equal(drive(limiter, req), 'ok')
  })

  it('counts clients separately and reports who was limited', () => {
    const limited = []
    const limiter = createRateLimiter({ limit: 1, now: () => 0, onLimit: (k) => limited.push(k) })
    assert.equal(drive(limiter, { ip: '198.51.100.1' }), 'ok')
    assert.equal(drive(limiter, { ip: '198.51.100.2' }), 'ok')
    assert.notEqual(drive(limiter, { ip: '198.51.100.1' }), 'ok')
    assert.deepEqual(limited, ['198.51.100.1'])
  })

  it('sweeps expired buckets once the table grows past 5000 clients', () => {
    let t = 0
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => t })
    for (let i = 0; i < 5001; i += 1) drive(limiter, { ip: `10.0.${Math.floor(i / 250)}.${i % 250}` })
    t = 5000
    assert.equal(drive(limiter, { ip: '10.0.0.0' }), 'ok', 'an expired bucket is reset, not stuck')
  })
})
