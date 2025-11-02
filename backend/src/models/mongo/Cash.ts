import mongoose, { Schema, Document } from 'mongoose';

// 交易记录接口定义
export interface ICashDoc extends Document {
  uid: number;
  student_id: number | null;
  cash: number;
  note: string | null;
  created_at: Date;
  updated_at: Date;
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

export default mongoose.model<ICashDoc>('Cash', CashSchema);