# 02 - PostgreSQL 表结构设计

## 1. 表结构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                         PostgreSQL Schema                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐       ┌─────────────────────┐                  │
│  │  students   │       │  cash_transactions  │                  │
│  │─────────────│       │─────────────────────│                  │
│  │ uid (PK)    │◄──────│ student_id (FK)     │                  │
│  │ name        │       │ uid (PK)            │                  │
│  │ age         │       │ amount              │                  │
│  │ phone       │       │ note                │                  │
│  │ class_type  │       │ installment_snapshot│                  │
│  │ subject     │       │ created_at          │                  │
│  │ rings[]     │       └─────────────────────┘                  │
│  │ lesson_left │                 ▲                              │
│  │ membership_*│                 │ 1:1 (cash_uid)               │
│  └─────────────┘                 │                              │
│         │                        │                              │
│         │ 1:N                    │                              │
│         ▼                        │                              │
│  ┌──────────────────┐    ┌───────┴───────┐                      │
│  │ installment_plans│    │ installments  │                      │
│  │──────────────────│    │───────────────│                      │
│  │ uid (PK)         │◄───│ plan_id (FK)  │                      │
│  │ student_id (FK)  │    │ uid (PK)      │                      │
│  │ total_amount     │    │ amount        │                      │
│  │ frequency        │    │ due_date      │                      │
│  │ status           │    │ status        │                      │
│  └──────────────────┘    │ cash_uid (FK) │                      │
│                          └───────────────┘                      │
│                                                                  │
│  ┌─────────────────┐                                            │
│  │ system_configs  │                                            │
│  │─────────────────│                                            │
│  │ key (PK)        │                                            │
│  │ value           │                                            │
│  │ description     │                                            │
│  └─────────────────┘                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 详细表定义

### 2.1 students 表

```sql
-- 学员表
CREATE TABLE students (
    -- 主键：自增 UID
    uid SERIAL PRIMARY KEY,

    -- 基本信息
    name VARCHAR(50) NOT NULL,
    age SMALLINT CHECK (age >= 0 AND age <= 120),
    phone VARCHAR(20) NOT NULL,

    -- 分类信息
    class_type VARCHAR(20) NOT NULL DEFAULT 'TEN_TRY',
    subject VARCHAR(20) NOT NULL DEFAULT 'SHOOTING',

    -- 课程信息
    lesson_left INTEGER DEFAULT 0,

    -- 成绩数组 (使用 PostgreSQL 原生数组)
    rings REAL[] DEFAULT '{}',

    -- 备注
    note TEXT,

    -- 会员信息
    membership_start_date DATE,
    membership_end_date DATE,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- 约束
    CONSTRAINT valid_class_type CHECK (
        class_type IN ('TEN_TRY', 'MONTH', 'YEAR', 'OTHERS')
    ),
    CONSTRAINT valid_subject CHECK (
        subject IN ('SHOOTING', 'ARCHERY', 'OTHERS')
    ),
    CONSTRAINT valid_membership_dates CHECK (
        membership_end_date IS NULL OR
        membership_start_date IS NULL OR
        membership_end_date >= membership_start_date
    )
);

-- 索引
CREATE INDEX idx_students_name ON students(name);
CREATE INDEX idx_students_phone ON students(phone);
CREATE INDEX idx_students_class_type ON students(class_type);
CREATE INDEX idx_students_membership_end ON students(membership_end_date);
CREATE INDEX idx_students_created_at ON students(created_at);

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**MongoDB → PostgreSQL 字段映射:**

| MongoDB 字段 | PostgreSQL 字段 | 类型变化 | 说明 |
|-------------|-----------------|----------|------|
| `_id` | - | 删除 | 使用 uid 作为主键 |
| `uid` | `uid` | Number → SERIAL | 自增主键 |
| `name` | `name` | String → VARCHAR(50) | 保持不变 |
| `age` | `age` | Number → SMALLINT | 添加范围约束 |
| `phone` | `phone` | String → VARCHAR(20) | 保持不变 |
| `class` | `class_type` | String → VARCHAR(20) | 重命名避免关键字 |
| `subject` | `subject` | String → VARCHAR(20) | 保持不变 |
| `lesson_left` | `lesson_left` | Number → INTEGER | 保持不变 |
| `rings` | `rings` | Array → REAL[] | 使用原生数组 |
| `note` | `note` | String → TEXT | 保持不变 |
| `membership_start_date` | `membership_start_date` | Date → DATE | 保持不变 |
| `membership_end_date` | `membership_end_date` | Date → DATE | 保持不变 |
| `created_at` | `created_at` | Date → TIMESTAMPTZ | 保持不变 |
| `updated_at` | `updated_at` | Date → TIMESTAMPTZ | 保持不变 |

---

### 2.2 cash_transactions 表

```sql
-- 交易表
CREATE TABLE cash_transactions (
    -- 主键
    uid SERIAL PRIMARY KEY,

    -- 关联学员 (可为空，表示非学员交易)
    student_id INTEGER REFERENCES students(uid) ON DELETE SET NULL,

    -- 金额 (单位：分，正数收入，负数支出)
    amount BIGINT NOT NULL,

    -- 备注
    note TEXT,

    -- 分期快照 (JSONB 存储嵌入式文档)
    installment_snapshot JSONB,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- 约束
    CONSTRAINT valid_amount CHECK (
        amount >= -999999999999 AND amount <= 999999999999
    )
);

