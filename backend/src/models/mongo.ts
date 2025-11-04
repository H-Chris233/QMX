import { Schema, model, Document, Types } from 'mongoose';
import { getNextSequence, STUDENT_SEQUENCE_NAME } from './counter';
import { ClassType, SubjectType } from '@/types';
import { AppError } from '@/utils/errors';

const TEN_TRY_DEFAULT_LESSON = 10;
const PHONE_REGEX = /^1[3-9]\d{9}$/;
const SCORE_MIN = 0;
const SCORE_MAX = 10;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

type NullableDate = Date | null | undefined;

const formatDate = (value: NullableDate, withTime = false): string | null => {
  if (!value) {
    return null;
  }

  const iso = value.toISOString();
  if (withTime) {
    return iso;
  }
  return iso.split('T')[0];
};

const ensureNonNegativeInteger = (value: number, field: string): number => {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw AppError.invalidInput(`${field} 必须是非负整数`);
  }
  return value;
};

const ensureValidScore = (score: number): number => {
  if (typeof score !== 'number' || Number.isNaN(score)) {
    throw AppError.invalidInput('成绩必须是数字');
  }
  if (score < SCORE_MIN || score > SCORE_MAX) {
    throw AppError.invalidInput(`成绩必须在 ${SCORE_MIN}-${SCORE_MAX} 之间`);
  }
  return Number(score);
};

export interface IStudentDoc extends Document {
  _id: Types.ObjectId;
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

  setLessonLeft(lessonLeft: number | null | undefined): IStudentDoc;
  setClassWithLessonInit(classType: ClassType): IStudentDoc;
  hasMembership(at?: Date): boolean;
  getMembershipDaysRemaining(at?: Date): number | null;
  getAverageScore(): number;
  getMaxScore(): number;
  getMinScore(): number;
  addScore(score: number): IStudentDoc;
  removeScore(index: number): number;
  updateScore(index: number, newScore: number): number;
}

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
      validator: function validator(v: string) {
        return PHONE_REGEX.test(v) || v === '未填写';
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
      validator: function validator(v: number[]) {
        return v.every(score => typeof score === 'number' && !Number.isNaN(score));
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
  timestamps: true,
  collection: 'students',
  versionKey: false
});

studentSchema.index({ membershipStartDate: 1, membershipEndDate: 1 });
studentSchema.index({ name: 1, phone: 1 });
studentSchema.index({ class: 1, subject: 1 });

studentSchema.pre('validate', function validateMembership(this: IStudentDoc, next) {
  if ((this.membershipStartDate && !this.membershipEndDate) || (!this.membershipStartDate && this.membershipEndDate)) {
    this.invalidate('membershipEndDate', '会员开始和结束日期必须同时设置或同时为空');
  }

  if (this.membershipStartDate && this.membershipEndDate && this.membershipStartDate > this.membershipEndDate) {
    this.invalidate('membershipEndDate', '会员开始日期不能晚于结束日期');
  }

  next();
});

studentSchema.pre('save', function ensureTenTryLesson(this: IStudentDoc, next) {
  if (this.class === ClassType.TEN_TRY && (this.lessonLeft === null || this.lessonLeft === undefined)) {
    this.lessonLeft = TEN_TRY_DEFAULT_LESSON;
  }
  next();
});

studentSchema.methods.setLessonLeft = function setLessonLeft(lessonLeft: number | null | undefined): IStudentDoc {
  if (lessonLeft === undefined || lessonLeft === null) {
    this.lessonLeft = null;
    return this;
  }

  this.lessonLeft = ensureNonNegativeInteger(lessonLeft, '课时数');
  return this;
};

studentSchema.methods.setClassWithLessonInit = function setClassWithLessonInit(classType: ClassType): IStudentDoc {
  this.class = classType;
  if (classType === ClassType.TEN_TRY && (this.lessonLeft === null || this.lessonLeft === undefined)) {
    this.lessonLeft = TEN_TRY_DEFAULT_LESSON;
  }
  return this;
};

studentSchema.methods.hasMembership = function hasMembership(at?: Date): boolean {
  if (!this.membershipStartDate || !this.membershipEndDate) {
    return false;
  }
  const reference = at ? new Date(at) : new Date();
  return reference >= this.membershipStartDate && reference <= this.membershipEndDate;
};

studentSchema.methods.getMembershipDaysRemaining = function getMembershipDaysRemaining(at?: Date): number | null {
  if (!this.membershipEndDate) {
    return null;
  }

  const reference = at ? new Date(at) : new Date();
  const diff = this.membershipEndDate.getTime() - reference.getTime();

  if (diff < 0) {
    return 0;
  }
  return Math.ceil(diff / MS_PER_DAY);
};

