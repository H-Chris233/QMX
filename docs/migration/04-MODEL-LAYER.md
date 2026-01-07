# 04 - 数据模型层重写

## 1. 迁移策略

### 1.1 现有 Mongoose 模型结构

```
backend/src/models/
├── mongo.ts                 # Student 模型
├── CashMongo.ts             # Cash 交易模型
├── InstallmentMongo.ts      # Installment 分期记录模型
├── InstallmentPlanMongo.ts  # InstallmentPlan 分期计划模型
├── counter.ts               # Counter 自增ID模型 (将删除)
└── SystemConfig.ts          # SystemConfig 系统配置模型
```

### 1.2 新 Drizzle 模型结构

```
backend/src/db/
├── index.ts                 # 数据库连接
├── schema/
│   ├── students.ts          # 学员表
│   ├── cash.ts              # 交易表
│   ├── installments.ts      # 分期计划 + 分期记录表
│   ├── configs.ts           # 系统配置表
│   └── index.ts             # 统一导出
└── repositories/            # 仓储层 (封装常用操作)
    ├── studentRepository.ts
    ├── cashRepository.ts
    ├── installmentRepository.ts
    └── index.ts
```

---

## 2. Student 模型迁移

### 2.1 原 Mongoose 模型 (mongo.ts)

```typescript
// 原代码位置: backend/src/models/mongo.ts

const studentSchema = new Schema<IStudentDoc>({
  uid: { type: Number, required: true, unique: true, index: true },
  age: { type: Number, min: 0, max: 120, default: null },
  name: { type: String, required: true, trim: true, maxlength: 50, index: true },
  phone: { type: String, required: true, validate: {...} },
  class: { type: String, enum: [...], default: 'TEN_TRY' },
  subject: { type: String, enum: [...], default: 'SHOOTING' },
  lesson_left: { type: Number, default: 0 },
  rings: { type: [Number], default: [] },
  note: { type: String, default: null },
  membership_start_date: { type: Date, default: null },
  membership_end_date: { type: Date, default: null },
}, { timestamps: true });

// 静态方法
studentSchema.statics.findByUid = async function(uid: number) {...}
studentSchema.statics.findAll = async function() {...}
studentSchema.statics.search = async function(filters) {...}
studentSchema.statics.deleteByUid = async function(uid: number) {...}
studentSchema.statics.count = async function(filter) {...}
studentSchema.statics.findWithPagination = async function(options) {...}
```

### 2.2 新 Drizzle Schema (db/schema/students.ts)

```typescript
// backend/src/db/schema/students.ts

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
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// 枚举常量
export const CLASS_TYPES = ['TEN_TRY', 'MONTH', 'YEAR', 'OTHERS'] as const;
export const SUBJECTS = ['SHOOTING', 'ARCHERY', 'OTHERS'] as const;

export type ClassType = typeof CLASS_TYPES[number];
export type Subject = typeof SUBJECTS[number];

// 学员表定义
export const students = pgTable('students', {
  uid: serial('uid').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  age: smallint('age'),
  phone: varchar('phone', { length: 20 }).notNull(),
  classType: varchar('class_type', { length: 20 }).notNull().default('TEN_TRY'),
  subject: varchar('subject', { length: 20 }).notNull().default('SHOOTING'),
  lessonLeft: integer('lesson_left').default(0),
  rings: real('rings').array().default(sql`'{}'`),
  note: text('note'),
  membershipStartDate: date('membership_start_date'),
  membershipEndDate: date('membership_end_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 类型推断
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;

// 用于 API 响应的类型 (兼容前端)
export interface StudentResponse {
  uid: number;
  name: string;
  age: number | null;
  phone: string;
  class: ClassType;  // 前端使用 'class' 而非 'classType'
  subject: Subject;
  lesson_left: number;
  rings: number[];
  note: string | null;
  membership_start_date: string | null;
  membership_end_date: string | null;
  created_at: string;
  updated_at: string;
}
```

### 2.3 Student Repository (db/repositories/studentRepository.ts)

