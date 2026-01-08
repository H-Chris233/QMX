/**
 * Builder Pattern Unit Tests
 *
 * Tests for Builder classes - validation, fluent API, data integrity
 */

import { StudentBuilder } from '@/services/studentBuilder';
import { CashBuilder, convertAmountToCents } from '@/services/cashBuilder';
import { StudentUpdater } from '@/services/studentUpdater';
import { CashUpdater } from '@/services/cashUpdater';
import { StudentRepository } from '@/db/repositories/studentRepository';
import { CashRepository } from '@/db/repositories/cashRepository';
import { ClassType, SubjectType } from '@/types';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllCollections,
  resetAllSequences,
  createTestStudent,
} from './helpers/testSetup';

jest.setTimeout(30000);

describe('StudentBuilder', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await clearAllCollections();
    await resetAllSequences();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('Fluent API', () => {
    it('allows chaining multiple methods', async () => {
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

    it('returns new builder instance on create', () => {
      const builder = StudentBuilder.create();
      expect(builder).toBeInstanceOf(StudentBuilder);
    });
  });

  describe('Validation - Name', () => {
    it('throws error for empty name', async () => {
      await expect(
        StudentBuilder.create()
          .name('')
          .phone('13812345678')
          .build()
      ).rejects.toThrow(/学员姓名不能为空/);
    });

    it('throws error for name exceeding 50 characters', async () => {
      const longName = 'A'.repeat(51);
      await expect(
        StudentBuilder.create()
          .name(longName)
          .phone('13812345678')
          .build()
      ).rejects.toThrow(/学员姓名长度不能超过50字符/);
    });
  });

  describe('Validation - Phone', () => {
    it('throws error for empty phone', async () => {
      await expect(
        StudentBuilder.create()
          .name('Test Student')
          .phone('')
          .build()
      ).rejects.toThrow(/手机号不能为空/);
    });

    it('throws error for phone exceeding 20 characters', async () => {
      await expect(
        StudentBuilder.create()
          .name('Test Student')
          .phone('1'.repeat(21))
          .build()
      ).rejects.toThrow(/手机号长度不能超过20字符/);
    });

    it('throws error for invalid phone format', async () => {
      await expect(
        StudentBuilder.create()
          .name('Test Student')
          .phone('123456')
          .build()
      ).rejects.toThrow(/手机号格式不正确/);
    });

    it('allows special phone value "未填写"', async () => {
      const student = await StudentBuilder.create()
        .name('No Phone Student')
        .phone('未填写')
        .build();

      expect(student.phone).toBe('未填写');
    });
  });

  describe('Validation - Age', () => {
    it('throws error for negative age', async () => {
      await expect(
        StudentBuilder.create()
          .name('Test Student')
          .phone('13812345678')
          .age(-1)
          .build()
      ).rejects.toThrow(/年龄必须在0-120之间/);
    });

    it('throws error for age exceeding 120', async () => {
      await expect(
        StudentBuilder.create()
          .name('Test Student')
          .phone('13812345678')
          .age(121)
          .build()
      ).rejects.toThrow(/年龄必须在0-120之间/);
    });

    it('allows null age', async () => {
      const student = await StudentBuilder.create()
        .name('No Age Student')
        .phone('13812345678')
        .age(null)
        .build();

      expect(student.age).toBeNull();
    });
  });

  describe('Validation - Class Type', () => {
    it('throws error for invalid class type', () => {
      expect(() => {
        StudentBuilder.create().name('Test').classType('INVALID_CLASS' as any);
      }).toThrow(/无效的班级类型/);
    });

    it('accepts valid class types', async () => {
      const types = [ClassType.TEN_TRY, ClassType.MONTH, ClassType.YEAR, ClassType.OTHERS];
      for (const type of types) {
        const student = await StudentBuilder.create()
          .name(`Student ${type}`)
          .phone(`138${Date.now()}${type}`)
          .classType(type)
          .subject(SubjectType.SHOOTING)
          .build();
        expect(student.classType).toBe(type);
      }
    });
  });

  describe('Validation - Subject', () => {
    it('throws error for invalid subject', () => {
      expect(() => {
        StudentBuilder.create().name('Test').subject('INVALID_SUBJECT' as any);
      }).toThrow(/无效的科目类型/);
    });

    it('accepts valid subjects', async () => {
      const subjects = [SubjectType.SHOOTING, SubjectType.ARCHERY, SubjectType.OTHERS];
      for (const subject of subjects) {
        const student = await StudentBuilder.create()
          .name(`Student ${subject}`)
          .phone(`138${Date.now()}${subject}`)
          .classType(ClassType.MONTH)
          .subject(subject)
          .build();
        expect(student.subject).toBe(subject);
      }
    });
  });

  describe('Validation - Membership', () => {
    it('throws error when start date is after end date', async () => {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() - 1);

      await expect(
        StudentBuilder.create()
          .name('Test Student')
          .phone('13812345678')
          .membership(start, end)
          .build()
      ).rejects.toThrow(/会员开始日期不能晚于结束日期/);
    });

    it('creates student with valid membership', async () => {
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

    it('handles null membership dates', async () => {
      const student = await StudentBuilder.create()
        .name('No Membership Student')
        .phone('13812345678')
        .membership(null, null)
        .build();

      expect(student.membershipStartDate).toBeNull();
      expect(student.membershipEndDate).toBeNull();
    });
  });

  describe('Validation - Lesson Left', () => {
    it('throws error for negative lessons', async () => {
      await expect(
        StudentBuilder.create()
          .name('Test Student')
          .phone('13812345678')
          .lessonLeft(-1)
          .build()
      ).rejects.toThrow(/课时数不能为负数/);
    });

    it('defaults to 0 for TenTry class', async () => {
      const student = await StudentBuilder.create()
        .name('TenTry Student')
        .phone('13812345678')
        .classType(ClassType.TEN_TRY)
        .subject(SubjectType.SHOOTING)
        .build();

      expect(student.lessonLeft).toBe(10);
    });
  });

  describe('Rings Array', () => {
    it('initializes empty rings array', async () => {
      const student = await StudentBuilder.create()
        .name('No Rings Student')
        .phone('13812345678')
        .build();

      expect(student.rings).toEqual([]);
    });

    it('accepts rings array', async () => {
      const student = await StudentBuilder.create()
        .name('With Rings Student')
        .phone('13812345678')
        .rings([9, 8.5, 10, 7])
        .build();

      expect(student.rings).toEqual([9, 8.5, 10, 7]);
    });

    it('overwrites rings when called multiple times', async () => {
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

describe('CashBuilder', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await clearAllCollections();
    await resetAllSequences();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('Amount Conversion', () => {
    it('converts positive amounts correctly', () => {
      expect(convertAmountToCents(100)).toBe(10000);
      expect(convertAmountToCents(50.5)).toBe(5050);
      expect(convertAmountToCents(0.01)).toBe(1);
      expect(convertAmountToCents('99.99')).toBe(9999);
    });

    it('converts negative amounts for expenses', () => {
      expect(convertAmountToCents(-100)).toBe(-10000);
      expect(convertAmountToCents(-50.5)).toBe(-5050);
    });

    it('rejects zero amount', () => {
      expect(() => convertAmountToCents(0)).toThrow(/金额不能为0/);
      expect(() => convertAmountToCents('0')).toThrow(/金额不能为0/);
    });

    it('rejects invalid amounts', () => {
      expect(() => convertAmountToCents('invalid')).toThrow(/金额必须是数字/);
      expect(() => convertAmountToCents(NaN)).toThrow(/金额必须是数字/);
      expect(() => convertAmountToCents(Infinity)).toThrow(/金额必须是数字/);
    });

    it('rejects amounts with more than 2 decimal places', () => {
      expect(() => convertAmountToCents(123.456)).toThrow(/金额最多保留两位小数/);
    });
  });

  describe('Fluent API', () => {
    it('allows chaining multiple methods', async () => {
      const student = await createTestStudent();
      const transaction = await CashBuilder.create()
        .amount(100)
        .studentId(student.uid)
        .note('Test Transaction')
        .build();

      expect(transaction.amount).toBe(10000);
      expect(transaction.studentId).toBe(student.uid);
      expect(transaction.note).toBe('Test Transaction');
    });
  });

  describe('Student Validation', () => {
    it('rejects non-existent student id', async () => {
      await expect(
        CashBuilder.create()
          .amount(100)
          .studentId(99999)
          .build()
      ).rejects.toMatchObject({
        message: expect.stringContaining('学员不存在'),
      });
    });

    it('rejects invalid student id format', () => {
      expect(() => {
        CashBuilder.create().amount(100).studentId(-1);
      }).toThrow(/学员ID必须为正整数/);

      expect(() => {
        CashBuilder.create().amount(100).studentId(0);
      }).toThrow(/学员ID必须为正整数/);

      expect(() => {
        CashBuilder.create().amount(100).studentId(1.5);
      }).toThrow(/学员ID必须为正整数/);
    });
  });

  describe('Note Handling', () => {
    it('normalizes empty note to null', async () => {
      const transaction = await CashBuilder.create()
        .amount(50)
        .note('')
        .build();

      expect(transaction.note).toBeNull();
    });

    it('normalizes whitespace-only note to null', async () => {
      const transaction = await CashBuilder.create()
        .amount(50)
        .note('   ')
        .build();

      expect(transaction.note).toBeNull();
    });
  });

  describe('Income and Expense', () => {
    it('creates income transaction with positive amount', async () => {
      const transaction = await CashBuilder.create()
        .amount(100)
        .note('Income')
        .build();

      expect(transaction.amount).toBe(10000);
      expect(transaction.amount).toBeGreaterThan(0);
    });

    it('creates expense transaction with negative amount', async () => {
      const transaction = await CashBuilder.create()
        .amount(-50)
        .note('Expense')
        .build();

      expect(transaction.amount).toBe(-5000);
      expect(transaction.amount).toBeLessThan(0);
    });
  });
});

describe('StudentUpdater', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await clearAllCollections();
    await resetAllSequences();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('fromDocument', () => {
    it('creates updater from existing student', async () => {
      const student = await createTestStudent({ name: 'Original' });

      const updater = StudentUpdater.fromDocument(student);

      expect(updater).toBeDefined();
    });

    it('handles partial student data', async () => {
      const partialStudent = {
        uid: 1,
        name: 'Partial',
        phone: '13812345678',
        classType: ClassType.MONTH,
        subject: SubjectType.SHOOTING,
      } as any;

      const updater = StudentUpdater.fromDocument(partialStudent);
      expect(updater).toBeDefined();
    });
  });

  describe('for (static factory)', () => {
    it('creates updater by uid', async () => {
      const student = await createTestStudent();

      const updater = await StudentUpdater.for(student.uid);

      expect(updater).toBeDefined();
    });

    it('throws error for non-existent uid', async () => {
      await expect(StudentUpdater.for(99999)).rejects.toMatchObject({
        message: expect.stringContaining('不存在'),
      });
    });
  });

  describe('Score Operations', () => {
    it('adds ring', async () => {
      const student = await createTestStudent();
      const updater = StudentUpdater.fromDocument(student);
      updater.addRing(9);
      updater.addRing(8.5);
      const updated = await updater.commit();

      expect(updated.rings).toEqual([9, 8.5]);
    });

    it('rings at index', async () => {
      const student = await StudentBuilder.create()
        .name('Ring Test')
        .phone('13812345678')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .rings([8, 9, 7])
        .build();

      const updater = StudentUpdater.fromDocument(student);
      updater.ringAt(1, 10);
      const updated = await updater.commit();

      expect(updated.rings).toEqual([8, 10, 7]);
    });

    it('removes first ring', async () => {
      const student = await StudentBuilder.create()
        .name('Remove Test')
        .phone('13812345678')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .rings([8, 9, 7])
        .build();

      const updater = StudentUpdater.fromDocument(student);
      updater.removeRing(0);
      const updated = await updater.commit();

      expect(updated.rings).toEqual([9, 7]);
    });

    it('throws on out of range ring index', async () => {
      const student = await createTestStudent({ rings: [8, 9] });
      const updater = StudentUpdater.fromDocument(student);

      expect(() => {
        updater.removeRingAt(5);
      }).toThrow(/成绩索引超出范围/);
    });
  });

  describe('Membership Operations', () => {
    it('sets membership', async () => {
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

    it('clears membership with null', async () => {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 30);

      const student = await StudentBuilder.create()
        .name('Member')
        .phone('13812345678')
        .membership(start, end)
        .build();

      const updater = StudentUpdater.fromDocument(student);
      updater.membership(null, null);
      const updated = await updater.commit();

      expect(updated.membershipStartDate).toBeNull();
      expect(updated.membershipEndDate).toBeNull();
    });
  });
});

describe('CashUpdater', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await clearAllCollections();
    await resetAllSequences();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('fromDocument', () => {
    it('creates updater from existing transaction', async () => {
      const transaction = await createTestCashTransaction(100, null, 'Original Note');

      const updater = CashUpdater.fromDocument(transaction);

      expect(updater).toBeDefined();
    });
  });

  describe('for (static factory)', () => {
    it('creates updater by uid', async () => {
      const transaction = await createTestCashTransaction(100, null, 'Test');

      const updater = await CashUpdater.for(transaction.uid);

      expect(updater).toBeDefined();
    });

    it('throws error for non-existent uid', async () => {
      await expect(CashUpdater.for(99999)).rejects.toMatchObject({
        message: expect.stringContaining('不存在'),
      });
    });
  });

  describe('Update Operations', () => {
    it('updates note', async () => {
      const transaction = await createTestCashTransaction(100, null, 'Old Note');

      const updater = CashUpdater.fromDocument(transaction);
      updater.note('New Note');
      const updated = await updater.commit();

      expect(updated.note).toBe('New Note');
    });

    it('clears note with empty string', async () => {
      const transaction = await createTestCashTransaction(100, null, 'Test Note');

      const updater = CashUpdater.fromDocument(transaction);
      updater.note('   ');
      const updated = await updater.commit();

      expect(updated.note).toBeNull();
    });

    it('updates amount', async () => {
      const transaction = await createTestCashTransaction(100, null, 'Test');

      const updater = CashUpdater.fromDocument(transaction);
      updater.amount(200);
      const updated = await updater.commit();

      expect(updated.amount).toBe(20000);
    });

    it('updates student id', async () => {
      const student = await createTestStudent();
      const transaction = await createTestCashTransaction(100, null, 'Test');

      const updater = CashUpdater.fromDocument(transaction);
      updater.studentId(student.uid);
      const updated = await updater.commit();

      expect(updated.studentId).toBe(student.uid);
    });
  });
});
