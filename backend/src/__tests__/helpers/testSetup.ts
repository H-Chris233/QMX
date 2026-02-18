/**
 * Test Setup Helpers for PostgreSQL/Drizzle ORM
 *
 * Unified test utilities for all test files.
 * Replaces MongoDB Memory Server setup with PostgreSQL testing support.
 */

import { db } from '@/db';
import { students } from '@/db/schema/students';
import { cashTransactions } from '@/db/schema/cash';
import { installmentPlans, installments, InstallmentStatus } from '@/db/schema/installments';
import { StudentBuilder } from '@/services/studentBuilder';
import { CashBuilder } from '@/services/cashBuilder';
import { ClassType, SubjectType, PaymentFrequencyValues, InstallmentStatusValues, InstallmentPlanStatusValues } from '@/types';

// Types for test data factory
export interface TestStudentOverrides {
  name?: string;
  phone?: string;
  class?: ClassType;
  classType?: ClassType;
  subject?: SubjectType;
  rings?: number[];
  membership?: { startDate: Date; endDate: Date } | null;
  age?: number | null;
  lessonLeft?: number;
  note?: string;
}

export interface TestCashTransactionOverrides {
  studentId?: number | null;
  note?: string;
  transactionDate?: Date;
}

export interface TestInstallmentPlanOverrides {
  studentId?: number | null;
  customDays?: number;
  downPayment?: number;
  note?: string;
}

export interface TestInstallmentOverrides {
  studentId?: number | null;
  paidAmount?: number;
  paidDate?: Date;
  note?: string;
}

// ============================================
// Database Setup Functions
// ============================================

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

// Alias for backward compatibility
export const clearAllData = clearAllCollections;

export async function resetAllSequences(): Promise<void> {
  // PostgreSQL 使用 serial/identity，不需要手动重置序列
}

// ============================================
// Test Data Factory Functions
// ============================================

/**
 * Creates a test student with optional overrides
 * 注意：手机号必须符合正则 /^1[3-9]\d{9}$/（11位，以1开头，第二位3-9）
 */
export async function createTestStudent(
  overrides: TestStudentOverrides = {},
) {
  // 生成符合格式的测试手机号：11位标准手机号
  const generatePhone = (): string => {
    const prefix = '138'; // 中国移动 prefix
    const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    return prefix + suffix; // 3 + 8 = 11 位
  };

  const builder = StudentBuilder.create()
    .name(overrides.name || 'Test Student')
    .phone(overrides.phone || generatePhone())
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

  if (overrides.note) {
    builder.note(overrides.note);
  }

  return await builder.build();
}

/**
 * Creates multiple test students at once
 */
export async function createTestStudents(
  count: number,
  baseName: string = 'Student',
): Promise<Awaited<ReturnType<typeof createTestStudent>>[]> {
  const students: Awaited<ReturnType<typeof createTestStudent>>[] = [];
  for (let i = 0; i < count; i++) {
    // 生成 11 位手机号：138 + 8 位序号
    const phone = `138${String(i).padStart(8, '0')}`;
    students.push(await createTestStudent({
      name: `${baseName} ${i + 1}`,
      phone,
    }));
  }
  return students;
}

/**
 * Creates a test cash transaction with optional overrides
 */