```typescript
// backend/src/db/repositories/studentRepository.ts

import { db } from '../index';
import { students, Student, NewStudent, StudentResponse } from '../schema/students';
import { eq, like, and, or, gte, lte, isNull, isNotNull, desc, asc, sql, count } from 'drizzle-orm';

export interface StudentSearchOptions {
  name_contains?: string;
  min_age?: number;
  max_age?: number;
  class_type?: string;
  subject?: string;
  has_membership?: boolean;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export class StudentRepository {
  // 根据 UID 查找
  static async findByUid(uid: number): Promise<Student | null> {
    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.uid, uid))
      .limit(1);
    return student || null;
  }

  // 查找所有
  static async findAll(): Promise<Student[]> {
    return await db.select().from(students).orderBy(desc(students.createdAt));
  }

  // 创建学员
  static async create(data: NewStudent): Promise<Student> {
    const [student] = await db.insert(students).values(data).returning();
    return student;
  }

  // 更新学员
  static async updateByUid(uid: number, data: Partial<NewStudent>): Promise<Student | null> {
    const [updated] = await db
      .update(students)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(students.uid, uid))
      .returning();
    return updated || null;
  }

  // 删除学员
  static async deleteByUid(uid: number): Promise<boolean> {
    const result = await db.delete(students).where(eq(students.uid, uid));
    return result.rowCount > 0;
  }

  // 计数
  static async count(filter?: Partial<StudentSearchOptions>): Promise<number> {
    const conditions = this.buildConditions(filter || {});
    const [result] = await db
      .select({ count: count() })
      .from(students)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    return result?.count || 0;
  }

  // 搜索
  static async search(options: StudentSearchOptions): Promise<Student[]> {
    const conditions = this.buildConditions(options);
    const orderBy = this.buildOrderBy(options.sort_by, options.sort_order);

    let query = db.select().from(students);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(orderBy).limit(options.limit || 100);
  }

  // 分页查询
  static async findWithPagination(options: StudentSearchOptions): Promise<PaginationResult<Student>> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;

    const conditions = this.buildConditions(options);
    const orderBy = this.buildOrderBy(options.sort_by, options.sort_order);

    // 查询数据
    let dataQuery = db.select().from(students);
    if (conditions.length > 0) {
      dataQuery = dataQuery.where(and(...conditions));
    }
    const data = await dataQuery.orderBy(orderBy).limit(limit).offset(offset);

    // 查询总数
    let countQuery = db.select({ count: count() }).from(students);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }
    const [countResult] = await countQuery;
    const total = countResult?.count || 0;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  // 构建查询条件
  private static buildConditions(options: StudentSearchOptions) {
    const conditions = [];

    if (options.name_contains) {
      conditions.push(like(students.name, `%${options.name_contains}%`));
    }

    if (options.min_age !== undefined) {
      conditions.push(gte(students.age, options.min_age));
    }

    if (options.max_age !== undefined) {
      conditions.push(lte(students.age, options.max_age));
    }

    if (options.class_type) {
      conditions.push(eq(students.classType, options.class_type));
    }

    if (options.subject) {
      conditions.push(eq(students.subject, options.subject));
    }

    if (options.has_membership === true) {
      conditions.push(isNotNull(students.membershipEndDate));
    } else if (options.has_membership === false) {
      conditions.push(isNull(students.membershipEndDate));
    }

    return conditions;
  }

  // 构建排序
  private static buildOrderBy(sortBy?: string, sortOrder?: 'ASC' | 'DESC') {
    const column = sortBy === 'name' ? students.name
      : sortBy === 'age' ? students.age
      : sortBy === 'created_at' ? students.createdAt
      : students.uid;

    return sortOrder === 'ASC' ? asc(column) : desc(column);
  }

  // 转换为 API 响应格式 (兼容前端)
  static toResponse(student: Student): StudentResponse {
    return {
      uid: student.uid,
      name: student.name,
      age: student.age,
      phone: student.phone,
      class: student.classType as any,  // 前端使用 'class'
      subject: student.subject as any,
      lesson_left: student.lessonLeft || 0,
      rings: student.rings || [],
      note: student.note,
      membership_start_date: student.membershipStartDate,
      membership_end_date: student.membershipEndDate,
      created_at: student.createdAt?.toISOString() || '',
      updated_at: student.updatedAt?.toISOString() || '',
    };
  }

  // 成绩操作
  static async addScore(uid: number, score: number): Promise<number[] | null> {
    const student = await this.findByUid(uid);
    if (!student) return null;

    const newRings = [...(student.rings || []), score];
    await this.updateByUid(uid, { rings: newRings });
    return newRings;
  }

  static async updateScore(uid: number, index: number, newScore: number): Promise<number[] | null> {
    const student = await this.findByUid(uid);
    if (!student || !student.rings || index >= student.rings.length) return null;

    const newRings = [...student.rings];
    newRings[index] = newScore;
    await this.updateByUid(uid, { rings: newRings });
    return newRings;
  }

  static async deleteScore(uid: number, index: number): Promise<number[] | null> {
    const student = await this.findByUid(uid);
    if (!student || !student.rings || index >= student.rings.length) return null;

    const newRings = student.rings.filter((_, i) => i !== index);
    await this.updateByUid(uid, { rings: newRings });
    return newRings;
  }
}
```

