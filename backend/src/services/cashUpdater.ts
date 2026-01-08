import { CashRepository } from '../db/repositories/cashRepository';
import { StudentRepository } from '../db/repositories/studentRepository';
import { CashTransaction } from '../db/schema/cash';
import type { ICashInstallmentSnapshot } from '@/types';
import { AppError } from '@/utils/errors';
import { convertAmountToCents, normalizeNote, sanitizeInstallmentSnapshot } from './cashBuilder';

export class CashUpdater {
  private pendingStudentId?: number | null;
  private pendingInstallment?: ICashInstallmentSnapshot | null;
  private cashData: Partial<CashTransaction>;

  private constructor(cash: CashTransaction) {
    this.cashData = { ...cash };
  }

  static async for(uid: number): Promise<CashUpdater> {
    const cash = await CashRepository.findByUid(uid);
    if (!cash) {
      throw AppError.notFound('交易记录不存在');
    }
    return new CashUpdater(cash);
  }

  static fromDocument(cash: CashTransaction): CashUpdater {
    return new CashUpdater(cash);
  }

  get document(): CashTransaction {
    return this.cashData as CashTransaction;
  }

  amount(amount: number | string): this {
    this.cashData.amount = typeof amount === 'string' ? convertAmountToCents(Number(amount)) : convertAmountToCents(amount);
    return this;
  }

  studentId(studentId?: number | string | null): this {
    if (studentId === undefined) {
      return this;
    }
    if (studentId === null || studentId === '') {
      this.pendingStudentId = null;
      return this;
    }

    const numeric = Number(studentId);
    if (!Number.isInteger(numeric) || numeric <= 0) {
      throw AppError.invalidInput('学员ID必须为正整数');
    }

    this.pendingStudentId = numeric;
    return this;
  }

  note(note?: string | null): this {
    this.cashData.note = normalizeNote(note);
    return this;
  }

  installment(info?: ICashInstallmentSnapshot | null): this {
    const sanitized = sanitizeInstallmentSnapshot(info);
    if (sanitized && sanitized.due_date) {
      // 确保 due_date 是字符串格式
      this.pendingInstallment = {
        ...sanitized,
        due_date: typeof sanitized.due_date === 'string'
          ? sanitized.due_date
          : sanitized.due_date instanceof Date
            ? sanitized.due_date.toISOString().split('T')[0]
            : null
      };
    } else {
      this.pendingInstallment = sanitized;
    }
    return this;
  }

  async commit(): Promise<CashTransaction> {
    const uid = this.cashData.uid;
    if (!uid) {
      throw new Error('交易记录UID不存在');
    }

    // 更新学员ID
    if (this.pendingStudentId !== undefined) {
      if (this.pendingStudentId === null) {
        this.cashData.studentId = null;
      } else {
        const student = await StudentRepository.findByUid(this.pendingStudentId);
        if (!student) {
          throw AppError.notFound('学员不存在');
        }
        this.cashData.studentId = student.uid;
      }
    }

    // 更新分期信息
    if (this.pendingInstallment !== undefined) {
      this.cashData.installmentSnapshot = this.pendingInstallment ?? null;
    }

    const updated = await CashRepository.updateByUid(uid, {
      amount: this.cashData.amount ?? undefined,
      studentId: this.cashData.studentId ?? undefined,
      note: this.cashData.note ?? undefined,
      installmentSnapshot: this.cashData.installmentSnapshot ?? undefined,
    });

    if (!updated) {
      throw new Error('更新交易记录失败');
    }

    return updated;
  }
}
