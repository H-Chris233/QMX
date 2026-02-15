import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Playwright E2E 测试配置 - 核心流程版本
 * 支持本地与CI环境，包含完整的错误追踪和报告
 * 专门针对核心业务流程测试优化
 */
export default defineConfig({
  // 测试目录
  testDir: './tests/e2e',
  
  // 运行配置
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // 报告配置
  reporter: [
    ['html', { 
      outputFolder: 'playwright-report',
      open: process.env.CI ? 'never' : 'on-failure'
    }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    process.env.CI ? ['github'] : ['list'],
  ],
  
  // 全局设置
  globalSetup: join(__dirname, 'tests/e2e/global-setup.ts'),
  globalTeardown: join(__dirname, 'tests/e2e/global-teardown.ts'),
  
  // 超时配置（针对核心流程测试优化）
  timeout: 60 * 1000, // 60秒，给核心流程更多时间
  expect: {
    timeout: 15 * 1000, // 15秒
  },
  
  // 输出目录
  outputDir: 'test-results/',
  
  // WebServer 配置 - 自动启动前后端
  webServer: [
    {
      command: 'npm run backend',
      port: 3001,
      timeout: 120 * 1000, // 2分钟启动超时
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev',
      port: 1420,
      timeout: 60 * 1000, // 1分钟启动超时
      reuseExistingServer: !process.env.CI,
    }
  ],
  
  // 项目配置 - 专注于核心功能测试
  projects: [
    {
      name: 'chromium-core',
      use: { 
        ...devices['Desktop Chrome'],
        // 截图和视频配置
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
        // 测试数据隔离
        contextOptions: {
          ignoreHTTPSErrors: true,
        },
        // 核心流程测试专用配置
        locale: 'zh-CN',
        timezoneId: 'Asia/Shanghai',
      },
      testIgnore: [
        '**/smoke/**',
        '**/connectivity/**',
        '**/basic.spec.ts'
      ],
      testMatch: [
        '**/features/**/*.spec.ts',
        '**/integration.spec.ts'
      ],
    },
    
    {
      name: 'firefox-core',
      use: { 
        ...devices['Desktop Firefox'],
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
        contextOptions: {
          ignoreHTTPSErrors: true,
        },
        locale: 'zh-CN',
        timezoneId: 'Asia/Shanghai',
      },
      testIgnore: [
        '**/smoke/**',
        '**/connectivity/**',
        '**/basic.spec.ts'
      ],
      testMatch: [
        '**/features/**/*.spec.ts',
        '**/integration.spec.ts'
      ],
    },
    
    // 移动端核心流程测试
    {
      name: 'mobile-chrome-core',
      use: { 
        ...devices['Pixel 5'],
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
        locale: 'zh-CN',
        timezoneId: 'Asia/Shanghai',
      },
      testIgnore: [
        '**/smoke/**',
        '**/connectivity/**',
        '**/basic.spec.ts'
      ],
      testMatch: [
        '**/features/**/*.spec.ts',
        '**/integration.spec.ts'
      ],
    },
    
  ],
  
  // 开发服务器配置
  use: {
    // 基础URL
    baseURL: process.env.BASE_URL || 'http://localhost:1420',
    
    // 错误捕获
    actionTimeout: 30 * 1000, // 30秒
    navigationTimeout: 60 * 1000, // 60秒
    
    // 截图和视频
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    
    // 其他配置
    ignoreHTTPSErrors: true,
    bypassCSP: true,
  },
  
  // 测试环境元数据
  metadata: {
    'Test Environment': process.env.NODE_ENV || 'test',
    'Base URL': process.env.BASE_URL || 'http://localhost:1420',
    'Backend URL': process.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1',
    'Test Type': 'E2E Core Flow',
    'Coverage': 'Student Management, Financial Transactions, Dashboard, CSV Export, Installment Management',
  },
});
