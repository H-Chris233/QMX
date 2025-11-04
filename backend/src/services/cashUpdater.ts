import { AppError } from '@/middleware/errorHandler';
import { CashClass, ICashDoc } from '@/models/CashMongo';
import { Student } from '@/models/mongo';
import type { ICashInstallmentSnapshot } from '@/types';
import { convertAmountToCents, normalizeNote, sanitizeInstallmentSnapshot } from './cashBuilder';

export class CashUpdater {
  private pendingStudentId?: number | null;
  private pendingInstallment?: ICashInstallmentSnapshot | null;

  private constructor(private readonly cash: ICashDoc) {}

  static async for(uid: number): Promise<CashUpdater> {
    const doc = await CashClass.findByUid(uid);
    if (!doc) {
      throw new AppError('NotFound: 交易记录不存在', 404);
    }
    return new CashUpdater(doc);
  }

  static fromDocument(doc: ICashDoc): CashUpdater {
    return new CashUpdater(doc);
  }

  get document(): ICashDoc {
    return this.cash;
  }

  amount(amount: number | string): this {
    this.cash.cash = convertAmountToCents(amount);
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
      throw new AppError('InvalidInput: 学员ID必须为正整数', 400);
    }

    this.pendingStudentId = numeric;
    return this;
  }

  note(note?: string | null): this {
    this.cash.note = normalizeNote(note);
    return this;
  }

  installment(info?: ICashInstallmentSnapshot | null): this {
    this.pendingInstallment = sanitizeInstallmentSnapshot(info);
    return this;
  }

  async commit(): Promise<ICashDoc> {
    if (this.pendingStudentId !== undefined) {
      if (this.pendingStudentId === null) {
        this.cash.student_id = null;
      } else {
        const student = await Student.findByUid(this.pendingStudentId);
        if (!student) {
          throw new AppError('NotFound: 学员不存在', 404);
        }
        this.cash.student_id = student.uid;
      }
    }

    if (this.pendingInstallment !== undefined) {
      this.cash.installment = this.pendingInstallment ?? null;
      this.cash.markModified('installment');
    }

    return await this.cash.save();
  }
}
