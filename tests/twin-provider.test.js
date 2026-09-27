import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { reply } from './helpers/fake-groq.js'
import { ask, useTwinSetup } from './helpers/twin-setup.js'

const setup = useTwinSetup()

describe('provider failures are classified by cause', () => {
  it('permanent rejections (400/404/413/422) are misconfiguration, not "try again"', async () => {
    for (const status of [400, 404, 413, 422]) {
      const { twin } = await setup(reply.status(status))
      const res = await twin.post(ask('hi'))
      assert.equal(res.status, 502, String(status))
      assert.equal(res.json.error.code, 'provider_misconfigured', String(status))
      assert.match(res.json.error.message, /misconfigured/)
    }
  })

  it('logs only allow-listed provider error fields (code, type), never the provider message', async () => {
    const body = JSON.stringify({ error: { message: 'secret detail with the question text', code: 'model_not_found', type: 'invalid_request_error' } })
    const { twin } = await setup(reply.status(404, body))
    await twin.post(ask('my private question'))
    const logged = twin.logs.join('\n')
    assert.match(logged, /provider status 404 code=model_not_found type=invalid_request_error/)
    assert.ok(!logged.includes('secret detail') && !logged.includes('private question'))
  })

  it('ignores provider error fields that are not plain identifiers', async () => {
    const body = JSON.stringify({ error: { code: 'x y z with spaces', type: 'ok_type' } })
    const { twin } = await setup(reply.status(500, body))
    await twin.post(ask('hi'))
    const logged = twin.logs.join('\n')
    assert.match(logged, /provider status 500 type=ok_type/)
    assert.ok(!logged.includes('with spaces'))
  })

  it('a key with illegal header characters is reported as misconfiguration, without leaking it', async () => {
    const { twin } = await setup(reply.text('unused'), { GROQ_API_KEY: 'gsk_smart_quote_\u2019_key' })
    const res = await twin.post(ask('hi'))
    assert.equal(res.status, 502)
    assert.equal(res.json.error.code, 'provider_misconfigured')
    assert.ok(!res.text.includes('smart_quote') && !twin.logs.join('\n').includes('smart_quote'))
  })

  it('a stalled body after the headers times out (504) and the timeout is logged with its duration', async () => {
    const { twin } = await setup(reply.stall(), { TWIN_TIMEOUT_MS: '200' })
    const res = await twin.post(ask('hi'))
    assert.equal(res.status, 504)
    assert.equal(res.json.error.code, 'provider_timeout')
    assert.match(twin.logs.join('\n'), /provider timeout after 200ms/)
  })

  it('odd 200 shapes are bad responses: array content, null content, an error object, an empty object', async () => {
    const shapes = [
      { choices: [{ message: { content: [{ type: 'text', text: 'hi' }] } }] },
      { choices: [{ message: { content: null } }] },
      { error: { message: 'quota', code: 'insufficient_quota' } },
      {},
    ]
    for (const payload of shapes) {
      const { twin } = await setup(reply.json(payload))
      const res = await twin.post(ask('hi'))
      assert.equal(res.status, 502, JSON.stringify(payload))
      assert.equal(res.json.error.code, 'provider_bad_response')
    }
  })

  it('bounds Retry-After: 99999 becomes 120; 0 and HTTP-dates are ignored', async () => {
    const cases = [['99999', '120'], ['0', null], ['Wed, 21 Oct 2026 07:28:00 GMT', null]]
    for (const [sent, expected] of cases) {
      const { twin } = await setup(reply.status(429, undefined, { 'retry-after': sent }))
      const res = await twin.post(ask('hi'))
      assert.equal(res.status, 503)
      assert.equal(res.headers.get('retry-after'), expected, sent)
    }
  })

  it('sends the configured model and fixed generation settings to the provider', async () => {
    const { groq, twin } = await setup(reply.text('ok'), { GROQ_MODEL: 'openai/gpt-oss-20b' })
    await twin.post(ask('hi'))
    const sent = groq.requests[0].body
    assert.equal(sent.model, 'openai/gpt-oss-20b')
    assert.equal(sent.max_tokens, 700)
    assert.equal(sent.stream, false)
    assert.equal(sent.temperature, 0.2)
  })

  it('x-request-id matches the requestId in both success and error bodies', async () => {
    const ok = await setup(reply.text('fine'))
    const good = await ok.twin.post(ask('hi'))
    assert.equal(good.headers.get('x-request-id'), good.json.requestId)
    const bad = await ok.twin.post(ask(''))
    assert.equal(bad.headers.get('x-request-id'), bad.json.error.requestId)
  })
})
