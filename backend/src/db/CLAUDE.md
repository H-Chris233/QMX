[根目录](../../CLAUDE.md) > [backend](../../) > [src](../) > **db**

# 数据库模块

## 变更记录 (Changelog)

### 2026-01-10 - 文档补全
- 添加数据库模块完整文档
- 补全 Schema、Repository、关系定义文档
- 记录 PostgreSQL + Drizzle ORM 架构

### 2026-01-09 - PostgreSQL迁移完成
- 完成从 MongoDB + Mongoose 到 PostgreSQL + Drizzle ORM 的迁移
- 移除所有 MongoDB 依赖
- 实现 Repository 数据访问模式
- 添加数据库关系定义

---

## 模块职责

PostgreSQL 数据库层，使用 Drizzle ORM 进行数据访问和模式管理。提供类型安全的数据操作和关系映射。

**核心价值**：
- 类型安全的数据访问（Drizzle ORM）
- 清晰的表关系定义
- Repository 模式封装 CRUD 操作
- 支持复杂查询和聚合

## 入口与启动

**核心数据库文件**：
- `index.ts` - 数据库连接和 Drizzle 实例
- `schema/index.ts` - Schema 导出和关系定义
- `schema/*.ts` - 各表模式定义
- `repositories/*.ts` - 数据访问层

**启动流程**：
```typescript
// 1. 创建连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 2. 创建 Drizzle 实例
export const db = drizzle(pool, { schema });
```

## 对外接口

### 数据库连接管理

**index.ts** - 连接管理
```typescript
// 主要功能：
- db                    // Drizzle 数据库实例
- testConnection()      // 测试数据库连接
- closeDatabase()       // 优雅关闭连接

// 导出内容：
export { db, testConnection, closeDatabase };
export * from './schema';  // 所有 Schema 定义
```

### Schema 定义

**students.ts** - 学员表
```typescript
// 表结构：
- uid: serial (主键)
- name: varchar(50) (学员姓名)
- age: smallint (年龄)
- phone: varchar(11) (手机号)
- classType: enum ('TEN_TRY', 'MONTH', 'YEAR', 'OTHERS')
- subject: enum ('SHOOTING', 'ARCHERY', 'OTHERS')
- lessonLeft: integer (剩余课时)
- rings: real[] (成绩数组)
- note: text (备注)
- membershipStartDate: date (会员开始日期)
- membershipEndDate: date (会员结束日期)
- createdAt: timestamp (创建时间)
- updatedAt: timestamp (更新时间)

// 约束：
- valid_class_type: CHECK (classType IN ...)
- valid_subject: CHECK (subject IN ...)
- valid_membership_dates: CHECK (日期逻辑)
```

**cash.ts** - 交易表
```typescript
// 表结构：
- uid: serial (主键)
- student_id: integer (学员ID，外键)
- amount: integer (金额，单位：分)
- note: text (备注)
- created_at: timestamp (创建时间)
```

**installments.ts** - 分期计划表和分期记录表
```typescript
// installmentPlans (分期计划)：
- uid: serial (主键)
- student_id: integer (学员ID)
- total_amount: integer (总金额)
- total_installments: integer (总期数)
- frequency: varchar (付款频率)
- status: enum ('ACTIVE', 'PAID', 'CANCELLED', 'OVERDUE')
- start_date: date (开始日期)
- due_date: date (到期日期)
- created_at: timestamp

// installments (分期记录)：
- uid: serial (主键)
- plan_id: integer (计划ID)
- student_id: integer (学员ID)
- installment_number: integer (期数)
- amount: integer (金额)
- status: enum ('PENDING', 'PAID', 'OVERDUE')
- due_date: date (到期日期)
- paid_date: date (支付日期)
- cash_uid: integer (关联交易ID)
```

**config.ts** - 系统配置表
```typescript
// 表结构：
- key: varchar (配置键)
- value: text (配置值)
- description: text (描述)
- updated_at: timestamp (更新时间)
```

### 关系定义

