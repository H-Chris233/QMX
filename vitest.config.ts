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
    
    // 覆盖率配置 - 暂时禁用以解决版本兼容性问题
    // coverage: {
    //   provider: 'v8',
    //   reporter: ['text', 'json', 'html'],
    //   reportsDirectory: 'coverage',
    //   exclude: [
    //     'node_modules/',
    //     'tests/',
    //     '**/*.d.ts',
    //     '**/*.config.{js,ts}',
    //     'coverage/',
    //     'dist/',
    //     '.idea/',
    //     '.git/',
    //     '.cache/',
    //   ],
    //   thresholds: {
    //     global: {
    //       branches: 80,
    //       functions: 80,
    //       lines: 80,
    //       statements: 80,
    //     },
    //   },
    //   enabled: true,
    // },
    
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
    
    // 报告器配置
    reporter: ['verbose'],
    outputFile: {
      'junit': 'test-results/junit.xml',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
