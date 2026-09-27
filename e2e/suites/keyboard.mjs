import assert from 'node:assert/strict'
import { openPage, WIDTHS } from '../lib.mjs'

const desktop = WIDTHS.find((w) => w.name === '1440')
const phone = WIDTHS.find((w) => w.name === '390')

/** Tabs through the page and records every focus stop with its visible focus indicator. */
async function tabThrough(page, presses) {
  const stops = []
  for (let i = 0; i < presses; i += 1) {
    await page.keyboard.press('Tab')
    stops.push(
      await page.evaluate(() => {
        const el = document.activeElement
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0
        const label = el.getAttribute('aria-label') || el.textContent.trim().slice(0, 30) || el.id || el.tagName
        return { tag: el.tagName.toLowerCase(), label, w: r.width, h: r.height, outline, shadow: cs.boxShadow !== 'none', key: el.tagName + '|' + label + '|' + Math.round(r.top + window.scrollY) }
      }),
    )
  }
  return stops
}

export async function keyboardSuite(r, { browser, stack }) {
  r.section('Keyboard accessibility')

  for (const vp of [desktop, phone]) {
    await r.test(`${vp.name}px: every tabbable element is reachable, none traps focus, and each shows a visible indicator`, async () => {
      const page = await openPage(browser, stack.url, vp)
      const expected = await page.evaluate(() =>
        [...document.querySelectorAll('a[href], button, input, textarea, select, [tabindex]')].filter(
          (el) => el.tabIndex >= 0 && !el.disabled && (el.offsetParent !== null || getComputedStyle(el).position === 'fixed' || el.closest('.sr-only')),
        ).length,
      )
      const stops = await tabThrough(page, expected + 3)
      const real = stops.filter((s) => s.tag !== 'body') // Tab wraps to body at the end of the page
      const hidden = real.filter((s) => s.w === 0 || s.h === 0)
      assert.deepEqual(hidden.map((s) => s.label), [], 'focus landed on a zero-size element')
      const noIndicator = real.filter((s) => !s.outline && !s.shadow)
      assert.deepEqual(noIndicator.map((s) => `${s.tag} "${s.label}"`), [], 'focused elements without a visible focus style')
      const unique = new Set(real.map((s) => s.key))
      assert.ok(unique.size >= expected - 1, `reached ${unique.size} of ${expected} tabbable elements (possible trap or unreachable control)`)
      await page.close()
    })
  }

  await r.test('desktop: focus order starts skip link, logo, then primary navigation in reading order', async () => {
    const page = await openPage(browser, stack.url, desktop)
    const stops = await tabThrough(page, 9)
    assert.deepEqual(
      stops.map((s) => s.label),
      ['Skip to content', 'Rachana S, back to top', 'About', 'Work', 'Case studies', 'Learning', 'Skills', 'Ask Rachana', 'Contact'],
    )
    await page.close()
  })

  await r.test('landmarks and headings: one h1, one main, labelled nav and sections, labelled inputs', async () => {
    const page = await openPage(browser, stack.url, desktop)
    const facts = await page.evaluate(() => ({
      h1: document.querySelectorAll('h1').length,
      main: document.querySelectorAll('main').length,
      navLabels: [...document.querySelectorAll('nav')].map((n) => n.getAttribute('aria-label')),
      lang: document.documentElement.lang,
      sectionsLabelled: [...document.querySelectorAll('main section')].every((s) => document.getElementById(s.getAttribute('aria-labelledby'))),
      imagesWithoutAlt: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length,
      unlabelledInputs: [...document.querySelectorAll('input, textarea')].filter((i) => !i.labels || i.labels.length === 0).length,
    }))
    assert.equal(facts.h1, 1)
    assert.equal(facts.main, 1)
    assert.ok(facts.navLabels.every(Boolean))
    assert.equal(facts.lang, 'en')
    assert.equal(facts.sectionsLabelled, true)
    assert.equal(facts.imagesWithoutAlt, 0)
    assert.equal(facts.unlabelledInputs, 0)
    await page.close()
  })
}