**schema/index.ts** - 表关系
```typescript
// 学员关系
studentsRelations = relations(students, ({ many }) => ({
  transactions: many(cashTransactions),
  installmentPlans: many(installmentPlans),
  installmentRecords: many(installments),
}));

// 交易与学员
cashTransactionsRelations = relations(cashTransactions, ({ one }) => ({
  student: one(students, {
    fields: [cashTransactions.studentId],
    references: [students.uid],
  }),
}));

// 分期计划与学员/分期记录
installmentPlansRelations = relations(installmentPlans, ({ one, many }) => ({
  student: one(students),
  installments: many(installments),
}));

// 分期记录关系
installmentsRelations = relations(installments, ({ one }) => ({
  plan: one(installmentPlans),
  student: one(students),
  cashTransaction: one(cashTransactions),
}));
```

### Repository 数据访问层

**studentRepository.ts** - 学员数据访问
```typescript
// 主要方法：
- findByUid(uid: number): Promise<Student | null>
- findAll(): Promise<Student[]>
- create(data: NewStudent): Promise<Student>
- updateByUid(uid: number, data: Partial<NewStudent>): Promise<Student | null>
- deleteByUid(uid: number): Promise<boolean>
- count(filter?: Partial<StudentSearchOptions>): Promise<number>
- search(options: StudentSearchOptions): Promise<Student[]>
- findWithPagination(options: StudentSearchOptions): Promise<PaginationResult<Student>>
- findExpiringMemberships(days: number): Promise<Student[]>

// 成绩操作：
- addScore(uid: number, score: number): Promise<number[] | null>
- updateScore(uid: number, index: number, newScore: number): Promise<number[] | null>
- deleteScore(uid: number, index: number): Promise<number[] | null>
```

**cashRepository.ts** - 交易数据访问
```typescript
// 主要方法：
- findByUid(uid: number): Promise<CashTransaction | null>
- findAll(params?: CashSearchOptions): Promise<CashTransaction[]>
- create(data: NewCashTransaction): Promise<CashTransaction>
- updateByUid(uid: number, data: Partial<NewCashTransaction>): Promise<CashTransaction | null>
- deleteByUid(uid: number): Promise<boolean>
- findWithPagination(options: CashSearchOptions): Promise<PaginationResult<CashTransaction>>
```

**installmentRepository.ts** - 分期数据访问
```typescript
// 主要方法：
- findPlanByUid(planUid: number): Promise<InstallmentPlan | null>
- findPlansByStudent(studentId: number): Promise<InstallmentPlan[]>
- createPlan(data: NewInstallmentPlan): Promise<InstallmentPlan>
- updatePlanByUid(planUid: number, data: Partial<InstallmentPlan>): Promise<InstallmentPlan | null>
- deletePlan(planUid: number): Promise<boolean>
- getInstallmentsByPlan(planUid: number): Promise<Installment[]>
- findInstallmentByUid(uid: number): Promise<Installment | null>
- createInstallment(data: NewInstallment): Promise<Installment>
- updateInstallmentByUid(uid: number, data: Partial<Installment>): Promise<Installment | null>
- getOverdueInstallments(): Promise<OverdueInstallments>
- getUpcomingInstallments(days: number): Promise<UpcomingInstallment[]>
```

## 关键依赖与配置

### 外部依赖
- **drizzle-orm**: ORM 框架
- **drizzle-orm/pg-core**: PostgreSQL 列类型
- **node-postgres**: PostgreSQL 客户端
- **pg**: PostgreSQL 驱动

### 环境变量配置
```bash
# PostgreSQL 连接
DATABASE_URL=postgresql://username:password@localhost:5432/qmx

# 可选覆盖
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=qmx
POSTGRES_PASSWORD=your_password
POSTGRES_DB=qmx
```

### 连接池配置
```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,                      // 最大连接数
  idleTimeoutMillis: 30000,     // 空闲超时 30 秒
  connectionTimeoutMillis: 2000,// 连接超时 2 秒
});
```

## 数据库架构设计

### 表关系图

```
┌──────────────┐         ┌──────────────────────┐
│   students   │─────────┤  cashTransactions    │
│   (学员)      │  1:N    │  (交易记录)           │
└──────────────┘         └──────────────────────┘
       │
       ├─────────────────┬─────────────────────┐
       ▼                 ▼                     ▼
┌──────────────┐  ┌──────────────┐     ┌──────────────┐
│installment   │  │ installments │     │              │
│   Plans      │  │  (分期记录)   │     │              │
│  (分期计划)   │──── 1:N        │     │              │
└──────────────┘  └──────────────┘     └──────────────┘
```

### 数据类型约定

**金额存储**：
- 数据库：整数（分）
- API：浮点数（元）
- 转换：`amount_cents = amount_yuan * 100`

