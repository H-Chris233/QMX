import { chromium, FullConfig } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || '1234';

/**
 * 全局测试设置
 * 1. 设置时区为UTC
 * 2. 等待服务启动
 * 3. 准备测试数据
 * 4. 设置测试环境
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 开始 E2E 测试全局设置...');
  
  // 设置时区为UTC
  process.env.TZ = 'UTC';
  
  try {
    // 创建测试结果目录
    await ensureDirectories();
    
    // 等待服务启动（仅在本地运行时）
    if (!process.env.CI) {
      await waitForServices();
    }
    
    // 准备测试数据
    await setupTestData();

    // 设置测试密码（用于 E2E 登录）
    await setupTestAuth();

    console.log('✅ E2E 测试全局设置完成');
  } catch (error) {
    console.error('❌ E2E 测试全局设置失败:', error);
    throw error;
  }
}

/**
 * 等待前后端服务启动
 * 使用指数退避重试策略，最大等待120秒
 */
async function waitForServices() {
  console.log('⏳ 等待服务启动...');
  
  const services = [
    { name: '后端 (Backend)', url: 'http://127.0.0.1:3001/api/v1/health', port: 3001 },
    { name: '前端 (Frontend)', url: 'http://localhost:1420', port: 1420 },
  ];
  
  for (const service of services) {
    console.log(`  - 等待 ${service.name} 启动...`);
    
    let attempts = 0;
    const maxAttempts = 120; // 最多等待120次
    let backoffMs = 500; // 初始退避时间
    
    while (attempts < maxAttempts) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(service.url, {
          signal: controller.signal,
          method: 'GET',
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok || response.status === 404) { // 404也说明服务已启动
          console.log(`  ✅ ${service.name} 已启动`);
          break;
        }
      } catch (error) {
        // 服务还未启动，继续等待
        if (attempts % 10 === 0 && attempts > 0) {
          console.log(`    ⏳ 仍在等待... (已等待 ${attempts}s)`);
        }
      }
      
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error(`${service.name} 启动超时 (120秒)。请检查服务是否正确启动。`);
      }
      
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      // 逐步增加等待时间，但不超过2秒
      backoffMs = Math.min(backoffMs * 1.1, 2000);
    }
  }
}

/**
 * 设置测试数据
 * 支持重试机制，确保测试数据准备成功
 */
async function setupTestData() {
  console.log('🔧 准备测试数据...');
  
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  - 准备测试数据 (尝试 ${attempt}/${maxRetries})...`);
      
      const response = await fetch('http://127.0.0.1:3001/api/v1/test/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'prepare',
          environment: 'test',
        }),
        signal: AbortSignal.timeout(30000), // 30秒超时
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('  ✅ 测试数据准备完成:', result.message);
        return;
      } else if (response.status === 404) {
        // 如果没有测试种子接口，继续（可能在CI环境中）
        console.log('  ⚠️  未找到测试种子接口，跳过数据准备');
        return;
      } else if (response.status === 403) {
        // 如果在非测试环境，继续
        console.log('  ℹ️  测试接口在非测试环境不可用，跳过');
        return;
      } else {
        lastError = new Error(`测试数据准备失败: HTTP ${response.status}`);
        if (attempt < maxRetries) {
          console.log(`  ⚠️  重试中... (状态码: ${response.status})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        console.log(`  ⚠️  重试中...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  // 测试数据准备不成功时输出警告但继续测试
  if (lastError) {
    console.log(`  ⚠️  无法准备测试数据，但继续执行测试: ${lastError.message}`);
  } else {
    console.log('  ℹ️  测试数据准备完成或跳过');
  }
}

/**
 * 设置测试密码
 * 通过 auth API 设置密码，供 E2E 测试自动登录使用
 */
async function setupTestAuth() {
  console.log('🔑 设置测试认证...');

  try {
    // 检查认证状态
    const statusRes = await fetch('http://127.0.0.1:3001/api/v1/auth/status', {
      signal: AbortSignal.timeout(10000),
    });

    if (!statusRes.ok) {
      console.log('  ⚠️  认证状态接口不可用，跳过');
      return;
    }

    const status = await statusRes.json();

    if (status.isFirstVisit) {
      // 首次访问，设置测试密码
      const setupRes = await fetch('http://127.0.0.1:3001/api/v1/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: TEST_PASSWORD }),
        signal: AbortSignal.timeout(10000),
      });

      if (setupRes.ok) {
        console.log('  ✅ 测试密码设置完成');
      } else {
        console.log(`  ⚠️  密码设置失败: HTTP ${setupRes.status}`);
      }
    } else {
      console.log('  ℹ️  密码已存在，跳过设置');
    }
  } catch (error) {
    console.log('  ⚠️  认证设置失败，但继续执行测试:', error instanceof Error ? error.message : String(error));
  }
}

/**
 * 确保必要的目录存在
 */
async function ensureDirectories() {
  const directories = [
    'test-results',
    'test-results/screenshots',
    'test-results/videos',
    'test-results/traces',
    'playwright-report',
  ];
  
  for (const dir of directories) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }
  
  console.log('  ✅ 测试结果目录已创建');
}

export default globalSetup;
