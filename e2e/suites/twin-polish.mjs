import assert from 'node:assert/strict'
import { openPage, WIDTHS } from '../lib.mjs'
import { askViaForm, clickByText, setValue, waitForLog, TWIN_SUBMIT } from '../helpers.mjs'

const desktop = WIDTHS.find((w) => w.name === '1440')
const WITHHELD = /figure or link that isn.t in Rachana/

export async function twinPolishSuite(r, { browser, stack }) {
  r.section('Twin: output guard, truncation, busy-state handling')
  const groq = stack.groq

  await r.test('an invented figure from the model is replaced by the explicit refusal and never shown', async () => {
    const page = await openPage(browser, stack.url, desktop)
    stack.fixtures.answer = 'The asteroid model reached about 96% accuracy.'
    try {
      await askViaForm(page, 'What accuracy did the asteroid model reach?')
      await waitForLog(page, 'verified portfolio notes')
      const text = await page.$eval('#twin-log', (l) => l.innerText)
      assert.match(text, WITHHELD)
      assert.ok(!text.includes('96%'))
      assert.equal(await page.$('#twin-log button.chip'), null, 'no related-project links on a withheld answer')
    } finally {
      stack.resetFixtures()
      await page.close()
    }
  })

  await r.test('a length-limited answer is trimmed to a full sentence and labelled as cut short', async () => {
    const page = await openPage(browser, stack.url, desktop)
    stack.fixtures.mode = 'length'
    stack.fixtures.answer = 'Fixture answer: this sentence is complete and long enough to keep. This one is cut off mid'
    try {
      await askViaForm(page, 'Tell me about all six projects.')
      await waitForLog(page, 'cut short')
      const text = await page.$eval('#twin-log', (l) => l.innerText)
      assert.ok(text.includes('long enough to keep.') && !text.includes('cut off mid'))
    } finally {
      stack.resetFixtures()
      await page.close()
    }
  })

  await r.test('asking from the hero while an answer is pending keeps the typed question and explains why', async () => {
    const page = await openPage(browser, stack.url, desktop)
    stack.fixtures.delayMs = 900
    try {
      const before = groq.requests.length
      await askViaForm(page, 'Explain the asteroid project.')
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.type('#hero-ask', 'Which projects use authentication?')
      await page.keyboard.press('Enter')
      assert.equal(await page.$eval('#hero-ask', (i) => i.value), 'Which projects use authentication?', 'the question must not be erased')
      assert.match(await page.$eval('#twin-notice', (n) => n.textContent), /Still answering the previous question/)
      await waitForLog(page, 'Fixture answer')
      assert.equal(groq.requests.length, before + 1, 'only the first question was sent')
    } finally {
      stack.resetFixtures()
      await page.close()
    }
  })

  await r.test('Try again is disabled while another question is pending, and no question is lost', async () => {
    const page = await openPage(browser, stack.url, desktop)
    stack.fixtures.mode = 'error500'
    try {
      await askViaForm(page, 'First question.')
      await page.waitForSelector('#twin-log [role=alert]')
      stack.fixtures.mode = 'ok'
      stack.fixtures.delayMs = 900
      await askViaForm(page, 'Second question.')
      assert.equal(await page.$eval('#twin-log [role=alert] button', (b) => b.disabled), true)
      await waitForLog(page, 'Fixture answer')
      assert.equal((await page.$$('#twin-log ol > li')).length, 2, 'the failed first question is still there')
    } finally {
      stack.resetFixtures()
      await page.close()
    }
  })

  await r.test('answers are labelled as fallible', async () => {
    const page = await openPage(browser, stack.url, desktop)
    await askViaForm(page, 'Explain the asteroid project.')
    await waitForLog(page, 'Fixture answer')
    assert.match(await page.$eval('#twin-log', (l) => l.innerText), /It can be wrong: check the case study/i)
    await page.close()
  })

  await r.test('whitespace-only text is refused locally with the empty-question message', async () => {
    const page = await openPage(browser, stack.url, desktop)
    const before = groq.requests.length
    await setValue(page, '#twin-input', '   ')
    await page.click(TWIN_SUBMIT)
    assert.equal(await page.$eval('#twin-notice', (n) => n.textContent), 'Please type a question first.')
    assert.equal(groq.requests.length, before)
    await page.close()
  })

  await r.test('Clear while a question is pending frees the twin for a new question', async () => {
    const page = await openPage(browser, stack.url, desktop)
    stack.fixtures.delayMs = 1200
    try {
      await askViaForm(page, 'Slow question.')
      await clickByText(page, '#twin button', 'Clear')
      stack.fixtures.delayMs = 0
      await askViaForm(page, 'Fast question.')
      await waitForLog(page, 'Fixture answer')
      assert.equal((await page.$$('#twin-log ol > li')).length, 1)
      assert.ok((await page.$eval('#twin-log', (l) => l.innerText)).includes('Fast question.'))
    } finally {
      stack.resetFixtures()
      await page.close()
    }
  })
}
