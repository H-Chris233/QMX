import mongoose, { Schema, Document } from 'mongoose';
import logger from '@/utils/logger';

// 交易记录接口定义
export interface ICashDoc extends Document {
  uid: number;
  student_id: number | null;
  cash: number;
  note: string | null;
  created_at: Date;
  updated_at: Date;
  
  // 方法
  getAmount(): number;
  isIncome(): boolean;
  isExpense(): boolean;
  getFormattedAmount(): string;
  getTransactionDescription(): string;
}

// 交易记录Schema
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
    comment: '关联学生ID'
  },
  cash: {
    type: Schema.Types.Long,
    required: true,
    comment: '金额（分为单位，正数表示收入，负数表示支出）'
  },
  note: {
    type: String,
    default: null,
    comment: '备注信息，可能包含分期付款信息'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'cash_transactions',
  versionKey: false
});

// 索引优化
CashSchema.index({ student_id: 1 });
CashSchema.index({ cash: 1 });
CashSchema.index({ created_at: 1 });
CashSchema.index({ student_id: 1, created_at: 1 });

// 实例方法：获取金额
CashSchema.methods.getAmount = function(): number {
  return this.cash;
};

// 实例方法：是否为收入
CashSchema.methods.isIncome = function(): boolean {
  return this.cash > 0;
};

// 实例方法：是否为支出
CashSchema.methods.isExpense = function(): boolean {
  return this.cash < 0;
};

// 实例方法：格式化金额显示
CashSchema.methods.getFormattedAmount = function(): string {
  const absAmount = Math.abs(this.cash);
  const prefix = this.cash >= 0 ? '+' : '-';
  return `${prefix}¥${absAmount.toFixed(2)}`;
};

// 虚拟字段：关联的分期付款信息
CashSchema.virtual('installment_plan').get(function(): any {
  if (this.note && typeof this.note === 'string') {
    try {
      const noteData = JSON.parse(this.note);
      if (noteData.installment_id) {
        return {
          plan_id: noteData.installment_id,
          installment_number: noteData.installment_number
        };
      }
    } catch (e) {
      // 解析失败，返回undefined
    }
  }
  return undefined;
});

// 确保虚拟字段包含在JSON中
CashSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

CashSchema.set('toObject', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// 实例方法：获取交易描述
CashSchema.methods.getTransactionDescription = function(): string {
  const amount = Math.abs(this.cash);
  const prefix = this.cash >= 0 ? '收入' : '支出';
  return `${prefix} ¥${(amount / 100).toFixed(2)}`;
};

// 静态方法：按学生统计收入
CashSchema.statics.getStudentIncomeStats = async function(studentId?: number) {
  const matchCondition: any = { cash: { $gt: 0 } };
  if (studentId) {
    matchCondition.student_id = studentId;
  }
  
  return this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: '$student_id',
        totalIncome: { $sum: '$cash' },
        transactionCount: { $sum: 1 },
        avgAmount: { $avg: '$cash' }
      }
    },
    { $sort: { totalIncome: -1 } }
  ]);
};

// 静态方法：获取财务统计
CashSchema.statics.getFinancialStats = async function(period: string = 'month') {
  const now = new Date();
  let dateFrom: Date;
  
  switch (period) {
    case 'week':
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      dateFrom = new Date(now.getFullYear(), quarter * 3, 1);
      break;
    case 'year':
      dateFrom = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  
  return this.aggregate([
    { $match: { created_at: { $gte: dateFrom } } },
    {
      $group: {
        _id: null,
        totalIncome: { $sum: { $cond: [{ $gt: ['$cash', 0] }, '$cash', 0] } },
        totalExpense: { $sum: { $cond: [{ $lt: ['$cash', 0] }, { $abs: '$cash' }, 0] } },
        transactionCount: { $sum: 1 }
      }
    }
  ]);
};

// 中间件：数据验证
CashSchema.pre('save', function(next) {
  if (this.cash === 0) {
    return next(new Error('交易金额不能为0'));
  }
  if (this.isModified('note') && this.note) {
    this.note = this.note.trim();
  }
  next();
});

// 导出模型
const Cash = mongoose.models.Cash || mongoose.model<ICashDoc>('Cash', CashSchema);
export default Cash;