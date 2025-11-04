import { AppError } from '@/middleware/errorHandler';
import { Student, IStudentDoc } from '@/models/mongo';
import { ClassType, SubjectType } from '@/types';
import type { MembershipPayload } from '@/services/studentBuilder';

const PHONE_REGEX = /^1[3-9]\d{9}$/;
const SCORE_MIN = 0;
const SCORE_MAX = 10;

export class StudentUpdater {
  private constructor(private readonly student: IStudentDoc) {}

  static async for(uid: number): Promise<StudentUpdater> {
    const doc = await Student.findByUid(uid);
    if (!doc) {
      throw new AppError('NotFound: 学员不存在', 404);
    }
    return new StudentUpdater(doc);
  }

  static fromDocument(doc: IStudentDoc): StudentUpdater {
    return new StudentUpdater(doc);
  }

  get document(): IStudentDoc {
    return this.student;
  }

  name(name: string): this {
    const trimmed = name?.trim();
    if (!trimmed) {
      throw new AppError('InvalidInput: 学员姓名不能为空', 400);
    }
    this.student.name = trimmed;
    return this;
  }

  age(age?: number | null): this {
    if (age === undefined) {
      return this;
    }
    if (age === null) {
      this.student.age = null;
      return this;
    }
    if (!Number.isInteger(age) || age < 0 || age > 120) {
      throw new AppError('InvalidInput: 年龄必须在0-120之间', 400);
    }
    this.student.age = age;
    return this;
  }

  phone(phone?: string | null): this {
    if (!phone) {
      this.student.phone = '未填写';
      return this;
    }
    const normalized = phone.trim();
    if (!PHONE_REGEX.test(normalized)) {
      throw new AppError('InvalidInput: 手机号格式不正确', 400);
    }
    this.student.phone = normalized;
    return this;
  }

  class(classType: ClassType): this {
    this.student.setClassWithLessonInit(classType);
    return this;
  }

  subject(subjectType: SubjectType): this {
    this.student.subject = subjectType;
    return this;
  }

  lessonLeft(lessonLeft?: number | null): this {
    this.student.setLessonLeft(lessonLeft);
    return this;
  }

  note(note?: string | null): this {
    if (note === undefined || note === null) {
      this.student.note = '';
      return this;
    }
    this.student.note = note.trim();
    return this;
  }

  addRing(score: number): this {
    this.student.addScore(this.ensureValidScore(score));
    return this;
  }

  setRings(scores: number[]): this {
    if (!Array.isArray(scores)) {
      throw new AppError('InvalidInput: 成绩必须是数组', 400);
    }
    const sanitized = scores.map(score => this.ensureValidScore(score));
    this.student.rings = sanitized;
    this.student.markModified('rings');
    return this;
  }

  updateRingAt(index: number, score: number): this {
    this.student.updateScore(index, this.ensureValidScore(score));
    return this;
  }

  removeRingAt(index: number): this {
    this.student.removeScore(index);
    return this;
  }

  membership(membership: MembershipPayload | null): this {
    if (!membership) {
      this.student.membershipStartDate = null;
      this.student.membershipEndDate = null;
      return this;
    }

    const start = membership.startDate ? new Date(membership.startDate) : null;
    const end = membership.endDate ? new Date(membership.endDate) : null;

    if (!start || !end) {
      throw new AppError('InvalidInput: 会员开始和结束日期必须同时提供', 400);
    }
    if (start > end) {
      throw new AppError('InvalidInput: 会员开始日期不能晚于结束日期', 400);
    }

    this.student.membershipStartDate = start;
    this.student.membershipEndDate = end;
    return this;
  }

  async commit(): Promise<IStudentDoc> {
    return await this.student.save();
  }

  private ensureValidScore(score: number): number {
    if (typeof score !== 'number' || Number.isNaN(score)) {
      throw new AppError('InvalidInput: 成绩必须是数字', 400);
    }
    if (score < SCORE_MIN || score > SCORE_MAX) {
      throw new AppError(`InvalidInput: 成绩必须在 ${SCORE_MIN}-${SCORE_MAX} 之间`, 400);
    }
    return Number(score);
  }
}
