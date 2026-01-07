# 01 - 迁移概述

## 1. 迁移目标

### 1.1 为什么迁移？

| 问题 | MongoDB 现状 | PostgreSQL 解决方案 |
|------|-------------|-------------------|
| **事务缺失** | 财务操作无 ACID 保证 | 原生事务支持 |
| **数据一致性** | 依赖应用层保证 | 外键约束 + 事务 |
| **关联查询** | 手动多次查询 | SQL JOIN |
| **Schema 固定** | 未利用灵活性优势 | 强类型更适合 |

### 1.2 迁移收益

1. **数据安全**: 财务数据 ACID 事务保护
2. **查询效率**: JOIN 替代多次查询
3. **完整性约束**: 外键、唯一约束、CHECK 约束
4. **成熟生态**: 更多工具和运维支持

### 1.3 迁移风险

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| 数据丢失 | 高 | 完整备份 + 双写验证 |
| 业务中断 | 中 | 分阶段迁移 + 回滚方案 |
| 性能回退 | 低 | 索引优化 + 性能测试 |
| 代码缺陷 | 中 | 完整测试覆盖 |

---

## 2. 现有架构分析

### 2.1 MongoDB 数据模型

```
┌─────────────────┐
│    students     │
│  (uid, name...) │
└────────┬────────┘
         │ 1:N (student_id)
         │
    ┌────┴────┬──────────────┐
    ▼         ▼              ▼
┌───────┐ ┌──────────────┐ ┌─────────────┐
│ cash  │ │installment_  │ │installments │
│       │ │   plans      │ │             │
└───┬───┘ └──────┬───────┘ └──────┬──────┘
    │            │ 1:N            │
    │            └────────────────┘
    │                    │
    └────────────────────┘
         1:1 (cash_uid)
```

### 2.2 核心实体

| 实体 | 文件 | 记录数(估) | 关键字段 |
|------|------|-----------|----------|
| Student | `mongo.ts` | 100-1000 | uid, name, phone, rings[], membership_* |
| Cash | `CashMongo.ts` | 1000-10000 | uid, student_id, cash(分), installment{} |
| InstallmentPlan | `InstallmentPlanMongo.ts` | 10-100 | uid, student_id, total_amount, status |
| Installment | `InstallmentMongo.ts` | 50-500 | uid, plan_id, cash_uid, status |
| Counter | `counter.ts` | 5 | sequence_name, sequence_value |
| SystemConfig | `SystemConfig.ts` | 10-50 | key, value |

### 2.3 需要事务的关键操作

| 操作 | 涉及表 | 当前风险 |
|------|--------|----------|
| 创建分期计划 | plans + installments + cash | **高** - 部分创建失败导致数据不一致 |
| 支付分期 | installments + cash + plans | **高** - 支付记录与状态不同步 |
| 删除分期计划 | plans + installments | **中** - 孤儿记录 |
| 批量更新学员 | students (多条) | **低** - 部分更新失败 |

---

## 3. 技术选型

### 3.1 PostgreSQL 版本

**推荐: PostgreSQL 15+**

- 支持 MERGE 语句
- 改进的 JSON 处理
- 更好的并行查询

### 3.2 ORM 选择: Drizzle

**为什么选择 Drizzle 而非 Prisma?**

| 特性 | Drizzle | Prisma |
|------|---------|--------|
| 类型安全 | ✅ 完整 | ✅ 完整 |
| SQL-like API | ✅ 原生 | ❌ 抽象层 |
| 包大小 | ~50KB | ~2MB |
| 查询灵活性 | ✅ 高 | ⚠️ 中 |
| 原生 SQL | ✅ 无缝 | ⚠️ 需要 $queryRaw |
| 迁移工具 | drizzle-kit | prisma migrate |
| 学习曲线 | 低 (熟悉 SQL) | 中 |

**Drizzle 示例**:
```typescript
// 类型安全的查询
const students = await db
  .select()
  .from(studentsTable)
  .where(eq(studentsTable.classType, 'MONTH'))
  .orderBy(desc(studentsTable.createdAt))
  .limit(10);

// 事务
await db.transaction(async (tx) => {
  const plan = await tx.insert(installmentPlans).values({...}).returning();
  await tx.insert(installments).values([...]);
  await tx.insert(cashTransactions).values({...});
});
```

### 3.3 连接池

