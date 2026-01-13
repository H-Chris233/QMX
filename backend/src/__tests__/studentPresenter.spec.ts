/**
 * StudentPresenter 测试
 *
 * 测试学员数据展示格式转换功能
 */

import { presentStudent } from '@/services/studentPresenter';
import { StudentBuilder } from '@/services/studentBuilder';
import { ClassType, SubjectType, MembershipStatus } from '@/types';
import { setupTestDatabase, clearAllCollections, createTestStudent } from './helpers/testSetup';

describe('StudentPresenter', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await clearAllCollections();
  });

  describe('数据格式转换', () => {
    it('转换为展示格式', async () => {
      const student = await createTestStudent({
        name: 'Present Test',
        phone: '13812345678',
      });

      const presented = presentStudent(student);

      expect(presented.uid).toBe(student.uid);
      expect(presented.name).toBe('Present Test');
      expect(presented.phone).toBe('13812345678');
      expect(presented).toHaveProperty('class');
      expect(presented).toHaveProperty('subject');
      expect(presented).toHaveProperty('rings');
      expect(presented).toHaveProperty('lesson_left');
      expect(presented).toHaveProperty('membership_start_date');
      expect(presented).toHaveProperty('membership_end_date');
      expect(presented).toHaveProperty('membership_days_remaining');
      expect(presented).toHaveProperty('is_membership_active');
      expect(presented).toHaveProperty('membership_status');
      expect(presented).toHaveProperty('created_at');
      expect(presented).toHaveProperty('updated_at');
    });

    it('保留原始字段', async () => {
      const student = await createTestStudent({
        name: 'Present Test',
        phone: '13812345678',
        age: 25,
        rings: [9, 8.5],
      });

      const presented = presentStudent(student);

      expect(presented.age).toBe(25);
      expect(presented.rings).toEqual([9, 8.5]);
    });
  });

  describe('会员状态展示', () => {
    it('活跃会员显示剩余天数', async () => {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 30);

      const student = await StudentBuilder.create()
        .name('Membership Test')
        .phone('13812345678')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .membership(start, end)
        .build();

      const presented = presentStudent(student);

      expect(presented.membership_days_remaining).toBeGreaterThan(0);
      expect(presented.membership_days_remaining).toBeLessThanOrEqual(31);
      expect(presented.is_membership_active).toBe(true);
      expect(presented.membership_status).toBe(MembershipStatus.ACTIVE);
    });

    it('过期会员显示状态', async () => {
      const end = new Date();
      end.setDate(end.getDate() - 5);

      const student = await StudentBuilder.create()
        .name('Expired Test')
        .phone('13812345678')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .membership(new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000), end)
        .build();

      const presented = presentStudent(student);

      expect(presented.is_membership_active).toBe(false);
      expect(presented.membership_status).toBe(MembershipStatus.EXPIRED);
      expect(presented.membership_days_remaining).toBe(0);
    });

    it('未来会员显示状态', async () => {
      const start = new Date();
      start.setDate(start.getDate() + 10);
      const end = new Date();
      end.setDate(end.getDate() + 40);

      const student = await StudentBuilder.create()
        .name('Upcoming Test')
        .phone('13812345678')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .membership(start, end)
        .build();

      const presented = presentStudent(student);

      expect(presented.membership_status).toBe(MembershipStatus.UPCOMING);
      expect(presented.is_membership_active).toBe(false);
    });

    it('无会员显示NONE状态', async () => {
      const student = await createTestStudent({ name: 'No Membership' });

      const presented = presentStudent(student);

      expect(presented.membership_status).toBe(MembershipStatus.NONE);
      expect(presented.membership_start_date).toBeNull();
      expect(presented.membership_end_date).toBeNull();
      expect(presented.membership_days_remaining).toBeNull();
      expect(presented.is_membership_active).toBe(false);
    });
  });

  describe('日期格式', () => {
    it('日期转换为 YYYY-MM-DD 格式', async () => {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 30);

      const student = await StudentBuilder.create()
        .name('Date Format Test')
        .phone('13812345678')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .membership(start, end)
        .build();

      const presented = presentStudent(student);

      expect(presented.membership_start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(presented.membership_end_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('数据完整性', () => {
    it('成绩数组完整保留', async () => {
      const student = await StudentBuilder.create()
        .name('Array Test')
        .phone('13812345678')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .rings([9, 8.5, 10, 7])
        .build();

      const presented = presentStudent(student);

      expect(presented.rings).toEqual([9, 8.5, 10, 7]);
    });

    it('处理部分输入数据', () => {
      const partialData = {
        uid: 1,
        name: 'Partial',
        phone: '13812345678',
        class: ClassType.MONTH,
        subject: SubjectType.SHOOTING,
      };

      const presented = presentStudent(partialData as any);

      expect(presented.uid).toBe(1);
      expect(presented.name).toBe('Partial');
      expect(presented.rings).toEqual([]);
      expect(presented.lesson_left).toBeNull();
    });

    it('支持 snake_case 输入字段', async () => {
      const student = await createTestStudent({ name: 'Snake Test' });

      // 模拟 snake_case 格式的数据
      const snakeData = {
        uid: student.uid,
        name: 'Snake Test',
        phone: '13812345678',
        class: ClassType.MONTH,
        subject: SubjectType.SHOOTING,
        lesson_left: 15,
        membership_start_date: null,
        membership_end_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const presented = presentStudent(snakeData as any);

      expect(presented.lesson_left).toBe(15);
      expect(presented.lessonLeft).toBe(15);
    });
  });
});