-- 索引
CREATE INDEX idx_cash_student_id ON cash_transactions(student_id);
CREATE INDEX idx_cash_amount ON cash_transactions(amount);
CREATE INDEX idx_cash_created_at ON cash_transactions(created_at);
CREATE INDEX idx_cash_installment ON cash_transactions
    USING GIN (installment_snapshot)
    WHERE installment_snapshot IS NOT NULL;

-- 更新时间触发器
CREATE TRIGGER update_cash_updated_at
    BEFORE UPDATE ON cash_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**installment_snapshot JSONB 结构:**

```typescript
interface InstallmentSnapshot {
  plan_uid: number;
  installment_uid: number | null;
  installment_number: number | null;
  total_installments: number | null;
  due_date: string | null;  // ISO date string
  status: string | null;
  note: string | null;
}
```

**MongoDB → PostgreSQL 字段映射:**

| MongoDB 字段 | PostgreSQL 字段 | 类型变化 |
|-------------|-----------------|----------|
| `uid` | `uid` | Number → SERIAL |
| `student_id` | `student_id` | Number → INTEGER (FK) |
| `cash` | `amount` | Number → BIGINT |
| `note` | `note` | String → TEXT |
| `installment` | `installment_snapshot` | Object → JSONB |
| `created_at` | `created_at` | Date → TIMESTAMPTZ |
| `updated_at` | `updated_at` | Date → TIMESTAMPTZ |

---

### 2.3 installment_plans 表

```sql
-- 分期计划表
CREATE TABLE installment_plans (
    -- 主键
    uid SERIAL PRIMARY KEY,

    -- 关联学员
    student_id INTEGER NOT NULL REFERENCES students(uid) ON DELETE RESTRICT,

    -- 金额信息 (单位：分)
    total_amount BIGINT NOT NULL,
    down_payment BIGINT DEFAULT 0,

    -- 分期信息
    total_installments SMALLINT NOT NULL CHECK (total_installments > 0),
    frequency VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',

    -- 状态
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    -- 备注
    note TEXT,

    -- 时间戳
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- 约束
    CONSTRAINT valid_frequency CHECK (
        frequency IN ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'CUSTOM')
    ),
    CONSTRAINT valid_plan_status CHECK (
        status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')
    ),
    CONSTRAINT valid_total_amount CHECK (total_amount > 0)
);

-- 索引
CREATE INDEX idx_plans_student_id ON installment_plans(student_id);
CREATE INDEX idx_plans_status ON installment_plans(status);
CREATE INDEX idx_plans_created_at ON installment_plans(created_at);

-- 更新时间触发器
CREATE TRIGGER update_plans_updated_at
    BEFORE UPDATE ON installment_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### 2.4 installments 表

```sql
-- 分期记录表
CREATE TABLE installments (
    -- 主键
    uid SERIAL PRIMARY KEY,

    -- 关联分期计划
    plan_id INTEGER NOT NULL REFERENCES installment_plans(uid) ON DELETE CASCADE,

    -- 关联学员 (冗余字段，便于查询)
    student_id INTEGER NOT NULL REFERENCES students(uid) ON DELETE RESTRICT,

    -- 关联交易记录 (支付后关联)
    cash_uid INTEGER REFERENCES cash_transactions(uid) ON DELETE SET NULL,

    -- 分期信息
    installment_number SMALLINT NOT NULL,
    installment_amount BIGINT NOT NULL,

    -- 日期
    due_date DATE NOT NULL,
    paid_date DATE,

    -- 状态
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    -- 备注
    note TEXT,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- 约束
    CONSTRAINT valid_installment_status CHECK (
        status IN ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED')
    ),
    CONSTRAINT valid_installment_amount CHECK (installment_amount > 0),
    CONSTRAINT unique_plan_installment UNIQUE (plan_id, installment_number)
);

-- 索引
CREATE INDEX idx_installments_plan_id ON installments(plan_id);
CREATE INDEX idx_installments_student_id ON installments(student_id);
CREATE INDEX idx_installments_status ON installments(status);
CREATE INDEX idx_installments_due_date ON installments(due_date);
CREATE INDEX idx_installments_cash_uid ON installments(cash_uid);

-- 逾期分期查询优化索引
CREATE INDEX idx_installments_overdue ON installments(due_date, status)
    WHERE status = 'PENDING';

-- 更新时间触发器
CREATE TRIGGER update_installments_updated_at
    BEFORE UPDATE ON installments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### 2.5 system_configs 表

