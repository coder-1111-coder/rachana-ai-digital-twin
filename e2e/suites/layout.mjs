import assert from 'node:assert/strict'
import { openPage, WIDTHS, SHOTS } from '../lib.mjs'
import { assertNoOverflow, sleep } from '../helpers.mjs'

const PROJECT_IDS = ['face-recognition', 'asteroid', 'attrition', 'symbio-nlm', 'space-atlas', 'memory-of-a-city']

export async function layoutSuite(r, { browser, stack }) {
  r.section('Responsive layout (360 / 390 / 768 / 1440)')

  for (const vp of WIDTHS) {
    await r.test(`${vp.name}px: no horizontal overflow on the full page`, async () => {
      const page = await openPage(browser, stack.url, vp)
      await assertNoOverflow(page, `${vp.name}px page`, assert)
      await page.screenshot({ path: `${SHOTS}${vp.name}-hero-viewport.png` })
      await page.close()
    })

    await r.test(`${vp.name}px: no overflow with each of the 6 case studies open`, async () => {
      const page = await openPage(browser, stack.url, vp)
      for (const id of PROJECT_IDS) {
        await page.click(`#tab-${id}`)
        await sleep(60)
        await assertNoOverflow(page, `${vp.name}px ${id}`, assert)
      }
      await page.close()
    })

    if (vp.width < 1024) {
      await r.test(`${vp.name}px: no overflow with the mobile menu open`, async () => {
        const page = await openPage(browser, stack.url, vp)
        await page.click('button[aria-controls="site-menu"]')
        await page.waitForSelector('#site-menu')
        await assertNoOverflow(page, `${vp.name}px menu`, assert)
        await page.close()
      })
    }

    await r.test(`${vp.name}px: interactive targets are at least 24px tall`, async () => {
      const page = await openPage(browser, stack.url, vp)
      const small = await page.evaluate(() => {
        const out = []
        for (const el of document.querySelectorAll('button, [role=tab], nav a, footer a')) {
          if (el.closest('.sr-only')) continue
          const r = el.getBoundingClientRect()
          if (r.width === 0 || r.height === 0) continue
          if (r.height < 24) out.push(`${el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 22)}" ${Math.round(r.height)}px`)
        }
        return out
      })
      assert.deepEqual(small, [], `targets under 24px: ${small.join(', ')}`)
      await page.close()
    })
  }

  await r.test('360px: a long unbroken question and answer wrap instead of overflowing', async () => {
    const page = await openPage(browser, stack.url, WIDTHS[0])
    const before = stack.fixtures.answer
    stack.fixtures.answer = 'A'.repeat(320) + ' and then a normal sentence.'
    try {
      await page.type('#hero-ask', 'Q'.repeat(400))
      await page.keyboard.press('Enter')
      await page.waitForFunction(() => document.querySelector('#twin-log')?.innerText.includes('normal sentence'), { timeout: 8000 })
      await assertNoOverflow(page, '360px long answer', assert)
    } finally {
      stack.fixtures.answer = before
      await page.close()
    }
  })
}
