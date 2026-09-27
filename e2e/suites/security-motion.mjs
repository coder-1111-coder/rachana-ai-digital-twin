import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DIST, openPage, TEST_KEY, WIDTHS } from '../lib.mjs'
import { askViaForm, sleep, waitForLog } from '../helpers.mjs'

const desktop = WIDTHS.find((w) => w.name === '1440')

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

export async function securityMotionSuite(r, { browser, stack }) {
  r.section('Security, console health and motion')

  await r.test('the API key and env-var name appear in no built asset and no frontend source file', async () => {
    const srcDir = fileURLToPath(new URL('../../src', import.meta.url))
    for (const file of [...walk(DIST), ...walk(srcDir)]) {
      if (/\.(woff2?|png|ico)$/.test(file)) continue
      const text = readFileSync(file, 'utf8')
      assert.ok(!text.includes(TEST_KEY), `${file} contains the test key`)
      assert.ok(!text.includes('GROQ_API_KEY'), `${file} mentions GROQ_API_KEY`)
      assert.ok(!/gsk_[A-Za-z0-9]{10,}/.test(text), `${file} contains a Groq-style key`)
    }
  })

  await r.test('page response carries CSP and nosniff headers', async () => {
    const res = await fetch(stack.url + '/')
    assert.match(res.headers.get('content-security-policy'), /default-src 'self'/)
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(res.headers.get('x-powered-by'), null)
  })

  await r.test('full session (tabs, filters, menu, a twin answer): zero console errors, zero CSP violations, no third-party requests', async () => {
    const page = await browser.newPage()
    const problems = []
    const origins = new Set()
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
    page.on('console', (m) => m.type() === 'error' && problems.push(`console.error: ${m.text()}`))
    page.on('request', (req) => origins.add(new URL(req.url()).origin))
    await page.evaluateOnNewDocument(() => {
      window.__csp = []
      document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective))
    })
    await page.setViewport({ width: desktop.width, height: desktop.height })
    await page.goto(stack.url, { waitUntil: 'networkidle0' })
    for (const id of ['asteroid', 'symbio-nlm', 'memory-of-a-city']) await page.click(`#tab-${id}`)
    await page.click('#skills [role=group] button:nth-child(3)')
    await askViaForm(page, 'Explain the asteroid project.')
    await waitForLog(page, 'Fixture answer')
    const csp = await page.evaluate(() => window.__csp)
    await page.close()
    assert.deepEqual(problems, [], problems.join(' | '))
    assert.deepEqual(csp, [], `CSP violations: ${csp.join(', ')}`)
    assert.deepEqual([...origins], [new URL(stack.url).origin], `unexpected origins: ${[...origins].join(', ')}`)
  })

  await r.test('reduced motion: nothing is hidden waiting for a scroll animation', async () => {
    const page = await openPage(browser, stack.url, { ...desktop, reducedMotion: true })
    assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true)
    const hidden = await page.$$eval('.reveal, .hero-in', (els) => els.filter((e) => getComputedStyle(e).opacity !== '1').length)
    assert.equal(hidden, 0)
    await page.close()
  })

  await r.test('full motion: reveal is active, and after scrolling every section ends up visible', async () => {
    const page = await openPage(browser, stack.url, { ...desktop, reducedMotion: false })
    assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), false, 'this test must run with motion allowed')
    const invisibleAtStart = await page.$$eval('.reveal', (els) => els.filter((e) => getComputedStyle(e).opacity === '0').length)
    assert.ok(invisibleAtStart > 0, 'scroll-reveal should be hiding below-the-fold content until it is scrolled to')
    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    for (let y = 0; y <= height; y += 450) {
      await page.evaluate((top) => window.scrollTo(0, top), y)
      await sleep(90)
    }
    await sleep(1000)
    const stuck = await page.$$eval('.reveal, .hero-in', (els) => els.filter((e) => getComputedStyle(e).opacity !== '1').map((e) => e.className.slice(0, 40)))
    assert.deepEqual(stuck, [], 'content left invisible after scrolling')
    await page.close()
  })
}
