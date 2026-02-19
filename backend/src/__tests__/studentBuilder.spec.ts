/**
 * StudentBuilder 测试
 *
 * 测试学员构建器的所有功能：
 * - 流畅API
 * - 验证规则
 * - 默认值处理
 */

import { StudentBuilder } from '@/services/studentBuilder';
import { ClassType, SubjectType } from '@/types';
import { setupTestDatabase, clearAllData, createTestStudent } from './helpers/testSetup';

describe('StudentBuilder', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await clearAllData();
  });

  afterAll(async () => {
    // 清理工作由全局设置处理
  });

  describe('静态工厂方法', () => {
    it('create() 返回新的构建器实例', () => {
      const builder = StudentBuilder.create();
      expect(builder).toBeInstanceOf(StudentBuilder);
    });
  });

  describe('流畅API - 链式调用', () => {
    it('支持链式调用所有方法', async () => {
      const student = await StudentBuilder.create()
        .name('Chained Student')
        .phone('13812345678')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .age(25)
        .rings([8, 9, 7])
        .lessonLeft(20)
        .note('Test note')
        .build();

      expect(student.name).toBe('Chained Student');
      expect(student.phone).toBe('13812345678');
      expect(student.classType).toBe(ClassType.MONTH);
      expect(student.subject).toBe(SubjectType.SHOOTING);
      expect(student.age).toBe(25);
      expect(student.rings).toEqual([8, 9, 7]);
      expect(student.lessonLeft).toBe(20);
      expect(student.note).toBe('Test note');
    });
  });

  describe('姓名验证', () => {
    it('空姓名抛出错误', async () => {
      await expect(
        StudentBuilder.create()
          .name('')
          .phone('13812345678')
          .build(),
      ).rejects.toThrow(/学员姓名不能为空/);
    });

    it('姓名超过50字符抛出错误', async () => {
      const longName = 'A'.repeat(51);
      await expect(
        StudentBuilder.create()
          .name(longName)
          .phone('13812345678')
          .build(),
      ).rejects.toThrow(/学员姓名长度不能超过50字符/);
    });

    it('50字符以内正常创建', async () => {
      const name50 = 'A'.repeat(50);
      const student = await StudentBuilder.create()
        .name(name50)
        .phone('13812345678')
        .build();
      expect(student.name).toBe(name50);
    });
  });

  describe('手机号验证', () => {
    it('空手机号抛出错误', async () => {
      await expect(
        StudentBuilder.create()
          .name('Test Student')
          .phone('')
          .build(),
      ).rejects.toThrow(/手机号不能为空/);
    });

    it('手机号超过11字符抛出错误', async () => {
      await expect(
        StudentBuilder.create()
          .name('Test Student')
          .phone('1'.repeat(12))
          .build(),
      ).rejects.toThrow(/手机号长度不能超过11字符/);
    });

    it('无效手机格式抛出错误', async () => {
      await expect(
        StudentBuilder.create()
          .name('Test Student')
          .phone('123456') // 太短
          .build(),
      ).rejects.toThrow(/手机号格式不正确/);

      await expect(
        StudentBuilder.create()
          .name('Test Student')
          .phone('138123456789') // 12位
          .build(),
      ).rejects.toThrow(/手机号长度不能超过11字符/);
    });

    it('特殊值"未填写"允许', async () => {
      const student = await StudentBuilder.create()
        .name('No Phone Student')
        .phone('未填写')
        .build();
      expect(student.phone).toBe('未填写');
    });

    it('有效手机号通过验证', async () => {
      const validPhones = ['13812345678', '13987654321', '18612345678'];
      for (const phone of validPhones) {
        const student = await StudentBuilder.create()
          .name(`Student ${phone}`)
          .phone(phone)
          .build();
        expect(student.phone).toBe(phone);
      }
    });
  });

  describe('年龄验证', () => {
    it('负数年龄抛出错误', async () => {
      await expect(
        StudentBuilder.create()
          .name('Test Student')
          .phone('13812345678')
          .age(-1)
          .build(),
      ).rejects.toThrow(/年龄必须在0-120之间/);
    });

    it('超过120岁抛出错误', async () => {
      await expect(
        StudentBuilder.create()
          .name('Test Student')
          .phone('13812345678')
          .age(121)
          .build(),
      ).rejects.toThrow(/年龄必须在0-120之间/);
    });

    it('0-120范围内正常', async () => {
      const student = await StudentBuilder.create()
        .name('Valid Age Student')
        .phone('13812345678')
        .age(30)
        .build();
      expect(student.age).toBe(30);
    });

    it('null年龄正常创建', async () => {
      const student = await StudentBuilder.create()
        .name('No Age Student')
        .phone('13812345678')
        .age(null)
        .build();
      expect(student.age).toBeNull();
    });
  });

  describe('班级类型验证', () => {
    it('无效班级类型抛出错误', () => {
      expect(() => {
        StudentBuilder.create().name('Test').classType('INVALID_CLASS' as any);
      }).toThrow(/无效的班级类型/);
    });

    it('所有有效班级类型正常', async () => {
      const validTypes = [ClassType.TEN_TRY, ClassType.MONTH, ClassType.YEAR, ClassType.OTHERS];
      for (const type of validTypes) {
        const suffix = `${Date.now()}${validTypes.indexOf(type)}`.slice(-8).padStart(8, '0');
        const student = await StudentBuilder.create()
          .name(`Student ${type}`)
          .phone(`138${suffix}`)
          .classType(type)
          .subject(SubjectType.SHOOTING)
          .build();
        expect(student.classType).toBe(type);
      }
    });
  });

  describe('科目类型验证', () => {
    it('无效科目类型抛出错误', () => {
      expect(() => {
        StudentBuilder.create().name('Test').subject('INVALID_SUBJECT' as any);
      }).toThrow(/无效的科目类型/);
    });

    it('所有有效科目类型正常', async () => {
      const validSubjects = [SubjectType.SHOOTING, SubjectType.ARCHERY, SubjectType.SHOOTING_ARCHERY, SubjectType.OTHERS];
      for (const subject of validSubjects) {
        const suffix = `${Date.now()}${validSubjects.indexOf(subject)}`.slice(-8).padStart(8, '0');
        const student = await StudentBuilder.create()
          .name(`Student ${subject}`)
          .phone(`138${suffix}`)
          .classType(ClassType.MONTH)
          .subject(subject)
          .build();
        expect(student.subject).toBe(subject);
      }
    });
  });

  describe('会员期间验证', () => {
    it('开始日期晚于结束日期抛出错误', async () => {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() - 1);

      await expect(
        StudentBuilder.create()
          .name('Test Student')
          .phone('13812345678')
          .membership(start, end)
          .build(),
      ).rejects.toThrow(/会员开始日期不能晚于结束日期/);
    });

    it('有效的会员期间正常创建', async () => {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 30);

      const student = await StudentBuilder.create()
        .name('Member Student')
        .phone('13812345678')
        .membership(start, end)
        .build();

      expect(student.membershipStartDate).not.toBeNull();
      expect(student.membershipEndDate).not.toBeNull();
    });

    it('null会员期间创建无会员学员', async () => {
      const student = await StudentBuilder.create()
        .name('No Membership Student')
        .phone('13812345678')
        .membership(null, null)
        .build();

      expect(student.membershipStartDate).toBeNull();
      expect(student.membershipEndDate).toBeNull();
    });
  });

  describe('课时数验证', () => {
    it('负数课时抛出错误', async () => {
      await expect(
        StudentBuilder.create()
          .name('Test Student')
          .phone('13812345678')
          .lessonLeft(-1)
          .build(),
      ).rejects.toThrow(/课时数不能为负数/);
    });

    it('试课班级默认10节课', async () => {
      const student = await StudentBuilder.create()
        .name('TenTry Student')
        .phone('13812345678')
        .classType(ClassType.TEN_TRY)
        .subject(SubjectType.SHOOTING)
        .build();

      expect(student.lessonLeft).toBe(10);
    });

    it('非试课班级课时为0', async () => {
      const student = await StudentBuilder.create()
        .name('Month Student')
        .phone('13812345678')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .build();

      expect(student.lessonLeft).toBe(0);
    });
  });

  describe('成绩数组', () => {
    it('默认空数组', async () => {
      const student = await StudentBuilder.create()
        .name('No Rings Student')
        .phone('13812345678')
        .build();

      expect(student.rings).toEqual([]);
    });

    it('接受成绩数组', async () => {
      const student = await StudentBuilder.create()
        .name('With Rings Student')
        .phone('13812345678')
        .rings([9, 8.5, 10, 7])
        .build();

      expect(student.rings).toEqual([9, 8.5, 10, 7]);
    });

    it('多次调用覆盖之前的值', async () => {
      const student = await StudentBuilder.create()
        .name('Rings Test')
        .phone('13812345678')
        .rings([9, 8])
        .rings([7, 6])
        .build();

      expect(student.rings).toEqual([7, 6]);
    });
  });
});
