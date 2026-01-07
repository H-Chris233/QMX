import {
  pgTable,
  serial,
  integer,
  smallint,
  bigint,
  varchar,
  text,
  date,
  timestamp,
  unique,
  check
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { students } from './students';
import { cashTransactions } from './cash';

// 枚举类型
export const frequencyEnum = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'CUSTOM'] as const;
export const planStatusEnum = ['ACTIVE', 'COMPLETED', 'CANCELLED'] as const;
export const installmentStatusEnum = ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'] as const;

export type Frequency = typeof frequencyEnum[number];
export type PlanStatus = typeof planStatusEnum[number];
export type InstallmentStatus = typeof installmentStatusEnum[number];

// 分期计划表
export const installmentPlans = pgTable('installment_plans', {
  uid: serial('uid').primaryKey(),
  studentId: integer('student_id').notNull().references(() => students.uid, {
    onDelete: 'restrict'
  }),
  totalAmount: bigint('total_amount', { mode: 'number' }).notNull(),
  downPayment: bigint('down_payment', { mode: 'number' }).default(0),
  totalInstallments: smallint('total_installments').notNull(),
  frequency: varchar('frequency', { length: 20 }).notNull().default('MONTHLY'),
  customDays: integer('custom_days'),
  status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
  note: text('note'),
  startDate: date('start_date').notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  validFrequency: check('valid_frequency', sql`${table.frequency} IN ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'CUSTOM')`),
  validPlanStatus: check('valid_plan_status', sql`${table.status} IN ('ACTIVE', 'COMPLETED', 'CANCELLED')`),
  validTotalAmount: check('valid_total_amount', sql`${table.totalAmount} > 0`),
  validTotalInstallments: check('valid_total_installments', sql`${table.totalInstallments} > 0`),
}));

// 分期记录表
export const installments = pgTable('installments', {
  uid: serial('uid').primaryKey(),
  planId: integer('plan_id').notNull().references(() => installmentPlans.uid, {
    onDelete: 'cascade'
  }),
  studentId: integer('student_id').notNull().references(() => students.uid, {
    onDelete: 'restrict'
  }),
  cashUid: integer('cash_uid').references(() => cashTransactions.uid, {
    onDelete: 'set null'
  }),
  installmentNumber: smallint('installment_number').notNull(),
  installmentAmount: bigint('installment_amount', { mode: 'number' }).notNull(),
  paidAmount: bigint('paid_amount', { mode: 'number' }).default(0),
  dueDate: date('due_date').notNull(),
  paidDate: date('paid_date'),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniquePlanInstallment: unique().on(table.planId, table.installmentNumber),
  validInstallmentStatus: check('valid_installment_status', sql`${table.status} IN ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED')`),
  validInstallmentAmount: check('valid_installment_amount', sql`${table.installmentAmount} > 0`),
}));

// 类型导出
export type InstallmentPlan = typeof installmentPlans.$inferSelect;
export type NewInstallmentPlan = typeof installmentPlans.$inferInsert;
export type Installment = typeof installments.$inferSelect;
export type NewInstallment = typeof installments.$inferInsert;
