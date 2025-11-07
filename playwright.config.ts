import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Playwright E2E 测试配置
 * 支持本地与CI环境，包含完整的错误追踪和报告
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
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    process.env.CI ? ['github'] : ['list'],
  ],
  
  // 全局配置
  // globalSetup: join(__dirname, 'tests/e2e/global-setup.ts'),
  // globalTeardown: join(__dirname, 'tests/e2e/global-teardown.ts'),
  
  // 超时配置
  timeout: 30 * 1000, // 30秒
  expect: {
    timeout: 10 * 1000, // 10秒
  },
  
  // 输出目录
  outputDir: 'test-results/',
  
  // WebServer 配置 - 自动启动前后端
  webServer: [],
  
  // 项目配置 - 支持多浏览器测试
  projects: [
    {
      name: 'chromium',
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
      },
    },
    
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
        contextOptions: {
          ignoreHTTPSErrors: true,
        },
      },
    },
    
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
        contextOptions: {
          ignoreHTTPSErrors: true,
        },
      },
    },
    
    // 移动端测试
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
      },
    },
    
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
      },
    },
  ],
  
  // 开发服务器配置
  use: {
    // 基础URL
    baseURL: process.env.BASE_URL || 'http://localhost:1420',
    
    // 错误捕获
    actionTimeout: 15 * 1000, // 15秒
    navigationTimeout: 30 * 1000, // 30秒
    
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
  },
});