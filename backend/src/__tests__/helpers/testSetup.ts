import { db } from '@/db';
import { students } from '@/db/schema/students';
import { cashTransactions } from '@/db/schema/cash';
import { installmentPlans, installments, InstallmentStatus } from '@/db/schema/installments';
import { sql } from 'drizzle-orm';
import { StudentBuilder } from '@/services/studentBuilder';
import { CashBuilder } from '@/services/cashBuilder';
import { ClassType, SubjectType, PaymentFrequency } from '@/types';

export interface TestContext {
  db: typeof db;
}

export async function setupTestDatabase(): Promise<void> {
  // PostgreSQL 不需要特殊设置，连接已在 db/index.ts 中配置
  // 测试时会使用真实的 DATABASE_URL 或环境变量
}

export async function cleanupTestDatabase(): Promise<void> {
  // 清理数据
  await clearAllCollections();
}

export async function clearAllCollections(): Promise<void> {
  try {
    // 按正确顺序删除（因为有外键约束）
    await db.delete(installments);
    await db.delete(installmentPlans);
    await db.delete(cashTransactions);
    await db.delete(students);
  } catch (error) {
    console.warn('[testSetup] Failed to clear collections', error);
  }
}

export async function resetAllSequences(): Promise<void> {
  // PostgreSQL 使用 serial/identity，不需要手动重置序列
}

export async function createTestStudent(
  overrides: {
    name?: string;
    phone?: string;
    class?: ClassType;
    classType?: ClassType;
    subject?: SubjectType;
    rings?: number[];
    membership?: { startDate: Date; endDate: Date } | null;
    age?: number | null;
    lessonLeft?: number;
  } = {}
) {
  const builder = StudentBuilder.create()
    .name(overrides.name || 'Test Student')
    .phone(overrides.phone || '13800138000')
    .classType(overrides.classType || overrides.class || ClassType.MONTH)
    .subject(overrides.subject || SubjectType.SHOOTING);

  if (overrides.age !== undefined) {
    builder.age(overrides.age);
  }

  if (overrides.lessonLeft !== undefined) {
    builder.lessonLeft(overrides.lessonLeft);
  }

  if (overrides.rings) {
    builder.rings(overrides.rings);
  }

  if (overrides.membership) {
    builder.membership(overrides.membership.startDate, overrides.membership.endDate);
  }

  return await builder.build();
}

export async function createTestCashTransaction(
  amount: number,
  studentId?: number | null,
  note?: string
) {
  const builder = CashBuilder.create().amount(amount);

  if (studentId !== undefined) {
    builder.studentId(studentId);
  }

  if (note) {
    builder.note(note);
  }

  return await builder.build();
}

export async function createTestInstallmentPlan(
  totalAmount: number,
  totalInstallments: number,
  frequency: PaymentFrequency,
  startDate: Date,
  studentId?: number | null,
  customDays?: number
) {
  const { InstallmentPlanRepository } = await import('@/db/repositories/installmentRepository');
  return await InstallmentPlanRepository.create({
    studentId: studentId ?? null,
    totalAmount: totalAmount * 100, // 转换为分
    downPayment: 0,
    totalInstallments,
    frequency,
    customDays,
    startDate: startDate.toISOString().split('T')[0],
    note: undefined,
  });
}

export async function createTestInstallment(
  planId: number,
  studentId: number | null,
  installmentNumber: number,
  totalInstallments: number,
  amount: number,
  dueDate: Date,
  status: keyof typeof InstallmentStatus = 'PENDING'
) {
  const { InstallmentRepository } = await import('@/db/repositories/installmentRepository');
  return await InstallmentRepository.create({
    planId,
    studentId,
    installmentNumber,
    installmentAmount: amount * 100, // 转换为分
    dueDate: dueDate.toISOString().split('T')[0],
    status,
    note: undefined,
  });
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
