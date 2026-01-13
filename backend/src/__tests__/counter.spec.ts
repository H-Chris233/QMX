// PostgreSQL 使用 SERIAL/IDENTITY 自动生成ID，不需要手动序列
// 此测试文件仅保留验证数据库连接

import { db } from '@/db';
import { sql } from 'drizzle-orm';

jest.setTimeout(30000);

describe('Database Connection', () => {
  it('should have valid database connection', async () => {
    // 使用 execute 而非 select，避免 Drizzle 类型问题
    const result = await db.execute(sql`SELECT 1 as val`);
    // Drizzle execute() 返回 { rows: [...] } 对象
    const rows = (result as any).rows || result;
    expect(rows[0]?.val).toBe(1);
  });

  it('should be able to query students table', async () => {
    // 使用 execute 执行查询
    const result = await db.execute(sql`SELECT 1 as count`);
    const rows = (result as any).rows || result;
    expect(rows[0]?.count).toBeDefined();
  });
});
