import assert from 'node:assert/strict'
import { openPage, WIDTHS } from '../lib.mjs'
import { sleep, inViewTop } from '../helpers.mjs'

const SECTIONS = ['about', 'work', 'case-studies', 'learning', 'skills', 'twin', 'contact']
const desktop = WIDTHS.find((w) => w.name === '1440')
const phone = WIDTHS.find((w) => w.name === '390')

export async function navSuite(r, { browser, stack }) {
  r.section('Navigation')

  await r.test('desktop: each header link scrolls its section to the top and marks it current', async () => {
    const page = await openPage(browser, stack.url, desktop)
    for (const id of SECTIONS) {
      await page.click(`header nav[aria-label="Primary"] a[href="#${id}"]`)
      await sleep(250)
      const top = await inViewTop(page, `#${id}`)
      const atBottom = await page.evaluate(() => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2)
      assert.ok((top >= -4 && top <= 130) || (atBottom && top > 0), `#${id} top is ${Math.round(top)}px after clicking its link`)
      const current = await page.$eval('header nav[aria-label="Primary"] a[aria-current="location"]', (a) => a.getAttribute('href'))
      assert.equal(current, `#${id}`)
    }
    await page.close()
  })

  await r.test('desktop: the logo returns to the top', async () => {
    const page = await openPage(browser, stack.url, desktop)
    await page.click('header nav a[href="#contact"]')
    await sleep(200)
    await page.click('header a[href="#top"]')
    await sleep(250)
    assert.ok((await page.evaluate(() => window.scrollY)) < 10)
    await page.close()
  })

  await r.test('mobile: menu toggles aria-expanded, lists 7 links, and closes after choosing one', async () => {
    const page = await openPage(browser, stack.url, phone)
    const button = 'button[aria-controls="site-menu"]'
    assert.equal(await page.$eval(button, (b) => b.getAttribute('aria-expanded')), 'false')
    assert.equal(await page.$('#site-menu'), null, 'menu should not exist while closed')
    await page.click(button)
    assert.equal(await page.$eval(button, (b) => b.getAttribute('aria-expanded')), 'true')
    assert.equal((await page.$$('#site-menu a')).length, 7)
    await page.click('#site-menu a[href="#skills"]')
    await sleep(250)
    assert.equal(await page.$eval(button, (b) => b.getAttribute('aria-expanded')), 'false')
    const top = await inViewTop(page, '#skills')
    assert.ok(top >= -4 && top <= 130, `#skills top is ${Math.round(top)}px`)
    await page.close()
  })

  await r.test('mobile: Escape closes the menu', async () => {
    const page = await openPage(browser, stack.url, phone)
    await page.click('button[aria-controls="site-menu"]')
    await page.keyboard.press('Escape')
    await sleep(60)
    assert.equal(await page.$('#site-menu'), null)
    await page.close()
  })

  await r.test('skip link is the first tab stop, becomes visible, and moves focus to main', async () => {
    const page = await openPage(browser, stack.url, desktop)
    await page.keyboard.press('Tab')
    const info = await page.evaluate(() => {
      const el = document.activeElement
      const r = el.getBoundingClientRect()
      return { text: el.textContent.trim(), w: r.width, h: r.height, top: r.top }
    })
    assert.equal(info.text, 'Skip to content')
    assert.ok(info.w > 40 && info.h > 20 && info.top >= 0, 'skip link should be visible when focused')
    await page.keyboard.press('Enter')
    assert.equal(await page.evaluate(() => document.activeElement.id), 'main')
    await page.close()
  })
}
