/**
 * Updater 测试
 *
 * 测试所有更新器的功能：
 * - StudentUpdater
 * - CashUpdater
 */

import { StudentUpdater } from '@/services/studentUpdater';
import { CashUpdater } from '@/services/cashUpdater';
import { StudentBuilder } from '@/services/studentBuilder';
import { ClassType, SubjectType } from '@/types';
import { setupTestDatabase, clearAllData, createTestStudent, createTestTransaction } from './fixtures';

describe('StudentUpdater', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await clearAllData();
  });

  describe('静态工厂方法', () => {
    it('fromDocument() 从现有学员创建更新器', async () => {
      const student = await createTestStudent({ name: 'Original' });
      const updater = StudentUpdater.fromDocument(student);
      expect(updater).toBeDefined();
    });

    it('for() 通过UID创建更新器', async () => {
      const student = await createTestStudent();
      const updater = await StudentUpdater.for(student.uid);
      expect(updater).toBeDefined();
    });

    it('不存在的UID抛出错误', async () => {
      await expect(StudentUpdater.for(99999)).rejects.toMatchObject({
        message: expect.stringContaining('不存在'),
      });
    });
  });

  describe('姓名更新', () => {
    it('正常更新姓名', async () => {
      const student = await createTestStudent({ name: 'Original' });
      const updater = StudentUpdater.fromDocument(student);
      updater.name('Updated Name');
      const updated = await updater.commit();

      expect(updated.name).toBe('Updated Name');
    });

    it('姓名超过50字符抛出错误', async () => {
      const student = await createTestStudent();
      const updater = StudentUpdater.fromDocument(student);

      expect(() => {
        updater.name('A'.repeat(51));
      }).toThrow(/学员姓名长度不能超过50字符/);
    });
  });

  describe('年龄更新', () => {
    it('正常更新年龄', async () => {
      const student = await createTestStudent({ age: 20 });
      const updater = StudentUpdater.fromDocument(student);
      updater.age(25);
      const updated = await updater.commit();

      expect(updated.age).toBe(25);
    });

    it('设置null年龄', async () => {
      const student = await createTestStudent({ age: 20 });
      const updater = StudentUpdater.fromDocument(student);
      updater.age(null);
      const updated = await updater.commit();

      expect(updated.age).toBeNull();
    });

    it('无效年龄范围抛出错误', async () => {
      const student = await createTestStudent();
      const updater = StudentUpdater.fromDocument(student);

      expect(() => updater.age(-1)).toThrow(/年龄必须在0-120之间/);
      expect(() => updater.age(121)).toThrow(/年龄必须在0-120之间/);
    });
  });

  describe('手机号更新', () => {
    it('正常更新手机号', async () => {
      const student = await createTestStudent({ phone: '13800000000' });
      const updater = StudentUpdater.fromDocument(student);
      updater.phone('13912345678');
      const updated = await updater.commit();

      expect(updated.phone).toBe('13912345678');
    });

    it('特殊值"未填写"允许', async () => {
      const student = await createTestStudent();
      const updater = StudentUpdater.fromDocument(student);
      updater.phone('未填写');
      const updated = await updater.commit();

      expect(updated.phone).toBe('未填写');
    });

    it('无效手机号格式抛出错误', async () => {
      const student = await createTestStudent();
      const updater = StudentUpdater.fromDocument(student);

      expect(() => updater.phone('invalid')).toThrow(/手机号格式不正确/);
    });
  });

  describe('成绩操作', () => {
    it('addRing() 添加单个成绩', async () => {
      const student = await createTestStudent();
      const updater = StudentUpdater.fromDocument(student);
      updater.addRing(9);
      updater.addRing(8.5);
      const updated = await updater.commit();

      expect(updated.rings).toEqual([9, 8.5]);
    });

    it('ringAt() 更新指定位置成绩', async () => {
      const student = await createTestStudent({ rings: [8, 9, 7] });
      const updater = StudentUpdater.fromDocument(student);
      updater.ringAt(1, 10);
      const updated = await updater.commit();

      expect(updated.rings).toEqual([8, 10, 7]);
    });

    it('removeRing() 删除指定位置成绩', async () => {
      const student = await createTestStudent({ rings: [8, 9, 7] });
      const updater = StudentUpdater.fromDocument(student);
      updater.removeRing(0);
      const updated = await updater.commit();

      expect(updated.rings).toEqual([9, 7]);
    });

    it('超出范围索引抛出错误', async () => {
      const student = await createTestStudent({ rings: [8, 9] });
      const updater = StudentUpdater.fromDocument(student);

      expect(() => updater.removeRing(5)).toThrow(/成绩索引超出范围/);
      expect(() => updater.ringAt(5, 10)).toThrow(/成绩索引超出范围/);
    });

    it('无效成绩值抛出错误', async () => {
      const student = await createTestStudent();
      const updater = StudentUpdater.fromDocument(student);

      expect(() => updater.addRing(11)).toThrow(/成绩必须在 0-10 之间/);
      expect(() => updater.addRing(-1)).toThrow(/成绩必须在 0-10 之间/);
    });
  });

  describe('会员期间更新', () => {
    it('设置有效会员期间', async () => {
      const student = await createTestStudent();
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 30);

      const updater = StudentUpdater.fromDocument(student);
      updater.membership(start, end);
      const updated = await updater.commit();

      expect(updated.membershipStartDate).not.toBeNull();
      expect(updated.membershipEndDate).not.toBeNull();
    });

    it('清空会员期间', async () => {
      const membershipStart = new Date();
      const membershipEnd = new Date();
      membershipEnd.setDate(membershipEnd.getDate() + 30);
      const student = await StudentBuilder.create()
        .name('Member')
        .phone('13812345678')
        .membership(membershipStart, membershipEnd)
        .build();

      const updater = StudentUpdater.fromDocument(student);
      updater.membership(null, null);
      const updated = await updater.commit();

      expect(updated.membershipStartDate).toBeNull();
      expect(updated.membershipEndDate).toBeNull();
    });

    it('只设置开始或结束日期抛出错误', async () => {
      const student = await createTestStudent();
      const updater = StudentUpdater.fromDocument(student);

      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 30);

      expect(() => updater.membership(start, null)).toThrow(/必须同时设置或同时为空/);
      expect(() => updater.membership(null, end)).toThrow(/必须同时设置或同时为空/);
    });

    it('开始日期晚于结束日期抛出错误', async () => {
      const student = await createTestStudent();
      const updater = StudentUpdater.fromDocument(student);

      const start = new Date();
      start.setDate(start.getDate() + 10);
      const end = new Date();
      end.setDate(end.getDate() + 5);

      expect(() => updater.membership(start, end)).toThrow(/会员开始日期不能晚于结束日期/);
    });
  });

  describe('班级/科目更新', () => {
    it('更新班级类型', async () => {
      const student = await createTestStudent({ classType: ClassType.MONTH });
      const updater = StudentUpdater.fromDocument(student);
      updater.classType(ClassType.YEAR);
      const updated = await updater.commit();

      expect(updated.classType).toBe(ClassType.YEAR);
    });

    it('更新科目类型', async () => {
      const student = await createTestStudent({ subject: SubjectType.SHOOTING });
      const updater = StudentUpdater.fromDocument(student);
      updater.subject(SubjectType.ARCHERY);
      const updated = await updater.commit();

      expect(updated.subject).toBe(SubjectType.ARCHERY);
    });

    it('无效班级类型抛出错误', async () => {
      const student = await createTestStudent();
      const updater = StudentUpdater.fromDocument(student);

      expect(() => updater.classType('INVALID' as any)).toThrow(/无效的班级类型/);
    });

    it('无效科目类型抛出错误', async () => {
      const student = await createTestStudent();
      const updater = StudentUpdater.fromDocument(student);

      expect(() => updater.subject('INVALID' as any)).toThrow(/无效的科目类型/);
    });
  });

  describe('课时数更新', () => {
    it('正常更新课时数', async () => {
      const student = await createTestStudent({ lessonLeft: 10 });
      const updater = StudentUpdater.fromDocument(student);
      updater.lessonLeft(15);
      const updated = await updater.commit();

      expect(updated.lessonLeft).toBe(15);
    });

    it('负数课时抛出错误', async () => {
      const student = await createTestStudent();
      const updater = StudentUpdater.fromDocument(student);

      expect(() => updater.lessonLeft(-1)).toThrow(/课时数不能为负数/);
    });
  });
});

