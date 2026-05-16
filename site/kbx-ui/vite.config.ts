import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const uiHost = process.env.KBX_UI_HOST || 'kbx.local';
const bridgePort = Number(process.env.KBX_BRIDGE_PORT || 4174);

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: [uiHost],
    port: 4173,
    proxy: {
      '/api': {
        target: `http://${uiHost}:${bridgePort}`,
        changeOrigin: true,
      },
    },
  },
});