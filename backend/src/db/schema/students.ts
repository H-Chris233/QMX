import {
  pgTable,
  serial,
  varchar,
  smallint,
  integer,
  text,
  date,
  timestamp,
  real,
  jsonb,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// 枚举类型
export const classTypeEnum = ['TEN_TRY', 'MONTH', 'YEAR', 'OTHERS'] as const;
export const subjectEnum = ['SHOOTING', 'ARCHERY', 'SHOOTING_ARCHERY', 'OTHERS'] as const;

export type ClassType = typeof classTypeEnum[number];
export type Subject = typeof subjectEnum[number];
export interface ScoreDetail {
  score: number;
  subject: Subject;
  recorded_at: string;
  note?: string | null;
}

// 学员表
export const students = pgTable('students', {
  uid: serial('uid').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  age: smallint('age'),
  phone: varchar('phone', { length: 11 }).notNull(),
  classType: varchar('class_type', { length: 20 }).notNull().default('TEN_TRY'),
  subject: varchar('subject', { length: 20 }).notNull().default('SHOOTING'),
  lessonLeft: integer('lesson_left').default(0),
  rings: real('rings').array().default(sql`'{}'`),
  scoreDetails: jsonb('score_details').$type<ScoreDetail[]>().notNull().default(sql`'[]'::jsonb`),
  note: text('note'),
  membershipStartDate: date('membership_start_date'),
  membershipEndDate: date('membership_end_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  validClassType: check('valid_class_type', sql`${table.classType} IN ('TEN_TRY', 'MONTH', 'YEAR', 'OTHERS')`),
  validSubject: check('valid_subject', sql`${table.subject} IN ('SHOOTING', 'ARCHERY', 'SHOOTING_ARCHERY', 'OTHERS')`),
  validMembershipDates: check('valid_membership_dates',
    sql`(${table.membershipEndDate} IS NULL OR ${table.membershipStartDate} IS NULL OR ${table.membershipEndDate} >= ${table.membershipStartDate})`,
  ),
}));

// 类型导出
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
