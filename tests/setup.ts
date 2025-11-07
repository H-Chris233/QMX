import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ApiService } from '@/api/ApiService';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/msw/handlers';

/**
 * 全局测试设置
 * - 初始化 Pinia 状态管理
 * - Mock AppStore
 * - Mock ApiService
 * - 设置 MSW 服务器
 */

// MSW 服务器设置
const mswServer = setupServer(...handlers);

beforeAll(() => {
  // 启动 MSW 服务器
  mswServer.listen({ onUnhandledRequest: 'error' });
  
  // 初始化 Pinia
  setActivePinia(createPinia());
});

afterEach(() => {
  // 重置 MSW 处理器
  mswServer.resetHandlers();
  
  // 重置所有 mock
  vi.clearAllMocks();
});

afterAll(() => {
  // 关闭 MSW 服务器
  mswServer.close();
});

/**
 * 默认情况下不全局 mock ApiService。
 * 各测试文件可根据需要使用 vi.spyOn 单独 mock。
 */

// 导出 mswServer 用于测试中访问
export { mswServer };
