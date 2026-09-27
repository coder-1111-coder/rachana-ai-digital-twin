import assert from 'node:assert/strict'
import { openPage, WIDTHS } from '../lib.mjs'
import { askViaForm, clickByText, setValue, sleep, waitForLog, TWIN_SUBMIT } from '../helpers.mjs'

const desktop = WIDTHS.find((w) => w.name === '1440')
const turnCount = (page) => page.$$eval('#twin-log ol > li', (li) => li.length)

export async function twinUi2Suite(r, { browser, stack }) {
  r.section('Digital Twin UI, part 2')
  const groq = stack.groq

  await r.test('while waiting: Ask and suggestions are disabled and a double submit sends one request', async () => {
    const page = await openPage(browser, stack.url, desktop)
    stack.fixtures.delayMs = 700
    try {
      const before = groq.requests.length
      await setValue(page, '#twin-input', 'Explain the face recognition pipeline.')
      await page.click(TWIN_SUBMIT)
      await page.keyboard.press('Enter')
      assert.equal(await page.$eval(TWIN_SUBMIT, (b) => b.disabled), true)
      assert.match(await page.$eval(TWIN_SUBMIT, (b) => b.textContent), /Thinking/)
      assert.equal(await page.$$eval('#twin ul button', (bs) => bs.every((b) => b.disabled)), true)
      await waitForLog(page, 'Fixture answer')
      assert.equal(groq.requests.length, before + 1)
      assert.equal(await turnCount(page), 1)
    } finally {
      stack.resetFixtures()
      await page.close()
    }
  })

  await r.test('follow-up question sends the earlier turns as history', async () => {
    const page = await openPage(browser, stack.url, desktop)
    await askViaForm(page, 'Explain the asteroid project.')
    await waitForLog(page, 'Fixture answer')
    await askViaForm(page, 'How did she handle class imbalance?')
    await page.waitForFunction(() => document.querySelectorAll('#twin-log ol > li').length === 2 && !document.querySelector('#twin-log').innerText.includes('Reading the notes'))
    const roles = groq.requests.at(-1).body.messages.map((m) => m.role)
    assert.deepEqual(roles, ['system', 'user', 'user', 'user'], 'assistant turns are demoted to labelled user text')
    await page.close()
  })

  await r.test('Enter sends; Shift+Enter inserts a newline without sending', async () => {
    const page = await openPage(browser, stack.url, desktop)
    const before = groq.requests.length
    await page.focus('#twin-input')
    await page.keyboard.type('line one')
    await page.keyboard.down('Shift')
    await page.keyboard.press('Enter')
    await page.keyboard.up('Shift')
    await page.keyboard.type('line two')
    assert.equal(groq.requests.length, before)
    assert.match(await page.$eval('#twin-input', (t) => t.value), /line one.line two/s)
    await page.keyboard.press('Enter')
    await waitForLog(page, 'Fixture answer')
    assert.equal(groq.requests.length, before + 1)
    await page.close()
  })

  await r.test('hero question box jumps to the twin and shows the answer; Clear empties the log', async () => {
    const page = await openPage(browser, stack.url, desktop)
    await page.type('#hero-ask', 'Which projects use authentication?')
    await page.keyboard.press('Enter')
    await waitForLog(page, 'Fixture answer')
    await sleep(200)
    const top = await page.$eval('#twin', (t) => t.getBoundingClientRect().top)
    assert.ok(top >= -4 && top <= 130, `#twin top is ${Math.round(top)}px`)
    await clickByText(page, '#twin button', 'Clear')
    assert.equal(await turnCount(page), 0)
    await page.close()
  })

  await r.test('markup in an answer is shown as text and never executed', async () => {
    const page = await openPage(browser, stack.url, desktop)
    stack.fixtures.answer = 'Try <img src=x onerror="window.__pwned=1"> and <script>window.__pwned=2</script> here.'
    try {
      await askViaForm(page, 'Explain the asteroid project.')
      await waitForLog(page, 'Try <img')
      assert.equal(await page.$('#twin-log img'), null)
      assert.equal(await page.evaluate(() => window.__pwned), undefined)
    } finally {
      stack.resetFixtures()
      await page.close()
    }
  })
}
