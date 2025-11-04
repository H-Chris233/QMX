import mongoose, { Document, FilterQuery, Schema, UpdateQuery, Model } from 'mongoose';
import { AppError } from '@/utils/errors';
import { InstallmentStatus } from '@/types';
import { getNextSequence, INSTALLMENT_SEQUENCE_NAME } from './counter';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export interface IInstallmentDoc extends Document {
  uid: number;
  plan_id: number;
  installment_amount: number;
  current_installment: number;
  total_installments: number;
  due_date: Date;
  status: InstallmentStatus;
  paid_amount: number;
  paid_at: Date | null;
  student_id: number | null;
  cash_uid: number | null;
  created_at: Date;
  updated_at: Date;

  isOverdue(referenceDate?: Date): boolean;
  getDaysOverdue(referenceDate?: Date): number;
  getRemainingAmount(): number;
}

export interface IInstallmentCreatePayload {
  plan_id: number;
  installment_amount: number;
  current_installment: number;
  total_installments: number;
  due_date: Date;
  status?: InstallmentStatus;
  paid_amount?: number | null;
  paid_at?: Date | null;
  student_id?: number | null;
  cash_uid?: number | null;
}

const InstallmentSchema = new Schema<IInstallmentDoc>({
  uid: {
    type: Number,
    required: true,
    unique: true,
    index: true,
    comment: '分期记录唯一ID',
  },
  plan_id: {
    type: Number,
    required: true,
    index: true,
    comment: '关联分期计划UID',
  },
  installment_amount: {
    type: Number,
    required: true,
    min: [1, '分期金额必须大于0'],
    comment: '分期金额（单位：分）',
  },
  current_installment: {
    type: Number,
    required: true,
    min: [1, '当前期数必须大于0'],
    comment: '当前期数',
  },
  total_installments: {
    type: Number,
    required: true,
    min: [1, '总期数必须大于0'],
    comment: '总期数',
  },
  due_date: {
    type: Date,
    required: true,
    index: true,
    comment: '到期日期',
  },
  status: {
    type: String,
    required: true,
    enum: Object.values(InstallmentStatus),
    default: InstallmentStatus.PENDING,
    index: true,
    comment: '分期状态',
  },
  paid_amount: {
    type: Number,
    default: 0,
    min: [0, '已付金额不能为负'],
    comment: '已付金额（单位：分）',
  },
  paid_at: {
    type: Date,
    default: null,
    comment: '支付时间',
  },
  student_id: {
    type: Number,
    default: null,
    index: true,
    comment: '关联学生UID',
  },
  cash_uid: {
    type: Number,
    default: null,
    comment: '关联现金记录UID',
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'installments',
  versionKey: false,
});

InstallmentSchema.index({ plan_id: 1, current_installment: 1 }, { unique: true });

InstallmentSchema.methods.isOverdue = function isOverdue(this: IInstallmentDoc, referenceDate: Date = new Date()): boolean {
  if (this.status === InstallmentStatus.CANCELLED || this.status === InstallmentStatus.PAID) {
    return false;
  }
  if (this.status === InstallmentStatus.OVERDUE) {
    return true;
  }
  const reference = new Date(referenceDate);
  return this.due_date.getTime() < reference.getTime();
};

InstallmentSchema.methods.getDaysOverdue = function getDaysOverdue(this: IInstallmentDoc, referenceDate: Date = new Date()): number {
  if (!this.isOverdue(referenceDate)) {
    return 0;
  }
  const ref = new Date(referenceDate);
  const due = new Date(this.due_date);

  const refMidnight = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  const diff = Math.floor((refMidnight.getTime() - dueMidnight.getTime()) / MS_PER_DAY);
  return diff > 0 ? diff : 0;
};

InstallmentSchema.methods.getRemainingAmount = function getRemainingAmount(this: IInstallmentDoc): number {
  const paid = this.paid_amount ?? 0;
  const remaining = this.installment_amount - paid;
  return remaining > 0 ? remaining : 0;
};

InstallmentSchema.methods.toJSON = function toJSON(this: IInstallmentDoc) {
  const isOverdue = this.isOverdue();
  const remaining = this.getRemainingAmount();

  return {
    uid: this.uid,
    plan_id: this.plan_id,
    planId: this.plan_id,
    student_id: this.student_id,
    studentId: this.student_id,
    current_installment: this.current_installment,
    currentInstallment: this.current_installment,
    total_installments: this.total_installments,
    totalInstallments: this.total_installments,
    installment_amount: this.installment_amount,
    installmentAmount: this.installment_amount,
    due_date: this.due_date,
    dueDate: this.due_date,
    status: this.status,
    is_overdue: isOverdue,
    isOverdue,
    days_overdue: this.getDaysOverdue(),
    daysOverdue: this.getDaysOverdue(),
    paid_amount: this.paid_amount,
    paidAmount: this.paid_amount,
    paid_at: this.paid_at,
    paidAt: this.paid_at,
    remaining_amount: remaining,
    remainingAmount: remaining,
    cash_uid: this.cash_uid,
    cashUid: this.cash_uid,
    created_at: this.created_at,
    createdAt: this.created_at,
    updated_at: this.updated_at,
    updatedAt: this.updated_at,
  };
};

const InstallmentModel: Model<IInstallmentDoc> = (mongoose.models.Installment as Model<IInstallmentDoc> | undefined)
  ?? mongoose.model<IInstallmentDoc>('Installment', InstallmentSchema);

export class Installment {
  static async create(payload: IInstallmentCreatePayload): Promise<IInstallmentDoc> {
    if (!Number.isInteger(payload.installment_amount) || payload.installment_amount <= 0) {
      throw AppError.invalidInput('分期金额必须以分为单位存储且大于0');
    }

    const uid = await getNextSequence(INSTALLMENT_SEQUENCE_NAME);

    const doc = await InstallmentModel.create({
      uid,
      plan_id: payload.plan_id,
      installment_amount: payload.installment_amount,
      current_installment: payload.current_installment,
      total_installments: payload.total_installments,
      due_date: payload.due_date,
      status: payload.status ?? InstallmentStatus.PENDING,
      paid_amount: payload.paid_amount ?? 0,
      paid_at: payload.paid_at ?? null,
      student_id: payload.student_id ?? null,
      cash_uid: payload.cash_uid ?? null,
    });

    return doc;
  }

  static async findByUid(uid: number): Promise<IInstallmentDoc | null> {
    return InstallmentModel.findOne({ uid }).exec();
  }

  static async findByPlanId(planId: number): Promise<IInstallmentDoc[]> {
    return InstallmentModel.find({ plan_id: planId }).sort({ current_installment: 1 }).exec();
  }

  static async updateByUid(uid: number, update: UpdateQuery<IInstallmentDoc>): Promise<IInstallmentDoc | null> {
    return InstallmentModel.findOneAndUpdate({ uid }, update, { new: true }).exec();
  }

  static async deleteByUid(uid: number): Promise<boolean> {
    const result = await InstallmentModel.deleteOne({ uid }).exec();
    return (result.deletedCount ?? 0) > 0;
  }

  static async findOverdue(referenceDate: Date = new Date()): Promise<IInstallmentDoc[]> {
    return InstallmentModel.find({
      status: { $in: [InstallmentStatus.PENDING, InstallmentStatus.OVERDUE] },
      due_date: { $lt: referenceDate },
    }).sort({ due_date: 1 }).exec();
  }

  static async findAll(filter: FilterQuery<IInstallmentDoc> = {}): Promise<IInstallmentDoc[]> {
    return InstallmentModel.find(filter).exec();
  }

  static async createIndexes(): Promise<void> {
    await InstallmentModel.createIndexes();
  }
}

export { InstallmentModel };
