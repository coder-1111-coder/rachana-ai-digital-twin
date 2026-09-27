// Runs the API (with restart on change) and the Vite dev server together: npm run dev
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

// Same .env the API reads, so both processes agree on PORT.
if (existsSync('.env')) process.loadEnvFile('.env')

const children = []
let closing = false

function shutdown(code = 0) {
  if (closing) return
  closing = true
  for (const child of children) child.kill()
  process.exit(code)
}

function run(name, args) {
  const child = spawn(process.execPath, args, { stdio: 'inherit', env: process.env })
  child.on('exit', (code) => {
    if (!closing) console.error(`[dev] ${name} exited with code ${code}`)
    shutdown(code ?? 0)
  })
  children.push(child)
}

run('api', ['--watch', 'server/index.js'])
run('web', ['node_modules/vite/bin/vite.js'])

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
