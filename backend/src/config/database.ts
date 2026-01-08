import { testConnection as testPostgreSQLConnection, closeDatabase as closePostgreSQLDatabase } from '@/db';
import logger from '@/utils/logger';

// 启动数据库连接 - PostgreSQL（使用 Drizzle + pg 连接池）
export const connectDatabase = async (): Promise<void> => {
  const baseDelay = 2000; // 基础延迟2秒
  const maxDelay = 30000; // 最大延迟30秒
  let attempt = 1;

  // 先尝试一次连接
  try {
    const success = await testPostgreSQLConnection();
    if (success) {
      logger.info('PostgreSQL 连接成功');
      return;
    }
  } catch (error) {
    logger.error('PostgreSQL 初始连接失败，将启动后台重试:', error);
  }

  // 后台持续重试 - 指数退避
  const retryConnection = async () => {
    while (true) {
      try {
        const success = await testPostgreSQLConnection();
        if (success) {
          logger.info('🎉 PostgreSQL 后台重连成功！');
          return;
        }
      } catch (error) {
        // 指数退避算法：delay = min(baseDelay * 2^(attempt-1), maxDelay)
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);

        logger.error(`PostgreSQL 后台重连失败 (尝试 ${attempt}):`, error);
        logger.info(`⏳ ${Math.round(delay/1000)}秒后继续重试 (指数退避)...`);

        attempt++;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  // 启动后台重试，不阻塞主线程
  setTimeout(retryConnection, 1000);
};

// 数据库断开连接
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await closePostgreSQLDatabase();
    logger.info('PostgreSQL 连接已关闭');
  } catch (error) {
    logger.error('关闭PostgreSQL连接时出错:', error);
  }
};

// 检查是否使用PostgreSQL的函数（用于适配器兼容）
export function isUsingMongoDB(): boolean {
  return false;
}

export function isUsingPostgreSQL(): boolean {
  return true;
}