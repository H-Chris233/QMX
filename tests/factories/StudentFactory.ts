/**
 * 学员数据工厂
 * 用于生成测试用的学员数据
 */

import type { Student } from '@/types/api';
import { ClassType, SubjectType, MembershipStatus } from '@/types/api';
import {
  randomInt,
  randomFloat,
  randomPick,
  addDays,
  addMonths,
  isoToYYYYMMDD,
  randomChineseName,
  randomPhoneNumber,
} from './utils';

/**
 * 学员工厂构建器
 * 支持链式调用和可选字段
 * 
 * @example
 * const student = StudentFactory.build();
 * const activeStudent = StudentFactory.build({ membership_status: 'Active' });
 * const customStudent = StudentFactory.create()
 *   .withName("张三")
 *   .withAge(20)
 *   .withMembership('2024-01-01', '2024-12-31')
 *   .build();
 */
export class StudentFactory {
  private data: Partial<Student> = {};
  private static uidCounter = 1;

  constructor() {
    this.data = this.defaults();
  }

  /**
   * 创建新的工厂实例
   */
  static create(): StudentFactory {
    return new StudentFactory();
  }

  /**
   * 快速构建学员数据
   * @param overrides - 覆盖默认值
   */
  static build(overrides?: Partial<Student>): Student {
    return new StudentFactory().merge(overrides || {}).build();
  }

  /**
   * 批量构建学员数据
   * @param count - 数量
   * @param overrides - 覆盖默认值
   */
  static buildMany(count: number, overrides?: Partial<Student>): Student[] {
    return Array.from({ length: count }, () => StudentFactory.build(overrides));
  }

  /**
   * 重置UID计数器
   */
  static resetCounter(): void {
    StudentFactory.uidCounter = 1;
  }

  /**
   * 默认值
   */
  private defaults(): Partial<Student> {
    const now = new Date();
    const membershipStart = addDays(now, -30);
    const membershipEnd = addDays(now, 335); // 距离现在还有约11个月

    return {
      uid: StudentFactory.uidCounter++,
      name: randomChineseName(),
      age: randomInt(15, 40),
      phone: randomPhoneNumber(),
      class: randomPick([ClassType.MONTH, ClassType.YEAR, ClassType.TEN_TRY]),
      subject: randomPick([SubjectType.SHOOTING, SubjectType.ARCHERY]),
      rings: this.generateRandomScores(),
      lesson_left: randomInt(5, 50),
      membership_start_date: isoToYYYYMMDD(membershipStart),
      membership_end_date: isoToYYYYMMDD(membershipEnd),
      membership_status: MembershipStatus.ACTIVE,
      is_membership_active: true,
      membership_days_remaining: 335,
      note: '',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
  }

  /**
   * 生成随机成绩数组
   */
  private generateRandomScores(count: number = 5): number[] {
    return Array.from({ length: count }, () => randomFloat(6, 10, 1));
  }

  /**
   * 设置学员ID
   */
  withUid(uid: number): this {
    this.data.uid = uid;
    return this;
  }

  /**
   * 设置姓名
   */
  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  /**
   * 设置年龄
   */
  withAge(age: number | null): this {
    this.data.age = age;
    return this;
  }

  /**
   * 设置手机号
   */
  withPhone(phone: string): this {
    this.data.phone = phone;
    return this;
  }

  /**
   * 设置班级类型
   */
  withClass(classType: ClassType | string): this {
    this.data.class = classType;
    return this;
  }

  /**
   * 设置科目
   */
  withSubject(subject: SubjectType | string): this {
    this.data.subject = subject;
    return this;
  }

  /**
   * 设置成绩数组
   */
  withRings(rings: number[]): this {
    this.data.rings = rings;
    return this;
  }

  /**
   * 设置剩余课时
   */
  withLessonLeft(lessonLeft: number | null): this {
    this.data.lesson_left = lessonLeft;
    return this;
  }

  /**
   * 设置会员信息
   * @param startDate - 开始日期（YYYY-MM-DD）
   * @param endDate - 结束日期（YYYY-MM-DD）
   * @param status - 会员状态
   */
  withMembership(
    startDate: string | null,
    endDate: string | null,
    status: MembershipStatus = MembershipStatus.ACTIVE
  ): this {
    this.data.membership_start_date = startDate;
    this.data.membership_end_date = endDate;
    this.data.membership_status = status;
    
    if (startDate && endDate) {
      const now = new Date();
      const end = new Date(endDate);
      const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      
      this.data.is_membership_active = status === MembershipStatus.ACTIVE;
      this.data.membership_days_remaining = daysRemaining;
    } else {
      this.data.is_membership_active = false;
      this.data.membership_days_remaining = null;
    }
    
    return this;
  }

  /**
   * 设置为无会员状态
   */
  withoutMembership(): this {
    this.data.membership_start_date = null;
    this.data.membership_end_date = null;
    this.data.membership_status = MembershipStatus.NONE;
    this.data.is_membership_active = false;
    this.data.membership_days_remaining = null;
    return this;
  }

  /**
   * 设置为已过期会员
   */
  withExpiredMembership(): this {
    const now = new Date();
    const startDate = addMonths(now, -12);
    const endDate = addDays(now, -1);
    
    return this.withMembership(
      isoToYYYYMMDD(startDate),
      isoToYYYYMMDD(endDate),
      MembershipStatus.EXPIRED
    );
  }

  /**
   * 设置为即将开始的会员
   */
  withUpcomingMembership(): this {
    const now = new Date();
    const startDate = addDays(now, 7);
    const endDate = addMonths(startDate, 12);
    
    return this.withMembership(
      isoToYYYYMMDD(startDate),
      isoToYYYYMMDD(endDate),
      MembershipStatus.UPCOMING
    );
  }

  /**
   * 设置备注
   */
  withNote(note: string | null): this {
    this.data.note = note;
    return this;
  }

  /**
   * 设置创建时间
   */
  withCreatedAt(createdAt: string): this {
    this.data.created_at = createdAt;
    return this;
  }

  /**
   * 设置更新时间
   */
  withUpdatedAt(updatedAt: string): this {
    this.data.updated_at = updatedAt;
    return this;
  }

  /**
   * 合并部分数据
   */
  merge(overrides: Partial<Student>): this {
    this.data = { ...this.data, ...overrides };
    return this;
  }

  /**
   * 构建最终的学员数据
   */
  build(): Student {
    return this.data as Student;
  }
}
