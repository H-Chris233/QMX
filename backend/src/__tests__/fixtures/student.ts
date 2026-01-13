/**
 * 测试数据工厂
 *
 * 提供创建测试数据的工厂函数
 * 简化测试数据准备工作
 */

import { StudentBuilder } from '@/services/studentBuilder';
import { CashBuilder } from '@/services/cashBuilder';
import { InstallmentPlanRepository, InstallmentRepository } from '@/db/repositories/installmentRepository';
import {
  ClassType,
  SubjectType,
  PaymentFrequency,
  InstallmentStatus,
} from '@/types';
import { addDays, addMonths } from './date';

/**
 * 创建测试学员
 */
export async function createTestStudent(
  options: {
    name?: string;
    phone?: string;
    classType?: ClassType;
    subject?: SubjectType;
    age?: number | null;
    rings?: number[];
    lessonLeft?: number;
    membership?: { startDate: Date; endDate: Date } | null;
  } = {}
) {
  const builder = StudentBuilder.create()
    .name(options.name || 'Test Student')
    .phone(options.phone || '13800138000')
    .classType(options.classType || ClassType.MONTH)
    .subject(options.subject || SubjectType.SHOOTING);

  if (options.age !== undefined) {
    builder.age(options.age);
  }

  if (options.lessonLeft !== undefined) {
    builder.lessonLeft(options.lessonLeft);
  }

  if (options.rings) {
    builder.rings(options.rings);
  }

  if (options.membership) {
    builder.membership(options.membership.startDate, options.membership.endDate);
  }

  return await builder.build();
}

/**
 * 创建测试交易记录
 */
export async function createTestTransaction(
  amount: number,
  options: {
    studentId?: number | null;
    note?: string;
  } = {}
) {
  const builder = CashBuilder.create().amount(amount);

  if (options.studentId !== undefined) {
    builder.studentId(options.studentId);
  }

  if (options.note) {
    builder.note(options.note);
  }

  return await builder.build();
}

/**
 * 创建测试分期计划
 */
export async function createTestInstallmentPlan(
  totalAmount: number,      // 单位：元
  totalInstallments: number,
  frequency: PaymentFrequency,
  startDate: Date,
  options: {
    studentId?: number | null;
    customDays?: number;
    note?: string;
  } = {}
) {
  return await InstallmentPlanRepository.create({
    studentId: options.studentId ?? null,
    totalAmount: totalAmount * 100, // 转换为分
    downPayment: 0,
    totalInstallments,
    frequency,
    customDays: options.customDays,
    startDate: startDate.toISOString().split('T')[0],
    note: options.note ?? undefined,
  });
}

/**
 * 创建测试分期记录
 */
export async function createTestInstallment(
  planId: number,
  studentId: number | null,
  installmentNumber: number,
  totalInstallments: number,
  amount: number,           // 单位：元
  dueDate: Date,
  status: keyof typeof InstallmentStatus = 'PENDING'
) {
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

/**
 * 创建一套完整的测试数据集
 * 用于仪表盘统计等复杂测试场景
 */
export async function createCompleteTestDataset() {
  const membershipStart = new Date();
  membershipStart.setDate(membershipStart.getDate() - 5);
  const membershipEnd = new Date();
  membershipEnd.setDate(membershipEnd.getDate() + 5);

  // 有会员的学员（射击）
  const activeStudent = await createTestStudent({
    name: 'Alice Active',
    classType: ClassType.MONTH,
    subject: SubjectType.SHOOTING,
    phone: '13800000001',
    rings: [8.4, 9.1],
    membership: { startDate: membershipStart, endDate: membershipEnd },
  });

  // 试课学员（射箭）
  const trialStudent = await createTestStudent({
    name: 'Tom Trial',
    classType: ClassType.TEN_TRY,
    subject: SubjectType.ARCHERY,
    phone: '13800000002',
    rings: [6.2],
  });

  // 其他类型学员
  const otherStudent = await createTestStudent({
    name: 'Olivia Other',
    classType: ClassType.OTHERS,
    subject: SubjectType.SHOOTING,
    phone: '13800000003',
  });

  // 创建交易记录
  await createTestTransaction(500, { studentId: activeStudent.uid, note: 'Tuition' });
  await createTestTransaction(300, { studentId: trialStudent.uid, note: 'Course' });
  await createTestTransaction(150, { studentId: activeStudent.uid, note: 'Equipment' });
  await createTestTransaction(-120, { note: 'Rent' }); // 支出

  // 创建分期计划
  const plan = await createTestInstallmentPlan(
    800, // 总金额（元）
    4,   // 期数
    PaymentFrequency.MONTHLY,
    new Date(),
    { studentId: activeStudent.uid }
  );

  // 创建分期记录（一个有逾期的）
  const overdueDueDate = addDays(new Date(), -10);
  await createTestInstallment(
    plan.uid,
    activeStudent.uid,
    1,
    4,
    200, // 每期金额（元）
    overdueDueDate,
    'PENDING'
  );

  await createTestInstallment(
    plan.uid,
    activeStudent.uid,
    2,
    4,
    200,
    new Date(),
    'PAID'
  );

  return { activeStudent, trialStudent, otherStudent, plan };
}