---

## 3. Cash 模型迁移

### 3.1 原 Mongoose 模型 (CashMongo.ts)

```typescript
// 原代码位置: backend/src/models/CashMongo.ts

const InstallmentSnapshotSchema = new Schema<ICashInstallmentSnapshot>({
  plan_uid: { type: Number, required: true },
  installment_uid: { type: Number, default: null },
  // ...
}, { _id: false });

const cashSchema = new Schema<ICashDoc>({
  uid: { type: Number, required: true, unique: true, index: true },
  student_id: { type: Number, default: null, index: true },
  cash: { type: Number, required: true },
  note: { type: String, default: null },
  installment: { type: InstallmentSnapshotSchema, default: null },
}, { timestamps: true });
```

### 3.2 新 Drizzle Schema (db/schema/cash.ts)

```typescript
// backend/src/db/schema/cash.ts

import {
  pgTable,
  serial,
  integer,
  bigint,
  text,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';
import { students } from './students';

// 分期快照类型
export interface InstallmentSnapshot {
  plan_uid: number;
  installment_uid: number | null;
  installment_number: number | null;
  total_installments: number | null;
  due_date: string | null;
  status: string | null;
  note: string | null;
}

// 交易表定义
export const cashTransactions = pgTable('cash_transactions', {
  uid: serial('uid').primaryKey(),
  studentId: integer('student_id').references(() => students.uid, {
    onDelete: 'set null',
  }),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  note: text('note'),
  installmentSnapshot: jsonb('installment_snapshot').$type<InstallmentSnapshot>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 类型推断
export type CashTransaction = typeof cashTransactions.$inferSelect;
export type NewCashTransaction = typeof cashTransactions.$inferInsert;

// API 响应类型 (兼容前端)
export interface CashResponse {
  uid: number;
  student_id: number | null;
  cash: number;  // 前端使用 'cash' 而非 'amount'
  note: string | null;
  installment: InstallmentSnapshot | null;
  created_at: string;
  updated_at: string;
}
```

### 3.3 Cash Repository (db/repositories/cashRepository.ts)

