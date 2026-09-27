import { existsSync } from 'node:fs'
import { DIST, launchBrowser, startStack } from './lib.mjs'
import { Runner } from './runner.mjs'
import { layoutSuite } from './suites/layout.mjs'
import { navSuite } from './suites/nav.mjs'
import { projectsSuite } from './suites/projects.mjs'
import { twinUiSuite } from './suites/twin-ui.mjs'
import { twinUi2Suite } from './suites/twin-ui2.mjs'
import { twinFailureSuite } from './suites/twin-failures.mjs'
import { keyboardSuite } from './suites/keyboard.mjs'
import { polishSuite } from './suites/polish.mjs'
import { twinPolishSuite } from './suites/twin-polish.mjs'
import { securityMotionSuite } from './suites/security-motion.mjs'

if (!existsSync(`${DIST}/index.html`)) {
  console.error('dist/ is missing. Run `npm run build` first (npm run test:e2e does this for you).')
  process.exit(2)
}

const runner = new Runner()
const stack = await startStack()
const browser = await launchBrowser()
console.log(`Browser: ${await browser.version()}`)

try {
  const ctx = { browser, stack }
  await layoutSuite(runner, ctx)
  await navSuite(runner, ctx)
  await projectsSuite(runner, ctx)
  await twinUiSuite(runner, ctx)
  await twinUi2Suite(runner, ctx)
  await twinFailureSuite(runner, ctx)
  await polishSuite(runner, ctx)
  await twinPolishSuite(runner, ctx)
  await keyboardSuite(runner, ctx)
  await securityMotionSuite(runner, ctx)
} finally {
  await browser.close()
  await stack.close()
}
process.exitCode = runner.finish() > 0 ? 1 : 0
