import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@common': path.resolve('src/common'),
      '@plugin': path.resolve('src/plugin'),
      '@ui': path.resolve('src/ui'),
    },
  },
});
