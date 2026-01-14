import { test as base, expect } from '@playwright/test';

/**
 * E2E 测试基础 fixture
 * 提供通用的测试工具和数据准备功能
 */
export const test = base.extend({
  // 自定义页面 fixture
  page: async ({ page }, use) => {
    // 设置页面默认超时
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
    
    // 禁用动画和过渡以提高稳定性
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    // 监听页面错误并记录
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      console.error('页面错误:', error);
      pageErrors.push(error.message);
    });
    
    // 监听控制台错误
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('控制台错误:', msg.text());
        consoleErrors.push(msg.text());
      }
    });
    
    // 监听响应错误
    page.on('response', (response) => {
      if (response.status() >= 500) {
        console.warn(`服务器错误: ${response.url()} (${response.status()})`);
      }
    });
    
    await use(page);
    
    // 清理：输出错误汇总
    if (pageErrors.length > 0) {
      console.log(`测试期间发现 ${pageErrors.length} 个页面错误`);
    }
    if (consoleErrors.length > 0) {
      console.log(`测试期间发现 ${consoleErrors.length} 个控制台错误`);
    }
  },
  
  // 测试数据 fixture - 使用 PostgreSQL Schema 格式
  testData: async ({}, use) => {
    const data = {
      // 示例学生数据（PostgreSQL Schema 格式）
      students: [
        {
          name: '测试学生1',
          phone: '13800138001',
          age: 25,
          classType: 'TEN_TRY', // 枚举: TEN_TRY, MONTH, YEAR, OTHERS
          subject: 'SHOOTING', // 枚举: SHOOTING, ARCHERY, OTHERS
          lessonLeft: 10,
          note: '测试学生1',
        },
        {
          name: '测试学生2',
          phone: '13800138002',
          age: 30,
          classType: 'MONTH',
          subject: 'ARCHERY',
          lessonLeft: 20,
          note: '测试学生2',
        },
      ],

      // 示例财务数据
      transactions: [
        {
          amount: 10000, // 单位：分
          note: '测试学生1学费缴纳',
        },
        {
          amount: -500, // 单位：分，负数表示支出
          note: '测试办公用品购买',
        },
      ],

      // 班级类型枚举
      classTypes: ['TEN_TRY', 'MONTH', 'YEAR', 'OTHERS'],

      // 科目枚举
      subjects: ['SHOOTING', 'ARCHERY', 'OTHERS'],
    };

    await use(data);
  },
  
  // API helper fixture
  api: async ({ page }, use) => {
    const apiHelper = {
      baseURL: 'http://localhost:3001/api/v1',
      
      // 发送API请求
      async request(endpoint: string, options: RequestInit = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          ...options,
        });
        
        if (!response.ok) {
          throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }
        
        return response.json();
      },
      
      // GET请求
      async get(endpoint: string) {
        return this.request(endpoint, { method: 'GET' });
      },
      
      // POST请求
      async post(endpoint: string, data: any) {
        return this.request(endpoint, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },
      
      // PUT请求
      async put(endpoint: string, data: any) {
        return this.request(endpoint, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      },
      
      // DELETE请求
      async delete(endpoint: string) {
        return this.request(endpoint, { method: 'DELETE' });
      },
    };
    
    await use(apiHelper);
  },
});

// 重新导出 expect
export { expect };

// 添加自定义断言
expect.extend({
  // 检查元素是否可见且可交互
  async toBeVisibleAndEnabled(received: any) {
    const isVisible = await received.isVisible();
    const isEnabled = await received.isEnabled();
    
    return {
      pass: isVisible && isEnabled,
      message: () => `元素${isVisible ? '可见' : '不可见'}且${isEnabled ? '可用' : '不可用'}`,
    };
  },
  
  // 检查API响应格式
  toBeValidApiResponse(received: any) {
    const isValid = received && 
                   typeof received === 'object' && 
                   typeof received.success === 'boolean';
    
    return {
      pass: isValid,
      message: () => `响应${isValid ? '是' : '不是'}有效的API响应格式`,
    };
  },
});

// 扩展 expect 类型
declare global {
  namespace PlaywrightTest {
    interface Matchers<R> {
      toBeVisibleAndEnabled(): R;
      toBeValidApiResponse(): R;
    }
  }
}