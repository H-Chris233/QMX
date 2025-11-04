import mongoose, { Schema, Document, FilterQuery } from 'mongoose';
import { AppError } from '@/middleware/errorHandler';
import { getNextSequence, CASH_SEQUENCE_NAME } from './counter';
import type { ICashInstallmentSnapshot, ICashSearchOptions } from '@/types';

export interface ICashCreatePayload {
  student_id?: number | null;
  cash: number;
  note?: string | null;
  installment?: ICashInstallmentSnapshot | null;
}

export interface ICashDoc extends Document {
  uid: number;
  student_id: number | null;
  cash: number;
  note: string | null;
  installment?: ICashInstallmentSnapshot | null;
  created_at: Date;
  updated_at: Date;

  getAmount(): number;
  getFormattedAmount(): string;
  isIncome(): boolean;
  getTransactionDescription(): string;
}

export interface ICashPaginatedResult {
  data: ICashDoc[];
  total: number;
  page: number;
  limit: number;
}

const ALLOWED_SORT_FIELDS = new Set(['uid', 'student_id', 'cash', 'created_at', 'updated_at']);

const InstallmentSnapshotSchema = new Schema<ICashInstallmentSnapshot>({
  plan_uid: {
    type: Number,
    required: true,
    index: true,
    comment: '分期计划UID'
  },
  installment_uid: {
    type: Number,
    default: null,
    comment: '分期记录UID'
  },
  installment_number: {
    type: Number,
    default: null,
    comment: '当前期号'
  },
  total_installments: {
    type: Number,
    default: null,
    comment: '总期数快照'
  },
  due_date: {
    type: Date,
    default: null,
    comment: '应付款日期'
  },
  status: {
    type: String,
    default: null,
    comment: '分期状态快照'
  },
  note: {
    type: String,
    default: null,
    comment: '分期备注快照'
  }
}, { _id: false });

