import assert from 'node:assert/strict'
import { openPage, WIDTHS } from '../lib.mjs'
import { askViaForm, clickByText, setValue, waitForLog, TWIN_SUBMIT } from '../helpers.mjs'

const desktop = WIDTHS.find((w) => w.name === '1440')

export async function twinUiSuite(r, { browser, stack }) {
  r.section('Digital Twin UI, part 1 (fake Groq: tests plumbing, not model quality)')
  const groq = stack.groq

  await r.test('normal question: answer renders as text with list, bold and related-project chips', async () => {
    const page = await openPage(browser, stack.url, desktop)
    const before = groq.requests.length
    await clickByText(page, '#twin ul button', 'What projects has Rachana built?')
    await waitForLog(page, 'Fixture answer')
    assert.equal(await page.$eval('#twin-log strong', (s) => s.textContent), 'Space Atlas')
    assert.equal((await page.$$('#twin-log ul.list-disc li')).length, 2)
    const chips = await page.$$eval('#twin-log button.chip', (b) => b.map((x) => x.textContent))
    assert.deepEqual(chips, ['04 Symbio-NLM', '05 Space Atlas'], 'related chips follow project order')
    const sent = groq.requests.at(-1).body.messages
    assert.equal(groq.requests.length, before + 1)
    assert.match(sent[0].content, /VERIFIED SOURCE/)
    assert.equal(sent.at(-1).content, 'What projects has Rachana built?')
    await clickByText(page, '#twin-log button.chip', '05')
    assert.equal(await page.$eval('#tab-space-atlas', (t) => t.getAttribute('aria-selected')), 'true')
    await page.close()
  })

  await r.test('unknown question: the refusal answer is displayed', async () => {
    const page = await openPage(browser, stack.url, desktop)
    await clickByText(page, '#twin ul button', 'Where has Rachana worked?')
    await waitForLog(page, 'verified portfolio notes')
    await page.close()
  })

  await r.test('empty and whitespace-only questions are refused locally with a message', async () => {
    const page = await openPage(browser, stack.url, desktop)
    const before = groq.requests.length
    await page.click(TWIN_SUBMIT)
    assert.equal(await page.$eval('#twin-notice', (n) => n.textContent), 'Please type a question first.')
    await setValue(page, '#twin-input', '   ')
    await page.click(TWIN_SUBMIT)
    assert.equal(await page.$eval('#twin-notice', (n) => n.textContent), 'Please type a question first.')
    assert.equal(groq.requests.length, before, 'no request should be sent')
    await page.close()
  })

  await r.test('over-long question: counter warns, send is refused; exactly 600 characters is accepted', async () => {
    const page = await openPage(browser, stack.url, desktop)
    const before = groq.requests.length
    await setValue(page, '#twin-input', 'x'.repeat(601))
    assert.equal(await page.$eval('#twin-count', (c) => c.textContent.trim()), '601/600')
    await page.click(TWIN_SUBMIT)
    assert.match(await page.$eval('#twin-notice', (n) => n.textContent), /under 600 characters/)
    assert.equal(groq.requests.length, before)
    await setValue(page, '#twin-input', 'y'.repeat(600))
    await page.click(TWIN_SUBMIT)
    await waitForLog(page, 'Fixture answer')
    assert.equal(groq.requests.length, before + 1)
    await page.close()
  })

  await r.test('repeated question: two independent answers, two provider calls', async () => {
    const page = await openPage(browser, stack.url, desktop)
    const before = groq.requests.length
    await askViaForm(page, 'Explain the asteroid project.')
    await page.waitForFunction(() => document.querySelectorAll('#twin-log ol > li').length === 1 && document.querySelector('#twin-log').innerText.includes('Fixture answer'))
    await askViaForm(page, 'Explain the asteroid project.')
    await page.waitForFunction(() => document.querySelectorAll('#twin-log ol > li').length === 2 && !document.querySelector('#twin-log').innerText.includes('Reading the notes'))
    assert.equal(groq.requests.length, before + 2)
    await page.close()
  })
}
