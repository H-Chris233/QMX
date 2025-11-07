import { chromium, FullConfig } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 全局测试设置
 * 1. 等待服务启动
 * 2. 准备测试数据
 * 3. 设置测试环境
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 开始 E2E 测试全局设置...');
  
  try {
    // 等待服务启动
    await waitForServices();
    
    // 准备测试数据
    await setupTestData();
    
    // 创建测试结果目录
    await ensureDirectories();
    
    console.log('✅ E2E 测试全局设置完成');
  } catch (error) {
    console.error('❌ E2E 测试全局设置失败:', error);
    throw error;
  }
}

/**
 * 等待前后端服务启动
 */
async function waitForServices() {
  console.log('⏳ 等待服务启动...');
  
  const services = [
    { name: 'Frontend', url: 'http://localhost:1420', port: 1420 },
    { name: 'Backend', url: 'http://localhost:3001/api/v1/health', port: 3001 },
  ];
  
  for (const service of services) {
    console.log(`  - 等待 ${service.name} 服务启动...`);
    
    let attempts = 0;
    const maxAttempts = 60; // 最多等待60次，每次1秒
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(service.url);
        if (response.ok || response.status === 404) { // 404也说明服务已启动
          console.log(`  ✅ ${service.name} 服务已启动`);
          break;
        }
      } catch (error) {
        // 服务还未启动，继续等待
      }
      
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error(`${service.name} 服务启动超时`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

/**
 * 设置测试数据
 */
async function setupTestData() {
  console.log('🔧 准备测试数据...');
  
  try {
    // 调用后端测试数据准备接口
    const response = await fetch('http://localhost:3001/api/v1/test/seed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'prepare',
        environment: 'test',
      }),
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('  ✅ 测试数据准备完成:', result.message);
    } else if (response.status === 404) {
      // 如果没有测试种子接口，使用基础数据
      console.log('  ⚠️  未找到测试种子接口，跳过数据准备');
    } else {
      console.log('  ⚠️  测试数据准备失败，但继续执行测试');
    }
  } catch (error) {
    console.log('  ⚠️  无法连接到测试数据接口，但继续执行测试');
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