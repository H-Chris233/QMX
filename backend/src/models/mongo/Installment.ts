import mongoose, { Schema, Document } from 'mongoose';

// 分期付款状态枚举
export enum InstallmentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

// 分期付款频率枚举
export enum PaymentFrequency {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly'
}

// 分期付款计划接口定义
export interface IInstallmentPlanDoc extends Document {
  plan_id: number;
  student_id: number;
  total_amount: number; // 分为单位
  frequency: PaymentFrequency;
  installment_count: number;
  installment_amount: number; // 分为单位
  start_date: Date;
  status: InstallmentStatus;
  created_at: Date;
  updated_at: Date;
}

// 分期付款计划Schema
const InstallmentPlanSchema = new Schema<IInstallmentPlanDoc>({
  plan_id: {
    type: Number,
    required: true,
    unique: true,
    index: true,
    comment: '分期计划唯一ID'
  },
  student_id: {
    type: Number,
    required: true,
    index: true,
    comment: '关联学生ID'
  },
  total_amount: {
    type: Schema.Types.Long,
    required: true,
    comment: '总金额（分为单位）'
  },
  frequency: {
    type: String,
    enum: Object.values(PaymentFrequency),
    default: PaymentFrequency.MONTHLY,
    comment: '付款频率'
  },
  installment_count: {
    type: Number,
    required: true,
    min: 1,
    comment: '分期期数'
  },
  installment_amount: {
    type: Schema.Types.Long,
    required: true,
    comment: '每期金额（分为单位）'
  },
  start_date: {
    type: Date,
    required: true,
    comment: '开始日期'
  },
  status: {
    type: String,
    enum: Object.values(InstallmentStatus),
    default: InstallmentStatus.PENDING,
    comment: '计划状态'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'installment_plans',
  versionKey: false
});

// 索引优化
InstallmentPlanSchema.index({ student_id: 1 });
InstallmentPlanSchema.index({ status: 1 });
InstallmentPlanSchema.index({ start_date: 1 });
InstallmentPlanSchema.index({ student_id: 1, status: 1 });

// 虚拟字段：已付期数
InstallmentPlanSchema.virtual('paid_installments', {
  ref: 'Installment',
  localField: 'plan_id',
  foreignField: 'plan_id',
  match: { status: InstallmentStatus.PAID },
  count: true
});

// 虚拟字段：总期数
InstallmentPlanSchema.virtual('total_installments', {
  ref: 'Installment',
  localField: 'plan_id',
  foreignField: 'plan_id',
  count: true
});

// 实例方法：获取进度百分比
InstallmentPlanSchema.methods.getProgress = function(): number {
  const totalInstallments = this.installment_count;
  // 这个方法需要在populate后调用
  if (this.paid_installments !== undefined) {
    return Number(((this.paid_installments / totalInstallments) * 100).toFixed(1));
  }
  return 0;
};

// 确保虚拟字段包含在JSON中
InstallmentPlanSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// 分期付款详情接口定义
export interface IInstallmentDoc extends Document {
  uid: number;
  plan_id: number;
  installment_number: number;
  amount: number; // 分为单位
  due_date: Date;
  status: InstallmentStatus;
  cash_uid: number | null;
  created_at: Date;
  updated_at: Date;
}

// 分期付款详情Schema
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
    comment: '关联分期计划ID'
  },
  installment_number: {
    type: Number,
    required: true,
    min: 1,
    comment: '分期期号'
  },
  amount: {
    type: Schema.Types.Long,
    required: true,
    comment: '金额（分为单位）'
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
    default: null,
    index: true,
    comment: '关联的交易记录ID'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'installments',
  versionKey: false
});

// 索引优化
InstallmentSchema.index({ plan_id: 1 });
InstallmentSchema.index({ status: 1 });
InstallmentSchema.index({ due_date: 1 });
InstallmentSchema.index({ cash_uid: 1 });
InstallmentSchema.index({ plan_id: 1, installment_number: 1 });
InstallmentSchema.index({ due_date: 1, status: 1 });

// 实例方法：获取金额
InstallmentSchema.methods.getInstallmentAmount = function(): number {
  return this.amount;
};

// 实例方法：是否已付
InstallmentSchema.methods.isPaid = function(): boolean {
  return this.status === InstallmentStatus.PAID;
};

// 实例方法：是否逾期
InstallmentSchema.methods.isOverdue = function(): boolean {
  if (this.status === InstallmentStatus.PAID || this.status === InstallmentStatus.CANCELLED) {
    return false;
  }
  return new Date() > this.due_date;
};

// 实例方法：获取逾期天数
InstallmentSchema.methods.getOverdueDays = function(): number {
  if (!this.isOverdue()) {
    return 0;
  }
  const now = new Date();
  const dueDate = new Date(this.due_date);
  return Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
};

// 确保虚拟字段包含在JSON中
InstallmentSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// 创建关联
InstallmentPlanSchema.virtual('installments', {
  ref: 'Installment',
  localField: 'plan_id',
  foreignField: 'plan_id'
});

// 导出模型
export default mongoose.model<IInstallmentPlanDoc>('InstallmentPlan', InstallmentPlanSchema);
export const InstallmentModel = mongoose.model<IInstallmentDoc>('Installment', InstallmentSchema);