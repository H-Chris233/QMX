/**
 * StudentQuery 测试
 *
 * 测试学员查询构建器的所有功能：
 * - 各种过滤条件
 * - 排序
 * - 分页
 */

import { StudentQuery } from '@/services/studentQuery';
import { StudentBuilder } from '@/services/studentBuilder';
import { ClassType, SubjectType } from '@/types';
import { setupTestDatabase, clearAllCollections, createTestStudent } from './helpers/testSetup';

describe('StudentQuery', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await clearAllCollections();
  });

  describe('静态工厂方法', () => {
    it('create() 返回新的查询实例', () => {
      const query = StudentQuery.create();
      expect(query).toBeInstanceOf(StudentQuery);
    });
  });

  describe('流畅API - 链式调用', () => {
    it('支持链式调用所有过滤方法', async () => {
      const result = await StudentQuery.create()
        .nameContains('Test')
        .ageRange(18, 30)
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .hasMembership(true)
        .membershipStatus('ACTIVE')
        .scoreRange(8, 10)
        .sort('name', 'ASC')
        .paginate(1, 20)
        .execute();

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toHaveProperty('page', 1);
      expect(result.pagination).toHaveProperty('limit', 20);
      expect(result.pagination).toHaveProperty('total');
      expect(result.pagination).toHaveProperty('total_pages');
    });
  });

  describe('姓名过滤', () => {
    beforeEach(async () => {
      await createTestStudent({ name: 'Alice Smith' });
      await createTestStudent({ name: 'Bob Johnson' });
      await createTestStudent({ name: 'Alice Williams' });
    });

    it('按部分姓名匹配过滤', async () => {
      const result = await StudentQuery.create()
        .nameContains('Alice')
        .execute();

      expect(result.data.length).toBe(2);
      result.data.forEach((student) => {
        expect(student.name).toContain('Alice');
      });
    });

    it('无匹配姓名返回空结果', async () => {
      const result = await StudentQuery.create()
        .nameContains('Charlie')
        .execute();

      expect(result.data.length).toBe(0);
    });
  });

  describe('年龄过滤', () => {
    beforeEach(async () => {
      await StudentBuilder.create()
        .name('Young Student')
        .phone('13800000001')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .age(15)
        .build();

      await StudentBuilder.create()
        .name('Adult Student')
        .phone('13800000002')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .age(25)
        .build();

      await StudentBuilder.create()
        .name('Senior Student')
        .phone('13800000003')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .age(45)
        .build();
    });

    it('按最小年龄过滤', async () => {
      const result = await StudentQuery.create()
        .ageRange(20, null)
        .execute();

      expect(result.data.length).toBe(2);
      result.data.forEach((student) => {
        expect(student.age!).toBeGreaterThanOrEqual(20);
      });
    });

    it('按最大年龄过滤', async () => {
      const result = await StudentQuery.create()
        .ageRange(null, 30)
        .execute();

      expect(result.data.length).toBe(2);
      result.data.forEach((student) => {
        expect(student.age!).toBeLessThanOrEqual(30);
      });
    });

    it('按年龄范围过滤', async () => {
      const result = await StudentQuery.create()
        .ageRange(20, 30)
        .execute();

      expect(result.data.length).toBe(1);
      expect(result.data[0]?.name).toBe('Adult Student');
    });
  });

  describe('班级和科目过滤', () => {
    beforeEach(async () => {
      await createTestStudent({ name: 'Month Shoot', classType: ClassType.MONTH, subject: SubjectType.SHOOTING });
      await createTestStudent({ name: 'Month Archery', classType: ClassType.MONTH, subject: SubjectType.ARCHERY });
      await createTestStudent({ name: 'Year Shoot', classType: ClassType.YEAR, subject: SubjectType.SHOOTING });
    });

    it('按班级类型过滤', async () => {
      const result = await StudentQuery.create()
        .classType(ClassType.MONTH)
        .execute();

      expect(result.data.length).toBe(2);
      result.data.forEach((student) => {
        expect(student.classType).toBe(ClassType.MONTH);
      });
    });

    it('按科目类型过滤', async () => {
      const result = await StudentQuery.create()
        .subject(SubjectType.SHOOTING)
        .execute();

      expect(result.data.length).toBe(2);
      result.data.forEach((student) => {
        expect(student.subject).toBe(SubjectType.SHOOTING);
      });
    });

    it('组合班级和科目过滤', async () => {
      const result = await StudentQuery.create()
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .execute();

      expect(result.data.length).toBe(1);
      expect(result.data[0]?.name).toBe('Month Shoot');
    });
  });

  describe('会员状态过滤', () => {
    beforeEach(async () => {
      const now = new Date();

      // 活跃会员
      await StudentBuilder.create()
        .name('Active Member')
        .phone('13800000001')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .membership(
          new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
          new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000)
        )
        .build();

      // 已过期会员
      const expiredEnd = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      await StudentBuilder.create()
        .name('Expired Member')
        .phone('13800000002')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .membership(
          new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          expiredEnd
        )
        .build();

      // 无会员
      await StudentBuilder.create()
        .name('No Member')
        .phone('13800000003')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .build();
    });

    it('过滤有会员的学员', async () => {
      const result = await StudentQuery.create()
        .hasMembership(true)
        .execute();

      expect(result.data.length).toBe(2);
    });

    it('过滤无会员的学员', async () => {
      const result = await StudentQuery.create()
        .hasMembership(false)
        .execute();

      expect(result.data.length).toBe(1);
      expect(result.data[0]?.name).toBe('No Member');
    });

    it('按会员状态过滤 - 活跃', async () => {
      const result = await StudentQuery.create()
        .membershipStatus('ACTIVE')
        .execute();

      expect(result.data.length).toBe(1);
      expect(result.data[0]?.name).toBe('Active Member');
    });

    it('按会员状态过滤 - 过期', async () => {
      const result = await StudentQuery.create()
        .membershipStatus('EXPIRED')
        .execute();

      expect(result.data.length).toBe(1);
      expect(result.data[0]?.name).toBe('Expired Member');
    });

    it('按会员状态过滤 - 未来', async () => {
      const start = new Date();
      start.setDate(start.getDate() + 10);
      const end = new Date();
      end.setDate(end.getDate() + 40);

      await StudentBuilder.create()
        .name('Upcoming Member')
        .phone('13800000004')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .membership(start, end)
        .build();

      const result = await StudentQuery.create()
        .membershipStatus('UPCOMING')
        .execute();

      expect(result.data.length).toBe(1);
      expect(result.data[0]?.name).toBe('Upcoming Member');
    });
  });

  describe('成绩过滤', () => {
    beforeEach(async () => {
      await StudentBuilder.create()
        .name('High Scorer')
        .phone('13800000001')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .rings([9, 9.5, 10])
        .build();

      await StudentBuilder.create()
        .name('Low Scorer')
        .phone('13800000002')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .rings([5, 6, 7])
        .build();

      await StudentBuilder.create()
        .name('Average Scorer')
        .phone('13800000003')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .rings([7, 8, 7.5])
        .build();
    });

    it('按最低平均成绩过滤', async () => {
      const result = await StudentQuery.create()
        .scoreRange(8, null)
        .execute();

      expect(result.data.length).toBe(2);
    });

    it('按最高平均成绩过滤', async () => {
      const result = await StudentQuery.create()
        .scoreRange(null, 7.5)
        .execute();

      expect(result.data.length).toBe(2);
    });

    it('按成绩范围过滤', async () => {
      const result = await StudentQuery.create()
        .scoreRange(7, 9)
        .execute();

      expect(result.data.length).toBe(2);
    });

    it('无成绩学员不匹配成绩过滤', async () => {
      await createTestStudent({ name: 'No Scores' });

      const result = await StudentQuery.create()
        .scoreRange(5, 10)
        .execute();

      const noScoreStudent = result.data.find((s) => s.name === 'No Scores');
      expect(noScoreStudent).toBeUndefined();
    });
  });

  describe('排序', () => {
    beforeEach(async () => {
      await StudentBuilder.create().name('Charlie').phone('13800000003').classType(ClassType.MONTH).subject(SubjectType.SHOOTING).build();
      await StudentBuilder.create().name('Alice').phone('13800000001').classType(ClassType.MONTH).subject(SubjectType.SHOOTING).build();
      await StudentBuilder.create().name('Bob').phone('13800000002').classType(ClassType.MONTH).subject(SubjectType.SHOOTING).build();
    });

    it('按姓名升序排序', async () => {
      const result = await StudentQuery.create()
        .sort('name', 'ASC')
        .execute();

      expect(result.data.length).toBeGreaterThanOrEqual(3);
      const names = result.data.slice(0, 3).map((s) => s.name);
      expect(names).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('按姓名降序排序', async () => {
      const result = await StudentQuery.create()
        .sort('name', 'DESC')
        .execute();

      expect(result.data.length).toBeGreaterThanOrEqual(3);
      const names = result.data.slice(0, 3).map((s) => s.name);
      expect(names).toEqual(['Charlie', 'Bob', 'Alice']);
    });

    it('默认按创建时间降序排序', async () => {
      const result = await StudentQuery.create()
        .sort('created_at', 'DESC')
        .execute();

      expect(result.data.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('分页', () => {
    beforeEach(async () => {
      for (let i = 0; i < 15; i++) {
        await StudentBuilder.create()
          .name(`Student ${i}`)
          .phone(`13800000${i.toString().padStart(2, '0')}`)
          .classType(ClassType.MONTH)
          .subject(SubjectType.SHOOTING)
          .build();
      }
    });

    it('正确分页返回', async () => {
      const result = await StudentQuery.create()
        .paginate(1, 5)
        .execute();

      expect(result.data.length).toBe(5);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(5);
    });

    it('正确计算总页数', async () => {
      const result = await StudentQuery.create()
        .paginate(2, 5)
        .execute();

      expect(result.pagination.total).toBeGreaterThanOrEqual(15);
      expect(result.pagination.total_pages).toBeGreaterThanOrEqual(3);
    });

    it('最大限制100条', async () => {
      const result = await StudentQuery.create()
        .paginate(1, 200)
        .execute();

      expect(result.pagination.limit).toBe(100);
    });
  });

  describe('查询结果', () => {
    beforeEach(async () => {
      const student = await createTestStudent({ name: 'Query Test Student' });
      const { StudentUpdater } = await import('@/services/studentUpdater');
      const updater = StudentUpdater.fromDocument(student);
      updater.addRing(9.5).addRing(8);
      await updater.commit();
    });

    it('返回正确的数据结构', async () => {
      const result = await StudentQuery.create()
        .nameContains('Query Test')
        .execute();

      expect(result.data.length).toBe(1);
      const student = result.data[0];

      expect(student).toHaveProperty('uid');
      expect(student).toHaveProperty('name');
      expect(student).toHaveProperty('age');
      expect(student).toHaveProperty('phone');
      expect(student).toHaveProperty('classType');
      expect(student).toHaveProperty('subject');
      expect(student).toHaveProperty('rings');
      expect(student).toHaveProperty('averageScore');
      expect(student).toHaveProperty('membershipStatus');
      expect(student).toHaveProperty('membershipStartDate');
      expect(student).toHaveProperty('membershipEndDate');
      expect(student).toHaveProperty('lessonLeft');
      expect(student).toHaveProperty('createdAt');
    });

    it('正确计算平均成绩', async () => {
      const result = await StudentQuery.create()
        .nameContains('Query Test')
        .execute();

      const student = result.data[0];
      expect(student.averageScore).toBeCloseTo(8.75, 1);
    });

    it('无会员学员正确设置状态为NONE', async () => {
      const result = await StudentQuery.create()
        .nameContains('Query Test')
        .execute();

      const student = result.data[0];
      expect(student.membershipStatus).toBe('NONE');
    });
  });
});