使用 `pg` 驱动 + Drizzle 内置连接管理:

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool);
```

---

## 4. 迁移策略

### 4.1 分阶段迁移

```
┌─────────────────────────────────────────────────────────┐
│ 阶段 1: 准备 (不影响生产)                                │
│ ├── 安装 PostgreSQL                                     │
│ ├── 设计表结构                                          │
│ ├── 配置 Drizzle                                        │
│ └── 编写迁移脚本                                        │
└─────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│ 阶段 2: 代码重写 (开发环境)                              │
│ ├── Model 层重写                                        │
│ ├── Service 层适配                                      │
│ ├── Controller 层添加事务                               │
│ └── 单元测试通过                                        │
└─────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│ 阶段 3: 数据迁移 (测试环境)                              │
│ ├── 导出 MongoDB 数据                                   │
│ ├── 转换并导入 PostgreSQL                               │
│ ├── 数据校验                                            │
│ └── 集成测试通过                                        │
└─────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│ 阶段 4: 双写验证 (可选，高安全要求)                       │
│ ├── 同时写入 MongoDB 和 PostgreSQL                      │
│ ├── 比对数据一致性                                      │
│ └── 验证无差异                                          │
└─────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│ 阶段 5: 切换上线                                        │
│ ├── 停机维护窗口                                        │
│ ├── 最终数据同步                                        │
│ ├── 切换到 PostgreSQL                                   │
│ └── 验证生产环境                                        │
└─────────────────────────────────────────────────────────┘
```

### 4.2 回滚策略

每个阶段都有回滚点:

1. **代码回滚**: Git 分支切换
2. **数据回滚**: MongoDB 备份恢复
3. **配置回滚**: 环境变量切换数据库连接

---

## 5. 文件变更清单

### 5.1 需要新增的文件

```
backend/src/
├── db/
│   ├── index.ts              # Drizzle 连接配置
│   ├── schema/
│   │   ├── students.ts       # 学员表定义
│   │   ├── cash.ts           # 交易表定义
│   │   ├── installments.ts   # 分期表定义
│   │   └── index.ts          # Schema 导出
│   └── migrations/           # 迁移文件目录
├── drizzle.config.ts         # Drizzle Kit 配置
```

### 5.2 需要重写的文件

| 文件 | 变更类型 | 复杂度 |
|------|----------|--------|
| `models/mongo.ts` | 完全重写 → `db/schema/students.ts` | 高 |
| `models/CashMongo.ts` | 完全重写 → `db/schema/cash.ts` | 高 |
| `models/InstallmentMongo.ts` | 完全重写 → `db/schema/installments.ts` | 中 |
| `models/InstallmentPlanMongo.ts` | 完全重写 → `db/schema/installments.ts` | 中 |
| `models/counter.ts` | 删除 (使用 SERIAL) | - |
| `services/statsService.ts` | 重写聚合查询 | 高 |
| `services/studentQuery.ts` | 重写查询构建 | 高 |
| `services/studentBuilder.ts` | 适配新 Model | 中 |
| `services/studentUpdater.ts` | 适配新 Model | 中 |
| `services/cashBuilder.ts` | 适配新 Model | 中 |
| `config/mongodb.ts` | 替换 → `db/index.ts` | 中 |

### 5.3 需要修改的文件

| 文件 | 变更内容 |
|------|----------|
| `controllers/*.ts` | 调用新 Model/Service，添加事务 |
| `config/index.ts` | 添加 PostgreSQL 配置 |
| `app.ts` | 初始化 Drizzle 连接 |

### 5.4 可以保留的文件

| 文件 | 原因 |
|------|------|
| `services/studentPresenter.ts` | 纯数据转换，无数据库操作 |
| `middleware/*.ts` | 与数据库无关 |
| `routes/*.ts` | 路由定义不变 |
| `types/index.ts` | 类型定义基本不变 |

---

## 6. 依赖变更

### 6.1 新增依赖

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

### 6.2 移除依赖

```json
{
  "dependencies": {
    "mongoose": "移除"
  },
  "devDependencies": {
    "mongodb-memory-server": "移除"
  }
}
```

---

## 7. 验收标准

### 7.1 功能验收

- [ ] 所有现有 API 端点正常工作
- [ ] 前端无需修改即可使用
- [ ] 分期付款操作有事务保护
- [ ] 数据完整性约束生效

### 7.2 性能验收

- [ ] API 响应时间不超过原有 120%
- [ ] 数据库查询无慢查询 (>100ms)
- [ ] 连接池使用率正常

### 7.3 数据验收

- [ ] 所有记录数量一致
- [ ] 关键字段值一致
- [ ] 关联关系正确

---

**下一步**: [02-SCHEMA.md](./02-SCHEMA.md) - PostgreSQL 表结构设计
