// Captures per-section screenshots for design review: node scripts/shoot.mjs [width]
import { launchBrowser, startStack, openPage, SHOTS, WIDTHS } from '../e2e/lib.mjs'
const NL = String.fromCharCode(10)

const wanted = process.argv[2]
const stack = await startStack()
const browser = await launchBrowser()
try {
  for (const vp of WIDTHS.filter((w) => !wanted || w.name === wanted)) {
    const page = await openPage(browser, stack.url, vp)
    for (const id of ['top', 'about', 'work', 'case-studies', 'learning', 'skills', 'twin', 'contact']) {
      const el = await page.$(`#${id}`)
      await el.screenshot({ path: `${SHOTS}${vp.name}-${id}.png` })
    }
    // The twin with an answer showing. The answer text is a fixture written from the verified source, for layout review only.
    stack.fixtures.answer = 'The asteroid project is a binary classifier for hazardous and non-hazardous near-Earth objects.' + NL + NL + '- Train/test separation is grouped and leakage-safe.' + NL + '- SMOTE is applied to the training data only.' + NL + '- Gradient Boosting optimization and RandomizedSearchCV are part of the workflow.'
    await page.type('#hero-ask', 'Explain the asteroid project.')
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => document.querySelector('#twin-log')?.innerText.includes('binary classifier'))
    await (await page.$('#twin')).screenshot({ path: `${SHOTS}${vp.name}-twin-with-fixture-answer.png` })
    await page.close()
    console.log(`shot ${vp.name}`)
  }
} finally {
  await browser.close()
  await stack.close()
}