```sql
-- 系统配置表
CREATE TABLE system_configs (
    -- 主键
    key VARCHAR(100) PRIMARY KEY,

    -- 值 (JSONB 支持复杂配置)
    value JSONB NOT NULL,

    -- 描述
    description TEXT,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 更新时间触发器
CREATE TRIGGER update_configs_updated_at
    BEFORE UPDATE ON system_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 3. Drizzle Schema 定义

### 3.1 schema/students.ts

```typescript
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
  check
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// 枚举类型
export const classTypeEnum = ['TEN_TRY', 'MONTH', 'YEAR', 'OTHERS'] as const;
export const subjectEnum = ['SHOOTING', 'ARCHERY', 'OTHERS'] as const;

export type ClassType = typeof classTypeEnum[number];
export type Subject = typeof subjectEnum[number];

// 学员表
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

// 类型导出
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
```

### 3.2 schema/cash.ts

```typescript
import {
  pgTable,
  serial,
  integer,
  bigint,
  text,
  jsonb,
  timestamp
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
});

// 类型导出
export type CashTransaction = typeof cashTransactions.$inferSelect;
export type NewCashTransaction = typeof cashTransactions.$inferInsert;
```

### 3.3 schema/installments.ts

```typescript
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
  unique
} from 'drizzle-orm/pg-core';
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
  dueDate: date('due_date').notNull(),
  paidDate: date('paid_date'),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniquePlanInstallment: unique().on(table.planId, table.installmentNumber),
}));

// 类型导出
export type InstallmentPlan = typeof installmentPlans.$inferSelect;
export type NewInstallmentPlan = typeof installmentPlans.$inferInsert;
export type Installment = typeof installments.$inferSelect;
export type NewInstallment = typeof installments.$inferInsert;
```

### 3.4 schema/index.ts

```typescript
// 导出所有 Schema
export * from './students';
export * from './cash';
export * from './installments';

// 关系定义
import { relations } from 'drizzle-orm';
import { students } from './students';
import { cashTransactions } from './cash';
import { installmentPlans, installments } from './installments';

export const studentsRelations = relations(students, ({ many }) => ({
  transactions: many(cashTransactions),
  installmentPlans: many(installmentPlans),
  installments: many(installments),
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
```

---

## 4. 与 MongoDB 的关键差异

### 4.1 ID 生成策略

| MongoDB | PostgreSQL |
|---------|------------|
| Counter 集合 + findOneAndUpdate | SERIAL 自增 |
| 需要手动管理 | 数据库自动管理 |
| 可能有并发问题 | 原子操作保证 |

**迁移注意**: 删除 `counter.ts`，使用 `SERIAL` 或 `IDENTITY`。

### 4.2 数组字段

| MongoDB | PostgreSQL |
|---------|------------|
| 原生数组 `[1, 2, 3]` | `REAL[]` 或 `JSONB` |
| `$push`, `$pull` 操作 | `array_append()`, `array_remove()` |
| `$avg` 聚合 | `AVG(UNNEST(rings))` |

**示例 - 添加成绩:**
```sql
-- PostgreSQL
UPDATE students
SET rings = array_append(rings, 95.5)
WHERE uid = 1;
```

### 4.3 嵌入式文档

| MongoDB | PostgreSQL |
|---------|------------|
| 嵌入式 Schema | JSONB 字段 |
| 类型验证在 Mongoose | 应用层验证 |
| 可索引嵌套字段 | GIN 索引 |

**示例 - 查询分期交易:**
```sql
-- PostgreSQL
SELECT * FROM cash_transactions
WHERE installment_snapshot IS NOT NULL
  AND (installment_snapshot->>'status') = 'PAID';
```

### 4.4 外键约束

| MongoDB | PostgreSQL |
|---------|------------|
| 无外键约束 | 强制外键约束 |
| 应用层保证一致性 | 数据库层保证 |
| 可能有孤儿记录 | 自动级联/限制 |

**外键策略:**
- `ON DELETE SET NULL`: 学员删除时，交易记录保留但 student_id 置空
- `ON DELETE RESTRICT`: 有分期计划的学员不能删除
- `ON DELETE CASCADE`: 删除分期计划时，自动删除所有分期记录

---

## 5. 迁移 SQL 脚本

完整的建表脚本位于: `backend/src/db/migrations/0001_initial.sql`

```sql
-- 0001_initial.sql
-- QMX PostgreSQL 初始化迁移

BEGIN;

-- 1. 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. 创建 students 表
-- [完整 SQL 见上文]

-- 3. 创建 cash_transactions 表
-- [完整 SQL 见上文]

-- 4. 创建 installment_plans 表
-- [完整 SQL 见上文]

-- 5. 创建 installments 表
-- [完整 SQL 见上文]

-- 6. 创建 system_configs 表
-- [完整 SQL 见上文]

COMMIT;
```

---

**下一步**: [03-ORM-SETUP.md](./03-ORM-SETUP.md) - Drizzle ORM 配置
