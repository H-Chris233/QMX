# 01 - 迁移概述

## 1. 迁移目标

### 1.1 为什么迁移？

| 问题 | MongoDB 现状 | PostgreSQL 解决方案 |
|------|-------------|-------------------|
| **事务缺失** | 分期创建/支付涉及4-6个操作，无事务保证 | 原子事务保护 |
| **聚合复杂** | StatsService 使用复杂的聚合管道 | SQL GROUP BY + CASE WHEN |
| **查询低效** | 学生查询需多次检索 | JOIN 一次获取 |
| **关系验证** | 应用层手动检查 | 外键约束 |
| **Counter 机制** | 单独计数器表生成UID | SERIAL 自增 |

### 1.2 关键问题深度分析

#### 财务操作无事务保护

**分期创建** - 当前实现（`backend/src/controllers/installmentRoutes.ts`）:
```typescript
// 需要原子操作的4个步骤：
1. 创建 InstallmentPlan ✅
2. 创建 N 个 Installment 记录 ✅
3. 创建 Cash 交易记录 ✅
4. 更新 Plan 状态 ✅

// 问题：任何一步失败，产生孤儿数据
```

**分期支付** - 当前实现:
```typescript
// 需要原子操作的4个步骤：
1. 删除关联的旧 Cash 记录 ✅
2. 创建新的 Cash 交易 ✅
3. 更新 Installment 状态 ✅
4. 刷新 Plan 总状态 ✅

// 问题：删除旧cash但创建新cash失败 → 资金记录丢失
```

#### 聚合查询复杂度

**StatsService.buildDashboardStats** - 当前实现:
```typescript
// MongoDB 聚合管道
const revenueExpensePipeline: PipelineStage[] = [
  {
    $group: {
      _id: null,
      revenue: { $sum: { $cond: [{ $gt: ['$cash', 0] }, '$cash', 0] } },
      expense: { $sum: { $cond: [{ $lt: ['$cash', 0] }, '$cash', 0] } }
    }
  }
];

// 还需要遍历所有学生计算平均分、统计活跃会员数
// 对于1000+学生，性能下降明显
```

**PostgreSQL 方案**:
```sql
-- SQL 查询更直接高效
SELECT
  SUM(CASE WHEN cash > 0 THEN cash ELSE 0 END) AS revenue,
  SUM(CASE WHEN cash < 0 THEN cash ELSE 0 END) AS expense
FROM cash_transactions;

-- 统计使用 COUNT + 聚合函数，数据库优化
SELECT AVG(array_length(rings, 1)) FROM students
  WHERE rings IS NOT NULL AND array_length(rings, 1) > 0;
```

#### 学生查询构建器

**StudentQuery** - 当前实现（12种查询条件组合）:
```typescript
// 构建复杂的 MongoDB 聚合管道
export class StudentQuery {
  nameContains(name?: string): this;
  ageRange(min?: number, max?: number): this;
  class(classType?: ClassType): this;
  subject(subjectType?: SubjectType): this;
  hasMembership(hasMembership?: boolean): this;
  membershipActiveAt(date?: Date | string | null): this;
  scoreRange(min?: number, max?: number): this;
  sort(field?: string, order?: 'ASC' | 'DESC'): this;
  paginate(page?: number, limit?: number): this;

  build(): StudentQueryBuildResult; // 返回两个 aggregation pipelines
}

// 问题：
// - 平均分过滤需要 $addFields + $avg
// - 会员日期检查需要 $expr 数组条件
// - 复杂度和性能随查询条件增加而恶化
```

### 1.3 迁移收益

1. **数据一致性**: 财务操作 ACID 事务保护
2. **查询性能**: JOIN + 聚合函数替代多次聚合管道
3. **约束完整性**: 外键约束、级联删除
4. **开发体验**: SQL-like API，TypeScript类型安全
5. **运维友好**: 成熟工具链，社区支持

---

## 2. 现有架构深度分析

### 2.1 MongoDB 数据模型

```
┌──────────────────────────────┐
│        students (375行)       │
│  uid, name, age, phone,      │
│  lessonLeft, class, subject,  │
│  rings[]:number[],           │
│  membershipStartDate/EndDate │
└──────────┬───────────────────┘
           │ 1:N (student_id)
           │
    ┌──────┴──────────────────────┬──────────────┐
    ▼                             ▼              ▼
┌─────────────────┐    ┌──────────────────┐  ┌───────────┐
│   cash (424行)   │    │installment_       │  │installments│
│   uid:自增       │    │   plans (计划)   │  │  (分期)   │
│   student_id    │    │   total_amount   │  │  plan_id  │
│   cash(分)      │    │   frequency      │  │  cash_uid │
│   installment{} │    └────────┬─────────┘  └──────┬────┘
│   {嵌入快照}    │             │ 1:N               │
└────────┬────────┘             │                   │
         │ 1:1 (cash_uid)      │                   │
         └─────────────────────┴───────────────────┘
         关联关系：cash记录嵌入installment快照

┌───────────────┐
│   counter     │  ← UID生成器
│   Student:100 │
│   Cash:45     │
│   Installment:8
│   Plan:12     │
└───────────────┘
```

