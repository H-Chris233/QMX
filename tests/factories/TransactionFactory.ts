/**
 * 交易数据工厂
 * 用于生成测试用的交易/现金记录数据
 */

import type { Transaction, InstallmentStatus } from '@/types/api';
import { randomInt, randomFloat, randomPick, addDays, isoToYYYYMMDD } from './utils';

/**
 * 交易工厂构建器
 * 
 * @example
 * const transaction = TransactionFactory.build();
 * const income = TransactionFactory.buildIncome(100.50, 1);
 * const expense = TransactionFactory.buildExpense(-50.00);
 * const installment = TransactionFactory.create()
 *   .withAmount(100)
 *   .withStudentId(1)
 *   .withInstallment({ plan_uid: 1, installment_number: 2, total_installments: 12 })
 *   .build();
 */
export class TransactionFactory {
  private data: Partial<Transaction> = {};
  private static uidCounter = 1;

  constructor() {
    this.data = this.defaults();
  }

  /**
   * 创建新的工厂实例
   */
  static create(): TransactionFactory {
    return new TransactionFactory();
  }

  /**
   * 快速构建交易数据
   * @param overrides - 覆盖默认值
   */
  static build(overrides?: Partial<Transaction>): Transaction {
    return new TransactionFactory().merge(overrides || {}).build();
  }

  /**
   * 批量构建交易数据
   * @param count - 数量
   * @param overrides - 覆盖默认值
   */
  static buildMany(count: number, overrides?: Partial<Transaction>): Transaction[] {
    return Array.from({ length: count }, () => TransactionFactory.build(overrides));
  }

  /**
   * 构建收入交易
   * @param amount - 金额（元，正数）
   * @param studentId - 学员ID
   */
  static buildIncome(amount: number, studentId?: number | null): Transaction {
    return new TransactionFactory()
      .withAmount(Math.abs(amount))
      .withStudentId(studentId || null)
      .withNote('课程费用')
      .build();
  }

  /**
   * 构建支出交易
   * @param amount - 金额（元，负数）
   * @param note - 备注
   */
  static buildExpense(amount: number, note?: string): Transaction {
    return new TransactionFactory()
      .withAmount(-Math.abs(amount))
      .withNote(note || '设备采购')
      .build();
  }

  /**
   * 构建分期付款交易
   * @param amount - 金额（元）
   * @param studentId - 学员ID
   * @param planUid - 分期计划ID
   * @param current - 当前期数
   * @param total - 总期数
   */
  static buildInstallment(
    amount: number,
    studentId: number,
    planUid: number,
    current: number = 1,
    total: number = 12
  ): Transaction {
    const dueDate = addDays(new Date(), 30);
    
    return new TransactionFactory()
      .withAmount(amount)
      .withStudentId(studentId)
      .withInstallment({
        plan_uid: planUid,
        installment_uid: randomInt(1, 1000),
        installment_number: current,
        total_installments: total,
        due_date: isoToYYYYMMDD(dueDate),
        status: 'Paid' as InstallmentStatus,
        note: `第${current}/${total}期付款`,
      })
      .build();
  }

  /**
   * 重置UID计数器
   */
  static resetCounter(): void {
    TransactionFactory.uidCounter = 1;
  }

  /**
   * 默认值
   */
  private defaults(): Partial<Transaction> {
    const now = new Date();
    const amount = randomFloat(50, 500, 2);
    const isIncome = Math.random() > 0.2; // 80%为收入

    return {
      uid: TransactionFactory.uidCounter++,
      student_id: randomInt(1, 100),
      amount: isIncome ? amount : -amount,
      note: isIncome ? '课程费用' : '设备采购',
      is_income: isIncome,
      is_expense: !isIncome,
      is_installment: false,
      installment: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
  }

  /**
   * 设置交易ID
   */
  withUid(uid: number): this {
    this.data.uid = uid;
    return this;
  }

  /**
   * 设置金额（元）
   * @param amount - 金额，正数为收入，负数为支出
   */
  withAmount(amount: number): this {
    this.data.amount = amount;
    this.data.is_income = amount > 0;
    this.data.is_expense = amount < 0;
    this.data.formatted_amount = amount > 0 ? `+${amount.toFixed(2)} 元` : `${amount.toFixed(2)} 元`;
    return this;
  }

  /**
   * 设置学员ID
   */
  withStudentId(studentId: number | null): this {
    this.data.student_id = studentId;
    return this;
  }

  /**
   * 设置备注
   */
  withNote(note: string | null): this {
    this.data.note = note;
    return this;
  }

  /**
   * 设置分期付款信息
   */
  withInstallment(installment: Transaction['installment']): this {
    this.data.installment = installment;
    this.data.is_installment = installment !== null && installment !== undefined;
    return this;
  }

  /**
   * 设置为无分期付款
   */
  withoutInstallment(): this {
    this.data.installment = null;
    this.data.is_installment = false;
    return this;
  }

  /**
   * 设置关联学员信息
   */
  withStudent(student: Record<string, unknown> | null): this {
    this.data.student = student;
    return this;
  }

  /**
   * 设置创建时间
   */
  withCreatedAt(createdAt: string): this {
    this.data.created_at = createdAt;
    return this;
  }

  /**
   * 设置更新时间
   */
  withUpdatedAt(updatedAt: string): this {
    this.data.updated_at = updatedAt;
    return this;
  }

  /**
   * 合并部分数据
   */
  merge(overrides: Partial<Transaction>): this {
    this.data = { ...this.data, ...overrides };
    return this;
  }

  /**
   * 构建最终的交易数据
   */
  build(): Transaction {
    return this.data as Transaction;
  }
}
