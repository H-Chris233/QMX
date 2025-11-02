import { Schema, model, Document } from 'mongoose';
import { ClassType, SubjectType } from '@/types';

// Student MongoDB 接口
export interface IStudentDoc extends Document {
  uid: number;
  age: number | null;
  name: string;
  phone: string;
  lessonLeft: number | null;
  class: ClassType;
  subject: SubjectType;
  rings: number[];
  note: string;
  membershipStartDate: Date | null;
  membershipEndDate: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // 实例方法
  hasMembership(): boolean;
  getMembershipDaysRemaining(): number | null;
  getAverageScore(): number;
  getMaxScore(): number;
  getMinScore(): number;
  addScore(score: number): void;
  removeScore(index: number): void;
  updateScore(index: number, newScore: number): void;
}

// MongoDB Schema 定义
const studentSchema = new Schema<IStudentDoc>({
  uid: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  age: {
    type: Number,
    min: 0,
    max: 120,
    default: null
  },
  name: {
    type: String,
    required: [true, '学员姓名不能为空'],
    trim: true,
    maxlength: [50, '学员姓名长度必须在1-50字符之间'],
    index: true
  },
  phone: {
    type: String,
    required: [true, '手机号不能为空'],
    default: '未填写',
    validate: {
      validator: function(v: string) {
        return /^1[3-9]\d{9}$|^未填写$/.test(v);
      },
      message: '手机号格式不正确'
    },
    index: true
  },
  lessonLeft: {
    type: Number,
    min: 0,
    default: null
  },
  class: {
    type: String,
    enum: Object.values(ClassType),
    required: [true, '班级类型不能为空'],
    default: ClassType.OTHERS,
    index: true
  },
  subject: {
    type: String,
    enum: Object.values(SubjectType),
    required: [true, '科目类型不能为空'],
    default: SubjectType.OTHERS,
    index: true
  },
  rings: {
    type: [Number],
    default: [],
    validate: {
      validator: function(v: number[]) {
        return v.every(score => typeof score === 'number' && !isNaN(score));
      },
      message: '成绩数组必须是有效的数字数组'
    }
  },
  note: {
    type: String,
    trim: true,
    maxlength: [1000, '备注长度不能超过1000字符'],
    default: ''
  },
  membershipStartDate: {
    type: Date,
    default: null
  },
  membershipEndDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true, // 自动添加 createdAt, updatedAt
  collection: 'students',
  versionKey: false
});

// 复合索引
studentSchema.index({ membershipStartDate: 1, membershipEndDate: 1 });
studentSchema.index({ name: 1, phone: 1 });
studentSchema.index({ class: 1, subject: 1 });

// 实例方法实现
studentSchema.methods.hasMembership = function(): boolean {
  if (!this.membershipStartDate || !this.membershipEndDate) {
    return false;
  }
  const now = new Date();
  return now >= this.membershipStartDate && now <= this.membershipEndDate;
};

studentSchema.methods.getMembershipDaysRemaining = function(): number | null {
  if (!this.membershipEndDate) {
    return null;
  }
  const now = new Date();
  if (now > this.membershipEndDate) {
    return 0;
  }
  const diffTime = this.membershipEndDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

studentSchema.methods.getAverageScore = function(): number {
  if (this.rings.length === 0) {
    return 0;
  }
  const sum = this.rings.reduce((acc: number, score: number) => acc + score, 0);
  return Number((sum / this.rings.length).toFixed(1));
};

studentSchema.methods.getMaxScore = function(): number {
  if (this.rings.length === 0) {
    return 0;
  }
  return Math.max(...this.rings);
};

studentSchema.methods.getMinScore = function(): number {
  if (this.rings.length === 0) {
    return 0;
  }
  return Math.min(...this.rings);
};

studentSchema.methods.addScore = function(score: number): void {
  this.rings.push(score);
  this.markModified('rings');
};

studentSchema.methods.removeScore = function(index: number): void {
  if (index >= 0 && index < this.rings.length) {
    this.rings.splice(index, 1);
    this.markModified('rings');
  }
};

studentSchema.methods.updateScore = function(index: number, newScore: number): void {
  if (index >= 0 && index < this.rings.length) {
    this.rings[index] = newScore;
    this.markModified('rings');
  }
};

// 虚拟字段
studentSchema.virtual('isMembershipActive').get(function() {
  return this.hasMembership();
});

studentSchema.virtual('membershipDaysRemaining').get(function() {
  return this.getMembershipDaysRemaining();
});

// JSON 序列化时转换字段名
studentSchema.methods.toJSON = function() {
  const obj = this.toObject();
  return {
    uid: obj.uid,
    name: obj.name,
    age: obj.age,
    class: obj.class,
    phone: obj.phone,
    rings: obj.rings,
    note: obj.note,
    cash: obj.cash || '',
    subject: obj.subject,
    lesson_left: obj.lessonLeft,
    membership_start_date: obj.membershipStartDate ? obj.membershipStartDate.toISOString().split('T')[0] : null,
    membership_end_date: obj.membershipEndDate ? obj.membershipEndDate.toISOString().split('T')[0] : null,
    is_membership_active: this.hasMembership(),
    membership_days_remaining: this.getMembershipDaysRemaining()
  };
};

// 创建并导出模型
export const StudentModel = model<IStudentDoc>('Student', studentSchema);

// 导出函数组件式接口
export class Student {
  static async findByUid(uid: number): Promise<IStudentDoc | null> {
    return await StudentModel.findOne({ uid }).exec();
  }

  static async findAll(): Promise<IStudentDoc[]> {
    return await StudentModel.find().sort({ createdAt: -1 }).exec();
  }

  static async create(data: Partial<IStudentDoc>): Promise<IStudentDoc> {
    // 获取下一个UID
    const lastStudent = await StudentModel.findOne().sort({ uid: -1 }).exec();
    const nextUid = lastStudent ? lastStudent.uid + 1 : 1;

    return await StudentModel.create({ ...data, uid: nextUid });
  }

  static async updateByUid(uid: number, data: Partial<IStudentDoc>): Promise<IStudentDoc | null> {
    return await StudentModel.findOneAndUpdate({ uid }, data, { new: true, runValidators: true }).exec();
  }

  static async deleteByUid(uid: number): Promise<boolean> {
    const result = await StudentModel.deleteOne({ uid }).exec();
    return result.deletedCount > 0;
  }

  static async search(criteria: any): Promise<IStudentDoc[]> {
    return await StudentModel.find(criteria).sort({ createdAt: -1 }).exec();
  }

  static async count(criteria: any = {}): Promise<number> {
    return await StudentModel.countDocuments(criteria).exec();
  }
}

// 导出类型和模型
export default Student;
export { StudentModel, IStudentDoc };