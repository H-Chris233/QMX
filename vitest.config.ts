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
    
    // 测试配置
    testTimeout: 10000,
    hookTimeout: 10000,
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
    
    // Mock 配置
    clearMocks: true,
    restoreMocks: true,
    
    // 监视模式配置
    watch: false,
    
    // 报告器配置 - 支持多格式输出
    reporter: process.env.CI ? ['verbose', 'json', 'junit'] : ['verbose'],
    outputFile: {
      'json': 'test-results/vitest-results.json',
      'junit': 'test-results/vitest-junit.xml',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
