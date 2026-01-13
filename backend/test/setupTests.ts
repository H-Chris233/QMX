/**
 * Test Setup for PostgreSQL/Drizzle ORM
 *
 * This file replaces the MongoDB Memory Server setup with PostgreSQL testing support.
 * Tests use the real database or test database as configured.
 */

// 确保测试环境使用 UTC 时区
process.env.TZ = 'UTC';

// 强制使用 stdout 日志输出，避免文件权限问题
process.env.LOG_STDOUT = 'true';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

import {
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllCollections,
  resetAllSequences,
  TestDataFactory,
  dateUtils,
  testUtils,
} from './setupBackend';

// 全局导出测试工具，方便测试文件使用
(global as any).testUtils = testUtils;
(global as any).dateUtils = dateUtils;
(global as any).TestDataFactory = TestDataFactory;

// 扩展 Jest 匹配器
expect.extend({
  // 检查金额是否为分（整数）
  toBeInCents(received: number) {
    const isInteger = Number.isInteger(received);
    const isPositive = received > 0;

    if (isInteger && isPositive) {
      return {
        message: () => `expected ${received} not to be in cents`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a positive integer (cents)`,
        pass: false,
      };
    }
  },

  // 检查日期是否为 YYYY-MM-DD 格式
  toBeISODate(received: string) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const isValid = typeof received === 'string' && dateRegex.test(received);

    if (isValid) {
      return {
        message: () => `expected ${received} not to be a valid ISO date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid ISO date (YYYY-MM-DD)`,
        pass: false,
      };
    }
  },

  // 检查是否为有效的正整数ID (PostgreSQL serial)
  toBeValidId(received: number) {
    const isValid = Number.isInteger(received) && received > 0;

    if (isValid) {
      return {
        message: () => `expected ${received} not to be a valid ID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a positive integer`,
        pass: false,
      };
    }
  },
});

// 声明全局扩展
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInCents(): R;
      toBeISODate(): R;
      toBeValidId(): R;
    }
  }
}