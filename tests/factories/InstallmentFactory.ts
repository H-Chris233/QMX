/**
 * 分期付款数据工厂
 * 用于生成测试用的分期付款和分期计划数据
 */

import type { Installment, InstallmentPlan } from '@/types/api';
import { InstallmentStatus, InstallmentPlanStatus, PaymentFrequency } from '@/types/api';
import { randomInt, randomFloat, randomPick, addDays, isoToYYYYMMDD } from './utils';

/**
 * 分期付款工厂构建器
 * 
 * @example
 * const installment = InstallmentFactory.build();
 * const pendingInstallment = InstallmentFactory.buildPending(1, 100, 3, 12);
 * const paidInstallment = InstallmentFactory.buildPaid(1, 100, 1, 12);
 * const overdueInstallment = InstallmentFactory.buildOverdue(1, 100, 2, 12);
 */
export class InstallmentFactory {
  private data: Partial<Installment> = {};
  private static uidCounter = 1;

  constructor() {
    this.data = this.defaults();
  }

  /**
   * 创建新的工厂实例
   */
  static create(): InstallmentFactory {
    return new InstallmentFactory();
  }

  /**
   * 快速构建分期付款数据
   */
  static build(overrides?: Partial<Installment>): Installment {
    return new InstallmentFactory().merge(overrides || {}).build();
  }

  /**
   * 批量构建分期付款数据
   */
  static buildMany(count: number, overrides?: Partial<Installment>): Installment[] {
    return Array.from({ length: count }, () => InstallmentFactory.build(overrides));
  }

  /**
   * 构建待支付分期
   */
  static buildPending(
    planId: number,
    amount: number,
    current: number,
    total: number
  ): Installment {
    const dueDate = addDays(new Date(), 15);
    
    return new InstallmentFactory()
      .withPlanId(planId)
      .withAmount(amount)
      .withInstallmentNumber(current, total)
      .withDueDate(isoToYYYYMMDD(dueDate))
      .withStatus(InstallmentStatus.PENDING)
      .withPaidAmount(0)
      .withPaidAt(null)
      .build();
  }

  /**
   * 构建已支付分期
   */
  static buildPaid(
    planId: number,
    amount: number,
    current: number,
    total: number
  ): Installment {
    const dueDate = addDays(new Date(), -30);
    const paidDate = addDays(new Date(), -25);
    
    return new InstallmentFactory()
      .withPlanId(planId)
      .withAmount(amount)
      .withInstallmentNumber(current, total)
      .withDueDate(isoToYYYYMMDD(dueDate))
      .withStatus(InstallmentStatus.PAID)
      .withPaidAmount(amount)
      .withPaidAt(paidDate.toISOString())
      .build();
  }

  /**
   * 构建逾期分期
   */
  static buildOverdue(
    planId: number,
    amount: number,
    current: number,
    total: number
  ): Installment {
    const dueDate = addDays(new Date(), -10);
    
    return new InstallmentFactory()
      .withPlanId(planId)
      .withAmount(amount)
      .withInstallmentNumber(current, total)
      .withDueDate(isoToYYYYMMDD(dueDate))
      .withStatus(InstallmentStatus.OVERDUE)
      .withPaidAmount(0)
      .withPaidAt(null)
      .withIsOverdue(true)
      .withDaysOverdue(10)
      .build();
  }

  /**
   * 重置UID计数器
   */
  static resetCounter(): void {
    InstallmentFactory.uidCounter = 1;
  }

  /**
   * 默认值
   */
  private defaults(): Partial<Installment> {
    const now = new Date();
    const dueDate = addDays(now, 30);
    const amount = randomFloat(100, 1000, 2);

    return {
      uid: InstallmentFactory.uidCounter++,
      plan_id: randomInt(1, 100),
      installment_amount: amount,
      current_installment: 1,
      total_installments: 12,
      due_date: isoToYYYYMMDD(dueDate),
      status: InstallmentStatus.PENDING,
      paid_amount: 0,
      paid_at: null,
      student_id: randomInt(1, 100),
      cash_uid: null,
      is_overdue: false,
      days_overdue: 0,
      remaining_amount: amount,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
  }

  withUid(uid: number): this {
    this.data.uid = uid;
    return this;
  }

  withPlanId(planId: number): this {
    this.data.plan_id = planId;
    return this;
  }

  withAmount(amount: number): this {
    this.data.installment_amount = amount;
    this.data.remaining_amount = amount - (this.data.paid_amount || 0);
    return this;
  }

  withInstallmentNumber(current: number, total: number): this {
    this.data.current_installment = current;
    this.data.total_installments = total;
    return this;
  }

  withDueDate(dueDate: string): this {
    this.data.due_date = dueDate;
    return this;
  }

  withStatus(status: InstallmentStatus): this {
    this.data.status = status;
    return this;
  }

  withPaidAmount(paidAmount: number): this {
    this.data.paid_amount = paidAmount;
    this.data.remaining_amount = (this.data.installment_amount || 0) - paidAmount;
    return this;
  }

  withPaidAt(paidAt: string | null): this {
    this.data.paid_at = paidAt;
    return this;
  }

  withStudentId(studentId: number | null): this {
    this.data.student_id = studentId;
    return this;
  }

  withCashUid(cashUid: number | null): this {
    this.data.cash_uid = cashUid;
    return this;
  }

  withIsOverdue(isOverdue: boolean): this {
    this.data.is_overdue = isOverdue;
    return this;
  }

  withDaysOverdue(daysOverdue: number): this {
    this.data.days_overdue = daysOverdue;
    return this;
  }

  merge(overrides: Partial<Installment>): this {
    this.data = { ...this.data, ...overrides };
    return this;
  }

  build(): Installment {
    return this.data as Installment;
  }
}

/**
 * 分期计划工厂构建器
 * 
 * @example
 * const plan = InstallmentPlanFactory.build();
 * const monthlyPlan = InstallmentPlanFactory.buildMonthly(1, 12000, 12);
 * const weeklyPlan = InstallmentPlanFactory.buildWeekly(2, 1200, 4);
 */
export class InstallmentPlanFactory {
  private data: Partial<InstallmentPlan> = {};
  private static uidCounter = 1;

