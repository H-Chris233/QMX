# QMX Backend

QMX学生管理系统的后端服务，提供完整的RESTful API支持。

## 技术栈

- **Node.js** + **TypeScript** - 运行时和编程语言
- **Express.js** - Web框架
- **Sequelize ORM** - 数据库ORM
- **SQLite/PostgreSQL** - 数据库
- **Joi** - 数据验证
- **Winston** - 日志管理
- **JWT** - 身份认证
- **Helmet/CORS** - 安全中间件

## 快速开始

### 安装依赖

```bash
cd backend
npm install
```

### 环境配置

```bash
cp .env.example .env
# 编辑 .env 文件配置数据库连接等参数
```

### 开发模式

```bash
npm run dev
```

### 生产模式

```bash
npm run build
npm start
```

### 启动流程概览

1. **加载环境变量**：`src/config/index.ts` 会通过 `dotenv` 读取 `.env`，同时调用 `validateConfig()` 校验必填项。
2. **连接数据库**：`src/config/database.ts` 中的 `connectDatabase()` 在应用启动前建立 MongoDB 连接，如连接失败会立即退出。
3. **启动应用**：`src/index.ts` 引导 `app` 实例监听端口，并输出健康检查、环境等启动日志。

> 待相关模型补齐后，可运行 `npm run build` 确认编译通过。

## API文档

### 基础信息

- **基础URL**: `http://localhost:3001/api/v1`
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON

### 主要端点

#### 学生管理
- `GET /students` - 获取学生列表
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
- `DELETE /transactions/:id` - 删除交易记录

> 💡 **金额单位说明**：现金交易在数据库中以“分”为单位存储（整数），API 响应则统一转换为“元”（保留两位小数）。在服务层创建或更新现金记录时，请使用 `cashBuilder` / `cashUpdater` 进行金额校验与单位转换，避免直接操作 `cash` 字段。

#### 统计数据
- `GET /dashboard/stats` - 获取仪表板统计

> 💡 **统计服务说明**：`backend/src/services/statsService.ts` 会以“分”为单位聚合现金、分期等数据，控制器层统一转换为“元”（保留两位小数），并复用与 Rust 版本一致的汇总逻辑，确保金额精度与字段含义完全对齐。

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
│   ├── config/         # 配置文件
│   ├── controllers/    # 控制器
│   ├── middleware/     # 中间件
│   ├── models/         # 数据模型
│   ├── routes/         # 路由定义
│   ├── types/          # TypeScript类型定义
│   ├── utils/          # 工具函数
│   └── index.ts        # 应用入口
├── data/              # 数据库文件
├── logs/              # 日志文件
├── uploads/           # 上传文件
└── dist/              # 编译输出
```

## 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| PORT | 服务端口 | 3001 |
| NODE_ENV | 运行环境 | development |
| DB_TYPE | 数据库类型 | sqlite |
| DB_NAME | 数据库名称 | qmx_db |
| JWT_SECRET | JWT密钥 | - |
| CORS_ORIGIN | CORS源 | http://localhost:1420 |

## 开发指南

### 添加新的API端点

1. 在`models/`中定义数据模型
2. 在`controllers/`中实现业务逻辑
3. 在`routes/`中定义路由
4. 在`middleware/validation.ts`中添加验证规则

### 数据库迁移

```bash
npm run migrate
```

### 日志管理

日志文件位于`logs/`目录：
- `app.log` - 应用日志
- `app-error.log` - 错误日志
- `app-exceptions.log` - 异常日志

## 许可证

MIT License