import mongoose, { Schema, Document } from 'mongoose';

export interface IStudentDoc extends Document {
  uid: number;
  name: string;
  phone: string | null;
  class: string;
  subject: string;
  lesson_left: number;
  scores: number[];
  membership_start_date: Date | null;
  membership_end_date: Date | null;
  note?: string;
  created_at: Date;
  updated_at: Date;
}

const StudentSchema = new Schema<IStudentDoc>({
  uid: {
    type: Number,
    required: true,
    unique: true,
    index: true,
    comment: '学生唯一ID'
  },
  name: {
    type: String,
    required: true,
    trim: true,
    comment: '学生姓名'
  },
  phone: {
    type: String,
    trim: true,
    default: null,
    comment: '联系电话'
  },
  class: {
    type: String,
    required: true,
    trim: true,
    comment: '班级'
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    comment: '科目'
  },
  lesson_left: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
    comment: '剩余课时'
  },
  scores: {
    type: [Number],
    default: [],
    comment: '成绩列表'
  },
  membership_start_date: {
    type: Date,
    default: null,
    comment: '会员开始日期'
  },
  membership_end_date: {
    type: Date,
    default: null,
    comment: '会员结束日期'
  },
  note: {
    type: String,
    trim: true,
    default: null,
    comment: '备注信息'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'students',
  versionKey: false
});

StudentSchema.index({ phone: 1 });
StudentSchema.index({ class: 1 });
StudentSchema.index({ subject: 1 });
StudentSchema.index({ membership_end_date: 1 });

StudentSchema.set('toJSON', {
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Student = mongoose.models.Student || mongoose.model<IStudentDoc>('Student', StudentSchema);
export default Student;