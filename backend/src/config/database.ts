import { mongoManager } from './mongodb';
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


// 检查是否使用MongoDB的函数（用于适配器兼容）
export function isUsingMongoDB(): boolean {
  return true;
}