```typescript
// backend/src/db/repositories/cashRepository.ts

import { db } from '../index';
import { cashTransactions, CashTransaction, NewCashTransaction, CashResponse, InstallmentSnapshot } from '../schema/cash';
import { students } from '../schema/students';
import { eq, and, gte, lte, gt, lt, isNull, isNotNull, desc, asc, sql, count, sum } from 'drizzle-orm';

export interface CashSearchOptions {
  student_id?: number;
  min_amount?: number;
  max_amount?: number;
  has_installment?: boolean;
  date_from?: string;
  date_to?: string;
  is_income?: boolean;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

export interface FinancialStats {
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  transactionCount: number;
}

export class CashRepository {
  // 根据 UID 查找
  static async findByUid(uid: number): Promise<CashTransaction | null> {
    const [cash] = await db
      .select()
      .from(cashTransactions)
      .where(eq(cashTransactions.uid, uid))
      .limit(1);
    return cash || null;
  }

  // 查找所有
  static async findAll(): Promise<CashTransaction[]> {
    return await db
      .select()
      .from(cashTransactions)
      .orderBy(desc(cashTransactions.createdAt));
  }

  // 创建交易
  static async create(data: NewCashTransaction): Promise<CashTransaction> {
    const [cash] = await db.insert(cashTransactions).values(data).returning();
    return cash;
  }

  // 更新交易
  static async updateByUid(uid: number, data: Partial<NewCashTransaction>): Promise<CashTransaction | null> {
    const [updated] = await db
      .update(cashTransactions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cashTransactions.uid, uid))
      .returning();
    return updated || null;
  }

  // 删除交易
  static async deleteByUid(uid: number): Promise<boolean> {
    const result = await db.delete(cashTransactions).where(eq(cashTransactions.uid, uid));
    return result.rowCount > 0;
  }

  // 搜索
  static async search(options: CashSearchOptions): Promise<CashTransaction[]> {
    const conditions = this.buildConditions(options);
    const orderBy = this.buildOrderBy(options.sort_by, options.sort_order);

    let query = db.select().from(cashTransactions);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const limit = options.limit || 100;
    const offset = ((options.page || 1) - 1) * limit;

    return await query.orderBy(orderBy).limit(limit).offset(offset);
  }

  // 财务统计
  static async getFinancialStats(dateFrom?: string, dateTo?: string): Promise<FinancialStats> {
    const conditions = [];

    if (dateFrom) {
      conditions.push(gte(cashTransactions.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(cashTransactions.createdAt, new Date(dateTo)));
    }

    const [result] = await db
      .select({
        totalIncome: sum(sql`CASE WHEN ${cashTransactions.amount} > 0 THEN ${cashTransactions.amount} ELSE 0 END`),
        totalExpense: sum(sql`CASE WHEN ${cashTransactions.amount} < 0 THEN ABS(${cashTransactions.amount}) ELSE 0 END`),
        transactionCount: count(),
      })
      .from(cashTransactions)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const totalIncome = Number(result?.totalIncome || 0);
    const totalExpense = Number(result?.totalExpense || 0);

    return {
      totalIncome,
      totalExpense,
      netIncome: totalIncome - totalExpense,
      transactionCount: result?.transactionCount || 0,
    };
  }

  // 按学员统计收入排名
  static async getStudentIncomeRanking(limit: number = 10, dateFrom?: string, dateTo?: string) {
    const conditions = [gt(cashTransactions.amount, 0)];

    if (dateFrom) {
      conditions.push(gte(cashTransactions.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(cashTransactions.createdAt, new Date(dateTo)));
    }

    return await db
      .select({
        studentId: cashTransactions.studentId,
        totalAmount: sum(cashTransactions.amount),
        transactionCount: count(),
      })
      .from(cashTransactions)
      .where(and(...conditions))
      .groupBy(cashTransactions.studentId)
      .orderBy(desc(sum(cashTransactions.amount)))
      .limit(limit);
  }

  // 构建查询条件
  private static buildConditions(options: CashSearchOptions) {
    const conditions = [];

    if (options.student_id !== undefined) {
      conditions.push(eq(cashTransactions.studentId, options.student_id));
    }

    if (options.min_amount !== undefined) {
      conditions.push(gte(cashTransactions.amount, options.min_amount));
    }

    if (options.max_amount !== undefined) {
      conditions.push(lte(cashTransactions.amount, options.max_amount));
    }

    if (options.has_installment === true) {
      conditions.push(isNotNull(cashTransactions.installmentSnapshot));
    } else if (options.has_installment === false) {
      conditions.push(isNull(cashTransactions.installmentSnapshot));
    }

    if (options.date_from) {
      conditions.push(gte(cashTransactions.createdAt, new Date(options.date_from)));
    }

    if (options.date_to) {
      conditions.push(lte(cashTransactions.createdAt, new Date(options.date_to)));
    }

    if (options.is_income === true) {
      conditions.push(gt(cashTransactions.amount, 0));
    } else if (options.is_income === false) {
      conditions.push(lt(cashTransactions.amount, 0));
    }

    return conditions;
  }

  // 构建排序
  private static buildOrderBy(sortBy?: string, sortOrder?: 'ASC' | 'DESC') {
    const column = sortBy === 'amount' || sortBy === 'cash' ? cashTransactions.amount
      : sortBy === 'student_id' ? cashTransactions.studentId
      : sortBy === 'created_at' ? cashTransactions.createdAt
      : cashTransactions.uid;

    return sortOrder === 'ASC' ? asc(column) : desc(column);
  }

  // 转换为 API 响应格式
  static toResponse(cash: CashTransaction): CashResponse {
    return {
      uid: cash.uid,
      student_id: cash.studentId,
      cash: cash.amount,  // 前端使用 'cash'
      note: cash.note,
      installment: cash.installmentSnapshot,
      created_at: cash.createdAt?.toISOString() || '',
      updated_at: cash.updatedAt?.toISOString() || '',
    };
  }
}
```

