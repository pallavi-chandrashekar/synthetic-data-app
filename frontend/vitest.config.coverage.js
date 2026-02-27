import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./setupTests.js'],
    exclude: ['node_modules', 'e2e', 'dist', 'vite.config.test.js', 'vitest.config.coverage.js'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**'],
      exclude: ['node_modules/', 'src/setupTests.js', 'src/main.jsx'],
      thresholds: {
        lines: 70,
        functions: 35,
        branches: 70,
        statements: 70,
      },
    },
  },
});
