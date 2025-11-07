import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'tests/e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