const CashSchema = new Schema<ICashDoc>({
  uid: {
    type: Number,
    required: true,
    unique: true,
    index: true,
    comment: '交易唯一ID'
  },
  student_id: {
    type: Number,
    default: null,
    index: true,
    comment: '关联学员UID'
  },
  cash: {
    type: Number,
    required: true,
    comment: '金额（分为单位，正数收入负数支出）'
  },
  note: {
    type: String,
    default: null,
    trim: true,
    comment: '备注信息'
  },
  installment: {
    type: InstallmentSnapshotSchema,
    default: null,
    comment: '关联分期快照'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'cash_transactions',
  versionKey: false
});

CashSchema.index({ created_at: -1 });
CashSchema.index({ student_id: 1, created_at: -1 });
CashSchema.index({ 'installment.plan_uid': 1 });

CashSchema.pre('validate', function ensureNonZeroAmount(this: ICashDoc, next) {
  if (this.cash === 0) {
    next(new AppError('InvalidInput: 交易金额不能为0', 400));
    return;
  }
  next();
});

CashSchema.methods.getAmount = function getAmount(this: ICashDoc): number {
  const amount = Math.abs(this.cash) / 100;
  return Number(amount.toFixed(2));
};

CashSchema.methods.getFormattedAmount = function getFormattedAmount(this: ICashDoc): string {
  const amount = this.getAmount().toFixed(2);
  const sign = this.cash >= 0 ? '+' : '-';
  return `${sign}¥${amount}`;
};

CashSchema.methods.isIncome = function isIncome(this: ICashDoc): boolean {
  return this.cash > 0;
};

CashSchema.methods.getTransactionDescription = function getTransactionDescription(this: ICashDoc): string {
  const prefix = this.isIncome() ? '收入' : '支出';
  return `${prefix} ¥${this.getAmount().toFixed(2)}`;
};

CashSchema.methods.toJSON = function toJSON(this: ICashDoc) {
  const isIncome = this.isIncome();
  const amount = this.getAmount();
  const formattedAmount = this.getFormattedAmount();
  const description = this.getTransactionDescription();

  return {
    uid: this.uid,
    student_id: this.student_id ?? null,
    studentId: this.student_id ?? null,
    cash: this.cash,
    cashInCents: this.cash,
    amount,
    note: this.note ?? null,
    installment: this.installment ?? null,
    is_income: isIncome,
    isIncome,
    is_expense: !isIncome,
    isExpense: !isIncome,
    formatted_amount: formattedAmount,
    formattedAmount,
    description,
    created_at: this.created_at,
    createdAt: this.created_at,
    updated_at: this.updated_at,
    updatedAt: this.updated_at
  };
};

const CashModel = mongoose.models.CashTransaction || mongoose.model<ICashDoc>('CashTransaction', CashSchema);

export class CashClass {
  static async create(payload: ICashCreatePayload): Promise<ICashDoc> {
    const cash = this.ensureValidCash(payload.cash);
    const uid = await getNextSequence(CASH_SEQUENCE_NAME);

    const doc = await CashModel.create({
      uid,
      student_id: payload.student_id ?? null,
      cash,
      note: payload.note?.trim() ? payload.note.trim() : null,
      installment: payload.installment ?? null
    });

    return doc;
  }

  static async findByUid(uid: number): Promise<ICashDoc | null> {
    return await CashModel.findOne({ uid }).exec();
  }

  static async deleteByUid(uid: number): Promise<boolean> {
    const result = await CashModel.deleteOne({ uid }).exec();
    return (result.deletedCount ?? 0) > 0;
  }

  static async findAll(): Promise<ICashDoc[]> {
    return await CashModel.find().sort({ created_at: -1 }).exec();
  }

  static aggregate<T = any>(pipeline: Record<string, unknown>[]) {
    return CashModel.aggregate<T>(pipeline);
  }

  static async findWithPagination(
    filter: FilterQuery<ICashDoc> = {},
    page = 1,
    limit = 20,
    sort: Record<string, 1 | -1> = { created_at: -1 }
  ): Promise<ICashPaginatedResult> {
    const safePage = this.normalizePositiveInteger(page, 1);
    const safeLimit = this.normalizePositiveInteger(limit, 1, 200);
    const skip = (safePage - 1) * safeLimit;

    const [data, total] = await Promise.all([
      CashModel.find(filter).sort(sort).skip(skip).limit(safeLimit).exec(),
      CashModel.countDocuments(filter).exec(),
    ]);

    return { data, total, page: safePage, limit: safeLimit };
  }

  static async search(options: ICashSearchOptions = {}): Promise<ICashPaginatedResult> {
    const { filter, page, limit, sort } = this.buildSearchQuery(options);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      CashModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      CashModel.countDocuments(filter).exec(),
    ]);

    return { data, total, page, limit };
  }

  private static buildSearchQuery(options: ICashSearchOptions) {
    const filter: FilterQuery<ICashDoc> = {};

    const studentFilter = options.studentId ?? options.student_id;
    if (studentFilter !== undefined && studentFilter !== null) {
      filter.student_id = Number(studentFilter);
    }

    const cashRange: Record<string, number> = {};
    const minAmount = this.normalizeAmountFilter(options.minAmount ?? options.min_amount);
    if (minAmount !== undefined) {
      cashRange.$gte = minAmount;
    }
    const maxAmount = this.normalizeAmountFilter(options.maxAmount ?? options.max_amount);
    if (maxAmount !== undefined) {
      cashRange.$lte = maxAmount;
    }
    if (Object.keys(cashRange).length > 0) {
      filter.cash = { ...(filter.cash as Record<string, number> | undefined ?? {}), ...cashRange } as any;
    }

    const incomeFlag = options.isIncome ?? options.is_income;
    if (incomeFlag === true) {
      filter.cash = { ...(filter.cash as Record<string, number> | undefined ?? {}), $gt: 0 } as any;
    } else if (incomeFlag === false) {
      filter.cash = { ...(filter.cash as Record<string, number> | undefined ?? {}), $lt: 0 } as any;
    }

    const dateRange: Record<string, Date> = {};
    const from = options.dateFrom ?? options.date_from;
    if (from) {
      dateRange.$gte = this.normalizeDate(from);
    }
    const to = options.dateTo ?? options.date_to;
    if (to) {
      dateRange.$lte = this.normalizeDate(to);
    }
    if (Object.keys(dateRange).length > 0) {
      filter.created_at = dateRange as any;
    }

    if (options.created_at && typeof options.created_at === 'object') {
      filter.created_at = {
        ...(filter.created_at as Record<string, unknown> | undefined ?? {}),
        ...(options.created_at as Record<string, unknown>),
      } as any;
    }

    const hasInstallment = options.hasInstallment ?? options.has_installment;
    if (hasInstallment === true) {
      filter.installment = { $ne: null } as any;
    } else if (hasInstallment === false) {
      filter.$or = [
        { installment: { $exists: false } },
        { installment: null }
      ] as any;
    }

    const page = this.normalizePositiveInteger(options.page ?? 1, 1);
    const limit = this.normalizePositiveInteger(options.limit ?? 20, 1, 200);

    const rawSortBy = options.sortBy ?? options.sort_by ?? 'created_at';
    const normalizedSortBy = ALLOWED_SORT_FIELDS.has(rawSortBy) ? rawSortBy : 'created_at';
    const rawSortOrder = options.sortOrder ?? options.sort_order ?? 'DESC';
    const sort: Record<string, 1 | -1> = {
      [normalizedSortBy]: rawSortOrder === 'ASC' ? 1 : -1
    };

    return { filter, page, limit, sort };
  }

  private static normalizePositiveInteger(value: unknown, min = 1, max = Number.MAX_SAFE_INTEGER): number {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return min;
    }
    const normalized = Math.floor(num);
    if (normalized < min) {
      return min;
    }
    if (normalized > max) {
      return max;
    }
    return normalized;
  }

  private static normalizeAmountFilter(value?: number | string | null): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      throw new AppError('InvalidInput: 金额必须是数字', 400);
    }
    const normalized = Number(numeric.toFixed(2));
    if (Math.abs(numeric - normalized) > 1e-8) {
      throw new AppError('InvalidInput: 金额最多保留两位小数', 400);
    }
    return Math.round(normalized * 100);
  }

  private static normalizeDate(value: Date | string): Date {
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        throw new AppError('InvalidInput: 日期格式不正确', 400);
      }
      return value;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new AppError('InvalidInput: 日期格式不正确', 400);
    }
    return parsed;
  }

  private static ensureValidCash(cash: number): number {
    if (!Number.isFinite(cash)) {
      throw new AppError('InvalidInput: 金额无效', 400);
    }
    if (!Number.isInteger(cash)) {
      throw new AppError('InvalidInput: 金额必须以分为单位存储', 400);
    }
    if (cash === 0) {
      throw new AppError('InvalidInput: 交易金额不能为0', 400);
    }
    return cash;
  }
}

export const Cash = CashModel;
