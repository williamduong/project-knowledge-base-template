import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const bridgePort = Number(process.env.KBX_BRIDGE_PORT || 4174)

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: `http://localhost:${bridgePort}`,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
  plugins: [react(), tailwindcss()],
})
