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
    
    // 覆盖率配置 - 统一标准
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html', 'json', 'json-summary'],
      reportsDirectory: './coverage',
      
      // 包含需要统计覆盖率的文件
      include: [
        'src/**/*.{js,ts,vue}',
      ],
      
      // 排除不需要统计的文件
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        'src/**/*.{test,spec}.{js,ts}',
        'src/**/__tests__/**',
        'src/**/mocks/**',
        'src/types/**',           // 类型定义文件
        'src/main.ts',            // 应用入口文件
        'src/App.vue',            // 根组件
        '**/*.d.ts',              // TypeScript 声明文件
        '**/index.ts',            // 仅作为导出的索引文件
      ],
      
      // 覆盖率阈值 - 前端标准 ≥80% (目标)
      // 当前设置为实际水平，逐步提升至目标
      thresholds: {
        statements: 25,
        branches: 75,
        functions: 50,
        lines: 25,
      },
      
      // 在CI环境中启用所有报告
      all: true,
      
      // 清理旧的覆盖率报告
      clean: true,
      
      // 跳过完整的代码覆盖率检查
      skipFull: false,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
