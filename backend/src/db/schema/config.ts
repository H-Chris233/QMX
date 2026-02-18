import {
  pgTable,
  varchar,
  text,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';

// 系统配置表
export const systemConfigs = pgTable('system_configs', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: jsonb('value').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 类型导出
export type SystemConfig = typeof systemConfigs.$inferSelect;
export type NewSystemConfig = typeof systemConfigs.$inferInsert;
