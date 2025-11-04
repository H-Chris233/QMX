import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import CounterModel, { getNextSequence, resetSequence, STUDENT_SEQUENCE_NAME } from '@/models/counter';

jest.setTimeout(30000);

describe('Counter utilities', () => {
  let mongoServer: MongoMemoryServer | undefined;

  beforeAll(async () => {
    const instance = await MongoMemoryServer.create();
    mongoServer = instance;
    await mongoose.connect(instance.getUri(), {
      dbName: 'qmx-counter-tests'
    });
  });

  afterEach(async () => {
    await CounterModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
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