---

## 4. Installment 模型迁移

### 4.1 新 Drizzle Schema (db/schema/installments.ts)

```typescript
// backend/src/db/schema/installments.ts

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
} from 'drizzle-orm/pg-core';
import { students } from './students';
import { cashTransactions } from './cash';

// 枚举常量
export const FREQUENCIES = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'CUSTOM'] as const;
export const PLAN_STATUSES = ['ACTIVE', 'COMPLETED', 'CANCELLED'] as const;
export const INSTALLMENT_STATUSES = ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'] as const;

export type Frequency = typeof FREQUENCIES[number];
export type PlanStatus = typeof PLAN_STATUSES[number];
export type InstallmentStatus = typeof INSTALLMENT_STATUSES[number];

// 分期计划表
export const installmentPlans = pgTable('installment_plans', {
  uid: serial('uid').primaryKey(),
  studentId: integer('student_id').notNull().references(() => students.uid, {
    onDelete: 'restrict',
  }),
  totalAmount: bigint('total_amount', { mode: 'number' }).notNull(),
  downPayment: bigint('down_payment', { mode: 'number' }).default(0),
  totalInstallments: smallint('total_installments').notNull(),
  frequency: varchar('frequency', { length: 20 }).notNull().default('MONTHLY'),
  status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
  note: text('note'),
  startDate: date('start_date').defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 分期记录表
export const installments = pgTable('installments', {
  uid: serial('uid').primaryKey(),
  planId: integer('plan_id').notNull().references(() => installmentPlans.uid, {
    onDelete: 'cascade',
  }),
  studentId: integer('student_id').notNull().references(() => students.uid, {
    onDelete: 'restrict',
  }),
  cashUid: integer('cash_uid').references(() => cashTransactions.uid, {
    onDelete: 'set null',
  }),
  installmentNumber: smallint('installment_number').notNull(),
  installmentAmount: bigint('installment_amount', { mode: 'number' }).notNull(),
  dueDate: date('due_date').notNull(),
  paidDate: date('paid_date'),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniquePlanInstallment: unique().on(table.planId, table.installmentNumber),
}));

// 类型推断
export type InstallmentPlan = typeof installmentPlans.$inferSelect;
export type NewInstallmentPlan = typeof installmentPlans.$inferInsert;
export type Installment = typeof installments.$inferSelect;
export type NewInstallment = typeof installments.$inferInsert;
```

### 4.2 Installment Repository

