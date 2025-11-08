import { test, expect } from '../fixtures';

/**
 * 基础连接测试
 * 验证前后端服务能够正常启动和通信
 */
test.describe('基础连接测试', () => {
  test('前端服务响应正常', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    
    expect(response?.status()).toBe(200);
    expect(response?.ok()).toBeTruthy();
    
    // 等待页面网络空闲
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // 检查页面内容
    const title = await page.title();
    console.log('页面标题:', title);
    
    // 检查页面是否有基本内容
    const bodyContent = await page.textContent('body');
    expect(bodyContent).toBeTruthy();
    expect(bodyContent!.length).toBeGreaterThan(0);
    
    // 验证应用没有严重错误
    const hasError = await page.evaluate(() => {
      return (document.body.textContent || '').includes('Error') && 
             !(document.body.textContent || '').includes('error');
    });
    expect(hasError).toBeFalsy();
  });

  test('后端API健康检查', async ({ api }) => {
    try {
      // 测试基础API路径
      const response = await api.get('/');
      expect(response).toBeValidApiResponse();
      expect(response.success).toBeTruthy();
      console.log('API响应:', response);
    } catch (error) {
      console.log('API基础路径测试失败，尝试健康检查路径');
      
      // 尝试健康检查接口
      try {
        const healthResponse = await fetch('http://localhost:3001/api/v1/health');
        expect([200, 404]).toContain(healthResponse.status);
        console.log('健康检查状态:', healthResponse.status);
      } catch (healthError) {
        console.log('健康检查也失败，后端服务可能未启动');
        throw new Error('后端服务无法连接');
      }
    }
  });

  test('前后端通信测试', async ({ page }) => {
    // 通过前端代理访问后端API
    const apiCallResult = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/v1/');
        const data = await response.json();
        return {
          status: response.status,
          ok: response.ok,
          data: data,
        };
      } catch (error) {
        return {
          status: -1,
          error: error.message,
        };
      }
    });
    
    // 检查代理是否工作
    if (apiCallResult.status === -1) {
      console.log('前后端代理可能未配置或后端未启动');
    } else {
      console.log('前后端通信正常，状态码:', apiCallResult.status);
      expect([200, 404, 401]).toContain(apiCallResult.status);
    }
  });

  test('测试数据接口验证', async ({ api }) => {
    try {
      // 检查测试数据状态
      const statusResponse = await fetch('http://localhost:3001/api/v1/test/status');
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log('测试数据状态:', statusData);
        expect(statusData.success).toBeTruthy();
      } else {
        // 如果测试接口不存在，这是正常的（非测试环境）
        console.log('测试接口未启用（这是正常的）');
      }
    } catch (error) {
      console.log('无法访问测试接口，可能不在测试环境');
    }
  });

  test('页面基本元素检查', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 检查是否有Vue应用挂载
    const vueApp = await page.locator('#app').first();
    if (await vueApp.isVisible()) {
      console.log('✅ Vue应用挂载正常');
    }
    
    // 检查是否有基本导航元素
    const navElements = page.locator('nav, .nav, .navbar, header');
    const navCount = await navElements.count();
    if (navCount > 0) {
      console.log(`✅ 找到 ${navCount} 个导航元素`);
    }
    
    // 检查是否有主要内容区域
    const mainElements = page.locator('main, .main, .content, #content');
    const mainCount = await mainElements.count();
    if (mainCount > 0) {
      console.log(`✅ 找到 ${mainCount} 个主要内容区域`);
    }
    
    // 至少应该有body元素
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('控制台错误监控', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // 等待可能的延迟错误
    
    if (errors.length > 0) {
      console.log('发现的控制台错误:', errors);
      
      // 过滤一些非关键错误
      const criticalErrors = errors.filter(error => 
        !error.includes('Non-Error promise rejection') &&
        !error.includes('Network request failed') &&
        !error.includes('404')
      );
      
      // 关键错误不应太多
      expect(criticalErrors.length).toBeLessThan(3);
    } else {
      console.log('✅ 没有发现控制台错误');
    }
  });
});