studentSchema.methods.getAverageScore = function getAverageScore(): number {
  if (this.rings.length === 0) {
    return 0;
  }
  const sum = this.rings.reduce((acc: number, score: number) => acc + score, 0);
  return Number((sum / this.rings.length).toFixed(1));
};

studentSchema.methods.getMaxScore = function getMaxScore(): number {
  if (this.rings.length === 0) {
    return 0;
  }
  return Math.max(...this.rings);
};

studentSchema.methods.getMinScore = function getMinScore(): number {
  if (this.rings.length === 0) {
    return 0;
  }
  return Math.min(...this.rings);
};

studentSchema.methods.addScore = function addScore(score: number): IStudentDoc {
  const validScore = ensureValidScore(score);
  this.rings.push(validScore);
  this.markModified('rings');
  return this;
};

studentSchema.methods.removeScore = function removeScore(index: number): number {
  if (index < 0 || index >= this.rings.length) {
    throw AppError.invalidInput('成绩索引超出范围');
  }
  const [removed] = this.rings.splice(index, 1);
  this.markModified('rings');
  return removed;
};

studentSchema.methods.updateScore = function updateScore(index: number, newScore: number): number {
  if (index < 0 || index >= this.rings.length) {
    throw AppError.invalidInput('成绩索引超出范围');
  }
  const validScore = ensureValidScore(newScore);
  this.rings[index] = validScore;
  this.markModified('rings');
  return validScore;
};

studentSchema.virtual('isMembershipActive').get(function membershipActiveGetter(this: IStudentDoc) {
  return this.hasMembership();
});

studentSchema.virtual('membershipDaysRemaining').get(function membershipDaysRemainingGetter(this: IStudentDoc) {
  return this.getMembershipDaysRemaining();
});

studentSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject({ virtuals: true });
  const isActive = this.hasMembership();
  const daysRemaining = this.getMembershipDaysRemaining();

  return {
    uid: obj.uid,
    name: obj.name,
    age: obj.age,
    class: obj.class,
    subject: obj.subject,
    phone: obj.phone,
    rings: obj.rings,
    note: obj.note,
    lesson_left: obj.lessonLeft,
    lessonLeft: obj.lessonLeft,
    membership_start_date: formatDate(obj.membershipStartDate),
    membershipStartDate: formatDate(obj.membershipStartDate),
    membership_end_date: formatDate(obj.membershipEndDate),
    membershipEndDate: formatDate(obj.membershipEndDate),
    is_membership_active: isActive,
    isMembershipActive: isActive,
    membership_days_remaining: daysRemaining,
    membershipDaysRemaining: daysRemaining,
    created_at: formatDate(obj.createdAt, true),
    createdAt: obj.createdAt,
    updated_at: formatDate(obj.updatedAt, true),
    updatedAt: obj.updatedAt,
  };
};

const StudentModel = model<IStudentDoc>('Student', studentSchema);

const getNextUid = async (): Promise<number> => {
  return getNextSequence(STUDENT_SEQUENCE_NAME);
};

export class Student {
  static async findByUid(uid: number): Promise<IStudentDoc | null> {
    return await StudentModel.findOne({ uid }).exec();
  }

  static async findAll(): Promise<IStudentDoc[]> {
    return await StudentModel.find().sort({ createdAt: -1 }).exec();
  }

  static async create(data: Partial<IStudentDoc>): Promise<IStudentDoc> {
    const nextUid = await getNextUid();
    return await StudentModel.create({ ...data, uid: nextUid });
  }

  static async updateByUid(uid: number, data: Partial<IStudentDoc>): Promise<IStudentDoc | null> {
    return await StudentModel.findOneAndUpdate({ uid }, data, { new: true, runValidators: true }).exec();
  }

  static async deleteByUid(uid: number): Promise<boolean> {
    const result = await StudentModel.deleteOne({ uid }).exec();
    return result.deletedCount > 0;
  }

  static async search(criteria: Record<string, unknown>): Promise<IStudentDoc[]> {
    return await StudentModel.find(criteria).sort({ createdAt: -1 }).exec();
  }

  static async count(criteria: Record<string, unknown> = {}): Promise<number> {
    return await StudentModel.countDocuments(criteria).exec();
  }

  static async createIndexes(): Promise<void> {
    await StudentModel.createIndexes();
  }

  static aggregate(pipeline: any[]) {
    return StudentModel.aggregate(pipeline);
  }
}

export { StudentModel as studentModel, Student };
export { IStudentDoc };
