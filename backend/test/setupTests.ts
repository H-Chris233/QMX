import mongoose from 'mongoose';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllCollections,
  resetAllSequences,
  TestDataFactory,
  dateUtils,
  testUtils,
} from './setupBackend';

// 确保测试环境使用 UTC 时区
process.env.TZ = 'UTC';

// 每个测试后的清理 - 暂时禁用以避免并发问题
// 测试应该自己管理数据库生命周期

// 全局导出测试工具，方便测试文件使用
(global as any).testUtils = testUtils;
(global as any).dateUtils = dateUtils;
(global as any).TestDataFactory = TestDataFactory;

// 扩展 Jest 匹配器
expect.extend({
  // 检查是否为有效的 ObjectId
  toBeValidObjectId(received: string) {
    try {
      const { ObjectId } = require('mongoose');
      const isValid = ObjectId.isValid(received);
      
      if (isValid) {
        return {
          message: () => `expected ${received} not to be a valid ObjectId`,
          pass: true,
        };
      } else {
        return {
          message: () => `expected ${received} to be a valid ObjectId`,
          pass: false,
        };
      }
    } catch (error) {
      return {
        message: () => `failed to validate ObjectId: ${error}`,
        pass: false,
      };
    }
  },

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

  // 检查日期是否为 UTC 格式
  toBeUTCDate(received: string) {
    const date = new Date(received);
    const isValid = !isNaN(date.getTime());
    const isUTC = received.endsWith('Z');
    
    if (isValid && isUTC) {
      return {
        message: () => `expected ${received} not to be a valid UTC date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UTC date string`,
        pass: false,
      };
    }
  },
});

// 声明全局扩展
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidObjectId(): R;
      toBeInCents(): R;
      toBeUTCDate(): R;
    }
  }
}