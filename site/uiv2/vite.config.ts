import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://kbx.local:4174',
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), tailwindcss()],
})