describe('CashUpdater', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await clearAllData();
  });

  describe('静态工厂方法', () => {
    it('fromDocument() 从现有交易创建更新器', async () => {
      const transaction = await createTestTransaction(100, { studentId: null, note: 'Original Note' });
      const updater = CashUpdater.fromDocument(transaction as any);
      expect(updater).toBeDefined();
    });

    it('for() 通过UID创建更新器', async () => {
      const transaction = await createTestTransaction(100, { studentId: null, note: 'Test' });
      const updater = await CashUpdater.for(transaction.uid!);
      expect(updater).toBeDefined();
    });

    it('不存在的UID抛出错误', async () => {
      await expect(CashUpdater.for(99999)).rejects.toMatchObject({
        message: expect.stringContaining('不存在'),
      });
    });
  });

  describe('备注更新', () => {
    it('更新备注内容', async () => {
      const transaction = await createTestTransaction(100, { studentId: null, note: 'Old Note' });
      const updater = CashUpdater.fromDocument(transaction as any);
      updater.note('New Note');
      const updated = await updater.commit();

      expect(updated.note).toBe('New Note');
    });

    it('空白备注转换为null', async () => {
      const transaction = await createTestTransaction(100, { studentId: null, note: 'Test Note' });
      const updater = CashUpdater.fromDocument(transaction as any);
      updater.note('   ');
      const updated = await updater.commit();

      expect(updated.note).toBeNull();
    });
  });

  describe('金额更新', () => {
    it('更新金额', async () => {
      const transaction = await createTestTransaction(100, { studentId: null, note: 'Test' });
      const updater = CashUpdater.fromDocument(transaction as any);
      updater.amount(200);
      const updated = await updater.commit();

      expect(updated.amount).toBe(20000); // 200元 = 20000分
    });
  });

  describe('学员ID更新', () => {
    it('更新关联学员', async () => {
      const student = await createTestStudent({ name: 'Target Student' });
      const transaction = await createTestTransaction(100, { studentId: null, note: 'Test' });

      const updater = CashUpdater.fromDocument(transaction as any);
      updater.studentId(student.uid);
      const updated = await updater.commit();

      expect(updated.studentId).toBe(student.uid);
    });

    it('设置为null', async () => {
      const student = await createTestStudent();
      const transaction = await createTestTransaction(100, { studentId: student.uid, note: 'Test' });

      const updater = CashUpdater.fromDocument(transaction as any);
      updater.studentId(null);
      const updated = await updater.commit();

      expect(updated.studentId).toBeNull();
    });
  });
});
