import mongoose, { Document, FilterQuery, Schema, UpdateQuery } from 'mongoose';
import { AppError } from '@/middleware/errorHandler';
import { PaymentFrequency } from '@/types';
import { getNextSequence, INSTALLMENT_PLAN_SEQUENCE_NAME } from './counter';

export enum InstallmentPlanStatus {
  ACTIVE = 'Active',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
}

export interface IInstallmentPlanDoc extends Document {
  uid: number;
  student_id: number | null;
  total_amount: number;
  total_installments: number;
  frequency: PaymentFrequency;
  custom_days?: number | null;
  start_date: Date;
  status: InstallmentPlanStatus;
  note: string | null;
  created_at: Date;
  updated_at: Date;

  getInstallmentAmount(installmentNumber?: number): number;
  isActive(): boolean;
}

export interface IInstallmentPlanPaginatedResult {
  data: IInstallmentPlanDoc[];
  total: number;
  page: number;
  limit: number;
}

export interface IInstallmentPlanCreatePayload {
  student_id?: number | null;
  total_amount: number;
  total_installments: number;
  frequency: PaymentFrequency;
  custom_days?: number | null;
  start_date: Date;
  status?: InstallmentPlanStatus;
  note?: string | null;
}

export interface IInstallmentPlanSearchOptions {
  sort?: Record<string, 1 | -1>;
  limit?: number;
  page?: number;
}

const InstallmentPlanSchema = new Schema<IInstallmentPlanDoc>({
  uid: {
    type: Number,
    required: true,
    unique: true,
    index: true,
    comment: '分期计划唯一ID',
  },
  student_id: {
    type: Number,
    default: null,
    index: true,
    comment: '关联学生UID',
  },
  total_amount: {
    type: Number,
    required: true,
    min: [1, '总金额必须大于0'],
    comment: '总金额（单位：分）',
  },
  total_installments: {
    type: Number,
    required: true,
    min: [1, '总期数必须大于0'],
    comment: '分期总期数',
  },
  frequency: {
    type: String,
    required: true,
    enum: Object.values(PaymentFrequency),
    comment: '付款频率',
  },
  custom_days: {
    type: Number,
    default: null,
    min: [1, '自定义频率天数必须大于0'],
    comment: '自定义付款间隔（天）',
  },
  start_date: {
    type: Date,
    required: true,
    comment: '开始日期',
  },
  status: {
    type: String,
    required: true,
    enum: Object.values(InstallmentPlanStatus),
    default: InstallmentPlanStatus.ACTIVE,
    index: true,
    comment: '计划状态',
  },
  note: {
    type: String,
    default: null,
    trim: true,
    comment: '备注',
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'installment_plans',
  versionKey: false,
});

InstallmentPlanSchema.index({ student_id: 1, status: 1, start_date: -1 });
InstallmentPlanSchema.index({ start_date: -1 });
InstallmentPlanSchema.index({ created_at: -1 });

InstallmentPlanSchema.pre('validate', function validateCustomDays(this: IInstallmentPlanDoc, next) {
  if (this.frequency === PaymentFrequency.CUSTOM && (this.custom_days === null || this.custom_days === undefined)) {
    this.invalidate('custom_days', '自定义频率必须指定天数');
  }
  if (this.frequency !== PaymentFrequency.CUSTOM) {
    this.custom_days = null;
  }
  next();
});

const calculateInstallmentAmount = (totalAmount: number, totalInstallments: number, installmentNumber?: number): number => {
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return 0;
  }
  const installments = Math.max(1, totalInstallments);
  const baseAmount = Math.floor(totalAmount / installments);
  const remainder = totalAmount % installments;

  if (installmentNumber === undefined) {
    return baseAmount + (remainder > 0 ? 1 : 0);
  }

  const index = Math.trunc(installmentNumber);
  if (index <= 0 || index > installments) {
    return baseAmount;
  }

  return index <= remainder ? baseAmount + 1 : baseAmount;
};

InstallmentPlanSchema.methods.getInstallmentAmount = function getInstallmentAmount(this: IInstallmentPlanDoc, installmentNumber?: number): number {
  return calculateInstallmentAmount(this.total_amount, this.total_installments, installmentNumber);
};

InstallmentPlanSchema.methods.isActive = function isActive(this: IInstallmentPlanDoc): boolean {
  return this.status === InstallmentPlanStatus.ACTIVE;
};

