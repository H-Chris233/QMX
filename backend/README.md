# QMX Backend

QMX学生管理系统的后端服务，提供完整的RESTful API支持。

## 技术栈

- **Node.js** + **TypeScript** - 运行时和编程语言
- **Express.js** - Web框架
- **Drizzle ORM** - PostgreSQL ORM
- **PostgreSQL** - 关系型数据库
- **Joi** - 数据验证
- **Winston** - 日志管理
- **bcryptjs** - 密码哈希
- **Helmet/CORS** - 安全中间件
- **rate-limiter-flexible** - 速率限制

## 快速开始

### 安装依赖

```bash
cd backend
pnpm install
```

### 环境配置

```bash
cp .env.example .env
# 编辑 .env 文件配置数据库连接等参数
```

### 数据库设置

```bash
# 确保PostgreSQL已启动
# 创建数据库
createdb qmx

# 运行迁移
pnpm run db:migrate

# 或开发环境推送Schema
pnpm run db:push
```

### 开发模式

```bash
pnpm run dev
```

### 生产模式

```bash
pnpm run build
pnpm start
```

### 启动流程概览

1. **加载环境变量**：`src/config/index.ts` 会通过 `dotenv` 读取 `.env`，同时调用 `validateConfig()` 校验必填项。
2. **连接数据库**：`src/config/database.ts` 中的 `connectDatabase()` 在应用启动前建立 PostgreSQL 连接，如连接失败会立即退出。
3. **启动应用**：`src/index.ts` 引导 `app` 实例监听端口，并输出健康检查、环境等启动日志。

## API文档

### 基础信息

- **基础URL**: `http://localhost:3001/api/v1`
- **认证方式**: 简单密码认证（bcrypt）
- **数据格式**: JSON
- **健康检查**: `http://localhost:3001/health`

### 主要端点

#### 学生管理
- `GET /students` - 获取学生列表（支持分页、搜索）
- `POST /students` - 创建新学生
- `GET /students/:id` - 获取学生详情
- `PUT /students/:id` - 更新学生信息
- `DELETE /students/:id` - 删除学生

#### 成绩管理
- `POST /students/:id/scores` - 添加成绩
- `GET /students/:id/scores` - 获取学生成绩
- `PUT /students/:id/scores/:index` - 更新成绩
- `DELETE /students/:id/scores/:index` - 删除成绩

#### 财务管理
- `GET /transactions` - 获取交易记录
- `POST /transactions` - 创建交易记录
- `GET /transactions/:id` - 获取交易详情
- `DELETE /transactions/:id` - 删除交易记录

#### 分期付款
- `GET /installments` - 获取分期列表
- `POST /installments/plans` - 创建分期计划
- `GET /installments/plans/:id` - 获取分期计划详情
- `POST /installments/plans/:id/pay` - 支付分期

#### 会员管理
- `GET /memberships` - 获取会员列表
- `PUT /memberships/:id` - 更新会员信息

#### 统计数据
- `GET /dashboard/stats` - 获取仪表板统计
- `GET /dashboard/financial-stats` - 财务统计
- `GET /dashboard/students/:id/stats` - 学员统计数据

> **金额单位说明**：现金交易在数据库中以"分"为单位存储（整数），API 响应则统一转换为"元"（保留两位小数）。在服务层创建或更新现金记录时，请使用 `cashBuilder` / `cashUpdater` 进行金额校验与单位转换，避免直接操作 `amount` 字段。

> **统计服务说明**：`backend/src/services/statsService.ts` 会以"分"为单位聚合现金、分期等数据，控制器层统一转换为"元"（保留两位小数），并复用与 Rust 版本一致的汇总逻辑，确保金额精度与字段含义完全对齐。

##### 仪表盘字段（`/dashboard/stats`）
- `total_students`：学员总数
- `total_revenue` / `total_expense` / `net_income`：财务汇总（元，保留两位小数）
- `average_score` / `max_score`：全体成绩汇总（保留 1 位小数）
- `active_courses`：去重后的班级数量（排除 `Others` 班级）
- `active_members`：当前处于有效会员周期的学员数
- `active_installments` / `overdue_installments`：活跃分期计划及逾期期数统计

