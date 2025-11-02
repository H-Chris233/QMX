import mongoose, { Schema, Document } from 'mongoose';

export interface ICashDoc extends Document {
  uid: number;
  student_id: number | null;
  cash: number;
  note: string | null;
  created_at: Date;
  updated_at: Date;
}

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
    type: Number,
    required: true,
    comment: '金额（分为单位，正数表示收入，负数表示支出）'
  },
  note: {
    type: String,
    default: null,
    comment: '备注信息'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'cash_transactions',
  versionKey: false
});

CashSchema.index({ student_id: 1 });
CashSchema.index({ created_at: 1 });
CashSchema.index({ student_id: 1, created_at: 1 });

CashSchema.set('toJSON', {
  transform: function(doc, ret) {
    const transformed: any = { ...ret };
    delete transformed._id;
    delete transformed.__v;
    return transformed;
  }
});

const Cash = mongoose.models.Cash || mongoose.model<ICashDoc>('Cash', CashSchema);
export default Cash;