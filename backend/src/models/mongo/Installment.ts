import mongoose, { Schema, Document } from 'mongoose';
import logger from '@/utils/logger';

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
  YEARLY = 'yearly',
  CUSTOM = 'custom'
}

// 分期付款计划接口定义
export interface IInstallmentPlanDoc extends Document {
  plan_id: number;
  student_id: number;
  total_amount: number; // 分为单位
  total_installments: number;
  frequency: PaymentFrequency;
  custom_days?: number[];
  start_date: Date;
  status: InstallmentStatus;
  created_at: Date;
  updated_at: Date;
  
  // 方法
  getProgress(): number;
  getStatusText(): string;
  getFrequencyText(): string;
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
  total_installments: {
    type: Number,
    required: true,
    min: 1,
    comment: '分期期数'
  },
  custom_days: {
    type: [Number],
    default: undefined,
    comment: '自定义间隔天数（仅当frequency为custom时使用）'
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
InstallmentPlanSchema.methods.getProgress = async function(): Promise<number> {
  const paidCount = await mongoose.model('Installment').countDocuments({
    plan_id: this.plan_id,
    status: InstallmentStatus.PAID
  });
  return Number(((paidCount / this.total_installments) * 100).toFixed(1));
};

// 实例方法：获取状态文本
InstallmentPlanSchema.methods.getStatusText = function(): string {
  const statusMap = {
    [InstallmentStatus.PENDING]: '待付款',
    [InstallmentStatus.PAID]: '已付款',
    [InstallmentStatus.OVERDUE]: '逾期',
    [InstallmentStatus.CANCELLED]: '已取消'
  };
  return statusMap[this.status] || '未知';
};

// 实例方法：获取频率文本
InstallmentPlanSchema.methods.getFrequencyText = function(): string {
  const frequencyMap = {
    [PaymentFrequency.MONTHLY]: '月付',
    [PaymentFrequency.QUARTERLY]: '季付',
    [PaymentFrequency.YEARLY]: '年付',
    [PaymentFrequency.CUSTOM]: '自定义'
  };
  return frequencyMap[this.frequency] || '未知';
};

// 静态方法：获取学生分期计划
InstallmentPlanSchema.statics.findByStudent = function(studentId: number) {
  return this.find({ student_id: studentId }).sort({ created_at: -1 });
};

// 静态方法：获取活跃计划
InstallmentPlanSchema.statics.findActive = function() {
  return this.find({ status: { $ne: InstallmentStatus.CANCELLED } });
};

// 静态方法：获取逾期统计
InstallmentPlanSchema.statics.getOverdueStats = async function() {
  const overdueInstallments = await mongoose.model('Installment').find({
    due_date: { $lt: new Date() },
    status: InstallmentStatus.PENDING
  });
  
  const planIds = [...new Set(overdueInstallments.map(i => i.plan_id))];
  return this.find({ plan_id: { $in: planIds } });
};

// 中间件：数据验证
InstallmentPlanSchema.pre('save', function(next) {
  if (this.isModified('total_amount') && this.total_amount <= 0) {
    return next(new Error('分期总金额必须大于0'));
  }
  if (this.isModified('total_installments') && this.total_installments <= 0) {
    return next(new Error('分期期数必须大于0'));
  }
  next();
});

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
  total_amount: number; // 分为单位
  total_installments: number;
  current_installment: number;
  frequency: PaymentFrequency;
  custom_days?: number[];
  due_date: Date;
  status: InstallmentStatus;
  cash_uid?: number;
  created_at: Date;
  updated_at: Date;
  
  // 方法
  getInstallmentAmount(): number;
  isPaid(): boolean;
  isOverdue(): boolean;
  getDaysOverdue(): number;
  getStatusText(): string;
  getFrequencyText(): string;
  getProgress(): string;
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
  total_amount: {
    type: Schema.Types.Long,
    required: true,
    comment: '总金额（分为单位）'
  },
  total_installments: {
    type: Number,
    required: true,
    min: 1,
    comment: '总期数'
  },
  current_installment: {
    type: Number,
    required: true,
    min: 1,
    comment: '当前期号'
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
    comment: '自定义间隔天数（仅当frequency为custom时使用）'
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

// 索引优化
InstallmentSchema.index({ plan_id: 1 });
InstallmentSchema.index({ status: 1 });
InstallmentSchema.index({ due_date: 1 });
InstallmentSchema.index({ cash_uid: 1 });
InstallmentSchema.index({ plan_id: 1, installment_number: 1 });
InstallmentSchema.index({ due_date: 1, status: 1 });

// 实例方法：获取每期金额
InstallmentSchema.methods.getInstallmentAmount = function(): number {
  return Math.round(this.total_amount / this.total_installments);
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
InstallmentSchema.methods.getDaysOverdue = function(): number {
  if (!this.isOverdue()) {
    return 0;
  }
  const now = new Date();
  const dueDate = new Date(this.due_date);
  return Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
};

// 实例方法：获取状态文本
InstallmentSchema.methods.getStatusText = function(): string {
  const statusMap = {
    [InstallmentStatus.PENDING]: '待付款',
    [InstallmentStatus.PAID]: '已付款',
    [InstallmentStatus.OVERDUE]: '逾期',
    [InstallmentStatus.CANCELLED]: '已取消'
  };
  return statusMap[this.status] || '未知';
};

// 实例方法：获取频率文本
InstallmentSchema.methods.getFrequencyText = function(): string {
  const frequencyMap = {
    [PaymentFrequency.MONTHLY]: '月付',
    [PaymentFrequency.QUARTERLY]: '季付',
    [PaymentFrequency.YEARLY]: '年付',
    [PaymentFrequency.CUSTOM]: '自定义'
  };
  return frequencyMap[this.frequency] || '未知';
};

// 实例方法：获取进度
InstallmentSchema.methods.getProgress = function(): string {
  return `${this.current_installment}/${this.total_installments}`;
};

// 静态方法：获取逾期分期
InstallmentSchema.statics.findOverdue = function() {
  return this.find({
    due_date: { $lt: new Date() },
    status: InstallmentStatus.PENDING
  }).sort({ due_date: 1 });
};

// 静态方法：按学生查找
InstallmentSchema.statics.findByStudent = function(studentId: number) {
  return this.find({ plan_id: studentId }).sort({ due_date: 1 });
};

// 静态方法：按状态查找
InstallmentSchema.statics.findByStatus = function(status: InstallmentStatus) {
  return this.find({ status }).sort({ due_date: 1 });
};

// 静态方法：获取逾期统计
InstallmentSchema.statics.getOverdueStats = async function() {
  const overdueInstallments = await this.findOverdue();
  const totalOverdueAmount = overdueInstallments.reduce((sum, installment) => {
    return sum + installment.getInstallmentAmount();
  }, 0);
  
  return {
    count: overdueInstallments.length,
    totalAmount: totalOverdueAmount,
    averageDays: overdueInstallments.length > 0 ? 
      Math.round(overdueInstallments.reduce((sum, i) => sum + i.getDaysOverdue(), 0) / overdueInstallments.length) : 0
  };
};

// 中间件：数据验证
InstallmentSchema.pre('save', function(next) {
  if (this.isModified('current_installment') && (this.current_installment < 1 || this.current_installment > this.total_installments)) {
    return next(new Error('当前期号必须在1到总期数之间'));
  }
  if (this.isModified('total_amount') && this.total_amount <= 0) {
    return next(new Error('分期总金额必须大于0'));
  }
  next();
});

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