##### 学员统计字段（`/dashboard/students/:id/stats`）
- `total_payments` / `payment_count`：该学员的收入总额及次数
- `average_score` / `max_score` / `min_score` / `score_count`：成绩表现
- `membership_status` / `membership_status_code`：会员可读文案及状态枚举（`None`/`Active`/`Expired`/`Upcoming`）
- `membership_is_active` / `membership_days_remaining` / `membership_days_until_start`：临近过期、未开始等场景的提示
- `installment_stats`：
  - `total_amount`：计划总额
  - `paid_amount`：已支付金额
  - `pending_amount`：待支付金额（含逾期）
  - `pending_count`：待支付期数
  - `remaining_amount`：剩余金额

##### 财务统计字段（`/dashboard/financial-stats`）
- `period` / `date_from` / `date_to`：本次统计覆盖的时间范围
- `total_income` / `total_expense` / `net_income` / `net_profit`：净收益指标（元）
- `is_profitable`：是否盈利
- `installment_total` / `installment_paid` / `installment_pending` / `installment_remaining`：分期金额拆分
- `transaction_count`：交易数量
- `student_income`：学员收入 Top 榜（含 `student_id`、`student_name`、`amount`）

### 错误响应格式

当请求无法成功处理时，后端会返回如下结构的统一错误响应：

```json
{
  "success": false,
  "error": {
    "type": "InvalidInput",
    "message": "金额不能为0",
    "details": {
      "field": "amount"
    }
  }
}
```

- `type`：错误类别（`InvalidInput`、`NotFound`、`State`、`Unauthorized` 等），前端可据此展示对应提示。
- `message`：面向用户的错误信息。
- `details` / `code`：可选的补充信息，便于定位问题。

常见错误类别与 HTTP 状态码对应关系：

| 错误类型 | 状态码 | 说明 |
|----------|--------|------|
| `InvalidInput` | 400 | 请求参数或数据校验失败 |
| `NotFound` | 404 | 资源不存在或已删除 |
| `State` | 409 | 当前业务状态不允许执行该操作 |
| `Unauthorized` / `Forbidden` | 401 / 403 | 认证或权限校验未通过 |
| `RateLimit` | 429 | 请求过于频繁，请稍后重试 |
| `Other` | 500 | 未分类的服务端错误 |

## 项目结构

```
backend/
├── src/
│   ├── config/              # 配置文件
│   ├── controllers/         # 控制器
│   ├── db/
│   │   ├── schema/          # Drizzle Schema定义
│   │   ├── repositories/    # 数据仓储层
│   │   └── index.ts         # 数据库连接
│   ├── middleware/          # 中间件
│   ├── routes/              # 路由定义
│   ├── services/            # 业务逻辑层
│   ├── types/               # TypeScript类型定义
│   ├── utils/               # 工具函数
│   ├── app.ts               # Express应用
│   └── index.ts             # 应用入口
├── drizzle/                 # Drizzle配置和迁移
├── logs/                    # 日志文件
└── dist/                    # 编译输出
```

### 架构模式

本项目采用多种设计模式：

- **Repository模式** - 数据访问封装
  - `db/repositories/studentRepository.ts`
  - `db/repositories/cashRepository.ts`
  - `db/repositories/installmentRepository.ts`

- **Builder模式** - 复杂对象构建
  - `services/studentBuilder.ts`
  - `services/cashBuilder.ts`

- **Updater模式** - 更新操作封装
  - `services/studentUpdater.ts`
  - `services/cashUpdater.ts`

- **Presenter模式** - 数据格式化输出
  - `services/studentPresenter.ts`

## 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| PORT | 服务端口 | 3001 |
| NODE_ENV | 运行环境 | development |
| POSTGRES_HOST | PostgreSQL主机 | localhost |
| POSTGRES_PORT | PostgreSQL端口 | 5432 |
| POSTGRES_USER | 数据库用户 | postgres |
| POSTGRES_PASSWORD | 数据库密码 | - |
| POSTGRES_DB | 数据库名 | qmx |
| QMX_ADMIN_PASSWORD_HASH | 管理员密码（bcrypt哈希） | - |
| CORS_ORIGIN | CORS源 | http://localhost:1420 |
| LOG_LEVEL | 日志级别 | info |

