import { getNextSequence, resetSequence, STUDENT_SEQUENCE_NAME } from '@/models/counter';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// 使用更长的超时
jest.setTimeout(90000);

describe('Counter utilities', () => {
  let mongoServer: MongoMemoryServer | null = null;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it('should reset sequence', async () => {
    console.log('测试1: 开始重置序列...');
    const resetValue = await resetSequence(STUDENT_SEQUENCE_NAME);
    console.log('测试1: 重置完成，值:', resetValue);
    expect(resetValue).toBe(0);
  });

  it('should get next sequence', async () => {
    console.log('测试2: 开始获取序列...');
    const firstValue = await getNextSequence(STUDENT_SEQUENCE_NAME);
    console.log('测试2: 获取第一个值:', firstValue);
    expect(firstValue).toBeGreaterThan(0);
  });
});