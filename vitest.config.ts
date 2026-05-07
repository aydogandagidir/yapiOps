import { defineConfig } from 'vitest/config';

/**
 * Root Vitest config — each workspace package defines its own
 * `vitest.config.ts`. This root config exists for IDE integration and
 * cross-package test runs.
 */
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.config.{ts,js,mjs}',
        '**/*.d.ts',
        '**/__tests__/**',
        '**/coverage/**',
      ],
    },
  },
});
