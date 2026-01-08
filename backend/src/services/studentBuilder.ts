import { StudentRepository } from '../db/repositories/studentRepository';
import { NewStudent } from '../db/schema/students';

export class StudentBuilder {
  private payload: Partial<NewStudent> = {};

  static create(): StudentBuilder {
    return new StudentBuilder();
  }

  name(name: string): this {
    this.payload.name = name;
    return this;
  }

  age(age?: number | null): this {
    this.payload.age = age === null ? null : age ?? null;
    return this;
  }

  phone(phone: string): this {
    this.payload.phone = phone;
    return this;
  }

  classType(classType: string): this {
    if (!['TEN_TRY', 'MONTH', 'YEAR', 'OTHERS'].includes(classType)) {
      throw new Error(`无效的班级类型: ${classType}`);
    }
    this.payload.classType = classType;
    return this;
  }

  subject(subject: string): this {
    if (!['SHOOTING', 'ARCHERY', 'OTHERS'].includes(subject)) {
      throw new Error(`无效的科目类型: ${subject}`);
    }
    this.payload.subject = subject;
    return this;
  }

  rings(rings?: number[]): this {
    this.payload.rings = rings || [];
    return this;
  }

  lessonLeft(lessons?: number): this {
    this.payload.lessonLeft = lessons ?? 0;
    return this;
  }

  note(note?: string | null): this {
    this.payload.note = note || null;
    return this;
  }

  membership(startDate?: string | Date | null, endDate?: string | Date | null): this {
    const formatDate = (d?: string | Date | null): string | null => {
      if (d === null || d === undefined) return null;
      const date = typeof d === 'string' ? new Date(d) : d;
      if (Number.isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0];
    };

    this.payload.membershipStartDate = formatDate(startDate);
    this.payload.membershipEndDate = formatDate(endDate);

    // 验证会员日期
    if (this.payload.membershipStartDate && this.payload.membershipEndDate) {
      if (this.payload.membershipStartDate > this.payload.membershipEndDate) {
        throw new Error('会员开始日期不能晚于结束日期');
      }
    }

    return this;
  }

  async build(): Promise<NewStudent> {
    this.validate();
    return await StudentRepository.create(this.payload as NewStudent);
  }

  private validate(): void {
    if (!this.payload.name) {
      throw new Error('学员姓名不能为空');
    }
    if (this.payload.name.length > 50) {
      throw new Error('学员姓名长度不能超过50字符');
    }

    if (!this.payload.phone) {
      throw new Error('手机号不能为空');
    }
    if (this.payload.phone.length > 20) {
      throw new Error('手机号长度不能超过20字符');
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(this.payload.phone) && this.payload.phone !== '未填写') {
      throw new Error('手机号格式不正确');
    }

    // 验证年龄
    if (this.payload.age !== undefined && this.payload.age !== null) {
      if (this.payload.age < 0 || this.payload.age > 120) {
        throw new Error('年龄必须在0-120之间');
      }
    }

    // 验证课时数
    if (this.payload.lessonLeft !== undefined && this.payload.lessonLeft < 0) {
      throw new Error('课时数不能为负数');
    }
  }
}
