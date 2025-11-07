import { getNextSequence, resetSequence, STUDENT_SEQUENCE_NAME } from '@/models/counter';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

jest.setTimeout(60000);

describe('Counter utilities - Debug', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    console.log('启动内存数据库...');
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log('数据库已连接:', uri);
  });

  afterAll(async () => {
    console.log('清理数据库...');
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('should reset sequence', async () => {
    console.log('开始重置序列...');
    const resetValue = await resetSequence(STUDENT_SEQUENCE_NAME);
    console.log('重置完成，值:', resetValue);
    expect(resetValue).toBe(0);
  });

  it('should get next sequence', async () => {
    console.log('开始获取序列...');
    const value = await getNextSequence(STUDENT_SEQUENCE_NAME);
    console.log('获取完成，值:', value);
    expect(value).toBe(1);
  });
});