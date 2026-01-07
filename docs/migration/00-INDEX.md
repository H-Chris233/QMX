# QMX MongoDB → PostgreSQL 迁移方案

## 文档索引

| 文档 | 内容 | 优先级 |
|------|------|--------|
| [01-OVERVIEW.md](./01-OVERVIEW.md) | 迁移概述、目标、风险评估 | - |
| [02-SCHEMA.md](./02-SCHEMA.md) | PostgreSQL 表结构设计 | P0 |
| [03-ORM-SETUP.md](./03-ORM-SETUP.md) | Drizzle ORM 配置与连接 | P0 |
| [04-MODEL-LAYER.md](./04-MODEL-LAYER.md) | 数据模型层重写 | P1 |
| [05-SERVICE-LAYER.md](./05-SERVICE-LAYER.md) | 服务层迁移（聚合重写） | P1 |
| [06-CONTROLLER-LAYER.md](./06-CONTROLLER-LAYER.md) | 控制器层改造与事务 | P2 |
| [07-TESTING.md](./07-TESTING.md) | 测试策略与验证 | P3 |

> **注**: 原计划中的 DATA-MIGRATION.md 和 ROLLBACK.md 已移除，将整合到实际实施过程中处理。

## 迁移阶段

```
阶段1: 准备工作
├── 安装依赖 (PostgreSQL, Drizzle)
├── 设计表结构
└── 配置数据库连接

阶段2: 代码重写
├── Model 层 (6个Mongoose模型 → Drizzle表)
├── Service 层 (聚合管道重写为SQL)
└── Controller 层 (添加事务处理)

阶段3: 测试验证
├── 单元测试
├── 集成测试
└── 性能测试

阶段4: 上线切换
├── 数据迁移（脚本执行）
├── 双写验证
├── 切换读取
└── 下线 MongoDB
```

## 技术选型

| 组件 | 选择 | 理由 |
|------|------|------|
| 数据库 | PostgreSQL 15+ | ACID事务、成熟稳定 |
| ORM | Drizzle ORM | 类型安全、轻量、SQL-like |
| 迁移工具 | drizzle-kit | 与ORM配套 |
| 连接池 | 内置 (pg) | Drizzle 默认使用 |

## 核心发现（基于代码深度分析）

### 数据模型结构
- **6个Mongoose模型**: Student, Cash, Installment, InstallmentPlan, Counter, SystemConfig
- **重要字段**:
  - `uid`: 自增ID（使用Counter表生成）
  - `cash`: 存储为分（整数）
  - `installment`: 嵌入式快照（需转换为JSONB）
  - `rings`: 成绩数组（需转换为PostgreSQL ARRAY）

### 关键业务逻辑
- **分期计划创建**: 需要4个原子操作（plan + installments + cash + status更新）
- **分期支付**: 需要4个原子操作（删除旧cash + 创建新cash + 更新状态 + 刷新计划）
- **统计分析**: 使用MongoDB聚合管道（需重写为SQL）

### 服务层复杂度
- **StatsService**: 多维度聚合统计（仪表盘、财务、学生统计）
- **StudentQuery**: 12种查询条件组合的流畅API
- **Builder/Updater模式**: 专业级对象构建和更新（StudentBuilder, CashBuilder）

### 测试覆盖
- **10个专业测试文件**: 90%+覆盖率
- **测试工具链**: Jest + Supertest + MongoDB Memory Server

## 文件变更清单

### 需要重写的文件
| 文件路径 | 原代码 | 目标 | 复杂度 |
|---------|--------|------|--------|
| `backend/src/models/mongo.ts` | Mongoose模型 | Drizzle表定义 | 高 |
| `backend/src/models/CashMongo.ts` | Mongoose模型 | Drizzle表定义 | 中 |
| `backend/src/models/InstallmentMongo.ts` | Mongoose模型 | Drizzle表定义 | 中 |
| `backend/src/models/InstallmentPlanMongo.ts` | Mongoose模型 | Drizzle表定义 | 中 |
| `backend/src/models/counter.ts` | Counter集合 | PostgreSQL SERIAL | 低 |
| `backend/src/services/statsService.ts` | 聚合管道 | SQL查询 | 高 |
| `backend/src/services/studentQuery.ts` | 聚合管道 | Drizzle查询构建 | 高 |
| `backend/src/services/*Builder.ts` | Mongoose操作 | Drizzle操作 | 中 |
| `backend/src/services/*Updater.ts` | Mongoose操作 | Drizzle操作 | 中 |

### 需要添加的文件
| 文件路径 | 内容 |
|---------|------|
| `backend/src/db/schema.ts` | Drizzle表定义 |
| `backend/src/db/index.ts` | 数据库连接配置 |
| `backend/src/db/migrations/` | Drizzle迁移文件 |
| 各Controller文件中的事务包装 | 原子性保证 |

## 关键决策

1. **ORM 选择**: Drizzle 而非 Prisma
   - 更轻量，SQL-like API（~50KB vs 2MB）
   - 更好的类型推断
   - 更灵活的查询构建

2. **ID 策略**: 保留 `uid` 自增字段
   - 兼容现有前端
   - 使用 PostgreSQL SERIAL
   - 移除Counter集合依赖

3. **数组字段处理**:
   - `rings` (成绩) → PostgreSQL `REAL[]` 数组类型
   - 保持原生数组语义

4. **嵌入文档处理**:
   - `installment` 快照 → JSONB字段
   - 保持数据结构不变，支持查询

5. **事务策略**:
   - 使用PostgreSQL原生事务
   - 关键操作：分期创建、分期支付
   - 自动回滚保证数据一致性

## 迁移风险评估

| 风险 | 影响度 | 缓解措施 |
|------|--------|---------|
| **数据丢失** | 高 | 完整备份 + 灰度迁移 + 双写验证 |
| **财务数据不一致** | 严重 | 事务保证 + 验证脚本 |
| **服务中断** | 中 | 蓝绿部署 + 快速回滚 |
| **前端兼容** | 低 | 保持API响应格式不变 |
| **性能下降** | 低 | 索引优化 + 基准测试 |

## 迁移收益

1. **数据一致性**: ACID事务确保财务操作原子性
2. **查询性能**: JOIN替代多次查询，索引策略优化
3. **约束完整性**: 外键约束，级联删除
4. **开发体验**: TypeScript类型安全，SQL原生支持
5. **运维友好**: 成熟工具链，社区支持

---

**创建时间**: 2025-01-07
**最后更新**: 2025-01-07 (基于代码深度分析)
**状态**: 准备就绪
