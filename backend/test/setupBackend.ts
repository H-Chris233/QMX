import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// 全局测试环境变量
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // 减少测试时的日志噪音

// 全局变量
let mongoServer: MongoMemoryServer | null = null;

// MongoDB 内存服务器配置
const mongoConfig = {
  instance: {
    dbName: 'qmx-test-db',
    port: 27018, // 固定端口避免冲突
  },
  binary: {
    version: '7.0.0', // 固定版本确保稳定性
  },
  autoStart: false,
};

// 启动内存 MongoDB 服务器
export async function setupTestDatabase(): Promise<string> {
  if (mongoServer) {
    return mongoServer.getUri();
  }

  mongoServer = await MongoMemoryServer.create(mongoConfig);
  const uri = mongoServer.getUri();
  
  // 连接到测试数据库
  await mongoose.connect(uri, {
    dbName: 'qmx-test-db',
    maxPoolSize: 1, // 测试时使用较小的连接池
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 10000,
  });

  console.log(`🧪 测试数据库已启动: ${uri}`);
  return uri;
}

// 清理测试数据库
export async function cleanupTestDatabase(): Promise<void> {
  try {
    // 首先断开 mongoose 连接
    if (mongoose.connection.readyState !== 0) {
      console.log('[setupBackend] 正在断开 mongoose 连接...');
      await Promise.race([
        mongoose.disconnect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Disconnect timeout')), 5000)
        )
      ]).catch(err => {
        console.warn('[setupBackend] 断开连接时出错:', err.message);
      });
    }
    
    // 然后停止 MongoDB 服务器
    if (mongoServer) {
      console.log('[setupBackend] 正在停止 MongoDB 服务器...');
      await Promise.race([
        mongoServer.stop(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Stop timeout')), 5000)
        )
      ]).catch(err => {
        console.warn('[setupBackend] 停止 MongoDB 时出错:', err.message);
      });
      mongoServer = null;
    }
    
    console.log('🧹 测试数据库已清理');
  } catch (error) {
    console.warn('[setupBackend] 清理测试数据库时出错:', error);
  }
}

// 清理所有集合（在每个测试后使用）
export async function clearAllCollections(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  try {
    const collections = mongoose.connection.collections;
    const promises = Object.values(collections).map(collection => 
      collection.deleteMany({})
    );
    await Promise.all(promises);
  } catch (error) {
    console.warn('[setupBackend] 清理集合时出错:', error);
  }
}

// 重置所有计数器序列
export async function resetAllSequences(): Promise<void> {
  try {
    const { resetSequence } = await import('../src/models/counter');
    const { 
      STUDENT_SEQUENCE_NAME, 
      CASH_SEQUENCE_NAME, 
      INSTALLMENT_SEQUENCE_NAME, 
      INSTALLMENT_PLAN_SEQUENCE_NAME 
    } = await import('../src/models/counter');

    await Promise.all([
      resetSequence(STUDENT_SEQUENCE_NAME, 0),
      resetSequence(CASH_SEQUENCE_NAME, 0),
      resetSequence(INSTALLMENT_SEQUENCE_NAME, 0),
      resetSequence(INSTALLMENT_PLAN_SEQUENCE_NAME, 0),
    ]);
  } catch (error) {
    console.warn('[setupBackend] 重置序列时出错:', error);
  }
}

// 创建测试应用实例
export async function createTestApp() {
  const { createApp } = await import('../src/app');
  
  // 创建测试专用应用实例
  const app = createApp({
    server: {
      nodeEnv: 'test',
      port: 0, // 使用随机端口
      corsOrigin: '*',
    },
    logging: {
      level: 'error',
      file: './logs/test.log',
    },
  });

  return app;
}

// 种子数据工厂
export class TestDataFactory {
  static async createStudent(overrides: any = {}) {
    const { StudentBuilder } = await import('../src/services/studentBuilder');
    const { ClassType, SubjectType } = await import('../src/types');
    
    const builder = StudentBuilder.create()
      .name(overrides.name || 'Test Student')
      .phone(overrides.phone || '13800138000')
      .class(overrides.class || ClassType.MONTH)
      .subject(overrides.subject || SubjectType.SHOOTING);

    if (overrides.rings) {
      builder.rings(overrides.rings);
    }

    if (overrides.membership) {
      builder.membership(overrides.membership);
    }

    return await builder.build();
  }

  static async createCashTransaction(amount: number, overrides: any = {}) {
    const { CashBuilder } = await import('../src/services/cashBuilder');
    
    const builder = CashBuilder.create().amount(amount);

    if (overrides.studentId !== undefined) {
      builder.studentId(overrides.studentId);
    }

    if (overrides.note) {
      builder.note(overrides.note);
    }

    return await builder.build();
  }

  static async createInstallmentPlan(
    totalAmount: number,
    totalInstallments: number,
    frequency: any,
    startDate: Date,
    overrides: any = {}
  ) {
    const { InstallmentPlan } = await import('../src/models/InstallmentPlanMongo');
    
    const payload = {
      student_id: overrides.studentId ?? null,
      total_amount: totalAmount * 100, // 转换为分
      total_installments: totalInstallments,
      frequency,
      start_date: startDate,
      custom_days: overrides.customDays,
    };

    return await InstallmentPlan.create(payload);
  }

  static async createInstallment(
    planId: number,
    studentId: number | null,
    installmentNumber: number,
    totalInstallments: number,
    amount: number,
    dueDate: Date,
    status: any
  ) {
    const { Installment } = await import('../src/models/InstallmentMongo');
    
    return await Installment.create({
      plan_id: planId,
      student_id: studentId,
      current_installment: installmentNumber,
      total_installments: totalInstallments,
      installment_amount: amount * 100, // 转换为分
      due_date: dueDate,
      status,
    });
  }
}

// 日期工具函数
export const dateUtils = {
  addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },

  addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  },

  toUTCString(date: Date): string {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();
  },

  // 固定测试时间，避免时区问题
  fixedTestDate: new Date('2024-01-01T00:00:00.000Z'),
};

// Jest 全局设置
export const jestGlobalSetup = async () => {
  await setupTestDatabase();
};

export const jestGlobalTeardown = async () => {
  await cleanupTestDatabase();
};

// 测试工具函数
export const testUtils = {
  // 等待异步操作完成
  async waitFor(ms: number = 100): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // 生成随机测试数据
  randomPhone(): string {
    return `138${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
  },

  randomName(): string {
    const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
    return names[Math.floor(Math.random() * names.length)];
  },

  // 生成随机金额
  randomAmount(min: number = 10, max: number = 1000): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
};

// 导出所有工具
export default {
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllCollections,
  resetAllSequences,
  createTestApp,
  TestDataFactory,
  dateUtils,
  testUtils,
  jestGlobalSetup,
  jestGlobalTeardown,
};