  constructor() {
    this.data = this.defaults();
  }

  static create(): InstallmentPlanFactory {
    return new InstallmentPlanFactory();
  }

  static build(overrides?: Partial<InstallmentPlan>): InstallmentPlan {
    return new InstallmentPlanFactory().merge(overrides || {}).build();
  }

  static buildMany(count: number, overrides?: Partial<InstallmentPlan>): InstallmentPlan[] {
    return Array.from({ length: count }, () => InstallmentPlanFactory.build(overrides));
  }

  /**
   * 构建月付计划
   */
  static buildMonthly(
    studentId: number,
    totalAmount: number,
    totalInstallments: number
  ): InstallmentPlan {
    return new InstallmentPlanFactory()
      .withStudentId(studentId)
      .withTotalAmount(totalAmount)
      .withTotalInstallments(totalInstallments)
      .withFrequency(PaymentFrequency.MONTHLY)
      .withStatus(InstallmentPlanStatus.ACTIVE)
      .build();
  }

  /**
   * 构建周付计划
   */
  static buildWeekly(
    studentId: number,
    totalAmount: number,
    totalInstallments: number
  ): InstallmentPlan {
    return new InstallmentPlanFactory()
      .withStudentId(studentId)
      .withTotalAmount(totalAmount)
      .withTotalInstallments(totalInstallments)
      .withFrequency(PaymentFrequency.WEEKLY)
      .withStatus(InstallmentPlanStatus.ACTIVE)
      .build();
  }

  /**
   * 构建季付计划
   */
  static buildQuarterly(
    studentId: number,
    totalAmount: number,
    totalInstallments: number
  ): InstallmentPlan {
    return new InstallmentPlanFactory()
      .withStudentId(studentId)
      .withTotalAmount(totalAmount)
      .withTotalInstallments(totalInstallments)
      .withFrequency(PaymentFrequency.QUARTERLY)
      .withStatus(InstallmentPlanStatus.ACTIVE)
      .build();
  }

  static resetCounter(): void {
    InstallmentPlanFactory.uidCounter = 1;
  }

  private defaults(): Partial<InstallmentPlan> {
    const now = new Date();
    const startDate = addDays(now, 7);

    return {
      uid: InstallmentPlanFactory.uidCounter++,
      student_id: randomInt(1, 100),
      total_amount: randomFloat(1000, 10000, 2),
      total_installments: randomPick([3, 6, 12, 24]),
      frequency: randomPick([
        PaymentFrequency.WEEKLY,
        PaymentFrequency.MONTHLY,
        PaymentFrequency.QUARTERLY,
      ]),
      start_date: isoToYYYYMMDD(startDate),
      status: InstallmentPlanStatus.ACTIVE,
      note: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
  }

  withUid(uid: number): this {
    this.data.uid = uid;
    return this;
  }

  withStudentId(studentId: number | null): this {
    this.data.student_id = studentId;
    return this;
  }

  withTotalAmount(totalAmount: number): this {
    this.data.total_amount = totalAmount;
    return this;
  }

  withTotalInstallments(totalInstallments: number): this {
    this.data.total_installments = totalInstallments;
    return this;
  }

  withFrequency(frequency: PaymentFrequency): this {
    this.data.frequency = frequency;
    return this;
  }

  withCustomDays(customDays: number): this {
    this.data.frequency = PaymentFrequency.CUSTOM;
    this.data.custom_days = customDays;
    return this;
  }

  withStartDate(startDate: string): this {
    this.data.start_date = startDate;
    return this;
  }

  withStatus(status: InstallmentPlanStatus): this {
    this.data.status = status;
    return this;
  }

  withNote(note: string | null): this {
    this.data.note = note;
    return this;
  }

  merge(overrides: Partial<InstallmentPlan>): this {
    this.data = { ...this.data, ...overrides };
    return this;
  }

  build(): InstallmentPlan {
    return this.data as InstallmentPlan;
  }
}
