import assert from 'node:assert/strict'
import { openPage, WIDTHS } from '../lib.mjs'
import { sleep, inViewTop, waitForLog } from '../helpers.mjs'

const desktop = WIDTHS.find((w) => w.name === '1440')

const EXPECTED = {
  'face-recognition': ['Problem', 'Dataset', 'Pipeline', 'Models', 'Evaluation', 'Key decisions', 'Project materials', 'Repository'],
  asteroid: ['Problem', 'Dataset', 'Workflow', 'Models', 'Evaluation', 'Key decisions', 'Project materials', 'Repository'],
  attrition: ['Problem', 'Dataset', 'Methods', 'Models', 'Evaluation', 'Key decisions', 'Repository'],
  'symbio-nlm': ['Problem', 'Architecture', 'Frontend', 'Backend', 'Database', 'AI & auth', 'All features', 'Repository'],
  'space-atlas': ['Problem', 'Architecture', 'Frontend', 'Backend', 'Database', 'AI & auth', 'All features', 'Repository'],
  'memory-of-a-city': ['Problem', 'Data', 'Flow', 'AI Change Story', 'Not in my verified notes', 'Repository'],
}

export async function projectsSuite(r, { browser, stack }) {
  r.section('Project interactions')

  await r.test('Selected Work row opens that case study and scrolls to it', async () => {
    const page = await openPage(browser, stack.url, desktop)
    await page.click('button[aria-label="Open case study: Space Atlas"]')
    await sleep(250)
    assert.equal(await page.$eval('#tab-space-atlas', (t) => t.getAttribute('aria-selected')), 'true')
    assert.equal(await page.$eval('[role=tabpanel] h3', (h) => h.textContent), 'Space Atlas')
    const top = await inViewTop(page, '#case-studies')
    assert.ok(top >= -4 && top <= 130, `#case-studies top is ${Math.round(top)}px`)
    await page.close()
  })

  for (const [id, labels] of Object.entries(EXPECTED)) {
    await r.test(`${id}: shows ${labels.join(' > ')}`, async () => {
      const page = await openPage(browser, stack.url, desktop)
      await page.click(`#tab-${id}`)
      const shown = await page.$$eval('[role=tabpanel] h4', (hs) => hs.map((h) => h.textContent.replace(/^\d+\s*/, '').trim()))
      assert.deepEqual(shown, labels)
      await page.close()
    })
  }

  await r.test('Memory of a City shows a DEMO DATA notice and never calls the data verified', async () => {
    const page = await openPage(browser, stack.url, desktop)
    await page.click('#tab-memory-of-a-city')
    const note = await page.$eval('[role=tabpanel] [role=note]', (n) => n.innerText)
    assert.match(note, /DEMO DATA/)
    assert.match(note, /not verified real-world measurements/)
    await page.close()
  })

  await r.test('tabs follow the ARIA pattern: roving tabindex, arrows, Home/End, wrap-around', async () => {
    const page = await openPage(browser, stack.url, desktop)
    const selected = () => page.$eval('[role=tab][aria-selected=true]', (t) => t.id)
    const focused = () => page.evaluate(() => document.activeElement.id)
    assert.equal(await page.$$eval('[role=tab][tabindex="0"]', (t) => t.length), 1)
    await page.focus('#tab-face-recognition')
    await page.keyboard.press('ArrowDown')
    assert.equal(await selected(), 'tab-asteroid')
    assert.equal(await focused(), 'tab-asteroid')
    await page.keyboard.press('End')
    assert.equal(await selected(), 'tab-memory-of-a-city')
    await page.keyboard.press('ArrowRight')
    assert.equal(await selected(), 'tab-face-recognition', 'ArrowRight from the last tab wraps to the first')
    await page.keyboard.press('ArrowUp')
    assert.equal(await selected(), 'tab-memory-of-a-city', 'ArrowUp from the first tab wraps to the last')
    await page.keyboard.press('Home')
    assert.equal(await selected(), 'tab-face-recognition')
    assert.equal(await page.$eval('[role=tabpanel]', (p) => p.getAttribute('aria-labelledby')), 'tab-face-recognition')
    await page.close()
  })

  await r.test('skills filter highlights one project, dims the rest, and All resets', async () => {
    const page = await openPage(browser, stack.url, desktop)
    const buttons = await page.$$('#skills [role=group] button')
    assert.equal(buttons.length, 7)
    await buttons[2].click()
    assert.equal(await buttons[2].evaluate((b) => b.getAttribute('aria-pressed')), 'true')
    const matched = await page.$$eval('#skills li[data-match=true]', (li) => li.map((x) => x.textContent))
    const dimmed = await page.$eval('#skills', (s) => s.querySelectorAll('li[data-match=false]').length)
    assert.ok(matched.some((t) => t.includes('SMOTE')), 'SMOTE is used in the asteroid project')
    assert.ok(matched.some((t) => t.includes('Joblib')))
    assert.ok(!matched.some((t) => t.includes('JWT')), 'JWT is not used in the asteroid project')
    assert.ok(dimmed > 20)
    await buttons[0].click()
    assert.equal(await page.$eval('#skills', (s) => s.querySelectorAll('li[data-match=false]').length), 0)
    await page.close()
  })

  await r.test('Ask-the-twin button in a case study sends a question about that project', async () => {
    const page = await openPage(browser, stack.url, desktop)
    await page.click('#tab-asteroid')
    const before = stack.groq.requests.length
    await page.click('[role=tabpanel] header button.btn')
    await waitForLog(page, 'Fixture answer')
    assert.equal(stack.groq.requests.length, before + 1)
    assert.equal(stack.groq.requests.at(-1).body.messages.at(-1).content, 'Explain the Hazardous Asteroid Prediction project.')
    await page.close()
  })
}
