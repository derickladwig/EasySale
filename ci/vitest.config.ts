import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.property.test.ts', '**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/archive/**'],
    testTimeout: 30000, // 30 seconds for property tests
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../'),
    },
  },
});
