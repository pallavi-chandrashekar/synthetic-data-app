import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      reporter: ['text', 'lcov'],
      exclude: ['node_modules/', 'src/setupTests.js'],
    },
  },
});
