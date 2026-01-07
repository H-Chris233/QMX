# QMX MongoDB → PostgreSQL 迁移方案

## 文档索引

| 文档 | 内容 | 优先级 |
|------|------|--------|
| [01-OVERVIEW.md](./01-OVERVIEW.md) | 迁移概述、目标、风险评估 | - |
| [02-SCHEMA.md](./02-SCHEMA.md) | PostgreSQL 表结构设计 | P0 |
| [03-ORM-SETUP.md](./03-ORM-SETUP.md) | Drizzle ORM 配置与连接 | P0 |
| [04-MODEL-LAYER.md](./04-MODEL-LAYER.md) | 数据模型层重写 | P1 |
| [05-SERVICE-LAYER.md](./05-SERVICE-LAYER.md) | 服务层迁移（Builder/Query） | P1 |
| [06-CONTROLLER-LAYER.md](./06-CONTROLLER-LAYER.md) | 控制器层改造与事务 | P2 |
| [07-DATA-MIGRATION.md](./07-DATA-MIGRATION.md) | 数据迁移脚本 | P2 |
| [08-TESTING.md](./08-TESTING.md) | 测试策略与验证 | P3 |
| [09-ROLLBACK.md](./09-ROLLBACK.md) | 回滚方案 | P3 |

## 迁移阶段

```
阶段1: 准备工作
├── 安装依赖 (PostgreSQL, Drizzle)
├── 设计表结构
└── 配置数据库连接

阶段2: 代码重写
├── Model 层 (Schema → Table)
├── Service 层 (Builder/Query)
└── Controller 层 (添加事务)

阶段3: 数据迁移
├── 导出 MongoDB 数据
├── 转换数据格式
└── 导入 PostgreSQL

阶段4: 测试验证
├── 单元测试
├── 集成测试
└── 性能测试

阶段5: 上线切换
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

## 预估工作量

| 模块 | 文件数 | 复杂度 |
|------|--------|--------|
| Schema 设计 | 5 | 中 |
| Model 层 | 6 | 高 |
| Service 层 | 6 | 高 |
| Controller 层 | 7 | 中 |
| 数据迁移 | 2 | 中 |
| 测试 | 10+ | 中 |

## 关键决策

1. **ORM 选择**: Drizzle 而非 Prisma
   - 更轻量，SQL-like API
   - 更好的类型推断
   - 更灵活的查询构建

2. **ID 策略**: 保留 `uid` 自增字段
   - 兼容现有前端
   - 使用 PostgreSQL SERIAL

3. **数组字段处理**:
   - `rings` (成绩) → PostgreSQL ARRAY 或 JSONB
   - 推荐使用 `REAL[]` 数组类型

4. **嵌入文档处理**:
   - `installment` 快照 → JSONB 字段
   - 保持数据结构不变

---

**创建时间**: 2025-01-07
**状态**: 规划中