## 开发指南

### 添加新的API端点

1. 在 `db/schema/` 中定义数据表Schema
2. 在 `db/repositories/` 中创建Repository
3. 在 `services/` 中实现业务逻辑
4. 在 `controllers/` 中实现控制器
5. 在 `routes/` 中定义路由
6. 在 `middleware/validation.ts` 中添加验证规则

### 数据库迁移

```bash
# 生成迁移文件
pnpm run db:generate

# 执行迁移
pnpm run db:migrate

# 推送Schema变更（开发环境）
pnpm run db:push

# 打开Drizzle Studio
pnpm run db:studio
```

### 运行测试

本项目使用 Jest 进行自动化测试，测试覆盖：

- 学生服务：创建、更新、查询、成绩管理、会员管理
- 现金交易：收入/支出创建、金额校验、分页搜索、删除
- 分期付款：计划创建、期票生成、逾期检测、支付更新
- 统计服务：仪表盘统计、学员统计、财务统计
- API集成：学生API、交易API、分期API、统计API
- 仓储层：数据访问操作

运行所有测试：

```bash
# 使用 pnpm
pnpm test

# 运行带覆盖率的测试
pnpm test -- --coverage
```

**环境要求**：
- 测试使用 PostgreSQL 数据库，需要运行中的数据库实例
- 设置 `DATABASE_URL` 环境变量指向测试数据库
- 建议 Node.js >= 18.0.0

**测试结构**：
```
backend/src/__tests__/
├── helpers/              # 测试辅助工具
│   └── testSetup.ts     # 数据库设置、测试数据工厂
├── api/                  # API集成测试
│   ├── students.api.spec.ts
│   ├── transactions.api.spec.ts
│   ├── installments.api.spec.ts
│   └── dashboard.api.spec.ts
├── cash.spec.ts          # 现金交易测试
├── cashBuilder.spec.ts   # 交易构建器测试
├── installments.spec.ts  # 分期付款测试
├── studentBuilder.spec.ts # 学生构建器测试
├── studentQuery.spec.ts  # 学生查询测试
├── studentPresenter.spec.ts # 数据展示测试
├── updaters.spec.ts      # 更新器测试
├── statsService.spec.ts  # 统计服务测试
├── serviceIntegration.spec.ts # 服务集成测试
├── boundary.spec.ts      # 边界条件测试
├── repositories.spec.ts  # 仓储层测试
├── errorHandling.spec.ts # 错误处理测试
└── middleware.spec.ts    # 中间件测试
```

**PostgreSQL 测试特性**：
- 使用真实的 PostgreSQL 数据库（需要配置 DATABASE_URL）
- 测试间数据隔离：通过 `clearAllCollections()` 清理数据
- 序列管理：PostgreSQL SERIAL 自动管理，无需手动重置
- 日期处理：统一使用 UTC 时区
- 金额处理：数据库存储分（整数），API 返回元（两位小数）

**测试数据工厂**：
测试使用统一的数据工厂函数创建测试数据：
- `createTestStudent(overrides)` - 创建测试学员
- `createTestStudents(count, baseName)` - 批量创建学员
- `createTestCashTransaction(amount, studentId?, note?)` - 创建交易
- `createTestInstallmentPlan(totalAmount, totalInstallments, frequency, startDate, studentId?)` - 创建分期计划
- `createTestInstallment(planId, studentId, installmentNumber, totalInstallments, amount, dueDate, status)` - 创建分期
- `createCompleteTestDataset()` - 创建完整的测试数据集

**覆盖率目标**：
- 整体覆盖率 >= 65%
- 核心模块（Student、Cash、Installment）覆盖率 >= 85%

### 日志管理

日志文件位于 `logs/` 目录：
- `app.log` - 应用日志
- `app-error.log` - 错误日志
- `app-exceptions.log` - 异常日志

## 许可证

MIT License
