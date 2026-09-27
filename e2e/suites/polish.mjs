import assert from 'node:assert/strict'
import { openPage, WIDTHS } from '../lib.mjs'
import { clickByText, sleep } from '../helpers.mjs'

const desktop = WIDTHS.find((w) => w.name === '1440')
const phone = WIDTHS.find((w) => w.name === '390')

export async function polishSuite(r, { browser, stack }) {
  r.section('Review fixes: layout polish and honesty of the UI')

  await r.test('Learning columns line up: equal paragraph starts and project chips sharing a bottom edge', async () => {
    const page = await openPage(browser, stack.url, desktop)
    const geometry = await page.$$eval('#learning ul.grid > li', (cols) => ({
      paragraphTops: cols.map((c) => Math.round(c.querySelector('p:nth-of-type(2)').getBoundingClientRect().top)),
      chipBottoms: cols.map((c) => Math.round(c.querySelector('ul').getBoundingClientRect().bottom)),
    }))
    assert.equal(new Set(geometry.paragraphTops).size, 1, `paragraphs start at different heights: ${geometry.paragraphTops}`)
    assert.ok(Math.max(...geometry.chipBottoms) - Math.min(...geometry.chipBottoms) <= 2, `chip rows do not share a baseline: ${geometry.chipBottoms}`)
    await page.close()
  })

  await r.test('dimmed skills stay readable (no opacity fade) and expose their project numbers to screen readers', async () => {
    const page = await openPage(browser, stack.url, desktop)
    await page.click('#skills [role=group] button:nth-child(3)')
    const facts = await page.$eval('#skills li[data-match=false]', (li) => ({
      opacity: getComputedStyle(li).opacity,
      color: getComputedStyle(li).color,
      border: getComputedStyle(li).borderTopStyle,
      readable: li.querySelector('.sr-only').textContent,
      hiddenNumbers: li.querySelector('[aria-hidden=true]') !== null,
    }))
    assert.equal(facts.opacity, '1')
    assert.equal(facts.color, 'rgb(140, 136, 128)', 'ink-3, ~5.5:1 on the dark page background')
    assert.equal(facts.border, 'dashed')
    assert.match(facts.readable, /used in projects/)
    assert.equal(facts.hiddenNumbers, true)
    await page.close()
  })

  await r.test('mobile hero: "AI-ML" is never split across lines', async () => {
    const page = await openPage(browser, stack.url, phone)
    const boxes = await page.$eval('#top .eyebrow', (p) => {
      const span = [...p.querySelectorAll('span')].find((s) => s.textContent === 'AI-ML')
      return span ? span.getClientRects().length : -1
    })
    assert.equal(boxes, 1, 'the AI-ML span must occupy exactly one line box')
    await page.close()
  })

  await r.test('nav highlight clears when scrolling back to the hero', async () => {
    const page = await openPage(browser, stack.url, desktop)
    await page.click('header nav a[href="#skills"]')
    await sleep(300)
    assert.ok(await page.$('header nav a[aria-current=location]'))
    await page.evaluate(() => window.scrollTo(0, 0))
    await sleep(400)
    assert.equal(await page.$('header nav a[aria-current=location]'), null)
    await page.close()
  })

  await r.test('contact and repository links match the verified source, and only the four verified repos appear', async () => {
    const page = await openPage(browser, stack.url, desktop)
    assert.equal(await page.$eval('#contact a[href^="mailto:"]', (a) => a.getAttribute('href')), 'mailto:rachana00526@gmail.com')
    const linkedinHref = 'https://www.linkedin.com/in/rachana-s-21b931331/'
    assert.equal(await page.$eval(`#contact a[href="${linkedinHref}"]`, (a) => a.getAttribute('target')), '_blank')
    assert.equal(await page.$eval(`#contact a[href="${linkedinHref}"]`, (a) => a.getAttribute('rel')), 'noopener noreferrer')
    assert.equal(await page.$('#contact a[href*="github.com"]'), null, 'no personal GitHub profile was verified')

    const repoLinks = {
      'face-recognition': null,
      asteroid: null,
      attrition: 'https://github.com/rachana26paw/hr-attrition-ml-analysis',
      'symbio-nlm': 'https://github.com/anurag-njr11/Symbio-project',
      'space-atlas': 'https://github.com/coder-1111-coder/Space-Atlas-backend-codes',
      'memory-of-a-city': 'https://github.com/Meghna-K03/Memory-of--a-city.git',
    }
    for (const [id, url] of Object.entries(repoLinks)) {
      await page.click(`#tab-${id}`)
      const href = await page
        .$eval('[role=tabpanel] a[href*="github.com"]', (a) => a.getAttribute('href'))
        .catch(() => null)
      assert.equal(href, url, `${id} repository link`)
    }

    await page.click('#tab-memory-of-a-city')
    assert.match(await page.$eval('[role=tabpanel] header', (h) => h.innerText), /Technology stack: not listed in my verified notes/)
    await page.close()
  })

  await r.test('"Next case study" advances, moves focus to the tab, and wraps after the last', async () => {
    const page = await openPage(browser, stack.url, desktop)
    await clickByText(page, '[role=tabpanel] button', 'Next case study')
    assert.equal(await page.$eval('[role=tab][aria-selected=true]', (t) => t.id), 'tab-asteroid')
    assert.equal(await page.evaluate(() => document.activeElement.id), 'tab-asteroid')
    await page.click('#tab-memory-of-a-city')
    await clickByText(page, '[role=tabpanel] button', 'Next case study')
    assert.equal(await page.$eval('[role=tab][aria-selected=true]', (t) => t.id), 'tab-face-recognition')
    await page.close()
  })

  await r.test('the project title (h3) is smaller than the section title (h2), and block labels carry no numerals', async () => {
    const page = await openPage(browser, stack.url, desktop)
    const sizes = await page.evaluate(() => ({
      h2: parseFloat(getComputedStyle(document.querySelector('#case-studies h2')).fontSize),
      h3: parseFloat(getComputedStyle(document.querySelector('[role=tabpanel] h3')).fontSize),
    }))
    assert.ok(sizes.h3 < sizes.h2, `h3 ${sizes.h3}px vs h2 ${sizes.h2}px`)
    const labels = await page.$$eval('[role=tabpanel] h4', (hs) => hs.map((h) => h.textContent.trim()))
    assert.ok(labels.length >= 6 && labels.every((l) => !/^[0-9]/.test(l)), labels.join(' | '))
    await page.close()
  })

}

