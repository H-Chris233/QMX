import {
  pgTable,
  serial,
  integer,
  bigint,
  text,
  jsonb,
  timestamp,
  check
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { students } from './students';

// 分期快照类型
export interface InstallmentSnapshot {
  plan_uid: number;
  installment_uid?: number | null | undefined;
  installment_number?: number | null | undefined;
  total_installments?: number | null | undefined;
  due_date?: string | Date | null | undefined;
  status?: string | null | undefined;
  note?: string | null | undefined;
}

// 交易表
export const cashTransactions = pgTable('cash_transactions', {
  uid: serial('uid').primaryKey(),
  studentId: integer('student_id').references(() => students.uid, {
    onDelete: 'set null'
  }),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  note: text('note'),
  installmentSnapshot: jsonb('installment_snapshot').$type<InstallmentSnapshot>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  validAmount: check('valid_amount', sql`${table.amount} >= -999999999999 AND ${table.amount} <= 999999999999`),
}));

// 类型导出
export type CashTransaction = typeof cashTransactions.$inferSelect;
export type NewCashTransaction = typeof cashTransactions.$inferInsert;
