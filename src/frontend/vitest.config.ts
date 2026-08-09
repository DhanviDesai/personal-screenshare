import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const frontendDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(frontendDir, '../..');
const nm = path.join(frontendDir, 'node_modules');

export default defineConfig({
  plugins: [react()],
  root: frontendDir,
  resolve: {
    alias: {
      '@': path.join(frontendDir, 'src'),
      '@testing-library/react': path.join(nm, '@testing-library/react'),
      '@testing-library/jest-dom/vitest': path.join(nm, '@testing-library/jest-dom/vitest'),
      'livekit-client': path.join(nm, 'livekit-client'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: [path.join(repoRoot, 'tests/unit/frontend/**/*.{test,spec}.{ts,tsx}')],
  },
  server: {
    fs: { allow: [repoRoot] },
  },
});
