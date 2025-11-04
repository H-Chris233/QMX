import { AppError } from '@/utils/errors';
import { Student, IStudentDoc } from '@/models/mongo';
import { ClassType, SubjectType } from '@/types';

const TEN_TRY_DEFAULT_LESSON = 10;
const PHONE_REGEX = /^1[3-9]\d{9}$/;
const SCORE_MIN = 0;
const SCORE_MAX = 10;

export interface MembershipPayload {
  startDate: Date | string | null;
  endDate: Date | string | null;
}

export class StudentBuilder {
  private payload: Partial<IStudentDoc> = {
    age: null,
    lessonLeft: null,
    rings: [],
    note: '',
    membershipStartDate: null,
    membershipEndDate: null,
  };

  static create(): StudentBuilder {
    return new StudentBuilder();
  }

  name(name: string): this {
    const trimmed = name?.trim();
    if (!trimmed) {
      throw AppError.invalidInput('学员姓名不能为空');
    }
    this.payload.name = trimmed;
    return this;
  }

  age(age?: number | null): this {
    if (age === undefined) {
      return this;
    }
    if (age === null) {
      this.payload.age = null;
      return this;
    }
    if (!Number.isInteger(age) || age < 0 || age > 120) {
      throw AppError.invalidInput('年龄必须在0-120之间');
    }
    this.payload.age = age;
    return this;
  }

  phone(phone?: string | null): this {
    if (!phone) {
      this.payload.phone = '未填写';
      return this;
    }
    const normalized = phone.trim();
    if (!PHONE_REGEX.test(normalized)) {
      throw AppError.invalidInput('手机号格式不正确');
    }
    this.payload.phone = normalized;
    return this;
  }

  class(classType?: ClassType): this {
    const effectiveClass = classType ?? ClassType.OTHERS;
    this.payload.class = effectiveClass;
    if (effectiveClass === ClassType.TEN_TRY && (this.payload.lessonLeft === null || this.payload.lessonLeft === undefined)) {
      this.payload.lessonLeft = TEN_TRY_DEFAULT_LESSON;
    }
    return this;
  }

  subject(subjectType?: SubjectType): this {
    this.payload.subject = subjectType ?? SubjectType.OTHERS;
    return this;
  }

  lessonLeft(lessonLeft?: number | null): this {
    if (lessonLeft === undefined) {
      return this;
    }
    if (lessonLeft === null) {
      this.payload.lessonLeft = null;
      return this;
    }
    if (!Number.isInteger(lessonLeft) || lessonLeft < 0) {
      throw AppError.invalidInput('课时数必须为非负整数');
    }
    this.payload.lessonLeft = lessonLeft;
    return this;
  }

  note(note?: string | null): this {
    if (note === undefined || note === null) {
      this.payload.note = '';
      return this;
    }
    this.payload.note = note.trim();
    return this;
  }

  rings(rings?: number[]): this {
    if (rings === undefined) {
      return this;
    }
    if (!Array.isArray(rings)) {
      throw AppError.invalidInput('成绩必须是数组');
    }
    this.payload.rings = rings.map(score => this.ensureValidScore(score));
    return this;
  }

  membership(membership: MembershipPayload | null): this {
    if (!membership) {
      this.payload.membershipStartDate = null;
      this.payload.membershipEndDate = null;
      return this;
    }

    const start = membership.startDate ? new Date(membership.startDate) : null;
    const end = membership.endDate ? new Date(membership.endDate) : null;

    if (!start || !end) {
      throw AppError.invalidInput('会员开始和结束日期必须同时提供');
    }
    if (start > end) {
      throw AppError.invalidInput('会员开始日期不能晚于结束日期');
    }

    this.payload.membershipStartDate = start;
    this.payload.membershipEndDate = end;
    return this;
  }

  async build(): Promise<IStudentDoc> {
    if (!this.payload.name) {
      throw AppError.invalidInput('学员姓名不能为空');
    }

    if (!this.payload.class) {
      this.payload.class = ClassType.OTHERS;
    }

    if (!this.payload.subject) {
      this.payload.subject = SubjectType.OTHERS;
    }

    if (!this.payload.phone) {
      this.payload.phone = '未填写';
    }

    if (!this.payload.note && this.payload.note !== '') {
      this.payload.note = '';
    }

    if (!this.payload.rings) {
      this.payload.rings = [];
    }

    if (this.payload.class === ClassType.TEN_TRY && (this.payload.lessonLeft === null || this.payload.lessonLeft === undefined)) {
      this.payload.lessonLeft = TEN_TRY_DEFAULT_LESSON;
    }

    return await Student.create(this.payload);
  }

  private ensureValidScore(score: number): number {
    if (typeof score !== 'number' || Number.isNaN(score)) {
      throw AppError.invalidInput('成绩必须是数字');
    }
    if (score < SCORE_MIN || score > SCORE_MAX) {
      throw AppError.invalidInput(`成绩必须在 ${SCORE_MIN}-${SCORE_MAX} 之间`);
    }
    return Number(score);
  }
}
