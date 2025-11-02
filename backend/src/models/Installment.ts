import mongoose, { Schema, Document } from 'mongoose';

export enum InstallmentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

export enum PaymentFrequency {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom'
}

export interface IInstallmentDoc extends Document {
  uid: number;
  plan_id: number;
  student_id: number;
  total_amount: number;
  installment_number: number;
  total_installments: number;
  amount: number;
  frequency: PaymentFrequency;
  custom_days?: number[];
  due_date: Date;
  status: InstallmentStatus;
  cash_uid?: number;
  created_at: Date;
  updated_at: Date;
}

const InstallmentSchema = new Schema<IInstallmentDoc>({
  uid: {
    type: Number,
    required: true,
    unique: true,
    index: true,
    comment: '分期唯一ID'
  },
  plan_id: {
    type: Number,
    required: true,
    index: true,
    comment: '分期计划ID'
  },
  student_id: {
    type: Number,
    required: true,
    index: true,
    comment: '关联学生ID'
  },
  total_amount: {
    type: Number,
    required: true,
    comment: '总金额（分为单位）'
  },
  installment_number: {
    type: Number,
    required: true,
    min: 1,
    comment: '当前期号'
  },
  total_installments: {
    type: Number,
    required: true,
    min: 1,
    comment: '总期数'
  },
  amount: {
    type: Number,
    required: true,
    comment: '当期金额（分为单位）'
  },
  frequency: {
    type: String,
    enum: Object.values(PaymentFrequency),
    default: PaymentFrequency.MONTHLY,
    comment: '付款频率'
  },
  custom_days: {
    type: [Number],
    default: undefined,
    comment: '自定义间隔天数'
  },
  due_date: {
    type: Date,
    required: true,
    comment: '应付款日期'
  },
  status: {
    type: String,
    enum: Object.values(InstallmentStatus),
    default: InstallmentStatus.PENDING,
    comment: '分期状态'
  },
  cash_uid: {
    type: Number,
    default: undefined,
    index: true,
    comment: '关联的交易记录ID'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'installments',
  versionKey: false
});

InstallmentSchema.index({ plan_id: 1 });
InstallmentSchema.index({ student_id: 1 });
InstallmentSchema.index({ status: 1 });
InstallmentSchema.index({ due_date: 1 });
InstallmentSchema.index({ plan_id: 1, installment_number: 1 });

InstallmentSchema.set('toJSON', {
  transform: function(doc, ret) {
    const transformed: any = { ...ret };
    delete transformed._id;
    delete transformed.__v;
    return transformed;
  }
});

export default mongoose.model<IInstallmentDoc>('Installment', InstallmentSchema);