**日期存储**：
- 简单日期：`date` 类型（YYYY-MM-DD）
- 带时间：`timestamp with time zone`

**数组类型**：
- 成绩：`real[]`（PostgreSQL ARRAY）

**枚举类型**：
- 班级：`'TEN_TRY' | 'MONTH' | 'YEAR' | 'OTHERS'`
- 科目：`'SHOOTING' | 'ARCHERY' | 'OTHERS'`
- 分期状态：`'ACTIVE' | 'PAID' | 'CANCELLED' | 'OVERDUE'`
- 分期记录状态：`'PENDING' | 'PAID' | 'OVERDUE'`

## 测试与质量

### 测试覆盖
- **单元测试**: Repository 方法测试 (`repositories.spec.ts`)
- **集成测试**: 数据库操作测试 (`__tests__/api/`)
- **数据一致性**: 日期/金额一致性测试 (`date-money-consistency.spec.ts`)

### 代码质量
- TypeScript 严格模式
- Drizzle Schema 类型推导（`$inferSelect`, `$inferInsert`）
- 数据库约束（CHECK, FK）
- 优雅关闭处理（SIGINT, SIGTERM）

### 性能优化
- 连接池管理
- 索引优化（主键自动索引）
- 分页查询（OFFSET + LIMIT）

## 常见问题 (FAQ)

**Q: 如何添加新表？**
A:
1. 在 `schema/` 创建新文件（如 `newTable.ts`）
2. 定义 `pgTable` 和列
3. 在 `schema/index.ts` 导出并定义关系
4. 在 `repositories/` 创建 Repository

**Q: 如何修改表结构？**
A:
1. 修改 Drizzle Schema
2. 生成迁移：`pnpm db:generate`
3. 执行迁移：`pnpm db:migrate`

**Q: 如何处理事务？**
A:
```typescript
import { db } from '@/db';

await db.transaction(async (tx) => {
  await tx.insert(table).values(data);
  await tx.update(table).set(data).where(condition);
});
```

**Q: 数据库连接失败怎么办？**
A:
1. 检查 `DATABASE_URL` 环境变量
2. 验证 PostgreSQL 服务状态
3. 检查网络连接和防火墙
4. 查看详细错误日志

## 相关文件清单

```
backend/src/db/
├── index.ts                    # 数据库连接管理
├── CLAUDE.md                   # 本文档
├── schema/
│   ├── index.ts               # Schema导出和关系定义
│   ├── students.ts            # 学员表定义
│   ├── cash.ts                # 交易表定义
│   ├── installments.ts        # 分期表定义
│   └── config.ts              # 配置表定义
└── repositories/
    ├── index.ts               # Repository导出
    ├── studentRepository.ts   # 学员数据访问
    ├── cashRepository.ts      # 交易数据访问
    └── installmentRepository.ts # 分期数据访问
```

## 数据库架构图

```
┌─────────────────────────────────────────┐
│         PostgreSQL 15+                  │
│  ┌───────────────────────────────────┐  │
│  │  Tables                           │  │
│  │  ├── students (学员)              │  │
│  │  ├── cash_transactions (交易)     │  │
│  │  ├── installment_plans (分期计划) │  │
│  │  ├── installments (分期记录)      │  │
│  │  └── system_config (系统配置)     │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  Constraints & Indexes            │  │
│  │  ├── PRIMARY KEY (uid)            │  │
│  │  ├── FOREIGN KEY relationships    │  │
│  │  ├── CHECK constraints            │  │
│  │  └── ENUM types                   │  │
│  └───────────────────────────────────┘  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Drizzle ORM                     │
│  ┌───────────────────────────────────┐  │
│  │  Schema Definitions               │  │
│  │  ├── pgTable()                    │  │
│  │  ├── relations()                  │  │
│  │  └── Type Inference               │  │
│  └───────────────────────────────────┘  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Repository Layer                │
│  ┌───────────────────────────────────┐  │
│  │  Data Access Objects              │  │
│  │  ├── StudentRepository            │  │
│  │  ├── CashRepository               │  │
│  │  └── InstallmentRepository        │  │
│  └───────────────────────────────────┘  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Controller / Service            │
│       (Business Logic Layer)            │
└─────────────────────────────────────────┘
```

---

**最后更新**: 2026-01-10
**维护者**: H-Chris233
