import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { CashBuilder, convertAmountToCents } from '@/services/cashBuilder';
import { CashUpdater } from '@/services/cashUpdater';
import { Cash, CashClass } from '@/models/CashMongo';
import { AppError, ErrorType } from '@/utils/errors';
import { 
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllCollections,
  resetAllSequences,
  TestDataFactory 
} from '../../test/setupBackend';

jest.setTimeout(30000);

describe('Cash Transaction Service', () => {
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

  describe('CashBuilder - Amount Conversion', () => {
    it('converts positive yuan amount to cents', () => {
      expect(convertAmountToCents(100)).toBe(10000);
      expect(convertAmountToCents(50.5)).toBe(5050);
      expect(convertAmountToCents(0.01)).toBe(1);
      expect(convertAmountToCents('123.45')).toBe(12345);
    });

    it('converts negative yuan amount to cents for expenses', () => {
      expect(convertAmountToCents(-100)).toBe(-10000);
      expect(convertAmountToCents(-50.5)).toBe(-5050);
      expect(convertAmountToCents('-123.45')).toBe(-12345);
    });

    it('rejects zero amount', () => {
      expect(() => convertAmountToCents(0)).toThrow(/金额不能为0/);
      expect(() => convertAmountToCents('0')).toThrow(/金额不能为0/);
      expect(() => convertAmountToCents(0.00)).toThrow(/金额不能为0/);
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

  describe('CashBuilder - Income Creation', () => {
    it('creates income transaction without student', async () => {
      const transaction = await CashBuilder.create()
        .amount(100.50)
        .note('Miscellaneous Income')
        .build();

      expect(transaction.cash).toBe(10050);
      expect(transaction.student_id).toBeNull();
      expect(transaction.note).toBe('Miscellaneous Income');
      expect(transaction.isIncome()).toBe(true);
      expect(transaction.getAmount()).toBe(100.50);
      expect(transaction.uid).toBeGreaterThan(0);
    });

    it('creates income transaction with student', async () => {
      const student = await TestDataFactory.createStudent({ name: 'Alice' });
      const transaction = await CashBuilder.create()
        .amount(200)
        .studentId(student.uid)
        .note('Tuition Fee')
        .build();

      expect(transaction.cash).toBe(20000);
      expect(transaction.student_id).toBe(student.uid);
      expect(transaction.note).toBe('Tuition Fee');
      expect(transaction.isIncome()).toBe(true);
    });

    it('rejects transaction with non-existent student', async () => {
      await expect(
        CashBuilder.create()
          .amount(100)
          .studentId(99999)
          .build()
      ).rejects.toMatchObject({
        type: ErrorType.NotFound,
        statusCode: 404,
      });
    });

    it('normalizes empty note to null', async () => {
      const transaction = await CashBuilder.create()
        .amount(50)
        .note('  ')
        .build();

      expect(transaction.note).toBeNull();
    });
  });

  describe('CashBuilder - Expense Creation', () => {
    it('creates expense transaction with negative amount', async () => {
      const transaction = await CashBuilder.create()
        .amount(-50.75)
        .note('Office Rent')
        .build();

      expect(transaction.cash).toBe(-5075);
      expect(transaction.isIncome()).toBe(false);
      expect(transaction.getAmount()).toBe(50.75);
      expect(transaction.getFormattedAmount()).toBe('-¥50.75');
      expect(transaction.getTransactionDescription()).toBe('支出 ¥50.75');
    });

    it('creates expense for operational costs', async () => {
      const transaction = await CashBuilder.create()
        .amount(-1200.00)
        .note('Equipment Purchase')
        .build();

      expect(transaction.cash).toBe(-120000);
      expect(transaction.isIncome()).toBe(false);
    });
  });

  describe('Cash Transaction - Validation', () => {
    it('requires amount to be set', async () => {
      await expect(
        CashBuilder.create().note('Test').build()
      ).rejects.toMatchObject({
        type: ErrorType.InvalidInput,
      });
    });

    it('validates student ID format', () => {
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

    it('prevents zero amount at database level', async () => {
      const transaction = await CashBuilder.create().amount(100).build();
      transaction.cash = 0;

      await expect(transaction.save()).rejects.toThrow();
    });
  });

  describe('Cash Transaction - Search and Pagination', () => {
    beforeEach(async () => {
      const student1 = await TestDataFactory.createStudent({ name: 'Student A' });
      const student2 = await TestDataFactory.createStudent({ name: 'Student B' });

      await TestDataFactory.createCashTransaction(100, { studentId: student1.uid, note: 'Payment 1' });
      await TestDataFactory.createCashTransaction(200, { studentId: student1.uid, note: 'Payment 2' });
      await TestDataFactory.createCashTransaction(150, { studentId: student2.uid, note: 'Payment 3' });
      await TestDataFactory.createCashTransaction(-50, { studentId: null, note: 'Expense 1' });
      await TestDataFactory.createCashTransaction(-75, { studentId: null, note: 'Expense 2' });
    });

    it('retrieves all transactions with pagination', async () => {
      const result = await CashClass.findWithPagination({}, 1, 3);

      expect(result.data.length).toBe(3);
      expect(result.total).toBe(5);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(3);
    });

    it('filters transactions by student', async () => {
      // 使用beforeEach中创建的Student A，他有2笔交易
      // 我们需要先找到这个学生
      const { Student } = await import('../models/mongo');
      const students = await Student.search({ name: 'Student A' });
      const student = students[0];

      const result = await CashClass.search({ student_id: student!.uid });

      expect(result.data.length).toBe(2);
      result.data.forEach(tx => {
        expect(tx.student_id).toBe(student!.uid);
      });
    });

    it('filters income transactions', async () => {
      const result = await CashClass.search({ is_income: true });

      expect(result.data.length).toBe(3);
      result.data.forEach(tx => {
        expect(tx.isIncome()).toBe(true);
      });
    });

    it('filters expense transactions', async () => {
      const result = await CashClass.search({ is_income: false });

      expect(result.data.length).toBe(2);
      result.data.forEach(tx => {
        expect(tx.isIncome()).toBe(false);
      });
    });

    it('filters by amount range', async () => {
      const result = await CashClass.search({
        min_amount: 100,
        max_amount: 200,
      });

      result.data.forEach(tx => {
        const amount = tx.getAmount();
        expect(amount).toBeGreaterThanOrEqual(100);
        expect(amount).toBeLessThanOrEqual(200);
      });
    });

    it('sorts transactions by created_at descending by default', async () => {
      const result = await CashClass.search({ sort_order: 'DESC' });

      for (let i = 1; i < result.data.length; i++) {
        expect(result.data[i - 1]?.created_at.getTime())
          .toBeGreaterThanOrEqual(result.data[i]?.created_at.getTime() ?? 0);
      }
    });

    it('normalizes invalid pagination parameters', async () => {
      const result = await CashClass.findWithPagination({}, -1, 999);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(200);
    });
  });

  describe('Cash Transaction - Deletion', () => {
    it('deletes transaction by uid', async () => {
      const transaction = await TestDataFactory.createCashTransaction(100, { studentId: null, note: 'Test' });

      const deleted = await CashClass.deleteByUid(transaction.uid);
      expect(deleted).toBe(true);

      const found = await CashClass.findByUid(transaction.uid);
      expect(found).toBeNull();
    });

    it('returns false when deleting non-existent transaction', async () => {
      const deleted = await CashClass.deleteByUid(99999);
      expect(deleted).toBe(false);
    });
  });

  describe('Cash Transaction - Retrieval', () => {
    it('finds transaction by uid', async () => {
      const transaction = await TestDataFactory.createCashTransaction(100, { studentId: null, note: 'Test' });

      const found = await CashClass.findByUid(transaction.uid);
      expect(found).not.toBeNull();
      expect(found!.uid).toBe(transaction.uid);
      expect(found!.cash).toBe(10000);
    });

    it('returns null for non-existent uid', async () => {
      const found = await CashClass.findByUid(99999);
      expect(found).toBeNull();
    });

    it('retrieves all transactions sorted by created_at', async () => {
      await TestDataFactory.createCashTransaction(100, { studentId: null, note: 'First' });
      await TestDataFactory.createCashTransaction(200, { studentId: null, note: 'Second' });
      await TestDataFactory.createCashTransaction(300, { studentId: null, note: 'Third' });

      const all = await CashClass.findAll();
      expect(all.length).toBe(3);
      expect(all[0]?.note).toBe('Third');
      expect(all[2]?.note).toBe('First');
    });
  });

  describe('Cash Transaction - JSON Serialization', () => {
    it('serializes transaction with all computed fields', async () => {
      const student = await TestDataFactory.createStudent();
      const transaction = await TestDataFactory.createCashTransaction(123.45, { studentId: student.uid, note: 'Test' });

      const json = transaction.toJSON();

      expect(json.uid).toBe(transaction.uid);
      expect(json.cash).toBe(12345);
      expect(json.cashInCents).toBe(12345);
      expect(json.amount).toBe(123.45);
      expect(json.student_id).toBe(student.uid);
      expect(json.studentId).toBe(student.uid);
      expect(json.note).toBe('Test');
      expect(json.is_income).toBe(true);
      expect(json.isIncome).toBe(true);
      expect(json.is_expense).toBe(false);
      expect(json.isExpense).toBe(false);
      expect(json.formatted_amount).toBe('+¥123.45');
      expect(json.formattedAmount).toBe('+¥123.45');
      expect(json.description).toBe('收入 ¥123.45');
      expect(json.created_at).toBeInstanceOf(Date);
      expect(json.createdAt).toBeInstanceOf(Date);
    });

    it('serializes expense transaction correctly', async () => {
      const transaction = await TestDataFactory.createCashTransaction(-50.25, { studentId: null, note: 'Expense' });

      const json = transaction.toJSON();

      expect(json.is_income).toBe(false);
      expect(json.is_expense).toBe(true);
      expect(json.formatted_amount).toBe('-¥50.25');
      expect(json.description).toBe('支出 ¥50.25');
    });
  });

  describe('CashUpdater - Transaction Updates', () => {
    it('updates transaction note', async () => {
      const transaction = await TestDataFactory.createCashTransaction(100, { studentId: null, note: 'Old Note' });

      const updater = CashUpdater.fromDocument(transaction);
      updater.note('New Note');
      const updated = await updater.commit();

      expect(updated.note).toBe('New Note');
    });

    it('loads transaction by uid', async () => {
      const transaction = await TestDataFactory.createCashTransaction(100, { studentId: null, note: 'Test' });

      const updater = await CashUpdater.for(transaction.uid);
      updater.note('Updated');
      const updated = await updater.commit();

      expect(updated.uid).toBe(transaction.uid);
      expect(updated.note).toBe('Updated');
    });

    it('throws NotFound error for non-existent transaction', async () => {
      await expect(CashUpdater.for(99999)).rejects.toMatchObject({
        type: ErrorType.NotFound,
        statusCode: 404,
      });
    });

    it('clears note when set to empty string', async () => {
      const transaction = await TestDataFactory.createCashTransaction(100, { studentId: null, note: 'Test' });

      const updater = CashUpdater.fromDocument(transaction);
      updater.note('   ');
      const updated = await updater.commit();

      expect(updated.note).toBeNull();
    });
  });
});
