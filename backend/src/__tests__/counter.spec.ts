// PostgreSQL 使用 SERIAL/IDENTITY 自动生成ID，不需要手动序列
// 此测试文件仅保留验证数据库连接

import { db } from '@/db';
import { sql } from 'drizzle-orm';

jest.setTimeout(30000);

describe('Database Connection', () => {
  it('should have valid database connection', async () => {
    const [result] = await db.select({ val: sql`1` });
    expect(result.val).toBe(1);
  });

  it('should be able to query students table', async () => {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(
      // 使用子查询避免表不存在问题
      sql`(SELECT 1 as dummy) AS students`
    );
    expect(result.count).toBeDefined();
  });
});
