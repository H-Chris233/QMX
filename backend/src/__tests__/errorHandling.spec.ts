import { CashBuilder } from '@/services/cashBuilder';
import { AppError, ErrorType } from '@/utils/errors';
import { StudentBuilder } from '@/services/studentBuilder';
import { StudentUpdater } from '@/services/studentUpdater';
import { StudentRepository } from '@/db/repositories/studentRepository';
import { ClassType, SubjectType } from '@/types';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllCollections,
  resetAllSequences,
  createTestStudent,
} from './helpers/testSetup';

jest.setTimeout(30000);

describe('Domain error handling alignment', () => {
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

  it('throws InvalidInput when cash amount is zero', () => {
    expect.assertions(4);
    try {
      CashBuilder.create().amount(0);
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      const appError = error as AppError;
      expect(appError.type).toBe(ErrorType.InvalidInput);
      expect(appError.statusCode).toBe(400);
      expect(appError.message).toContain('金额不能为0');
      return;
    }
    throw new Error('Expected CashBuilder to reject zero amount');
  });

  it('allows negative cash amount for expenses', async () => {
    const transaction = await CashBuilder.create()
      .amount(-12.34)
      .note('租金支出')
      .build();

    expect(transaction.amount).toBe(-1234);
    expect(transaction.amount).toBeLessThan(0);
  });

  it('rejects student lookups for non-existent resources with NotFound error', async () => {
    await expect(StudentUpdater.for(999)).rejects.toMatchObject({
      message: expect.stringContaining('不存在'),
    });
  });

  it('rejects score operations when index is out of range', async () => {
    const student = await createTestStudent({
      name: 'Range Guard',
      phone: '13800000000',
      classType: ClassType.MONTH,
      subject: SubjectType.SHOOTING,
    });

    const updater = StudentUpdater.for(student.uid);
    await updater.then(async (u) => {
      u.addRing(9);
      await u.commit();
    });

    const reloaded = await StudentRepository.findByUid(student.uid);
    expect(reloaded).not.toBeNull();

    const updater2 = StudentUpdater.fromDocument(reloaded!);
    expect(() => {
      // 尝试删除不存在的索引
      updater2.removeRing(5);
    }).toThrow(/成绩索引超出范围/);
  });
});
