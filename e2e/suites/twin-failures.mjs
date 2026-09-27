import assert from 'node:assert/strict'
import { openPage, startStack, WIDTHS } from '../lib.mjs'
import { askViaForm, clickByText, waitForLog } from '../helpers.mjs'

const desktop = WIDTHS.find((w) => w.name === '1440')
const alertText = (page) => page.$eval('#twin-log [role=alert]', (a) => a.innerText)
const waitForAlert = (page, timeout = 8000) => page.waitForSelector('#twin-log [role=alert]', { timeout })

/** Replaces the API response for one page, simulating a broken backend. */
async function interceptApi(page, respond) {
  await page.setRequestInterception(true)
  page.on('request', (req) => {
    if (req.url().endsWith('/api/twin/chat')) respond(req)
    else req.continue()
  })
}

export async function twinFailureSuite(r, { browser, stack }) {
  r.section('Digital Twin failure handling')

  await r.test('provider error: friendly message, no provider detail, and Try again recovers', async () => {
    const page = await openPage(browser, stack.url, desktop)
    stack.fixtures.mode = 'error500'
    try {
      await askViaForm(page, 'Explain the asteroid project.')
      await waitForAlert(page)
      const text = await alertText(page)
      assert.match(text, /having trouble/i)
      assert.ok(!text.includes('provider detail'), 'provider body must not reach the UI')
      stack.resetFixtures()
      await clickByText(page, '#twin-log button', 'Try again')
      await waitForLog(page, 'Fixture answer')
      assert.equal(await page.$('#twin-log [role=alert]'), null, 'failed turn is replaced by the retry')
      assert.equal((await page.$$('#twin-log ol > li')).length, 1)
    } finally {
      stack.resetFixtures()
      await page.close()
    }
  })

  await r.test('slow provider: server times out and the UI reports it', async () => {
    const page = await openPage(browser, stack.url, desktop)
    stack.fixtures.mode = 'hang'
    try {
      await askViaForm(page, 'Explain the asteroid project.')
      await waitForAlert(page, 9000)
      assert.match(await alertText(page), /too long/i)
    } finally {
      stack.resetFixtures()
      await page.close()
    }
  })

  await r.test('missing API key: clear message, the rest of the site still works', async () => {
    const keyless = await startStack({ apiKey: '' })
    try {
      const page = await openPage(browser, keyless.url, desktop)
      await askViaForm(page, 'Explain the asteroid project.')
      await waitForAlert(page)
      assert.match(await alertText(page), /not configured/i)
      assert.equal(keyless.groq.requests.length, 0, 'no provider call without a key')
      await page.click('#tab-symbio-nlm')
      assert.equal(await page.$eval('[role=tabpanel] h3', (h) => h.textContent), 'Symbio-NLM')
      await page.close()
    } finally {
      await keyless.close()
    }
  })

  await r.test('backend unreachable (connection refused): network message with retry', async () => {
    const page = await openPage(browser, stack.url, desktop)
    await interceptApi(page, (req) => req.abort('connectionrefused'))
    await askViaForm(page, 'Explain the asteroid project.')
    await waitForAlert(page)
    assert.match(await alertText(page), /Couldn.t reach the Digital Twin service/)
    assert.ok(await page.$('#twin-log button.btn'), 'retry button present')
    await page.close()
  })

  await r.test('proxy returns an HTML 502 page: backend-unavailable message, no raw HTML shown', async () => {
    const page = await openPage(browser, stack.url, desktop)
    await interceptApi(page, (req) => req.respond({ status: 502, contentType: 'text/html', body: '<html><body>Bad gateway</body></html>' }))
    await askViaForm(page, 'Explain the asteroid project.')
    await waitForAlert(page)
    const text = await alertText(page)
    assert.match(text, /backend isn.t reachable/i)
    assert.ok(!text.includes('Bad gateway'))
    await page.close()
  })

  await r.test('200 response with an unreadable body: reported, not crashed', async () => {
    const page = await openPage(browser, stack.url, desktop)
    await interceptApi(page, (req) => req.respond({ status: 200, contentType: 'application/json', body: '{"unexpected":true}' }))
    await askViaForm(page, 'Explain the asteroid project.')
    await waitForAlert(page)
    assert.match(await alertText(page), /could not read/i)
    await page.close()
  })

  await r.test('server rate limit (429): the server message is shown', async () => {
    const page = await openPage(browser, stack.url, desktop)
    const body = JSON.stringify({ error: { code: 'rate_limited', message: 'Too many questions in a short time. Please wait a moment.' } })
    await interceptApi(page, (req) => req.respond({ status: 429, contentType: 'application/json', headers: { 'retry-after': '30' }, body }))
    await askViaForm(page, 'Explain the asteroid project.')
    await waitForAlert(page)
    assert.match(await alertText(page), /Too many questions/)
    await page.close()
  })
}
