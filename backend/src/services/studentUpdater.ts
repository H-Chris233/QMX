import { StudentRepository } from '../db/repositories/studentRepository';
import { Student } from '../db/schema/students';
import { NewStudent } from '../db/schema/students';

const SCORE_MIN = 0;
const SCORE_MAX = 10;

export class StudentUpdater {
  private student: Student;
  private updates: Partial<NewStudent> = {};

  static async for(uid: number): Promise<StudentUpdater> {
    const student = await StudentRepository.findByUid(uid);
    if (!student) {
      throw new Error('学员不存在');
    }
    return new StudentUpdater(student);
  }

  static fromDocument(student: Student): StudentUpdater {
    return new StudentUpdater(student);
  }

  constructor(student: Student) {
    this.student = student;
  }

  name(name: string): this {
    if (name.length > 50) {
      throw new Error('学员姓名长度不能超过50字符');
    }
    this.updates.name = name;
    return this;
  }

  age(age?: number | null): this {
    if (age !== undefined && age !== null) {
      if (age < 0 || age > 120) {
        throw new Error('年龄必须在0-120之间');
      }
      this.updates.age = age;
    } else {
      this.updates.age = null;
    }
    return this;
  }

  phone(phone: string): this {
    if (phone.length > 20) {
      throw new Error('手机号长度不能超过20字符');
    }
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone) && phone !== '未填写') {
      throw new Error('手机号格式不正确');
    }
    this.updates.phone = phone;
    return this;
  }

  classType(classType: string): this {
    if (!['TEN_TRY', 'MONTH', 'YEAR', 'OTHERS'].includes(classType)) {
      throw new Error(`无效的班级类型: ${classType}`);
    }
    this.updates.classType = classType;
    return this;
  }

  subject(subject: string): this {
    if (!['SHOOTING', 'ARCHERY', 'OTHERS'].includes(subject)) {
      throw new Error(`无效的科目类型: ${subject}`);
    }
    this.updates.subject = subject;
    return this;
  }

  rings(rings?: number[]): this {
    this.updates.rings = rings ?? [];
    return this;
  }

  addRing(score: number): this {
    if (typeof score !== 'number' || Number.isNaN(score)) {
      throw new Error('成绩必须是数字');
    }
    if (score < SCORE_MIN || score > SCORE_MAX) {
      throw new Error(`成绩必须在 ${SCORE_MIN}-${SCORE_MAX} 之间`);
    }
    const newRings = [...(this.student.rings || []), score];
    this.updates.rings = newRings;
    return this;
  }

  removeRing(index: number): this {
    const rings = this.student.rings || [];
    if (index < 0 || index >= rings.length) {
      throw new Error('成绩索引超出范围');
    }
    const newRings = rings.filter((_, i) => i !== index);
    this.updates.rings = newRings;
    return this;
  }

  ringAt(index: number, score: number): this {
    if (typeof score !== 'number' || Number.isNaN(score)) {
      throw new Error('成绩必须是数字');
    }
    if (score < SCORE_MIN || score > SCORE_MAX) {
      throw new Error(`成绩必须在 ${SCORE_MIN}-${SCORE_MAX} 之间`);
    }
    const rings = this.student.rings || [];
    if (index < 0 || index >= rings.length) {
      throw new Error('成绩索引超出范围');
    }
    const newRings = [...rings];
    newRings[index] = score;
    this.updates.rings = newRings;
    return this;
  }

  lessonLeft(lessons?: number): this {
    if (lessons !== undefined && lessons < 0) {
      throw new Error('课时数不能为负数');
    }
    this.updates.lessonLeft = lessons ?? 0;
    return this;
  }

  note(note?: string | null): this {
    if (note && note.length > 1000) {
      throw new Error('备注长度不能超过1000字符');
    }
    this.updates.note = note || null;
    return this;
  }

  membership(startDate?: string | Date | null, endDate?: string | Date | null): this {
    const formatDate = (d?: string | Date | null): string | null => {
      if (d === null || d === undefined) return null;
      const date = typeof d === 'string' ? new Date(d) : d;
      if (Number.isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0]; // 返回 YYYY-MM-DD 格式
    };

    const formattedStart = formatDate(startDate);
    const formattedEnd = formatDate(endDate);

    // 验证：要么都没有，要么都有
    if ((!formattedStart && formattedEnd) || (formattedStart && !formattedEnd)) {
      throw new Error('会员开始和结束日期必须同时设置或同时为空');
    }

    // 验证日期顺序
    if (formattedStart && formattedEnd && formattedStart > formattedEnd) {
      throw new Error('会员开始日期不能晚于结束日期');
    }

    this.updates.membershipStartDate = formattedStart ?? undefined;
    this.updates.membershipEndDate = formattedEnd ?? undefined;

    return this;
  }

  async commit(): Promise<Student> {
    if (Object.keys(this.updates).length === 0) {
      return this.student;
    }

    const updated = await StudentRepository.updateByUid(this.student.uid, this.updates);
    if (!updated) {
      throw new Error('更新失败');
    }

    this.student = updated;
    return updated;
  }

  // 获取当前学生数据
  getStudent(): Student {
    return this.student;
  }

  // 获取待更新数据
  getUpdates(): Partial<NewStudent> {
    return this.updates;
  }
}
