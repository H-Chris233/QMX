import { getNextSequence, resetSequence, STUDENT_SEQUENCE_NAME } from '@/models/counter';
import { setupTestDatabase, cleanupTestDatabase } from '../../test/setupBackend';

jest.setTimeout(30000);

describe('Counter utilities - Simple Test', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  it('should return incremental sequence values', async () => {
    // 重置序列
    const resetValue = await resetSequence(STUDENT_SEQUENCE_NAME);
    expect(resetValue).toBe(0);

    // 获取第一个值
    const firstValue = await getNextSequence(STUDENT_SEQUENCE_NAME);
    expect(firstValue).toBe(1);

    // 获取第二个值
    const secondValue = await getNextSequence(STUDENT_SEQUENCE_NAME);
    expect(secondValue).toBe(2);
  });

  it('should work independently across multiple sequences', async () => {
    // 重置两个不同的序列
    await resetSequence(STUDENT_SEQUENCE_NAME);
    const { CASH_SEQUENCE_NAME } = await import('@/models/counter');
    await resetSequence(CASH_SEQUENCE_NAME);

    // 分别获取值
    const studentValue = await getNextSequence(STUDENT_SEQUENCE_NAME);
    const cashValue = await getNextSequence(CASH_SEQUENCE_NAME);

    expect(studentValue).toBe(1);
    expect(cashValue).toBe(1);
  });
});