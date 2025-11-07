/**
 * 统计数据工厂
 * 用于生成测试用的各类统计数据
 */

import type { DashboardStats, StudentStats, FinancialStats } from '@/types/api';
import { randomInt, randomFloat } from './utils';

/**
 * 仪表板统计工厂
 * 
 * @example
 * const stats = DashboardStatsFactory.build();
 * const customStats = DashboardStatsFactory.build({ totalRevenue: 50000 });
 */
export class DashboardStatsFactory {
  private data: Partial<DashboardStats> = {};

  constructor() {
    this.data = this.defaults();
  }

  static create(): DashboardStatsFactory {
    return new DashboardStatsFactory();
  }

  static build(overrides?: Partial<DashboardStats>): DashboardStats {
    return new DashboardStatsFactory().merge(overrides || {}).build();
  }

  private defaults(): DashboardStats {
    return {
      totalRevenue: randomFloat(10000, 100000, 2),
      activeStudents: randomInt(50, 200),
      averageGrade: randomFloat(70, 95, 1),
    };
  }

  withTotalRevenue(totalRevenue: number): this {
    this.data.totalRevenue = totalRevenue;
    return this;
  }

  withActiveStudents(activeStudents: number): this {
    this.data.activeStudents = activeStudents;
    return this;
  }

  withAverageGrade(averageGrade: number): this {
    this.data.averageGrade = averageGrade;
    return this;
  }

  merge(overrides: Partial<DashboardStats>): this {
    this.data = { ...this.data, ...overrides };
    return this;
  }

  build(): DashboardStats {
    return this.data as DashboardStats;
  }
}

/**
 * 学员统计工厂
 * 
 * @example
 * const stats = StudentStatsFactory.build();
 * const detailedStats = StudentStatsFactory.buildDetailed(1, 5000, 85, 10);
 */
export class StudentStatsFactory {
  private data: Partial<StudentStats> = {};

  constructor() {
    this.data = this.defaults();
  }

  static create(): StudentStatsFactory {
    return new StudentStatsFactory();
  }

  static build(overrides?: Partial<StudentStats>): StudentStats {
    return new StudentStatsFactory().merge(overrides || {}).build();
  }

  /**
   * 构建详细的学员统计
   */
  static buildDetailed(
    totalPayments: number,
    paymentCount: number,
    averageScore: number,
    scoreCount: number
  ): StudentStats {
    return new StudentStatsFactory()
      .withTotalPayments(totalPayments)
      .withPaymentCount(paymentCount)
      .withAverageScore(averageScore)
      .withScoreCount(scoreCount)
      .build();
  }

  /**
   * 构建包含分期统计的学员统计
   */
  static buildWithInstallment(
    totalAmount: number,
    paidAmount: number,
    pendingCount: number
  ): StudentStats {
    return new StudentStatsFactory()
      .withInstallmentStats({
        total_amount: totalAmount,
        paid_amount: paidAmount,
        pending_amount: totalAmount - paidAmount,
        pending_count: pendingCount,
        remaining_amount: totalAmount - paidAmount,
      })
      .build();
  }

  private defaults(): StudentStats {
    return {
      total_payments: randomFloat(1000, 10000, 2),
      payment_count: randomInt(5, 50),
      average_score: randomFloat(70, 95, 1),
      max_score: randomFloat(90, 100, 1),
      min_score: randomFloat(60, 80, 1),
      score_count: randomInt(5, 30),
      membership_status: 'Active',
      membership_status_code: undefined,
      membership_is_active: true,
      membership_days_remaining: randomInt(30, 365),
    };
  }

  withTotalPayments(totalPayments: number): this {
    this.data.total_payments = totalPayments;
    return this;
  }

  withPaymentCount(paymentCount: number): this {
    this.data.payment_count = paymentCount;
    return this;
  }

  withAverageScore(averageScore: number): this {
    this.data.average_score = averageScore;
    return this;
  }

  withMaxScore(maxScore: number): this {
    this.data.max_score = maxScore;
    return this;
  }

  withMinScore(minScore: number): this {
    this.data.min_score = minScore;
    return this;
  }

  withScoreCount(scoreCount: number): this {
    this.data.score_count = scoreCount;
    return this;
  }

  withMembershipStatus(
    status: string,
    isActive: boolean = true,
    daysRemaining: number | null = 100
  ): this {
    this.data.membership_status = status;
    this.data.membership_is_active = isActive;
    this.data.membership_days_remaining = daysRemaining;
    return this;
  }

  withInstallmentStats(installmentStats: StudentStats['installment_stats']): this {
    this.data.installment_stats = installmentStats;
    return this;
  }

  merge(overrides: Partial<StudentStats>): this {
    this.data = { ...this.data, ...overrides };
    return this;
  }

  build(): StudentStats {
    return this.data as StudentStats;
  }
}

/**
 * 财务统计工厂
 * 
 * @example
 * const stats = FinancialStatsFactory.build();
 * const profitStats = FinancialStatsFactory.buildProfit(50000, 10000);
 * const lossStats = FinancialStatsFactory.buildLoss(30000, 40000);
 */
export class FinancialStatsFactory {
  private data: Partial<FinancialStats> = {};

  constructor() {
    this.data = this.defaults();
  }

  static create(): FinancialStatsFactory {
    return new FinancialStatsFactory();
  }

  static build(overrides?: Partial<FinancialStats>): FinancialStats {
    return new FinancialStatsFactory().merge(overrides || {}).build();
  }

  /**
   * 构建盈利统计
   */
  static buildProfit(totalIncome: number, totalExpense: number): FinancialStats {
    return new FinancialStatsFactory()
      .withTotalIncome(totalIncome)
      .withTotalExpense(totalExpense)
      .withNetIncome(totalIncome - totalExpense)
      .build();
  }

  /**
   * 构建亏损统计
   */
  static buildLoss(totalIncome: number, totalExpense: number): FinancialStats {
    return new FinancialStatsFactory()
      .withTotalIncome(totalIncome)
      .withTotalExpense(totalExpense)
      .withNetIncome(totalIncome - totalExpense)
      .build();
  }

  /**
   * 构建零收支统计
   */
  static buildZero(): FinancialStats {
    return new FinancialStatsFactory()
      .withTotalIncome(0)
      .withTotalExpense(0)
      .withNetIncome(0)
      .build();
  }

  private defaults(): FinancialStats {
    const totalIncome = randomFloat(30000, 100000, 2);
    const totalExpense = randomFloat(10000, 30000, 2);
    
    return {
      totalIncome,
      totalExpense,
      netIncome: totalIncome - totalExpense,
    };
  }

  withTotalIncome(totalIncome: number): this {
    this.data.totalIncome = totalIncome;
    return this;
  }

  withTotalExpense(totalExpense: number): this {
    this.data.totalExpense = totalExpense;
    return this;
  }

  withNetIncome(netIncome: number): this {
    this.data.netIncome = netIncome;
    return this;
  }

  merge(overrides: Partial<FinancialStats>): this {
    this.data = { ...this.data, ...overrides };
    return this;
  }

  build(): FinancialStats {
    return this.data as FinancialStats;
  }
}
