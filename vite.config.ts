import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // The API reads PORT from .env, so the dev proxy has to read the same file.
  const env = loadEnv(mode, process.cwd(), '')
  const apiPort = env.PORT || process.env.PORT || '8787'
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        '/api': `http://127.0.0.1:${apiPort}`,
      },
    },
  }
})
