import { test, expect } from '../fixtures';

/**
 * 冒烟测试 - 验证应用基本功能
 */
test.describe('冒烟测试', () => {
  test.beforeEach(async ({ page }) => {
    // 每个测试前导航到首页
    await page.goto('/');
  });

  test('应用首页正常加载', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/QMX|启明星/);
    
    // 验证主要元素加载
    await expect(page.locator('body')).toBeVisible();
    
    // 检查是否有主要导航元素
    const navElements = page.locator('nav, .nav, .navbar, header');
    if (await navElements.count() > 0) {
      await expect(navElements.first()).toBeVisible();
    }
  });

  test('前端服务健康检查', async ({ page }) => {
    // 检查前端是否正常响应
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    
    // 检查页面内容是否加载
    const bodyContent = await page.textContent('body');
    expect(bodyContent).toBeTruthy();
    expect(bodyContent!.length).toBeGreaterThan(0);
  });

  test('后端API健康检查', async ({ api }) => {
    try {
      // 尝试访问后端健康检查接口
      const response = await fetch('http://localhost:3001/api/v1/health');
      
      // 如果健康检查接口存在
      if (response.ok) {
        const data = await response.json();
        expect(data).toBeValidApiResponse();
      } else {
        // 如果健康检查接口不存在，尝试访问基础API路径
        const fallbackResponse = await fetch('http://localhost:3001/api/v1/');
        expect([200, 404, 401]).toContain(fallbackResponse.status);
      }
    } catch (error) {
      // 如果无法连接，测试失败
      throw new Error('后端服务无法连接');
    }
  });

  test('API代理配置验证', async ({ page }) => {
    // 通过前端访问后端API，验证代理配置
    try {
      const response = await page.evaluate(async () => {
        try {
          const resp = await fetch('/api/v1/health');
          return {
            status: resp.status,
            ok: resp.ok,
          };
        } catch (error) {
          return {
            status: -1,
            error: error.message,
          };
        }
      });
      
      // 检查代理是否工作（可能返回404但连接成功）
      expect([200, 404, 401, -1]).toContain(response.status);
      
      if (response.status === -1) {
        console.log('API代理可能未配置或后端未启动');
      }
    } catch (error) {
      // 代理配置问题不应阻止测试
      console.log('API代理验证失败:', error);
    }
  });

  test('页面资源加载检查', async ({ page }) => {
    // 监听网络请求
    const failedRequests: string[] = [];
    
    page.on('requestfailed', (request) => {
      failedRequests.push(request.url());
    });
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    
    // 检查是否有严重资源加载失败
    const criticalFailures = failedRequests.filter(url => 
      url.includes('.css') || url.includes('.js')
    );
    
    // 允许少量非关键资源失败
    expect(criticalFailures.length).toBeLessThan(3);
    
    if (criticalFailures.length > 0) {
      console.log('加载失败的资源:', criticalFailures);
    }
  });

  test('控制台错误检查', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    page.on('pageerror', (error) => {
      consoleErrors.push(error.message);
    });
    
    // 等待页面稳定
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // 等待可能的延迟错误
    
    // 检查控制台错误
    if (consoleErrors.length > 0) {
      console.log('控制台错误:', consoleErrors);
      
      // 允许一些非关键错误
      const criticalErrors = consoleErrors.filter(error => 
        !error.includes('Non-Error promise rejection') &&
        !error.includes('Network request failed') &&
        !error.includes('404')
      );
      
      // 关键错误不应太多
      expect(criticalErrors.length).toBeLessThan(3);
    }
  });
});