
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./setupTests.js'],
    exclude: ['node_modules', 'e2e', 'dist', 'vite.config.test.js', 'vitest.config.coverage.js'],
  },
});
