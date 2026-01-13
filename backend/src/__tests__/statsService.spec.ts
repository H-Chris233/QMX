/**
 * StatsService 测试
 *
 * 测试统计服务的所有功能：
 * - 仪表盘统计
 * - 学员统计
 * - 财务统计
 */

import StatsService from '@/services/statsService';
import { ClassType, SubjectType, MembershipStatus } from '@/types';
import {
  setupTestDatabase,
  clearAllCollections,
  createCompleteTestDataset,
  createTestStudent,
  createTestCashTransaction,
  addDays,
} from './helpers/testSetup';

describe('StatsService', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await clearAllCollections();
  });

  describe('buildDashboardStats() - 仪表盘统计', () => {
    it('聚合仪表盘统计数据', async () => {
      const { students, transactions, installmentPlan, installments } = await createCompleteTestDataset();

      const stats = await StatsService.buildDashboardStats();

      expect(stats.totalStudents).toBe(3);
      expect(stats.totalRevenueCents).toBe(95000); // 500 + 300 + 150
      expect(stats.totalExpenseCents).toBe(30000); // -100 + -200
      expect(stats.netIncomeCents).toBe(65000);
      expect(stats.averageScore).toBeCloseTo(8.4, 1);
      expect(stats.maxScore).toBeCloseTo(9.1, 1);
      expect(stats.activeCourses).toBe(2); // 试课 + 月卡
      expect(stats.activeMembers).toBe(1);
      expect(stats.activeInstallmentPlans).toBe(1);
      expect(stats.overdueInstallmentCount).toBe(2); // 2 pending installments
    });

    it('处理空数据库', async () => {
      const stats = await StatsService.buildDashboardStats();

      expect(stats.totalStudents).toBe(0);
      expect(stats.totalRevenueCents).toBe(0);
      expect(stats.totalExpenseCents).toBe(0);
      expect(stats.netIncomeCents).toBe(0);
      expect(stats.averageScore).toBe(0);
      expect(stats.activeCourses).toBe(0);
      expect(stats.activeMembers).toBe(0);
    });

    it('正确区分收入和支出', async () => {
      // 创建一些独立交易
      const student = await createTestStudent({ name: 'Revenue Test' });

      await createTestCashTransaction(1000, student.uid, 'Tuition');
      await createTestCashTransaction(-200, null, 'Rent');
      await createTestCashTransaction(-50, null, 'Supplies');

      const stats = await StatsService.buildDashboardStats();

      expect(stats.totalRevenueCents).toBe(100000);
      expect(stats.totalExpenseCents).toBe(25000);
      expect(stats.netIncomeCents).toBe(75000);
    });
  });

  describe('buildStudentStats() - 学员统计', () => {
    it('返回学员完整统计', async () => {
      const { students } = await createCompleteTestDataset();
      const activeStudent = students.activeStudent;

      const stats = await StatsService.buildStudentStats(activeStudent.uid);

      expect(stats.studentUid).toBe(activeStudent.uid);

      // 支付统计
      expect(stats.payments.totalAmountCents).toBe(65000); // 500 + 150
      expect(stats.payments.count).toBe(2);

      // 成绩统计
      expect(stats.scores.average).toBeCloseTo(8.8, 1);
      expect(stats.scores.max).toBeCloseTo(9.1, 1);
      expect(stats.scores.min).toBeCloseTo(8.5, 1);
      expect(stats.scores.count).toBe(2);

      // 会员状态
      expect(stats.membership.status).toBe(MembershipStatus.ACTIVE);
      expect(stats.membership.daysRemaining).toBeGreaterThan(0);
      expect(stats.membership.isActive).toBe(true);

      // 分期统计
      expect(stats.installments.totalAmountCents).toBe(80000);
      expect(stats.installments.paidAmountCents).toBe(40000); // 2 paid installments * 200
      expect(stats.installments.pendingAmountCents).toBe(40000); // 2 pending
      expect(stats.installments.pendingCount).toBe(2);
      expect(stats.installments.remainingAmountCents).toBe(40000);
    });

    it('处理无交易学员', async () => {
      const student = await createTestStudent({ name: 'No Payments' });

      const stats = await StatsService.buildStudentStats(student.uid);

      expect(stats.studentUid).toBe(student.uid);
      expect(stats.payments.totalAmountCents).toBe(0);
      expect(stats.payments.count).toBe(0);
      expect(stats.scores.count).toBe(0);
    });
  });

  describe('buildFinancialStats() - 财务统计', () => {
    it('计算指定时间段财务统计', async () => {
      await createCompleteTestDataset();

      const stats = await StatsService.buildFinancialStats('ThisMonth');

      expect(stats.period).toBe('ThisMonth');

      // 金额统计
      expect(stats.totals.incomeCents).toBe(95000);
      expect(stats.totals.expenseCents).toBe(30000);
      expect(stats.totals.netIncomeCents).toBe(65000);
      expect(stats.totals.isProfitable).toBe(true);

      // 分期统计
      expect(stats.installments.totalCents).toBe(80000);
      expect(stats.installments.paidCents).toBe(40000);
      expect(stats.installments.pendingCents).toBe(40000);
      expect(stats.installments.remainingCents).toBe(40000);

      // 交易计数
      expect(stats.transactionCount).toBe(5);

      // 学员收入排名
      expect(stats.studentIncome.length).toBe(2);
      expect(stats.studentIncome[0]).toEqual({
        studentId: expect.any(Number),
        studentName: 'Alice Active',
        amountCents: 65000,
      });
      expect(stats.studentIncome[1]).toEqual({
        studentId: expect.any(Number),
        studentName: 'Tom Trial',
        amountCents: 30000,
      });
    });

    it('处理无数据时段', async () => {
      await clearAllCollections();
      const stats = await StatsService.buildFinancialStats('ThisMonth');

      expect(stats.totals.incomeCents).toBe(0);
      expect(stats.totals.expenseCents).toBe(0);
      expect(stats.transactionCount).toBe(0);
      expect(stats.studentIncome.length).toBe(0);
    });

    it('支持不同时间段', async () => {
      const periods = ['Today', 'ThisWeek', 'ThisMonth', 'ThisYear'] as const;

      for (const period of periods) {
        const stats = await StatsService.buildFinancialStats(period);
        expect(stats.period).toBe(period);
      }
    });
  });
});
