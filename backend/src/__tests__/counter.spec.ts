import { getNextSequence, resetSequence, STUDENT_SEQUENCE_NAME } from '@/models/counter';
import { setupTestDatabase, cleanupTestDatabase } from '../../test/setupBackend';

jest.setTimeout(30000);

describe('Counter utilities', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  it('should return incremental sequence values', async () => {
    const resetValue = await resetSequence(STUDENT_SEQUENCE_NAME);

    const firstValue = await getNextSequence(STUDENT_SEQUENCE_NAME);
    const secondValue = await getNextSequence(STUDENT_SEQUENCE_NAME);

    expect(resetValue).toBe(0);
    expect(firstValue).toBe(1);
    expect(secondValue).toBe(firstValue + 1);
  });
});
