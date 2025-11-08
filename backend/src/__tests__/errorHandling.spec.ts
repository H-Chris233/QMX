import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { CashBuilder } from '@/services/cashBuilder';
import { AppError, ErrorType } from '@/utils/errors';
import { Cash } from '@/models/CashMongo';
import { Student, studentModel } from '@/models/mongo';
import { StudentBuilder } from '@/services/studentBuilder';
import { StudentUpdater } from '@/services/studentUpdater';
import { ClassType, SubjectType } from '@/types';
import { 
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllCollections,
  resetAllSequences,
  TestDataFactory 
} from '../../test/setupBackend';

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
    const transaction = await TestDataFactory.createCashTransaction(-12.34, { 
      studentId: null, 
      note: '租金支出' 
    });

    expect(transaction.cash).toBe(-1234);
    expect(transaction.isIncome()).toBe(false);
  });

  it('rejects student lookups for non-existent resources with NotFound error', async () => {
    await expect(StudentUpdater.for(999)).rejects.toMatchObject({
      type: ErrorType.NotFound,
      statusCode: 404,
    });
  });

  it('rejects score operations when index is out of range', async () => {
    const student = await TestDataFactory.createStudent({
      name: 'Range Guard',
      phone: '13800000000',
      class: ClassType.MONTH,
      subject: SubjectType.SHOOTING,
    });

    const updater = StudentUpdater.fromDocument(student);
    updater.addRing(9);
    await updater.commit();

    const reloaded = await Student.findByUid(student.uid);

    expect.assertions(2);
    try {
      StudentUpdater.fromDocument(reloaded!).removeRingAt(5);
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).type).toBe(ErrorType.InvalidInput);
      return;
    }

    throw new Error('Expected InvalidInput error when removing score with out-of-range index');
  });
});
