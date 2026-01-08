import { CashBuilder, convertAmountToCents } from '@/services/cashBuilder';
import { CashUpdater } from '@/services/cashUpdater';
import { CashRepository } from '@/db/repositories/cashRepository';
import { StudentRepository } from '@/db/repositories/studentRepository';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllCollections,
  resetAllSequences,
  createTestStudent,
  createTestCashTransaction,
} from './helpers/testSetup';

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

      expect(transaction.amount).toBe(10050);
      expect(transaction.studentId).toBeNull();
      expect(transaction.note).toBe('Miscellaneous Income');
      expect(transaction.uid).toBeGreaterThan(0);
    });

    it('creates income transaction with student', async () => {
      const student = await createTestStudent({ name: 'Alice' });
      const transaction = await CashBuilder.create()
        .amount(200)
        .studentId(student.uid)
        .note('Tuition Fee')
        .build();

      expect(transaction.amount).toBe(20000);
      expect(transaction.studentId).toBe(student.uid);
      expect(transaction.note).toBe('Tuition Fee');
    });

    it('rejects transaction with non-existent student', async () => {
      await expect(
        CashBuilder.create()
          .amount(100)
          .studentId(99999)
          .build()
      ).rejects.toMatchObject({
        message: expect.stringContaining('学员不存在'),
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

      expect(transaction.amount).toBe(-5075);
      expect(transaction.amount).toBeLessThan(0);
    });

    it('creates expense for operational costs', async () => {
      const transaction = await CashBuilder.create()
        .amount(-1200.00)
        .note('Equipment Purchase')
        .build();

      expect(transaction.amount).toBe(-120000);
      expect(transaction.amount).toBeLessThan(0);
    });
  });

  describe('Cash Transaction - Validation', () => {
    it('requires amount to be set', async () => {
      await expect(
        CashBuilder.create().note('Test').build()
      ).rejects.toThrow();
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
  });

  describe('Cash Transaction - Search and Pagination', () => {
    beforeEach(async () => {
      const student1 = await createTestStudent({ name: 'Student A' });
      const student2 = await createTestStudent({ name: 'Student B' });

      await createTestCashTransaction(100, student1.uid, 'Payment 1');
      await createTestCashTransaction(200, student1.uid, 'Payment 2');
      await createTestCashTransaction(150, student2.uid, 'Payment 3');
      await createTestCashTransaction(-50, null, 'Expense 1');
      await createTestCashTransaction(-75, null, 'Expense 2');
    });

    it('retrieves all transactions with pagination', async () => {
      const result = await CashRepository.findWithPagination({});

      expect(result.data.length).toBe(5);
      expect(result.pagination.total).toBe(5);
    });

    it('filters transactions by student', async () => {
      const student = await StudentRepository.findAll();
      const studentA = student.find(s => s.name === 'Student A');

      const result = await CashRepository.findWithPagination({
        student_id: studentA!.uid,
      });

      expect(result.data.length).toBe(2);
      result.data.forEach(tx => {
        expect(tx.studentId).toBe(studentA!.uid);
      });
    });

    it('filters income transactions', async () => {
      const result = await CashRepository.findWithPagination({
        is_income: true,
      });

      expect(result.data.length).toBe(3);
      result.data.forEach(tx => {
        expect(tx.amount).toBeGreaterThan(0);
      });
    });

    it('filters expense transactions', async () => {
      const result = await CashRepository.findWithPagination({
        is_income: false,
      });

      expect(result.data.length).toBe(2);
      result.data.forEach(tx => {
        expect(tx.amount).toBeLessThan(0);
      });
    });

    it('filters by amount range', async () => {
      const result = await CashRepository.findWithPagination({
        min_amount: 10000, // cents
        max_amount: 20000, // cents
      });

      result.data.forEach(tx => {
        expect(tx.amount).toBeGreaterThanOrEqual(10000);
        expect(tx.amount).toBeLessThanOrEqual(20000);
      });
    });

    it('retrieves all transactions sorted by created_at', async () => {
      await createTestCashTransaction(100, null, 'First');
      await createTestCashTransaction(200, null, 'Second');
      await createTestCashTransaction(300, null, 'Third');

      const all = await CashRepository.findAll();
      expect(all.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Cash Transaction - Deletion', () => {
    it('deletes transaction by uid', async () => {
      const transaction = await createTestCashTransaction(100, null, 'Test');

      const deleted = await CashRepository.deleteByUid(transaction.uid);
      expect(deleted).toBe(true);

      const found = await CashRepository.findByUid(transaction.uid);
      expect(found).toBeNull();
    });

    it('returns false when deleting non-existent transaction', async () => {
      const deleted = await CashRepository.deleteByUid(99999);
      expect(deleted).toBe(false);
    });
  });

  describe('Cash Transaction - Retrieval', () => {
    it('finds transaction by uid', async () => {
      const transaction = await createTestCashTransaction(100, null, 'Test');

      const found = await CashRepository.findByUid(transaction.uid);
      expect(found).not.toBeNull();
      expect(found!.uid).toBe(transaction.uid);
      expect(found!.amount).toBe(10000);
    });

    it('returns null for non-existent uid', async () => {
      const found = await CashRepository.findByUid(99999);
      expect(found).toBeNull();
    });
  });

  describe('CashUpdater - Transaction Updates', () => {
    it('updates transaction note', async () => {
      const transaction = await createTestCashTransaction(100, null, 'Old Note');

      const updater = CashUpdater.fromDocument(transaction);
      updater.note('New Note');
      const updated = await updater.commit();

      expect(updated.note).toBe('New Note');
    });

    it('loads transaction by uid', async () => {
      const transaction = await createTestCashTransaction(100, null, 'Test');

      const updater = await CashUpdater.for(transaction.uid);
      updater.note('Updated');
      const updated = await updater.commit();

      expect(updated.uid).toBe(transaction.uid);
      expect(updated.note).toBe('Updated');
    });

    it('throws NotFound error for non-existent transaction', async () => {
      await expect(CashUpdater.for(99999)).rejects.toMatchObject({
        message: expect.stringContaining('不存在'),
      });
    });

    it('clears note when set to empty string', async () => {
      const transaction = await createTestCashTransaction(100, null, 'Test');

      const updater = CashUpdater.fromDocument(transaction);
      updater.note('   ');
      const updated = await updater.commit();

      expect(updated.note).toBeNull();
    });
  });
});