```typescript
// backend/src/db/repositories/installmentRepository.ts

import { db } from '../index';
import {
  installmentPlans,
  installments,
  InstallmentPlan,
  Installment,
  NewInstallmentPlan,
  NewInstallment,
  InstallmentStatus,
  PlanStatus,
} from '../schema/installments';
import { eq, and, lt, desc, asc, count } from 'drizzle-orm';

export class InstallmentPlanRepository {
  static async findByUid(uid: number): Promise<InstallmentPlan | null> {
    const [plan] = await db
      .select()
      .from(installmentPlans)
      .where(eq(installmentPlans.uid, uid))
      .limit(1);
    return plan || null;
  }

  static async create(data: NewInstallmentPlan): Promise<InstallmentPlan> {
    const [plan] = await db.insert(installmentPlans).values(data).returning();
    return plan;
  }

  static async updateByUid(uid: number, data: Partial<NewInstallmentPlan>): Promise<InstallmentPlan | null> {
    const [updated] = await db
      .update(installmentPlans)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(installmentPlans.uid, uid))
      .returning();
    return updated || null;
  }

  static async deleteByUid(uid: number): Promise<boolean> {
    const result = await db.delete(installmentPlans).where(eq(installmentPlans.uid, uid));
    return result.rowCount > 0;
  }

  static async findByStudentId(studentId: number): Promise<InstallmentPlan[]> {
    return await db
      .select()
      .from(installmentPlans)
      .where(eq(installmentPlans.studentId, studentId))
      .orderBy(desc(installmentPlans.createdAt));
  }
}

export class InstallmentRepository {
  static async findByUid(uid: number): Promise<Installment | null> {
    const [installment] = await db
      .select()
      .from(installments)
      .where(eq(installments.uid, uid))
      .limit(1);
    return installment || null;
  }

  static async create(data: NewInstallment): Promise<Installment> {
    const [installment] = await db.insert(installments).values(data).returning();
    return installment;
  }

  static async createMany(data: NewInstallment[]): Promise<Installment[]> {
    return await db.insert(installments).values(data).returning();
  }

  static async updateByUid(uid: number, data: Partial<NewInstallment>): Promise<Installment | null> {
    const [updated] = await db
      .update(installments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(installments.uid, uid))
      .returning();
    return updated || null;
  }

  static async deleteByUid(uid: number): Promise<boolean> {
    const result = await db.delete(installments).where(eq(installments.uid, uid));
    return result.rowCount > 0;
  }

  static async findByPlanId(planId: number): Promise<Installment[]> {
    return await db
      .select()
      .from(installments)
      .where(eq(installments.planId, planId))
      .orderBy(asc(installments.installmentNumber));
  }

  // 查找逾期分期
  static async findOverdue(): Promise<Installment[]> {
    const today = new Date().toISOString().split('T')[0];
    return await db
      .select()
      .from(installments)
      .where(
        and(
          eq(installments.status, 'PENDING'),
          lt(installments.dueDate, today)
        )
      )
      .orderBy(asc(installments.dueDate));
  }

  // 刷新计划状态
  static async refreshPlanStatus(planId: number): Promise<void> {
    const planInstallments = await this.findByPlanId(planId);

    const allPaid = planInstallments.every(i => i.status === 'PAID');
    const allCancelled = planInstallments.every(i => i.status === 'CANCELLED');

    let newStatus: PlanStatus = 'ACTIVE';
    if (allPaid) {
      newStatus = 'COMPLETED';
    } else if (allCancelled) {
      newStatus = 'CANCELLED';
    }

    await InstallmentPlanRepository.updateByUid(planId, { status: newStatus });
  }
}
```

---

## 5. 字段映射对照表

### 5.1 Student

| Mongoose 字段 | Drizzle 字段 | API 响应字段 | 说明 |
|--------------|-------------|-------------|------|
| `uid` | `uid` | `uid` | 主键 |
| `name` | `name` | `name` | - |
| `age` | `age` | `age` | - |
| `phone` | `phone` | `phone` | - |
| `class` | `classType` | `class` | 避免 SQL 关键字 |
| `subject` | `subject` | `subject` | - |
| `lesson_left` | `lessonLeft` | `lesson_left` | camelCase |
| `rings` | `rings` | `rings` | 数组类型 |
| `note` | `note` | `note` | - |
| `membership_start_date` | `membershipStartDate` | `membership_start_date` | - |
| `membership_end_date` | `membershipEndDate` | `membership_end_date` | - |
| `createdAt` | `createdAt` | `created_at` | - |
| `updatedAt` | `updatedAt` | `updated_at` | - |

### 5.2 Cash

| Mongoose 字段 | Drizzle 字段 | API 响应字段 | 说明 |
|--------------|-------------|-------------|------|
| `uid` | `uid` | `uid` | 主键 |
| `student_id` | `studentId` | `student_id` | 外键 |
| `cash` | `amount` | `cash` | 语义更清晰 |
| `note` | `note` | `note` | - |
| `installment` | `installmentSnapshot` | `installment` | JSONB |
| `createdAt` | `createdAt` | `created_at` | - |
| `updatedAt` | `updatedAt` | `updated_at` | - |

---

## 6. 删除的文件

迁移完成后删除:

```bash
# 删除 Mongoose 模型
rm backend/src/models/mongo.ts
rm backend/src/models/CashMongo.ts
rm backend/src/models/InstallmentMongo.ts
rm backend/src/models/InstallmentPlanMongo.ts
rm backend/src/models/counter.ts  # 使用 SERIAL 替代

# 删除 MongoDB 配置
rm backend/src/config/mongodb.ts
```

---

**下一步**: [05-SERVICE-LAYER.md](./05-SERVICE-LAYER.md) - 服务层迁移
