export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export const TWIN_SUBMIT = 'form[aria-label="Ask the Digital Twin a question"] button[type=submit]'

/** Clicks the first element matching a selector whose text starts with the given text. */
export async function clickByText(page, selector, text) {
  const handle = await page.evaluateHandle(
    (sel, t) => [...document.querySelectorAll(sel)].find((el) => el.textContent.trim().startsWith(t)),
    selector,
    text,
  )
  const el = handle.asElement()
  if (!el) throw new Error(`no element matching ${selector} starting with "${text}"`)
  await el.click()
}

/** Reports horizontal overflow and what causes it, including text that spills out of its own box. */
export function overflowReport(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    const offenders = []
    const clippedByAncestor = (el) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        if (getComputedStyle(p).overflowX !== 'visible') return true
      }
      return false
    }
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('.sr-only')) continue
      const r = el.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) continue
      if ((r.right > vw + 0.5 || r.left < -0.5) && !clippedByAncestor(el)) {
        offenders.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + ' box right=' + Math.round(r.right))
      }
    }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement
      if (!parent || parent.closest('.sr-only') || !node.textContent.trim() || clippedByAncestor(node)) continue
      const range = document.createRange()
      range.selectNodeContents(node)
      const r = range.getBoundingClientRect()
      if (r.right > vw + 0.5) {
        offenders.push('text in ' + parent.tagName.toLowerCase() + ' "' + node.textContent.trim().slice(0, 20) + '" right=' + Math.round(r.right))
      }
    }
    return { scrollWidth: document.documentElement.scrollWidth, clientWidth: vw, offenders: offenders.slice(0, 6) }
  })
}

export async function assertNoOverflow(page, label, assert) {
  const report = await overflowReport(page)
  assert.ok(
    report.scrollWidth <= report.clientWidth && report.offenders.length === 0,
    `${label}: horizontal overflow (scrollWidth ${report.scrollWidth} > ${report.clientWidth}); offenders: ${report.offenders.join(' | ') || 'none'}`,
  )
}

/** Sets a React-controlled textarea/input value the way a real paste would. */
export function setValue(page, selector, value) {
  return page.$eval(
    selector,
    (el, v) => {
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    },
    value,
  )
}

export const logText = (page) => page.$eval('#twin-log', (el) => el.innerText)

export function waitForLog(page, needle, timeout = 8000) {
  return page.waitForFunction((n) => document.querySelector('#twin-log')?.innerText.includes(n), { timeout }, needle)
}

export async function askViaForm(page, text) {
  await setValue(page, '#twin-input', text)
  await page.click(TWIN_SUBMIT)
}

export const inViewTop = (page, selector) =>
  page.$eval(selector, (el) => {
    const top = el.getBoundingClientRect().top
    return top
  })
