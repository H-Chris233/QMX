import mongoManager from '@/config/mongodb';
import logger from '@/utils/logger';

// 连接数据库
export const connectDatabase = async (): Promise<void> => {
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