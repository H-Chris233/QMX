import mongoose, { Schema, Document } from 'mongoose';
import logger from '@/utils/logger';

// 学生接口定义
export interface IStudentDoc extends Document {
  uid: number;
  name: string;
  phone: string | null;
  class: string;
  subject: string;
  lesson_left: number;
  rings: number[];
  membership_start_date: Date | null;
  membership_end_date: Date | null;
  note?: string;
  created_at: Date;
  updated_at: Date;
  
  // 方法
  getAverageScore(): number;
  hasMembership(): boolean;
  getMembershipDaysRemaining(): number | null;
  updateScore(newScore: number): void;
  addMembershipDays(days: number): void;
}

// 学生Schema
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
  rings: {
    type: [Number],
    default: [],
    comment: '成绩列表'
  },
  membership_start_date: {
    type: Date,
    default: null,
    comment: '会员开始日期'
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

// 索引优化
StudentSchema.index({ phone: 1 });
StudentSchema.index({ class: 1 });
StudentSchema.index({ subject: 1 });
StudentSchema.index({ membership_end_date: 1 });
StudentSchema.index({ class: 1, subject: 1 });

// 实例方法：检查是否有会员
StudentSchema.methods.hasMembership = function(): boolean {
  const now = new Date();
  return this.membership_start_date !== null &&
         this.membership_end_date !== null &&
         this.membership_start_date <= now &&
         this.membership_end_date >= now;
};

// 实例方法：获取会员剩余天数
StudentSchema.methods.getMembershipDaysRemaining = function(): number | null {
  if (!this.hasMembership()) {
    return null;
  }
  const now = new Date();
  const endDate = new Date(this.membership_end_date);
  const timeDiff = endDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
};

// 实例方法：获取平均分
StudentSchema.methods.getAverageScore = function(): number {
  if (!this.rings || this.rings.length === 0) {
    return 0;
  }
  const sum = this.rings.reduce((total: number, score: number) => total + score, 0);
  return Number((sum / this.rings.length).toFixed(2));
};

// 实例方法：更新成绩
StudentSchema.methods.updateScore = function(newScore: number): void {
  if (!this.rings) {
    this.rings = [];
  }
  this.rings.push(newScore);
  // 只保留最近20次成绩
  if (this.rings.length > 20) {
    this.rings = this.rings.slice(-20);
  }
};

// 实例方法：添加会员天数
StudentSchema.methods.addMembershipDays = function(days: number): void {
  const now = new Date();
  if (!this.membership_end_date || this.membership_end_date < now) {
    this.membership_start_date = now;
    this.membership_end_date = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  } else {
    this.membership_end_date = new Date(this.membership_end_date.getTime() + days * 24 * 60 * 60 * 1000);
  }
};

// 静态方法：根据手机号查找
StudentSchema.statics.findByPhone = function(phone: string) {
  return this.findOne({ phone: phone?.trim() || null });
};

// 静态方法：查找有会员的学生
StudentSchema.statics.findWithMembership = function() {
  return this.find({
    membership_end_date: { $exists: true, $ne: null }
  });
};

// 静态方法：查找即将到期的会员
StudentSchema.statics.findExpiringSoon = function(days: number = 30) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + days);
  
  return this.find({
    membership_end_date: {
      $gte: new Date(),
      $lte: targetDate
    }
  }).sort({ membership_end_date: 1 });
};

// 虚拟字段：会员状态
StudentSchema.virtual('membership_status').get(function(): string {
  if (!this.hasMembership()) {
    return this.membership_end_date ? '已过期' : '无会员';
  }
  const daysRemaining = this.getMembershipDaysRemaining();
  if (daysRemaining && daysRemaining <= 7) {
    return '即将到期';
  }
  return '有效';
});

// 确保虚拟字段包含在JSON中
StudentSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

StudentSchema.set('toObject', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// 中间件：数据清理
StudentSchema.pre('save', function(next) {
  if (this.isModified('phone') && this.phone) {
    this.phone = this.phone.trim();
  }
  if (this.isModified('name')) {
    this.name = this.name.trim();
  }
  if (this.isModified('class')) {
    this.class = this.class.trim();
  }
  if (this.isModified('subject')) {
    this.subject = this.subject.trim();
  }
  next();
});

// 导出模型
const Student = mongoose.models.Student || mongoose.model<IStudentDoc>('Student', StudentSchema);
export default Student;