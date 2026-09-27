import { readFileSync } from 'node:fs'

/**
 * The content shapes live in src/types.ts (the single definition); tests/data.test.js checks the JSON against them.
 * @typedef {import('../src/types.ts').Portfolio} Portfolio
 * @typedef {import('../src/types.ts').Project} Project
 */

/** @returns {Portfolio} */
export function loadPortfolio(file = new URL('../data/portfolio.json', import.meta.url)) {
  return JSON.parse(readFileSync(file, 'utf8'))
}