### 2.2 核心实体详情

| 实体 | 文件 | 字段数 | 索引 | 特殊处理 |
|------|------|--------|------|---------|
| **Student** | `mongo.ts` | 14 | 8个 | `rings[]`数组 → `REAL[]` |
| **Cash** | `CashMongo.ts` | 8 | 4个 | `installment`对象 → `JSONB` |
| **InstallmentPlan** | `InstallmentPlanMongo.ts` | 10 | 4个 | `frequency`枚举 |
| **Installment** | `InstallmentMongo.ts` | 12 | 4个 | 唯一索引 `(plan_id, current_installment)` |
| **Counter** | `counter.ts` | 3 | 1个 | **删除** → 使用SERIAL |
| **SystemConfig** | `SystemConfig.ts` | 5 | 1个 | `value`→ JSON存储 |

### 2.3 关键业务流程（需要事务）

#### 流程1：创建分期计划
```typescript
// 当前代码位置：controllers/installmentRoutes.ts
// 操作序列：
1. validatePlan(payload)              // 验证输入
2. const plan = await InstallmentPlan.create(...)     // ✅
3. for (let i = 1; i <= total; i++) {
     await Installment.create(...)    // ✅ N次插入
   }
4. if (firstPayment) {
     await Cash.create(...)           // ✅ 创建交易
     // 关联 installment.cash_uid
   }
5. await InstallmentPlan.updateStatus(...) // ✅

// 风险：步骤4或5失败 → 产生孤儿数据
// PostgreSQL事务：全部成功或全部回滚
await db.transaction(async (tx) => {
  const plan = await tx.insert(installmentPlans).values(...).returning();
  const installments = await tx.insert(installments).values(...).returning();
  const cash = await tx.insert(cashTransactions).values(...).returning();
  await tx.update(installments).set({ cash_uid: cash.uid }).where(...);
  // 自动提交或回滚
});
```

#### 流程2：支付分期
```typescript
// 操作序列：
1. const installment = await Installment.findByUid(uid)
2. const oldCashUid = installment.cash_uid
3. if (oldCashUid) {
     await Cash.deleteByUid(oldCashUid)   // ⚠️ 删除旧记录
   }
4. const newCash = await Cash.create(...) // ✅ 创建新记录
5. await installment.updateByUid(uid, {
     status: PAID,
     cash_uid: newCash.uid,
     paid_amount: amount,
     paid_at: now
   })
6. // 刷新 Plan 状态
   await refreshPlanStatus(installment.plan_id)

// 风险：步骤1-2执行后，步骤3-6中的任何一步失败
// → 旧cash已删除，新cash未创建 → 交易记录丢失！
```

### 2.4 统计服务复杂度

**StatsService.buildDashboardStats** - 多数据聚合:
```typescript
// 需要从5个来源获取数据：
1. cash_transactions: 收入/支出聚合 (pipeline)
2. students: 遍历所有记录计算平均分、最大分
3. students: 统计活跃会员数 (hasMembership检查)
4. installment_plans: count(状态=ACTIVE)
5. installments: findOverdue(当前时间)

// 性能瓶颈：
// - N次数据库访问
// - students遍历 (内存操作)
// - 无缓存机制
```

---

## 3. 技术选型

### 3.1 PostgreSQL 版本

**推荐: PostgreSQL 15+**

| 特性 | PostgreSQL 15 | 优势 |
|------|---------------|------|
| MERGE | ✅ | 简化upsert操作 |
| JSON 路径查询 | ✅ 改进 | 更好的JSONB支持 |
| 并行查询 | ✅ 改进 | 统计查询加速 |
| 排序优化 | ✅ | GROUP BY性能提升 |

### 3.2 ORM 选择: Drizzle

**为什么选择 Drizzle 而非 Prisma?**

| 对比项 | Drizzle | Prisma | 评价 |
|--------|---------|--------|------|
| 包大小 | ~50KB | ~2MB | Drizzle 轻量40倍 |
| 类型安全 | ✅ 完整 | ✅ 完整 | 平手 |
| SQL-like API | ✅ 原生 | ❌ 抽象层 | Drizzle 更适合SQL专家 |
| 查询灵活性 | ✅ 高 | ⚠️ 中 | Drizzle 可以写复杂的SQL |
| 原生 SQL | ✅ 无缝 | ⚠️ 需要 $queryRaw | Drizzle 更易集成 |
| 迁移工具 | drizzle-kit | prisma migrate | 都成熟 |
| 学习曲线 | 低 (熟悉 SQL) | 中 | Drizzle 迁移更快 |
| 事务支持 | ✅ 原生 | ✅ 原生 | 平手 |

**代码对比**:

```typescript
// MongoDB (当前)
const students = await Student.find({ class: ClassType.TEN_TRY })
  .sort({ createdAt: -1 })
  .limit(20)
  .exec();

// Drizzle (目标)
const students = await db
  .select()
  .from(students)
  .where(eq(students.class, 'TEN_TRY'))
  .orderBy(desc(students.createdAt))
  .limit(20);

// 类似度：高，迁移学习成本低
```

