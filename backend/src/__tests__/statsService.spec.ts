import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import StatsService from '@/services/statsService';
import { CashClass, Cash } from '@/models/CashMongo';
import { Installment, InstallmentModel } from '@/models/InstallmentMongo';
import { InstallmentPlan, InstallmentPlanModel } from '@/models/InstallmentPlanMongo';
import { studentModel } from '@/models/mongo';
import { StudentBuilder } from '@/services/studentBuilder';
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
  TestDataFactory, 
  dateUtils 
} from '../../test/setupBackend';

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
      .membership({ startDate: membershipStart, endDate: membershipEnd })
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

    await CashClass.create({ student_id: activeStudent.uid, cash: 50_000, note: 'Tuition' });
    await CashClass.create({ student_id: trialStudent.uid, cash: 30_000, note: 'Course' });
    await CashClass.create({ student_id: activeStudent.uid, cash: 15_000, note: 'Equipment' });
    await CashClass.create({ cash: -12_000, note: 'Rent' });

    const plan = await InstallmentPlan.create({
      student_id: activeStudent.uid,
      total_amount: 80_000,
      total_installments: 4,
      frequency: PaymentFrequency.MONTHLY,
      start_date: new Date(),
    });

    const overdueDueDate = new Date();
    overdueDueDate.setDate(overdueDueDate.getDate() - 10);

    await Installment.create({
      plan_id: plan.uid,
      installment_amount: 20_000,
      current_installment: 1,
      total_installments: 4,
      due_date: overdueDueDate,
      status: InstallmentStatus.PENDING,
      student_id: activeStudent.uid,
    });

    await Installment.create({
      plan_id: plan.uid,
      installment_amount: 20_000,
      current_installment: 2,
      total_installments: 4,
      due_date: new Date(),
      status: InstallmentStatus.PAID,
      paid_amount: 20_000,
      paid_at: new Date(),
      student_id: activeStudent.uid,
    });

    return { activeStudent, trialStudent, otherStudent, plan };
  };

  it('aggregates dashboard statistics using cents precision', async () => {
    await createTestDataset();

    const stats = await StatsService.buildDashboardStats();

    expect(stats.totalStudents).toBe(3);
    expect(stats.totalRevenueCents).toBe(95_000);
    expect(stats.totalExpenseCents).toBe(12_000);
    expect(stats.netIncomeCents).toBe(83_000);
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
    expect(stats.payments.totalAmountCents).toBe(65_000);
    expect(stats.payments.count).toBe(2);

    expect(stats.scores.average).toBeCloseTo(8.8, 1);
    expect(stats.scores.max).toBeCloseTo(9.1, 1);
    expect(stats.scores.min).toBeCloseTo(8.4, 1);
    expect(stats.scores.count).toBe(2);

    expect(stats.membership.status).toBe(MembershipStatus.ACTIVE);
    expect(stats.membership.label.startsWith('会员即将到期')).toBe(true);
    expect(stats.membership.daysRemaining).toBeGreaterThan(0);
    expect(stats.membership.isActive).toBe(true);

    expect(stats.installments.totalAmountCents).toBe(80_000);
    expect(stats.installments.paidAmountCents).toBe(20_000);
    expect(stats.installments.pendingAmountCents).toBe(20_000);
    expect(stats.installments.pendingCount).toBe(1);
    expect(stats.installments.remainingAmountCents).toBe(60_000);
  });

  it('computes financial statistics for the given period', async () => {
    const { activeStudent, trialStudent } = await createTestDataset();

    const stats = await StatsService.buildFinancialStats('ThisMonth');

    expect(stats.period).toBe('ThisMonth');
    expect(stats.dateRange.start).toBeInstanceOf(Date);
    expect(stats.dateRange.end).toBeInstanceOf(Date);
    expect(stats.dateRange.end.getTime()).toBeGreaterThan(stats.dateRange.start.getTime());

    expect(stats.totals.incomeCents).toBe(95_000);
    expect(stats.totals.expenseCents).toBe(12_000);
    expect(stats.totals.netIncomeCents).toBe(83_000);
    expect(stats.totals.isProfitable).toBe(true);

    expect(stats.installments.totalCents).toBe(80_000);
    expect(stats.installments.paidCents).toBe(20_000);
    expect(stats.installments.pendingCents).toBe(20_000);
    expect(stats.installments.remainingCents).toBe(60_000);

    expect(stats.transactionCount).toBe(4);
    expect(stats.studentIncome).toHaveLength(2);
    expect(stats.studentIncome[0]).toEqual({
      studentId: activeStudent.uid,
      studentName: 'Alice Active',
      amountCents: 65_000,
    });
    expect(stats.studentIncome[1]).toEqual({
      studentId: trialStudent.uid,
      studentName: 'Tom Trial',
      amountCents: 30_000,
    });
  });
});
