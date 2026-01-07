// 导出所有 Schema
export * from './students';
export * from './cash';
export * from './installments';
export * from './config';

// 关系定义
import { relations } from 'drizzle-orm';
import { students } from './students';
import { cashTransactions } from './cash';
import { installmentPlans, installments } from './installments';

export const studentsRelations = relations(students, ({ many }) => ({
  transactions: many(cashTransactions),
  installmentPlans: many(installmentPlans),
  installmentRecords: many(installments),
}));

export const cashTransactionsRelations = relations(cashTransactions, ({ one }) => ({
  student: one(students, {
    fields: [cashTransactions.studentId],
    references: [students.uid],
  }),
}));

export const installmentPlansRelations = relations(installmentPlans, ({ one, many }) => ({
  student: one(students, {
    fields: [installmentPlans.studentId],
    references: [students.uid],
  }),
  installments: many(installments),
}));

export const installmentsRelations = relations(installments, ({ one }) => ({
  plan: one(installmentPlans, {
    fields: [installments.planId],
    references: [installmentPlans.uid],
  }),
  student: one(students, {
    fields: [installments.studentId],
    references: [students.uid],
  }),
  cashTransaction: one(cashTransactions, {
    fields: [installments.cashUid],
    references: [cashTransactions.uid],
  }),
}));
