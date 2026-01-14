import { CashRepository } from '../db/repositories/cashRepository';
import { NewCashTransaction, CashTransaction, InstallmentSnapshot } from '../db/schema/cash';
import { StudentRepository } from '../db/repositories/studentRepository';
import { PaymentFrequency } from '@/types';
import { AppError, ErrorType } from '../utils/errors';

/**
 * 金额转换工具函数
 * 将元转换为分（整数）
 */
export function convertAmountToCents(amount: number): number {
  const cents = Math.round(amount * 100);
  if (!Number.isInteger(cents)) {
    throw new Error('金额必须保留最多两位小数');
  }
  if (!Number.isFinite(cents)) {
    throw new Error('金额必须是有效数字');
  }
  if (Math.abs(cents) > 999999999999) {
    throw new Error('金额超出允许范围');
  }
  return cents;
}

/**
 * 备注归一化工具函数
 */
export function normalizeNote(note: string | null | undefined): string | null {
  if (note === undefined || note === null) {
    return null;
  }
  const trimmed = note.trim();
  if (trimmed === '') {
    return null;
  }
  return trimmed;
}

/**
 * 清理分期快照
 */
export function sanitizeInstallmentSnapshot(
  snapshot: Partial<InstallmentSnapshot> | null | undefined
): InstallmentSnapshot | null {
  if (!snapshot) return null;

  const due_date = snapshot.due_date
    ? (typeof snapshot.due_date === 'string'
        ? snapshot.due_date
        : (snapshot.due_date as any).toISOString().split('T')[0])
    : null;

  return {
    plan_uid: snapshot.plan_uid ?? 0,
    installment_uid: snapshot.installment_uid ?? null,
    installment_number: snapshot.installment_number ?? null,
    total_installments: snapshot.total_installments ?? null,
    due_date,
    status: snapshot.status ?? null,
    note: snapshot.note ?? null,
  };
}

export { PaymentFrequency } from '@/types';
export type { PaymentFrequency as PaymentFrequencyType };

export class CashBuilder {
  private payload: Partial<NewCashTransaction> = {};
  private checkStudent = true;

  static create(): CashBuilder {
    return new CashBuilder();
  }

  studentId(id?: number | null): this {
    this.payload.studentId = id ?? null;
    return this;
  }

  amount(amount: number): this {
    // 转换为分（假设输入是元）
    const cents = Math.round(amount * 100);
    if (!Number.isInteger(cents)) {
      throw new Error('金额必须保留最多两位小数');
    }
    if (cents === 0) {
      throw new Error('交易金额不能为0');
    }
    this.payload.amount = cents;
    return this;
  }

  amountInCents(cents: number): this {
    if (!Number.isFinite(cents) || !Number.isInteger(cents)) {
      throw new Error('金额必须是整数（分）');
    }
    if (Math.abs(cents) > 999999999999) {
      throw new Error('金额超出允许范围');
    }
    if (cents === 0) {
      throw new Error('交易金额不能为0');
    }
    this.payload.amount = cents;
    return this;
  }

  note(note?: string | null): this {
    if (note !== undefined && note !== null) {
      if (note.trim() === '') {
        this.payload.note = null;
      } else {
        this.payload.note = note.trim();
      }
    } else {
      this.payload.note = null;
    }
    return this;
  }

  installment(snapshot?: InstallmentSnapshot | null): this {
    this.payload.installmentSnapshot = snapshot ?? null;
    return this;
  }

  validateStudent(validate: boolean = true): this {
    this.checkStudent = validate;
    return this;
  }

  /**
   * 生成分期快照
   */
  static createInstallmentSnapshot(
    planUid: number,
    installmentUid?: number | null,
    otherFields?: Partial<InstallmentSnapshot>
  ): InstallmentSnapshot {
    return {
      plan_uid: planUid,
      installment_uid: installmentUid ?? null,
      installment_number: otherFields?.installment_number ?? null,
      total_installments: otherFields?.total_installments ?? null,
      due_date: otherFields?.due_date ?? null,
      status: otherFields?.status ?? null,
      note: otherFields?.note ?? null,
    };
  }

  async build(): Promise<CashTransaction> {
    // 验证金额
    if (this.payload.amount === undefined || this.payload.amount === null) {
      throw new Error('金额不能为空');
    }

    // 验证学员存在（如果需要）
    if (
      this.checkStudent &&
      this.payload.studentId !== null &&
      this.payload.studentId !== undefined
    ) {
      const student = await StudentRepository.findByUid(this.payload.studentId);
      if (!student) {
        throw new Error('学员不存在');
      }
    }

    return await CashRepository.create(this.payload as NewCashTransaction);
  }

  // 获取当前构建的数据
  getPayload(): Partial<NewCashTransaction> {
    return this.payload;
  }
}

/**
 * 交易更新器
 * 使用流畅 API 模式更新交易记录
 */
export class CashUpdater {
  private updates: Partial<NewCashTransaction> = {};

  constructor(private uid: string) {}

  /**
   * 创建更新器实例
   */
  static for(uid: string): CashUpdater {
    return new CashUpdater(uid);
  }

  /**
   * 设置金额（单位：分）
   */
  amount(value: number): this {
    if (!Number.isFinite(value) || value <= 0) {
      throw new AppError(
        '金额必须为正数',
        ErrorType.InvalidInput,
        { details: { field: 'amount', value } }
      );
    }
    this.updates.amount = value;
    return this;
  }

  /**
   * 设置备注
   */
  note(value: string | null): this {
    // 空字符串转换为 null
    this.updates.note = (value === '' || value === null) ? null : value;
    return this;
  }

  /**
   * 设置学员ID
   */
  studentId(id: number | null): this {
    this.updates.studentId = id;
    return this;
  }

  /**
   * 设置分期快照
   */
  installment(snapshot: InstallmentSnapshot | null): this {
    this.updates.installmentSnapshot = snapshot;
    return this;
  }

  /**
   * 提交更新
   */
  async save(): Promise<CashTransaction | null> {
    if (Object.keys(this.updates).length === 0) {
      return await CashRepository.findByUid(Number(this.uid));
    }
    return await CashRepository.updateByUid(Number(this.uid), this.updates);
  }

  /**
   * 获取待更新的数据
   */
  getUpdates(): Partial<NewCashTransaction> {
    return { ...this.updates };
  }
}
