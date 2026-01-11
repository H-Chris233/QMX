import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import logger from '@/utils/logger';

// 创建连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,                      // 最大连接数
  idleTimeoutMillis: 30000,      // 空闲超时 30 秒
  connectionTimeoutMillis: 2000, // 连接超时 2 秒
});

// 创建 Drizzle 实例
export const db = drizzle(pool, { schema });

// 导出 schema 以便在其他地方使用
export * from './schema';

// 数据库连接测试
export async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ PostgreSQL 连接成功:', result.rows[0].now);
    return true;
  } catch (error) {
    logger.error('PostgreSQL 连接失败', error);
    return false;
  }
}

// 优雅关闭数据库连接
export async function closeDatabase() {
  await pool.end();
  logger.info('数据库连接已关闭');
}

// 优雅关闭处理
if (process.env.NODE_ENV !== 'test') {
  process.on('SIGINT', async () => {
    await closeDatabase();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await closeDatabase();
    process.exit(0);
  });
}
