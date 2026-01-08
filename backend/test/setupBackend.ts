/**
 * Test Setup for PostgreSQL/Drizzle ORM
 *
 * This file replaces the MongoDB Memory Server setup with PostgreSQL testing support.
 * Tests use the real database or test database as configured.
 */

import { db } from '../src/db';
import { students } from '../src/db/schema/students';
import { cashTransactions } from '../src/db/schema/cash';
import { installmentPlans, installments } from '../src/db/schema/installments';
import { sql } from 'drizzle-orm';

// 全局测试环境变量
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// 检查数据库连接
export async function setupTestDatabase(): Promise<void> {
  try {
    // 测试数据库连接
    const [result] = await db.select({ val: sql`1` });
    if (result.val !== 1) {
      throw new Error('Database connection test failed');
    }
    console.log('🧪 测试数据库连接已建立');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    throw error;
  }
}

// 清理测试数据库
export async function cleanupTestDatabase(): Promise<void> {
  try {
    // 清理顺序很重要（外键约束）
    await db.delete(installments);
    await db.delete(installmentPlans);
    await db.delete(cashTransactions);
    await db.delete(students);
    console.log('🧹 测试数据库已清理');
  } catch (error) {
    console.warn('[setupBackend] 清理测试数据库时出错:', error);
  }
}

// 清理所有集合/表（在每个测试后使用）
export async function clearAllCollections(): Promise<void> {
  try {
    // 按正确顺序删除（因为有外键约束）
    await db.delete(installments);
    await db.delete(installmentPlans);
    await db.delete(cashTransactions);
    await db.delete(students);
  } catch (error) {
    console.warn('[setupBackend] 清理表时出错:', error);
  }
}

// 重置所有计数器序列
// PostgreSQL 使用 SERIAL/IDENTITY 自动生成ID，不需要手动序列重置
export async function resetAllSequences(): Promise<void> {
  // PostgreSQL 的序列是自动管理的，不需要手动重置
  // 如果需要在测试间重置ID，可以使用 TRUNCATE ... RESTART IDENTITY
  try {
    await db.transaction(async (tx) => {
      await tx.delete(installments);
      await tx.delete(installmentPlans);
      await tx.delete(cashTransactions);
      await tx.delete(students);
    });
  } catch (error) {
    console.warn('[setupBackend] 重置序列时出错:', error);
  }
}

// 创建测试应用实例
export async function createTestApp() {
  console.log('=== createTestApp: 开始创建最小化测试应用 ===');

  // 创建最小化的Express应用用于测试
  const express = await import('express');
  const app = express.default();

  // 基本中间件
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 测试健康检查端点
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: '测试应用正常运行' });
  });

  // 创建Promise来跟踪路由加载完成
  const routesLoaded = new Promise<void>((resolve, reject) => {
    setTimeout(async () => {
      try {
        console.log('=== createTestApp: 开始加载实际路由 ===');

        // 加载错误处理中间件
        const { errorHandler } = await import('../src/middleware/errorHandler');

        // 加载路由
        const routes = await import('../src/routes');
        app.use('/api/v1', routes.default);

        // 注册错误处理中间件（必须在所有路由之后）
        app.use(errorHandler);

        console.log('=== createTestApp: 路由加载完成 ===');
        resolve();
      } catch (error) {
        console.error('=== createTestApp: 路由加载失败:', error);
        reject(error);
      }
    }, 200);
  });

  console.log('=== createTestApp: 最小化应用创建完成 ===');

  // 等待路由加载完成
  await routesLoaded;

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
      .classType(overrides.classType || overrides.class || ClassType.MONTH)
      .subject(overrides.subject || SubjectType.SHOOTING);

    if (overrides.rings) {
      builder.rings(overrides.rings);
    }

    if (overrides.membership) {
      builder.membership(overrides.membership);
    }

    if (overrides.age !== undefined) {
      builder.age(overrides.age);
    }

    if (overrides.lessonLeft !== undefined) {
      builder.lessonLeft(overrides.lessonLeft);
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
    const { InstallmentPlanRepository } = await import('../src/db/repositories/installmentRepository');

    return await InstallmentPlanRepository.create({
      studentId: overrides.studentId ?? null,
      totalAmount: totalAmount * 100, // 转换为分
      downPayment: 0,
      totalInstallments,
      frequency,
      customDays: overrides.customDays,
      startDate,
      note: undefined,
    });
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
    const { InstallmentRepository } = await import('../src/db/repositories/installmentRepository');

    return await InstallmentRepository.create({
      planId,
      studentId,
      installmentNumber,
      installmentAmount: amount * 100, // 转换为分
      dueDate,
      status,
      note: undefined,
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
