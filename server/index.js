import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'
import { readConfig } from './twin/config.js'

// Look for .env next to package.json, not in whatever directory the process happened to start from.
const envFile = path.join(fileURLToPath(new URL('..', import.meta.url)), '.env')
if (existsSync(envFile)) process.loadEnvFile(envFile)

function readPort(raw) {
  if (raw === undefined || raw.trim() === '') return 8787
  const value = raw.trim()
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) {
    console.error(`PORT="${value}" is not a valid port (1-65535).`)
    process.exit(1)
  }
  return Number(value)
}

const port = readPort(process.env.PORT)
const host = process.env.HOST || '127.0.0.1'
const config = readConfig(process.env)
for (const warning of config.warnings) console.warn(`[config] ${warning}`)

const server = createApp().listen(port, host)

server.once('error', (err) => {
  console.error(`Could not listen on ${host}:${port}: ${err.code ?? err.message}`)
  process.exit(1)
})

server.once('listening', () => {
  console.log(`Portfolio server listening on http://${host}:${port}`)
  console.log(
    config.apiKey
      ? `Digital Twin: configured (model ${config.model}, timeout ${config.timeoutMs} ms, ${config.rateLimitPerMin}/min per client, ${config.globalLimitPerHour}/hour site-wide)`
      : 'Digital Twin: NOT configured. Set GROQ_API_KEY in .env; /api/twin/chat will return 503 until then.',
  )
  if (host !== '127.0.0.1' && process.env.TRUST_PROXY !== '1') {
    console.warn('[config] HOST exposes the server beyond this machine. Behind a reverse proxy, also set TRUST_PROXY=1 so rate limits see real client IPs.')
  }
})
