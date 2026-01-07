import type { Config } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

export default {
  // Schema 文件位置
  schema: './src/db/schema/index.ts',

  // 迁移文件输出目录
  out: './drizzle',

  // 数据库驱动
  driver: 'pg',

  // 数据库连接
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },

  // 输出详细日志
  verbose: true,

  // 严格模式
  strict: true,

  // 使用 .env 文件中的变量
  envPrefix: 'DB_',
} satisfies Config;
