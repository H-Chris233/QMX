import StatsService from '@/services/statsService';
import { CashRepository } from '@/db/repositories/cashRepository';
import { InstallmentPlanRepository, InstallmentRepository } from '@/db/repositories/installmentRepository';
import { StudentRepository } from '@/db/repositories/studentRepository';
import { StudentBuilder } from '@/services/studentBuilder';
import { CashBuilder } from '@/services/cashBuilder';
import {
  ClassType,
  SubjectType,
  PaymentFrequency,
  InstallmentStatus,
  MembershipStatus,
} from '@/types';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllCollections,
  resetAllSequences,
  createTestStudent,
  createTestCashTransaction,
  createTestInstallmentPlan,
  createTestInstallment,
  addDays,
} from './helpers/testSetup';

jest.setTimeout(30000);

describe('StatsService', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await clearAllCollections();
    await resetAllSequences();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  const createTestDataset = async () => {
    const membershipStart = new Date();
    membershipStart.setDate(membershipStart.getDate() - 5);
    const membershipEnd = new Date();
    membershipEnd.setDate(membershipEnd.getDate() + 5);

    const activeStudent = await StudentBuilder.create()
      .name('Alice Active')
      .class(ClassType.MONTH)
      .subject(SubjectType.SHOOTING)
      .phone('13800000001')
      .rings([8.4, 9.1])
      .membership(membershipStart, membershipEnd)
      .build();

    const trialStudent = await StudentBuilder.create()
      .name('Tom Trial')
      .class(ClassType.TEN_TRY)
      .subject(SubjectType.ARCHERY)
      .phone('13800000002')
      .rings([6.2])
      .build();

    const otherStudent = await StudentBuilder.create()
      .name('Olivia Other')
      .class(ClassType.OTHERS)
      .subject(SubjectType.SHOOTING)
      .phone('13800000003')
      .build();

    // 创建交易记录
    await CashBuilder.create().amount(500).studentId(activeStudent.uid).note('Tuition').build();
    await CashBuilder.create().amount(300).studentId(trialStudent.uid).note('Course').build();
    await CashBuilder.create().amount(150).studentId(activeStudent.uid).note('Equipment').build();
    await CashBuilder.create().amount(-120).note('Rent').build();

    // 创建分期计划
    const plan = await createTestInstallmentPlan(
      800, // 总金额（元）
      4,   // 期数
      PaymentFrequency.MONTHLY,
      new Date(),
      activeStudent.uid
    );

    const overdueDueDate = addDays(new Date(), -10);

    await createTestInstallment(
      plan.uid,
      activeStudent.uid,
      1,
      4,
      200, // 每期金额（元）
      overdueDueDate,
      InstallmentStatus.PENDING
    );

    await createTestInstallment(
      plan.uid,
      activeStudent.uid,
      2,
      4,
      200, // 每期金额（元）
      new Date(),
      InstallmentStatus.PAID
    );

    return { activeStudent, trialStudent, otherStudent, plan };
  };

  it('aggregates dashboard statistics using cents precision', async () => {
    await createTestDataset();

    const stats = await StatsService.buildDashboardStats();

    expect(stats.totalStudents).toBe(3);
    expect(stats.totalRevenueCents).toBe(95000); // 500 + 300 + 150
    expect(stats.totalExpenseCents).toBe(12000);
    expect(stats.netIncomeCents).toBe(83000);
    expect(stats.averageScore).toBeCloseTo(7.9, 1);
    expect(stats.maxScore).toBeCloseTo(9.1, 1);
    expect(stats.activeCourses).toBe(2);
    expect(stats.activeMembers).toBe(1);
    expect(stats.activeInstallmentPlans).toBe(1);
    expect(stats.overdueInstallmentCount).toBe(1);
  });

  it('returns detailed student statistics with membership summary', async () => {
    const { activeStudent } = await createTestDataset();

    const stats = await StatsService.buildStudentStats(activeStudent.uid);

    expect(stats.studentUid).toBe(activeStudent.uid);
    expect(stats.payments.totalAmountCents).toBe(65000); // 500 + 150
    expect(stats.payments.count).toBe(2);

    expect(stats.scores.average).toBeCloseTo(8.8, 1);
    expect(stats.scores.max).toBeCloseTo(9.1, 1);
    expect(stats.scores.min).toBeCloseTo(8.4, 1);
    expect(stats.scores.count).toBe(2);

    expect(stats.membership.status).toBe(MembershipStatus.ACTIVE);
    expect(stats.membership.daysRemaining).toBeGreaterThan(0);
    expect(stats.membership.isActive).toBe(true);

    expect(stats.installments.totalAmountCents).toBe(80000);
    expect(stats.installments.paidAmountCents).toBe(20000);
    expect(stats.installments.pendingAmountCents).toBe(20000);
    expect(stats.installments.pendingCount).toBe(1);
    expect(stats.installments.remainingAmountCents).toBe(60000);
  });

  it('computes financial statistics for the given period', async () => {
    const { activeStudent, trialStudent } = await createTestDataset();

    const stats = await StatsService.buildFinancialStats('ThisMonth');

    expect(stats.period).toBe('ThisMonth');
    expect(stats.dateRange.start).toBeInstanceOf(Date);
    expect(stats.dateRange.end).toBeInstanceOf(Date);
    expect(stats.dateRange.end.getTime()).toBeGreaterThan(stats.dateRange.start.getTime());

    expect(stats.totals.incomeCents).toBe(95000);
    expect(stats.totals.expenseCents).toBe(12000);
    expect(stats.totals.netIncomeCents).toBe(83000);
    expect(stats.totals.isProfitable).toBe(true);

    expect(stats.installments.totalCents).toBe(80000);
    expect(stats.installments.paidCents).toBe(20000);
    expect(stats.installments.pendingCents).toBe(20000);
    expect(stats.installments.remainingCents).toBe(60000);

    expect(stats.transactionCount).toBe(4);
    expect(stats.studentIncome.length).toBe(2);
    expect(stats.studentIncome[0]).toEqual({
      studentId: activeStudent.uid,
      studentName: 'Alice Active',
      amountCents: 65000,
    });
    expect(stats.studentIncome[1]).toEqual({
      studentId: trialStudent.uid,
      studentName: 'Tom Trial',
      amountCents: 30000,
    });
  });
});