**Drizzle 事务示例**:
```typescript
// 分期创建 - 完整事务
const result = await db.transaction(async (tx) => {
  const [plan] = await tx.insert(installmentPlans)
    .values(planData)
    .returning();

  const installmentData = generateInstallments(plan);
  const createdInstallments = await tx.insert(installments)
    .values(installmentData)
    .returning();

  const [cashRecord] = await tx.insert(cashTransactions)
    .values(cashData)
    .returning();

  // 关联installment与cash
  await tx.update(installments)
    .set({ cash_uid: cashRecord.uid })
    .where(eq(installments.plan_id, plan.uid));

  return { plan, installments: createdInstallments, cashRecord };
});

// 任一步失败，全部自动回滚
```

### 3.3 连接池配置

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,                    // 最大连接数
  idleTimeoutMillis: 30000,    // 空闲超时
  connectionTimeoutMillis: 2000, // 连接超时
});

export const db = drizzle(pool);
```

---

## 4. 文件变更清单（基于代码分析）

### 4.1 需要新增的文件

```
backend/src/
├── db/
│   ├── schema.ts              # 统一表定义
│   └── index.ts               # Drizzle连接配置
├── drizzle.config.ts          # Drizzle Kit配置
```

### 4.2 需要重写的文件

| 文件 | 行数 | 原架构 | 目标架构 | 复杂度 |
|------|------|--------|----------|--------|
| `models/mongo.ts` | 375 | Mongoose Schema | Drizzle Table | 高 |
| `models/CashMongo.ts` | 424 | Mongoose + JSONB | Drizzle + JSONB | 中 |
| `models/InstallmentPlanMongo.ts` | 332 | Mongoose | Drizzle Table | 中 |
| `models/InstallmentMongo.ts` | 248 | Mongoose | Drizzle Table | 中 |
| `models/counter.ts` | ~50 | Counter Collection | **删除** | - |
| `services/statsService.ts` | 617 | 聚合管道 | SQL Query | 高 |
| `services/studentQuery.ts` | 260 | 聚合构建器 | Drizzle Query | 高 |
| `services/studentBuilder.ts` | ~200 | Mongoose操作 | Drizzle操作 | 中 |
| `services/studentUpdater.ts` | ~200 | Mongoose操作 | Drizzle操作 | 中 |
| `services/cashBuilder.ts` | ~150 | Mongoose操作 | Drizzle操作 | 中 |
| `services/cashUpdater.ts` | ~150 | Mongoose操作 | Drizzle操作 | 中 |

### 4.3 需要修改的文件

| 文件 | 变更内容 |
|------|----------|
| `controllers/installmentRoutes.ts` | 添加事务包装 |
| `controllers/cashRoutes.ts` | 适配新Model |
| `controllers/studentRoutes.ts` | 适配新Model |
| `config/index.ts` | 添加PostgreSQL配置 |
| `index.ts` | 初始化Drizzle连接 |

### 4.4 测试文件修改

| 测试文件 | 变更类型 |
|---------|----------|
| `__tests__/models/cash.spec.ts` | MongoDB Memory Server → pg-test/fake-data |
| `__tests__/services/statsService.spec.ts` | 断言基于SQL结果 |
| `__tests__/*Service.spec.ts` | Mock Drizzle操作 |

### 4.5 可以保留的文件

| 文件 | 原因 |
|------|------|
| `services/studentPresenter.ts` | 纯数据转换，无数据库操作 |
| `middleware/*.ts` | 与数据库无关 |
| `routes/*.ts` | 路由定义不变 |
| `types/index.ts` | 类型定义基本不变 |
| `utils/errors.ts` | 错误处理逻辑不变 |

---

## 5. 依赖变更

### 5.1 新增依赖

```json
{
  "dependencies": {
    "drizzle-orm": "^0.29.0",
    "pg": "^8.11.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.20.0",
    "@types/pg": "^8.10.0"
  }
}
```

### 5.2 移除依赖

```json
{
  "dependencies": {
    "mongoose": "=8.8.4"  // 迁移后移除
  },
  "devDependencies": {
    "mongodb-memory-server": "=10.3.0"  // 移除
  }
}
```

---

## 6. 迁移风险评估

| 风险 | 影响度 | 概率 | 缓解措施 |
|------|--------|------|---------|
| **财务数据不一致** | 严重 | 低 | 事务保护 + 数据验证 |
| **数据丢失** | 高 | 低 | 完整备份 + 双写验证 |
| **性能下降** | 中 | 低 | 基准测试 + 索引优化 |
| **数据类型转换错误** | 中 | 中 | 单元测试 + 验证脚本 |
| **API兼容性** | 低 | 低 | 响应格式不变 + 集成测试 |
| **服务中断** | 中 | 低 | 蓝绿部署 + 快速回滚 |

**总体风险等级**: 低

**原因**:
1. 数据模型结构清晰，映射关系明确
2. 代码质量高，现有测试覆盖90%+
3. 业务逻辑成熟，无隐藏的复杂交互
4. 前后端分离，后端迁移对前端透明

---

**下一步**: [02-SCHEMA.md](./02-SCHEMA.md) - PostgreSQL 表结构设计
