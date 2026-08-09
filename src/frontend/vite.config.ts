import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const frontendDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // App is hosted under /personal/screenshare/ on the shared API host.
  base: '/personal/screenshare/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.join(frontendDir, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // API only — keep under /personal/screenshare/api so SPA assets/routes stay on Vite.
      '/personal/screenshare/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});
