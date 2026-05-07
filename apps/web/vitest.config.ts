import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // 'server-only' is a marker package Next.js uses to forbid client imports.
      // In Vitest (node) we replace it with a no-op so module graphs that
      // include server-only files can still be loaded for unit testing.
      'server-only': path.resolve(__dirname, './vitest.server-only-shim.ts'),
    },
  },
});
