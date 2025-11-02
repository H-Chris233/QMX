import { getDatabaseType } from '@/config';
import mongoManager from '@/config/mongodb';
import logger from '@/utils/logger';

// 连接数据库
export const connectDatabase = async (): Promise<void> => {
  const dbType = getDatabaseType();

  if (dbType !== 'mongodb') {
    throw new Error(`QMX现在只支持MongoDB，请更新配置使用mongodb`);
  }

  try {
    await mongoManager.connect();
    logger.info('MongoDB 连接成功');
  } catch (error) {
    logger.error('MongoDB 连接失败:', error);
    process.exit(1);
  }
};

// 数据库断开连接
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoManager.disconnect();
    logger.info('MongoDB 连接已关闭');
  } catch (error) {
    logger.error('关闭MongoDB连接时出错:', error);
  }
};

// 检查是否使用 MongoDB
export const isUsingMongoDB = (): boolean => {
  return getDatabaseType() === 'mongodb';
};

// 优雅关闭处理
process.on('SIGINT', async () => {
  logger.info('收到SIGINT信号，正在关闭应用...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('收到SIGTERM信号，正在关闭应用...');
  await disconnectDatabase();
  process.exit(0);
});