export async function createTestCashTransaction(
  amount: number,
  studentId?: number | null,
  note?: string,
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

/**
 * Creates multiple test cash transactions at once
 */
export async function createTestCashTransactions(
  amount: number,
  count: number,
  studentId?: number | null,
): Promise<Awaited<ReturnType<typeof createTestCashTransaction>>[]> {
  const transactions: Awaited<ReturnType<typeof createTestCashTransaction>>[] = [];
  for (let i = 0; i < count; i++) {
    transactions.push(await createTestCashTransaction(amount, studentId, `Transaction ${i + 1}`));
  }
  return transactions;
}

/**
 * Creates a test installment plan with optional overrides
 */
export async function createTestInstallmentPlan(
  totalAmount: number,
  totalInstallments: number,
  frequency: keyof typeof PaymentFrequencyValues,
  startDate: Date,
  studentId?: number | null,
  customDays?: number,
) {
  const { InstallmentPlanRepository } = await import('@/db/repositories/installmentRepository');

  // 如果没有提供 studentId，创建一个测试学员
  let finalStudentId = studentId;
  if (finalStudentId === null || finalStudentId === undefined) {
    const testStudent = await createTestStudent({
      name: 'Test Student for Installment',
      phone: `1380000${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
    });
    finalStudentId = testStudent.uid;
  }

  return await InstallmentPlanRepository.create({
    studentId: finalStudentId,
    totalAmount: totalAmount * 100, // 转换为分
    downPayment: 0,
    totalInstallments,
    frequency: PaymentFrequencyValues[frequency],
    customDays,
    startDate: startDate.toISOString().split('T')[0],
    note: undefined,
  });
}

/**
 * Creates a test installment with optional overrides
 */
export async function createTestInstallment(
  planId: number,
  studentId: number | null,
  installmentNumber: number,
  totalInstallments: number,
  amount: number,
  dueDate: Date,
  status: keyof typeof InstallmentStatusValues = 'PENDING',
) {
  const { InstallmentRepository } = await import('@/db/repositories/installmentRepository');

  // 如果没有提供 studentId，创建一个测试学员
  let finalStudentId = studentId;
  if (finalStudentId === null || finalStudentId === undefined) {
    const testStudent = await createTestStudent({
      name: 'Test Student for Installment',
      phone: `1380000${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
    });
    finalStudentId = testStudent.uid;
  }

  const statusValue = typeof status === 'string'
    ? InstallmentStatusValues[status as keyof typeof InstallmentStatusValues]
    : status;

  return await InstallmentRepository.create({
    planId,
    studentId: finalStudentId,
    installmentNumber,
    installmentAmount: amount * 100, // 转换为分
    dueDate: dueDate.toISOString().split('T')[0],
    status: statusValue,
    note: undefined,
  });
}

/**
 * Creates a complete installment plan with all installments
 */
export async function createCompleteInstallmentPlan(
  totalAmount: number,
  totalInstallments: number,
  frequency: keyof typeof PaymentFrequencyValues,
  startDate: Date,
  studentId?: number | null,
) {
  const plan = await createTestInstallmentPlan(
    totalAmount,
    totalInstallments,
    frequency,
    startDate,
    studentId,
  );

  const installmentAmount = totalAmount / totalInstallments;
  const installments: Awaited<ReturnType<typeof createTestInstallment>>[] = [];

  for (let i = 0; i < totalInstallments; i++) {
    const dueDate = new Date(startDate);
    
    switch (frequency) {
      case 'WEEKLY':
        dueDate.setDate(dueDate.getDate() + i * 7);
        break;
      case 'MONTHLY':
        dueDate.setMonth(dueDate.getMonth() + i);
        break;
      case 'CUSTOM': {
        // Use customDays from plan if available, default to 15
        const customDays = 15;
        dueDate.setDate(dueDate.getDate() + i * customDays);
        break;
      }
    }
    
    installments.push(await createTestInstallment(
      plan.uid,
      studentId ?? null,
      i + 1,
      totalInstallments,
      installmentAmount,
      dueDate,
      'PENDING',
    ));
  }

  return { plan, installments };
}

// ============================================
// Date Utility Functions
// ============================================

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

export function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

// ============================================
// Random Data Generators
// ============================================

export function randomPhone(): string {
  // 生成符合正则 /^1[3-9]\d{9}$/ 的随机手机号（11位）
  // 第1位固定为1，第2位为3-9，后面跟8位随机数字
  const secondDigit = String(Math.floor(Math.random() * 7) + 3); // 3-9
  const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0'); // 8位
  return '1' + secondDigit + suffix; // 1 + 1 + 8 = 11 位
}

export function randomName(): string {
  const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'];
  return `${names[Math.floor(Math.random() * names.length)]}${Date.now() % 1000}`;
}

export function randomAmount(min: number = 10, max: number = 1000): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomDate(start: Date = new Date('2024-01-01'), end: Date = new Date()): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// ============================================
// Complete Test Dataset Factory
// ============================================

/**
 * Creates a complete test dataset for integration testing
 * Useful for stats service and dashboard tests
 */
export interface CompleteTestDataset {
  students: {
    activeStudent: Awaited<ReturnType<typeof createTestStudent>>;
    trialStudent: Awaited<ReturnType<typeof createTestStudent>>;
    expiredStudent: Awaited<ReturnType<typeof createTestStudent>>;
  };
  transactions: {
    income1: Awaited<ReturnType<typeof createTestCashTransaction>>;
    income2: Awaited<ReturnType<typeof createTestCashTransaction>>;
    income3: Awaited<ReturnType<typeof createTestCashTransaction>>;
    expense1: Awaited<ReturnType<typeof createTestCashTransaction>>;
    expense2: Awaited<ReturnType<typeof createTestCashTransaction>>;
  };
  installmentPlan: Awaited<ReturnType<typeof createTestInstallmentPlan>>;
  installments: Awaited<ReturnType<typeof createTestInstallment>>[];
}

export async function createCompleteTestDataset(): Promise<CompleteTestDataset> {
  // Create students
  const activeStudent = await createTestStudent({
    name: 'Alice Active',
    phone: '13800000001',
    classType: ClassType.MONTH,
    subject: SubjectType.SHOOTING,
    rings: [9.1, 8.5],
    membership: {
      startDate: addDays(new Date(), -7),
      endDate: addDays(new Date(), 23),
    },
  });

  const trialStudent = await createTestStudent({
    name: 'Tom Trial',
    phone: '13800000002',
    classType: ClassType.TEN_TRY,
    subject: SubjectType.ARCHERY,
    rings: [7.5, 8.0],
  });

  const expiredStudent = await createTestStudent({
    name: 'Expired Student',
    phone: '13800000003',
    classType: ClassType.YEAR,
    subject: SubjectType.SHOOTING,
    membership: {
      startDate: addDays(new Date(), -60),
      endDate: addDays(new Date(), -30),
    },
  });

  // Create transactions
  const income1 = await createTestCashTransaction(500, activeStudent.uid, 'Tuition payment');
  const income2 = await createTestCashTransaction(300, trialStudent.uid, 'Trial lesson');
  const income3 = await createTestCashTransaction(150, activeStudent.uid, 'Additional payment');
  const expense1 = await createTestCashTransaction(-100, null, 'Office supplies');
  const expense2 = await createTestCashTransaction(-200, null, 'Equipment');

  // Create installment plan and installments
  const installmentPlan = await createTestInstallmentPlan(
    800, // 800元 total
    4, // 4 installments
    'MONTHLY',
    addDays(new Date(), -30),
    activeStudent.uid,
  );

  const installments: Awaited<ReturnType<typeof createTestInstallment>>[] = [];

  // Create installments with different statuses
  for (let i = 0; i < 4; i++) {
    const dueDate = addDays(new Date(), -30 + i * 5);
    const status = i < 2 ? 'PAID' : (i === 2 ? 'PENDING' : 'PENDING');
    const paidAmount = i < 2 ? 200 : 0;

    installments.push(await createTestInstallment(
      installmentPlan.uid,
      activeStudent.uid,
      i + 1,
      4,
      200,
      dueDate,
      status,
    ));
  }

  return {
    students: {
      activeStudent,
      trialStudent,
      expiredStudent,
    },
    transactions: {
      income1,
      income2,
      income3,
      expense1,
      expense2,
    },
    installmentPlan,
    installments,
  };
}

// ============================================
// Export all utilities
// ============================================

export default {
  // Database setup
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllCollections,
  clearAllData,
  resetAllSequences,
  
  // Data factory
  createTestStudent,
  createTestStudents,
  createTestCashTransaction,
  createTestCashTransactions,
  createTestInstallmentPlan,
  createTestInstallment,
  createCompleteInstallmentPlan,
  createCompleteTestDataset,
  
  // Date utilities
  addDays,
  addMonths,
  addYears,
  
  // Random generators
  randomPhone,
  randomName,
  randomAmount,
  randomDate,
};
