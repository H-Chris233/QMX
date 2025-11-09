import { beforeAll, afterEach, afterAll, vi, expect } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ApiService } from '@/api/ApiService';
import { setupServer } from 'msw/node';
import { defaultHandlers, allHandlers } from './mocks/msw/handlers';

/**
 * 全局测试设置
 * - 初始化 Pinia 状态管理
 * - Mock 浏览器 API
 * - Mock 定时器
 * - 设置 MSW 服务器
 * - 抑制控制台噪音
 */

// 确保测试环境使用 UTC 时区
process.env.TZ = 'UTC';

// MSW 服务器设置 - 使用所有处理器包括错误场景
const mswServer = setupServer(...allHandlers);

// Mock 浏览器 API
const mockBrowserAPIs = () => {
  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock URL.createObjectURL
  if (typeof URL.createObjectURL === 'undefined') {
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'mock-url'),
      writable: true,
    });
  }

  // Mock URL.revokeObjectURL
  if (typeof URL.revokeObjectURL === 'undefined') {
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      writable: true,
    });
  }

  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock getComputedStyle
  Object.defineProperty(window, 'getComputedStyle', {
    value: vi.fn(() => ({
      getPropertyValue: vi.fn(() => ''),
    })),
  });

  // Mock scrollTo
  Object.defineProperty(window, 'scrollTo', {
    value: vi.fn(),
  });

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });

  // Mock sessionStorage
  const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
  });
};

// 控制台噪音抑制
const suppressConsoleNoise = () => {
  // 保存原始方法
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  // Mock console.error 以抑制预期的错误
  console.error = (...args: any[]) => {
    // 如果是测试预期的错误，则不输出
    const message = args[0];
    if (
      typeof message === 'string' && (
        message.includes('获取学员列表失败') ||
        message.includes('删除学员失败') ||
        message.includes('Network error') ||
        message.includes('Permission denied')
      )
    ) {
      return;
    }
    originalConsoleError(...args);
  };

  // Mock console.warn 以抑制预期的警告
  console.warn = (...args: any[]) => {
    // 可以在这里添加需要抑制的警告条件
    originalConsoleWarn(...args);
  };

  // 恢复函数
  return () => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  };
};

beforeAll(() => {
  // 设置固定时间以避免时间敏感性
  vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  
  // Mock 浏览器 API
  mockBrowserAPIs();
  
  // 抑制控制台噪音
  const restoreConsole = suppressConsoleNoise();
  
  // 启动 MSW 服务器
  mswServer.listen({ 
    onUnhandledRequest: 'error',
  });
  
  // 初始化 Pinia
  setActivePinia(createPinia());
  
  // 在 afterAll 中恢复控制台
  afterAll(() => {
    restoreConsole();
  });
});

afterEach(() => {
  // 重置 MSW 处理器
  mswServer.resetHandlers();
  
  // 重置所有 mock
  vi.clearAllMocks();
  
  // 重置定时器
  vi.useRealTimers();
  
  // 清理 DOM
  document.body.innerHTML = '';
  
  // 重置模块注册表以避免状态泄漏
  vi.resetModules();
});

afterAll(() => {
  // 恢复真实时间
  vi.useRealTimers();
  
  // 关闭 MSW 服务器
  mswServer.close();
});

/**
 * 默认情况下不全局 mock ApiService。
 * 各测试文件可根据需要使用 vi.spyOn 单独 mock。
 */

// 导出 mswServer 用于测试中访问
export { mswServer };

// 导出辅助函数
export const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

// 导出等待 DOM 更新的辅助函数
export const waitForDOMUpdate = () => vi.waitFor(() => expect(document.body).toBeDefined());
