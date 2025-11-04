import { AppError } from '@/middleware/errorHandler';
import { CashClass, ICashCreatePayload, ICashDoc } from '@/models/CashMongo';
import { Student } from '@/models/mongo';
import type { ICashInstallmentSnapshot } from '@/types';

const PRECISION_EPSILON = 1e-8;

export const normalizeNote = (note?: string | null): string | null => {
  if (note === undefined || note === null) {
    return null;
  }
  const trimmed = String(note).trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const sanitizeInstallmentSnapshot = (info?: ICashInstallmentSnapshot | null): ICashInstallmentSnapshot | null => {
  if (!info) {
    return null;
  }

  if (info.plan_uid === undefined || info.plan_uid === null) {
    throw new AppError('InvalidInput: 分期计划ID不能为空', 400);
  }

  const planUid = Number(info.plan_uid);
  if (!Number.isFinite(planUid) || planUid <= 0) {
    throw new AppError('InvalidInput: 分期计划ID无效', 400);
  }

  const sanitized: ICashInstallmentSnapshot = {
    plan_uid: planUid,
  };

  if (info.installment_uid !== undefined) {
    sanitized.installment_uid = info.installment_uid === null ? null : Number(info.installment_uid);
    if (sanitized.installment_uid !== null && !Number.isFinite(sanitized.installment_uid)) {
      throw new AppError('InvalidInput: 分期记录ID无效', 400);
    }
  }

  if (info.installment_number !== undefined) {
    if (info.installment_number === null) {
      sanitized.installment_number = null;
    } else {
      const installmentNumber = Number(info.installment_number);
      if (!Number.isFinite(installmentNumber) || installmentNumber <= 0) {
        throw new AppError('InvalidInput: 分期期号无效', 400);
      }
      sanitized.installment_number = Math.trunc(installmentNumber);
    }
  }

  if (info.total_installments !== undefined) {
    if (info.total_installments === null) {
      sanitized.total_installments = null;
    } else {
      const total = Number(info.total_installments);
      if (!Number.isFinite(total) || total <= 0) {
        throw new AppError('InvalidInput: 分期总期数无效', 400);
      }
      sanitized.total_installments = Math.trunc(total);
    }
  }

  if (info.due_date !== undefined && info.due_date !== null) {
    const due = info.due_date instanceof Date ? info.due_date : new Date(info.due_date);
    if (Number.isNaN(due.getTime())) {
      throw new AppError('InvalidInput: 分期应付日期无效', 400);
    }
    sanitized.due_date = due;
  }

  if (info.status !== undefined) {
    sanitized.status = info.status ?? null;
  }

  const installmentNote = normalizeNote(info.note);
  if (installmentNote !== null) {
    sanitized.note = installmentNote;
  } else {
    sanitized.note = null;
  }

  return sanitized;
};

export const convertAmountToCents = (amount: number | string): number => {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) {
    throw new AppError('InvalidInput: 金额必须是数字', 400);
  }

  const normalized = Number(numeric.toFixed(2));
  if (Math.abs(numeric - normalized) > PRECISION_EPSILON) {
    throw new AppError('InvalidInput: 金额最多保留两位小数', 400);
  }

  const cents = Math.round(normalized * 100);
  if (cents === 0) {
    throw new AppError('InvalidInput: 金额不能为0', 400);
  }

  return cents;
};

export class CashBuilder {
  private payload: Partial<ICashCreatePayload> = {
    student_id: null,
    cash: undefined,
    note: null,
    installment: null,
  };

  private amountSet = false;

  static create(): CashBuilder {
    return new CashBuilder();
  }

  amount(amount: number | string): this {
    this.payload.cash = convertAmountToCents(amount);
    this.amountSet = true;
    return this;
  }

  studentId(studentId?: number | string | null): this {
    if (studentId === undefined) {
      return this;
    }
    if (studentId === null || studentId === '') {
      this.payload.student_id = null;
      return this;
    }

    const numeric = Number(studentId);
    if (!Number.isInteger(numeric) || numeric <= 0) {
      throw new AppError('InvalidInput: 学员ID必须为正整数', 400);
    }

    this.payload.student_id = numeric;
    return this;
  }

  note(note?: string | null): this {
    this.payload.note = normalizeNote(note);
    return this;
  }

  installment(info?: ICashInstallmentSnapshot | null): this {
    this.payload.installment = sanitizeInstallmentSnapshot(info);
    return this;
  }

  async build(): Promise<ICashDoc> {
    if (!this.amountSet || this.payload.cash === undefined) {
      throw new AppError('InvalidInput: 金额不能为空', 400);
    }

    if (this.payload.student_id !== null && this.payload.student_id !== undefined) {
      const student = await Student.findByUid(this.payload.student_id);
      if (!student) {
        throw new AppError('NotFound: 学员不存在', 404);
      }
      this.payload.student_id = student.uid;
    }

    const payload: ICashCreatePayload = {
      student_id: this.payload.student_id ?? null,
      cash: this.payload.cash,
      note: this.payload.note ?? null,
      installment: this.payload.installment ?? null,
    };

    return await CashClass.create(payload);
  }
}
