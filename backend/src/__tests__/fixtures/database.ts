/**
 * 测试数据库配置
 *
 * 提供统一的数据库设置和清理逻辑
 * 所有集成测试使用真实的 PostgreSQL 数据库
 */

import { db } from '@/db';
import { students } from '@/db/schema/students';
import { cashTransactions } from '@/db/schema/cash';
import { installmentPlans, installments } from '@/db/schema/installments';

/**
 * 设置测试数据库
 * PostgreSQL 使用真实的数据库连接，测试时使用测试数据库
 */
export async function setupTestDatabase(): Promise<void> {
  // PostgreSQL 连接已在 db/index.ts 中配置
  // 通过环境变量 DATABASE_URL 区分测试数据库
  // 无需额外设置
}

/**
 * 清理测试数据库
 * 按正确顺序删除（因为有外键约束）
 */
export async function cleanupTestDatabase(): Promise<void> {
  await clearAllData();
}

/**
 * 清空所有测试数据
 */
export async function clearAllData(): Promise<void> {
  try {
    // 按正确顺序删除（因为有外键约束）
    await db.delete(installments);
    await db.delete(installmentPlans);
    await db.delete(cashTransactions);
    await db.delete(students);
  } catch (error) {
    console.warn('[testFixtures] Failed to clear collections', error);
  }
}

/**
 * 获取测试数据库实例
 */
export function getTestDatabase() {
  return db;
}
