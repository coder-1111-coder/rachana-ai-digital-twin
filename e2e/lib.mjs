import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'
import { createApp } from '../server/app.js'
import { startFakeGroq } from '../tests/helpers/fake-groq.js'

export const DIST = fileURLToPath(new URL('../dist', import.meta.url))
export const SHOTS = fileURLToPath(new URL('../docs/screenshots/', import.meta.url))
export const TEST_KEY = 'gsk_e2e_key_must_never_reach_the_browser'

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
]

export function findChrome() {
  const found = CHROME_CANDIDATES.find((p) => p && existsSync(p))
  if (!found) throw new Error('No Chrome/Edge found. Set CHROME_PATH to a Chromium-based browser.')
  return found
}

export async function launchBrowser() {
  return puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
  })
}

/**
 * Fixture answers for the fake Groq. These exercise the UI and API plumbing only:
 * they are NOT evidence of how the real model behaves.
 */
const NL = String.fromCharCode(10)
const DEFAULT_FIXTURES = {
  mode: 'ok',
  delayMs: 0,
  answer: 'Fixture answer: Rachana built six projects, including **Space Atlas** and Symbio-NLM.' + NL + NL + '- First fixture bullet' + NL + '- Second fixture bullet',
}
export const fixtures = { ...DEFAULT_FIXTURES }

async function fixtureHandler(record, res) {
  if (fixtures.delayMs) await new Promise((r) => setTimeout(r, fixtures.delayMs))
  if (fixtures.mode === 'error500') {
    res.writeHead(500, { 'content-type': 'application/json' })
    return res.end('{"error":"provider detail"}')
  }
  if (fixtures.mode === 'hang') return
  const finish = fixtures.mode === 'length' ? 'length' : 'stop'
  const question = record.body?.messages?.at(-1)?.content ?? ''
  const text = /worked/i.test(question)
    ? "Fixture answer: That isn't in Rachana's verified portfolio notes."
    : fixtures.answer
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: text }, finish_reason: finish }] }))
}

/** Starts the real Express app (serving dist/) wired to a fake Groq. */
export async function startStack({ apiKey = TEST_KEY } = {}) {
  const groq = await startFakeGroq(fixtureHandler)
  const logs = []
  const app = createApp({
    env: { GROQ_API_KEY: apiKey, GROQ_BASE_URL: groq.baseUrl, TWIN_TIMEOUT_MS: '2000', TWIN_RATE_LIMIT_PER_MIN: '1000' },
    logger: { error: (...a) => logs.push(a.join(' ')) },
    distDir: DIST,
  })
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    groq,
    logs,
    fixtures,
    resetFixtures: () => Object.assign(fixtures, DEFAULT_FIXTURES),
    close: async () => {
      server.closeAllConnections?.()
      await new Promise((r) => server.close(r))
      await groq.close()
    },
  }
}

export const WIDTHS = [
  { name: '360', width: 360, height: 780, mobile: true },
  { name: '390', width: 390, height: 844, mobile: true },
  { name: '768', width: 768, height: 1024, mobile: false },
  { name: '1440', width: 1440, height: 900, mobile: false },
]

/** Opens a page at a given viewport. Reduced motion keeps scroll-reveal content visible for screenshots. */
export async function openPage(browser, url, { width, height, mobile = false, reducedMotion = true } = {}) {
  const page = await browser.newPage()
  await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile })
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' }])
  await page.goto(url, { waitUntil: 'networkidle0' })
  await page.evaluate(() => document.fonts.ready)
  return page
}