InstallmentPlanSchema.methods.toJSON = function toJSON(this: IInstallmentPlanDoc) {
  return {
    uid: this.uid,
    student_id: this.student_id,
    studentId: this.student_id,
    total_amount: this.total_amount,
    totalAmount: this.total_amount,
    total_installments: this.total_installments,
    totalInstallments: this.total_installments,
    frequency: this.frequency,
    custom_days: this.custom_days,
    customDays: this.custom_days,
    start_date: this.start_date,
    startDate: this.start_date,
    status: this.status,
    note: this.note,
    created_at: this.created_at,
    createdAt: this.created_at,
    updated_at: this.updated_at,
    updatedAt: this.updated_at,
  };
};

const InstallmentPlanModel = mongoose.models.InstallmentPlan || mongoose.model<IInstallmentPlanDoc>('InstallmentPlan', InstallmentPlanSchema);

const normalizeOptionalNumber = (value?: number | null): number | null => {
  if (value === undefined || value === null) {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw new AppError('InvalidInput: 数值必须为正整数', 400);
  }
  return numeric;
};

export class InstallmentPlan {
  static async create(payload: IInstallmentPlanCreatePayload): Promise<IInstallmentPlanDoc> {
    if (!Number.isInteger(payload.total_amount) || payload.total_amount <= 0) {
      throw new AppError('InvalidInput: 总金额必须以分为单位存储', 400);
    }
    if (!Number.isInteger(payload.total_installments) || payload.total_installments <= 0) {
      throw new AppError('InvalidInput: 总期数必须为正整数', 400);
    }

    const uid = await getNextSequence(INSTALLMENT_PLAN_SEQUENCE_NAME);

    const doc = await InstallmentPlanModel.create({
      uid,
      student_id: payload.student_id ?? null,
      total_amount: payload.total_amount,
      total_installments: payload.total_installments,
      frequency: payload.frequency,
      custom_days: payload.frequency === PaymentFrequency.CUSTOM
        ? normalizeOptionalNumber(payload.custom_days)
        : null,
      start_date: payload.start_date,
      status: payload.status ?? InstallmentPlanStatus.ACTIVE,
      note: payload.note?.trim() ? payload.note.trim() : null,
    });

    return doc;
  }

  static async findByUid(uid: number): Promise<IInstallmentPlanDoc | null> {
    return InstallmentPlanModel.findOne({ uid }).exec();
  }

  static async findAll(filter: FilterQuery<IInstallmentPlanDoc> = {}): Promise<IInstallmentPlanDoc[]> {
    return InstallmentPlanModel.find(filter).sort({ created_at: -1 }).exec();
  }

  static async findWithPagination(
    filter: FilterQuery<IInstallmentPlanDoc> = {},
    page = 1,
    limit = 20,
    sort: Record<string, 1 | -1> = { created_at: -1 },
  ): Promise<IInstallmentPlanPaginatedResult> {
    const safePage = this.normalizePositiveInteger(page, 1);
    const safeLimit = this.normalizePositiveInteger(limit, 1, 200);
    const skip = (safePage - 1) * safeLimit;

    const [data, total] = await Promise.all([
      InstallmentPlanModel.find(filter).sort(sort).skip(skip).limit(safeLimit).exec(),
      InstallmentPlanModel.countDocuments(filter).exec(),
    ]);

    return { data, total, page: safePage, limit: safeLimit };
  }

  static async search(
    filter: FilterQuery<IInstallmentPlanDoc> = {},
    options: IInstallmentPlanSearchOptions = {},
  ): Promise<IInstallmentPlanDoc[]> {
    const sort = options.sort ?? { created_at: -1 };
    const query = InstallmentPlanModel.find(filter).sort(sort);

    if (options.limit !== undefined) {
      const safeLimit = this.normalizePositiveInteger(options.limit, 1, 500);
      query.limit(safeLimit);

      if (options.page !== undefined) {
        const safePage = this.normalizePositiveInteger(options.page, 1);
        query.skip((safePage - 1) * safeLimit);
      }
    }

    return query.exec();
  }

  static async updateByUid(uid: number, update: UpdateQuery<IInstallmentPlanDoc>): Promise<IInstallmentPlanDoc | null> {
    return InstallmentPlanModel.findOneAndUpdate({ uid }, update, { new: true }).exec();
  }

  static async createIndexes(): Promise<void> {
    await InstallmentPlanModel.createIndexes();
  }

  static async deleteByUid(uid: number): Promise<boolean> {
    const result = await InstallmentPlanModel.deleteOne({ uid }).exec();
    return (result.deletedCount ?? 0) > 0;
  }

  private static normalizePositiveInteger(value: unknown, min = 1, max = Number.MAX_SAFE_INTEGER): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return min;
    }
    const normalized = Math.trunc(numeric);
    if (normalized < min) {
      return min;
    }
    if (normalized > max) {
      return max;
    }
    return normalized;
  }
}

export { InstallmentPlanModel };
