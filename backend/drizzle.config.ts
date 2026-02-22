import type { Config } from 'drizzle-kit';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDir, '.env') });

const drizzleDatabaseUrl = process.env.DATABASE_URL_MIGRATION || process.env.DATABASE_URL;
const drizzleDatabaseHostAddr = process.env.DATABASE_URL_MIGRATION_HOSTADDR?.trim();

if (!drizzleDatabaseUrl) {
  throw new Error('DATABASE_URL_MIGRATION 或 DATABASE_URL 未配置，无法执行 drizzle 命令');
}

const buildDbCredentials = (): Config['dbCredentials'] => {
  if (!drizzleDatabaseHostAddr) {
    return { url: drizzleDatabaseUrl };
  }

  const parsed = new URL(drizzleDatabaseUrl);
  const database = parsed.pathname.replace(/^\//, '');

  if (!database) {
    throw new Error('DATABASE_URL 路径缺少数据库名，无法使用 hostaddr 模式');
  }

  return {
    host: drizzleDatabaseHostAddr,
    port: parsed.port ? Number(parsed.port) : 5432,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
    // host 使用 IP 时通过 servername 保留 TLS/SNI 校验目标
    ssl: {
      servername: parsed.hostname,
    },
  };
};

export default {
  // Schema 文件位置
  schema: './src/db/schema/index.ts',

  // 迁移文件输出目录
  out: './drizzle',

  // 数据库方言 (新版本使用 dialect 替代 driver)
  dialect: 'postgresql',

  // 数据库连接
  dbCredentials: buildDbCredentials(),

  // 输出详细日志
  verbose: true,

  // 严格模式
  strict: true,
} satisfies Config;
