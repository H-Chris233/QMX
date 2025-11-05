# QMX 联调验收方案 (E2E Testing Checklist)

**版本**: 1.0  
**创建日期**: 2025-01  
**适用版本**: QMX v0.12.1+  
**目标**: 提供完整的前后端联调验收流程，确保所有核心功能正常运行

---

## 📋 目录

- [环境准备](#环境准备)
- [启动流程](#启动流程)
- [模块验收流程](#模块验收流程)
  - [1. 学员管理](#1-学员管理)
  - [2. 成绩管理](#2-成绩管理)
  - [3. 财务管理](#3-财务管理)
  - [4. 分期付款](#4-分期付款)
  - [5. 会员管理](#5-会员管理)
  - [6. 仪表盘统计](#6-仪表盘统计)
  - [7. 适配器接口](#7-适配器接口)
  - [8. 错误处理](#8-错误处理)
- [常见问题排查](#常见问题排查)
- [TODO 清单](#todo-清单)

---

## 环境准备

### 前置要求

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0 或 pnpm
- **MongoDB**: 本地实例或 MongoDB Atlas 云数据库
- **浏览器**: Chrome/Edge/Firefox 最新版本

### 环境变量配置

#### 1. 后端环境变量 (`backend/.env`)

创建 `backend/.env` 文件（如不存在），配置以下变量：

```env
# 数据库配置（必填）
MONGODB_URI=mongodb://localhost:27017/qmx
# 或使用 MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/qmx

# 服务器配置
PORT=3001
NODE_ENV=development

# CORS 配置（允许前端跨域访问）
CORS_ORIGIN=http://localhost:1420

# 日志配置
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# 速率限制（可选）
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# 安全配置（生产环境必改）
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

**重要说明**：
- `MONGODB_URI` 是**必填项**，后端无法启动若未配置
- 开发环境可使用本地 MongoDB: `mongodb://localhost:27017/qmx`
- 生产环境必须修改 `JWT_SECRET`

#### 2. 前端代理配置

前端已在 `vite.config.ts` 中配置 API 代理：

```typescript
server: {
  port: 1420,
  proxy: {
    '/api': {
      target: 'http://localhost:3001',  // 后端地址
      changeOrigin: true,
      secure: false,
    },
  },
}
```

**工作原理**：
- 前端访问 `/api/v1/students` → 自动代理到 `http://localhost:3001/api/v1/students`
- 无需在代码中配置完整 URL，直接使用相对路径 `/api/v1/...`

#### 3. 验证配置

```bash
# 检查 Node.js 版本
node --version  # 应输出 v18.x.x 或更高

# 检查 MongoDB 连接（如使用本地 MongoDB）
mongosh mongodb://localhost:27017/qmx

# 检查 .env 文件是否存在
ls -la backend/.env
```

---

## 启动流程

### 方式一：同时启动前后端（推荐）

```bash
# 在项目根目录执行
npm run dev:full
```

**预期输出**：
```
> qmx-chris233@0.12.1 dev:full
> concurrently "npm run backend" "npm run dev"

[0] > qmx-chris233@0.12.1 backend
[0] > cd backend && npm run dev
[1] > qmx-chris233@0.12.1 dev
[1] > vite
[0] 🔄 正在连接MongoDB: mongodb://localhost:27017/qmx
[0] ✅ MongoDB连接成功！
[0] 🚀 服务器启动成功，监听端口: 3001
[0] 🌐 环境: development
[0] 📡 健康检查: http://localhost:3001/health
[1] VITE v6.x.x  ready in xxx ms
[1] ➜  Local:   http://localhost:1420/
```

### 方式二：分别启动

#### 步骤 1：启动后端

```bash
# 在项目根目录或 backend 目录执行
npm run backend
# 或
cd backend && npm run dev
```

**验证后端启动成功**：
```bash
# 访问健康检查端点
curl http://localhost:3001/health

# 预期响应（HTTP 200）：
{
  "status": "ok",
  "timestamp": "2025-01-05T12:00:00.000Z",
  "uptime": 10.5,
  "environment": "development"
}

# 访问数据库健康检查
curl http://localhost:3001/api/v1/health/db

# 预期响应（HTTP 200）：
{
  "success": true,
  "data": {
    "database_type": "mongodb",
    "connection_status": "healthy",
    "details": {
      "state": "connected",
      "host": "localhost",
      "port": 27017,
      "name": "qmx"
    },
    "timestamp": "2025-01-05T12:00:00.000Z"
  }
}
```

**常见启动错误**：

| 错误信息 | 原因 | 解决方法 |
|---------|------|---------|
| `MONGODB_URI is required` | 未配置数据库连接 | 创建 `backend/.env` 并设置 `MONGODB_URI` |
| `MongoDB连接失败: connect ECONNREFUSED` | MongoDB 未启动 | 启动本地 MongoDB 服务或检查 Atlas 连接字符串 |
| `Port 3001 is already in use` | 端口被占用 | 修改 `.env` 中的 `PORT` 或关闭占用端口的进程 |

#### 步骤 2：启动前端

```bash
# 在项目根目录执行（需在另一个终端）
npm run dev
```

**验证前端启动成功**：
- 浏览器访问 http://localhost:1420
- 应显示 QMX 系统登录页或主界面
- 浏览器控制台无报错

---

## 模块验收流程

### 1. 学员管理

#### 1.1 创建新学员

**前置条件**：
- 后端和前端已启动
- 导航到"学员管理"页面

**操作步骤**：
1. 点击"新增学员"按钮
2. 填写学员信息：
   - 姓名: `测试学员001`（必填，1-50 字符）
   - 年龄: `12`（可选，0-120）
   - 电话: `13800138001`（可选，11 位数字）
   - 班级: 选择 `Year`（必填）
   - 科目: 选择 `Shooting`（必填）
   - 备注: `验收测试创建`（可选，最长 1000 字符）
   - 剩余课时: `10`（可选）
3. 点击"保存"按钮

**期望结果**：
- ✅ 显示成功提示："学员创建成功"
- ✅ 学员列表刷新，新学员显示在列表中
- ✅ 学员 UID 自动生成（非 0 的正整数）
- ✅ 创建时间和更新时间自动记录

**HTTP 请求/响应**：
```http
POST /api/v1/students
Content-Type: application/json

{
  "name": "测试学员001",
  "age": 12,
  "phone": "13800138001",
  "class": "Year",
  "subject": "Shooting",
  "note": "验收测试创建",
  "lesson_left": 10
}

# 预期响应（HTTP 201）：
{
  "success": true,
  "data": {
    "uid": 1,
    "name": "测试学员001",
    "age": 12,
    "phone": "13800138001",
    "class": "Year",
    "subject": "Shooting",
    "rings": [],
    "note": "验收测试创建",
    "lesson_left": 10,
    "membership_start_date": null,
    "membership_end_date": null,
    "is_membership_active": false,
    "membership_days_remaining": null,
    "membership_status": "None",
    "created_at": "2025-01-05T12:00:00.000Z",
    "updated_at": "2025-01-05T12:00:00.000Z"
  }
}
```

**失败场景验证**：

| 测试场景 | 输入数据 | 期望结果 |
|---------|---------|---------|
| 姓名为空 | `name: ""` | HTTP 400，错误提示："姓名不能为空" |
| 姓名过长 | `name: "A".repeat(51)` | HTTP 400，错误提示："姓名长度不能超过 50 字符" |
| 年龄无效 | `age: -1` 或 `age: 121` | HTTP 400，错误提示："年龄必须在 0-120 之间" |
| 电话格式错误 | `phone: "123"` | HTTP 400，错误提示："电话号码格式不正确" |
| 班级未选择 | `class: null` | HTTP 400，错误提示："班级类型必填" |

#### 1.2 查询学员列表

**操作步骤**：
1. 访问学员管理页面
2. 列表自动加载

**期望结果**：
- ✅ 显示所有学员（默认分页：第 1 页，每页 50 条）
- ✅ 显示分页控件（总数、当前页、总页数）
- ✅ 显示学员基本信息：姓名、年龄、电话、班级、科目、剩余课时、会员状态

**HTTP 请求/响应**：
```http
GET /api/v1/students?page=1&limit=50&sort_by=created_at&sort_order=DESC

# 预期响应（HTTP 200）：
{
  "success": true,
  "data": [
    { "uid": 1, "name": "测试学员001", ... }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "total_pages": 1
  }
}
```

#### 1.3 搜索学员

**操作步骤**：
1. 在搜索框输入关键词：`测试`
2. 点击"搜索"按钮

**期望结果**：
- ✅ 列表过滤显示包含"测试"的学员
- ✅ 分页信息更新

**HTTP 请求**：
```http
GET /api/v1/students/search?name_contains=测试&page=1&limit=50
```

**高级搜索测试**：
- 年龄范围: `min_age=10&max_age=15`
- 班级筛选: `class_type=Year`
- 科目筛选: `subject=Shooting`
- 会员筛选: `has_membership=true`
- 会员状态筛选: `membership_status=Active`

#### 1.4 编辑学员信息

**操作步骤**：
1. 点击学员行的"编辑"按钮
2. 修改学员信息：
   - 姓名: `测试学员001（已修改）`
   - 年龄: `13`
   - 备注: `验收测试编辑`
3. 点击"保存"

**期望结果**：
- ✅ 显示成功提示："学员信息已更新"
- ✅ 列表刷新显示新信息
- ✅ `updated_at` 时间戳更新

**HTTP 请求**：
```http
PUT /api/v1/students/1
Content-Type: application/json

{
  "name": "测试学员001（已修改）",
  "age": 13,
  "note": "验收测试编辑"
}

# 预期响应（HTTP 200）：
{
  "success": true,
  "data": {
    "uid": 1,
    "name": "测试学员001（已修改）",
    "age": 13,
    "note": "验收测试编辑",
    "updated_at": "2025-01-05T12:30:00.000Z",
    ...
  }
}
```

#### 1.5 删除学员

**操作步骤**：
1. 点击学员行的"删除"按钮
2. 确认删除对话框：点击"确认"

**期望结果**：
- ✅ 显示成功提示："学员已删除"
- ✅ 学员从列表中移除
- ✅ 关联数据处理（交易记录、成绩等）

**HTTP 请求**：
```http
DELETE /api/v1/students/1

# 预期响应（HTTP 200）：
{
  "success": true,
  "message": "学员已删除"
}

# 再次查询该学员（HTTP 404）：
{
  "success": false,
  "error": {
    "type": "NotFound",
    "message": "学员不存在"
  }
}
```

---

### 2. 成绩管理

**前置条件**：
- 已创建测试学员（UID: 2，姓名: `测试学员002`）

#### 2.1 添加单个成绩

**操作步骤**：
1. 进入学员详情页（点击学员名称或"详情"按钮）
2. 切换到"成绩管理"标签
3. 在成绩输入框输入：`9.5`
4. 点击"添加成绩"

**期望结果**：
- ✅ 成绩添加到列表
- ✅ 成绩统计更新（平均分、最高分、最低分、成绩次数）
- ✅ 学员 rings 数组增加新元素

**HTTP 请求**：
```http
POST /api/v1/students/2/scores
Content-Type: application/json

{
  "score": 9.5
}

# 预期响应（HTTP 200）：
{
  "success": true,
  "data": {
    "uid": 2,
    "name": "测试学员002",
    "rings": [9.5],
    ...
  }
}
```

**验证规则**：
- 成绩范围: 0-10（满分10环）
- 小数位数: 最多 1 位
- 无效输入测试:
  - `score: 10.1` → HTTP 400："成绩必须在 0-10 之间"
  - `score: -1` → HTTP 400："成绩不能为负数"
  - `score: "abc"` → HTTP 400："成绩必须是数字"

#### 2.2 批量添加成绩

**操作步骤**：
1. 继续添加多个成绩：`9.8`, `10.0`, `9.3`, `9.7`

**期望结果**：
- ✅ 所有成绩显示在列表中
- ✅ 统计数据正确：
  - 平均分: `(9.5 + 9.8 + 10.0 + 9.3 + 9.7) / 5 = 9.66`
  - 最高分: `10.0`
  - 最低分: `9.3`
  - 成绩次数: `5`

**HTTP 请求（获取成绩列表）**：
```http
GET /api/v1/students/2/scores

# 预期响应（HTTP 200）：
{
  "success": true,
  "data": {
    "rings": [9.5, 9.8, 10.0, 9.3, 9.7],
    "scores": [9.5, 9.8, 10.0, 9.3, 9.7],  // 兼容字段
    "stats": {
      "average": 9.7,
      "max": 10.0,
      "min": 9.3,
      "count": 5
    }
  }
}
```

#### 2.3 修改成绩

**操作步骤**：
1. 点击成绩列表中的"编辑"按钮（索引 2，成绩 10.0）
2. 修改为 `9.9`
3. 点击"保存"

**期望结果**：
- ✅ 成绩更新为 9.9
- ✅ 统计数据重新计算
- ✅ 最高分更新为 9.9

**HTTP 请求**：
```http
PUT /api/v1/students/2/scores/2
Content-Type: application/json

{
  "newScore": 9.9
}

# 预期响应（HTTP 200）：
{
  "success": true,
  "data": {
    "uid": 2,
    "rings": [9.5, 9.8, 9.9, 9.3, 9.7],
    ...
  }
}
```

#### 2.4 删除成绩

**操作步骤**：
1. 点击成绩列表中的"删除"按钮（索引 3，成绩 9.3）
2. 确认删除

**期望结果**：
- ✅ 成绩从列表移除
- ✅ 统计数据更新
- ✅ 最低分更新为 9.5

**HTTP 请求**：
```http
DELETE /api/v1/students/2/scores/3

# 预期响应（HTTP 200）：
{
  "success": true,
  "data": {
    "uid": 2,
    "rings": [9.5, 9.8, 9.9, 9.7],
    ...
  }
}
```

---

### 3. 财务管理

**前置条件**：
- 已创建测试学员（UID: 3，姓名: `测试学员003`）

#### 3.1 新增收入记录

**操作步骤**：
1. 导航到"财务管理"页面
2. 点击"新增交易"按钮
3. 填写交易信息：
   - 关联学员: 选择 `测试学员003`
   - 金额: `500.00`（正数表示收入）
   - 备注: `验收测试-收入`
4. 点击"保存"

**期望结果**：
- ✅ 显示成功提示："交易记录已创建"
- ✅ 交易列表刷新，新记录显示
- ✅ 金额格式化显示：`+¥500.00`（绿色）
- ✅ 财务统计更新（总收入增加 500 元）

**HTTP 请求**：
```http
POST /api/v1/transactions
Content-Type: application/json

{
  "student_id": 3,
  "amount": 500.00,
  "note": "验收测试-收入"
}

# 预期响应（HTTP 201）：
{
  "success": true,
  "data": {
    "uid": 1,
    "student_id": 3,
    "amount": 500.00,
    "formatted_amount": "+¥500.00",
    "note": "验收测试-收入",
    "is_income": true,
    "is_expense": false,
    "is_installment": false,
    "created_at": "2025-01-05T13:00:00.000Z",
    "updated_at": "2025-01-05T13:00:00.000Z"
  }
}
```

**金额单位说明**：
- 前端输入/显示: **元** (100.00 元)
- 后端存储: **分** (10000 分)
- API 请求/响应: **元** (后端自动转换)

#### 3.2 新增支出记录

**操作步骤**：
1. 点击"新增交易"按钮
2. 填写交易信息：
   - 关联学员: 留空（不关联学员的支出）
   - 金额: `-200.00`（负数表示支出）
   - 备注: `验收测试-支出（场地租金）`
3. 点击"保存"

**期望结果**：
- ✅ 交易记录创建成功
- ✅ 金额格式化显示：`-¥200.00`（红色）
- ✅ 财务统计更新（总支出增加 200 元，净收入 = 500 - 200 = 300 元）

**HTTP 请求**：
```http
POST /api/v1/transactions
Content-Type: application/json

{
  "student_id": null,
  "amount": -200.00,
  "note": "验收测试-支出（场地租金）"
}

# 预期响应（HTTP 201）：
{
  "success": true,
  "data": {
    "uid": 2,
    "student_id": null,
    "amount": -200.00,
    "formatted_amount": "-¥200.00",
    "note": "验收测试-支出（场地租金）",
    "is_income": false,
    "is_expense": true,
    "is_installment": false,
    ...
  }
}
```

#### 3.3 搜索交易记录

**操作步骤**：
1. 使用筛选条件：
   - 关联学员: `测试学员003`
   - 金额范围: 最小 `0`，最大 `1000`
   - 日期范围: 今天
   - 收支类型: `收入`
2. 点击"搜索"

**期望结果**：
- ✅ 列表过滤显示符合条件的记录（仅显示学员 3 的收入记录）
- ✅ 分页信息更新

**HTTP 请求**：
```http
GET /api/v1/transactions/search?student_id=3&min_amount=0&max_amount=1000&is_income=true&date_from=2025-01-05T00:00:00.000Z&date_to=2025-01-05T23:59:59.999Z
```

#### 3.4 删除交易记录

**操作步骤**：
1. 点击交易记录的"删除"按钮
2. 确认删除

**期望结果**：
- ✅ 显示成功提示："交易记录已删除"
- ✅ 记录从列表移除
- ✅ 财务统计更新

**HTTP 请求**：
```http
DELETE /api/v1/transactions/2

# 预期响应（HTTP 200）：
{
  "success": true,
  "message": "交易记录已删除"
}
```

---

### 4. 分期付款

**前置条件**：
- 已创建测试学员（UID: 4，姓名: `测试学员004`）

#### 4.1 创建分期计划

**操作步骤**：
1. 导航到"分期管理"页面
2. 点击"新增分期计划"按钮
3. 填写分期信息：
   - 关联学员: 选择 `测试学员004`
   - 总金额: `3000.00`
   - 分期数: `6`（6 期）
   - 付款频率: `Monthly`（每月）
   - 开始日期: 今天
   - 备注: `验收测试-分期计划`
4. 点击"保存"

**期望结果**：
- ✅ 显示成功提示："分期计划已创建"
- ✅ 自动生成 6 期分期记录
- ✅ 每期金额: `3000 / 6 = 500.00` 元
- ✅ 每期到期日间隔约 30 天

**HTTP 请求**：
```http
POST /api/v1/installments
Content-Type: application/json

{
  "student_id": 4,
  "total_amount": 3000.00,
  "total_installments": 6,
  "frequency": "Monthly",
  "start_date": "2025-01-05T00:00:00.000Z",
  "note": "验收测试-分期计划"
}

# 预期响应（HTTP 201）：
{
  "success": true,
  "data": {
    "plan": {
      "uid": 1,
      "student_id": 4,
      "total_amount": 3000.00,
      "total_installments": 6,
      "frequency": "Monthly",
      "start_date": "2025-01-05T00:00:00.000Z",
      "status": "Active",
      "note": "验收测试-分期计划",
      "created_at": "2025-01-05T13:30:00.000Z"
    },
    "installments": [
      {
        "uid": 1,
        "plan_id": 1,
        "installment_amount": 500.00,
        "current_installment": 1,
        "total_installments": 6,
        "due_date": "2025-01-05T00:00:00.000Z",
        "status": "Pending",
        "paid_amount": 0,
        "paid_at": null,
        "student_id": 4,
        "is_overdue": false
      },
      {
        "uid": 2,
        "current_installment": 2,
        "due_date": "2025-02-05T00:00:00.000Z",
        ...
      },
      // ... 共 6 期
    ]
  }
}
```

#### 4.2 查看分期计划详情

**操作步骤**：
1. 点击分期计划行的"详情"按钮

**期望结果**：
- ✅ 显示分期计划主信息
- ✅ 显示所有分期期数列表
- ✅ 每期状态清晰标识（待支付/已支付/逾期/已取消）
- ✅ 已支付金额、待支付金额、剩余金额统计

**HTTP 请求**：
```http
GET /api/v1/installments/1

# 预期响应（HTTP 200）：
{
  "success": true,
  "data": {
    "plan": { ... },
    "installments": [ ... ]
  }
}
```

#### 4.3 支付分期

**操作步骤**：
1. 在分期期数列表中，点击第 1 期的"支付"按钮
2. 确认支付金额: `500.00`
3. 点击"确认支付"

**期望结果**：
- ✅ 显示成功提示："分期付款已完成"
- ✅ 第 1 期状态更新为 `Paid`（已支付）
- ✅ 支付时间 `paid_at` 记录当前时间
- ✅ 自动创建交易记录（收入 500 元）
- ✅ 财务统计更新

**HTTP 请求**：
```http
PUT /api/v1/installments/1/payment
Content-Type: application/json

{
  "status": "Paid",
  "amount": 500.00
}

# 预期响应（HTTP 200）：
{
  "success": true,
  "data": {
    "uid": 1,
    "status": "Paid",
    "paid_amount": 500.00,
    "paid_at": "2025-01-05T14:00:00.000Z",
    "remaining_amount": 0,
    ...
  }
}
```

#### 4.4 逾期检测

**操作步骤**：
1. 修改系统时间到 2 个月后（或等待实际时间）
2. 刷新分期列表页面
3. 查看"逾期分期"列表

**期望结果**：
- ✅ 未支付且到期日已过的分期标记为 `Overdue`（逾期）
- ✅ 显示逾期天数
- ✅ 逾期分期高亮显示（红色）

**HTTP 请求**：
```http
GET /api/v1/installments/overdue

# 预期响应（HTTP 200）：
{
  "success": true,
  "data": [
    {
      "uid": 2,
      "current_installment": 2,
      "status": "Overdue",
      "due_date": "2025-02-05T00:00:00.000Z",
      "is_overdue": true,
      "days_overdue": 30,
      ...
    }
  ]
}
```

#### 4.5 取消分期计划

**操作步骤**：
1. 点击分期计划的"取消"按钮
2. 确认取消

**期望结果**：
- ✅ 显示成功提示："分期计划已取消"
- ✅ 计划状态更新为 `Cancelled`
- ✅ 所有未支付的期数状态更新为 `Cancelled`
- ✅ 已支付的期数保持 `Paid` 状态

**HTTP 请求**：
```http
DELETE /api/v1/installments/1

# 预期响应（HTTP 200）：
{
  "success": true,
  "message": "分期计划已取消"
}
```

---

### 5. 会员管理

**前置条件**：
- 已创建测试学员（UID: 5，姓名: `测试学员005`）

#### 5.1 设置会员（按类型）

**操作步骤**：
1. 进入学员详情页
2. 切换到"会员管理"标签
3. 选择会员类型：`月卡`（30 天）
4. 勾选"从今天开始"
5. 点击"开通会员"

**期望结果**：
- ✅ 显示成功提示："会员已开通"
- ✅ 会员开始日期: 今天
- ✅ 会员结束日期: 今天 + 30 天
- ✅ 会员状态: `Active`（激活）
- ✅ 剩余天数: `30`

**HTTP 请求**：
```http
POST /api/v1/membership/students/5/membership/type
Content-Type: application/json

{
  "membershipType": "month",
  "startFromToday": true
}

# 预期响应（HTTP 200）：
{
  "success": true,
  "data": {
    "uid": 5,
    "name": "测试学员005",
    "membership_start_date": "2025-01-05T00:00:00.000Z",
    "membership_end_date": "2025-02-04T23:59:59.999Z",
    "is_membership_active": true,
    "membership_days_remaining": 30,
    "membership_status": "Active",
    ...
  }
}
```

**会员类型测试**：
- `month`: 30 天
- `year`: 365 天

#### 5.2 自定义会员日期

**操作步骤**：
1. 选择"自定义日期"模式
2. 设置开始日期: `2025-01-01`
3. 设置结束日期: `2025-12-31`
4. 点击"保存"

**期望结果**：
- ✅ 会员日期按自定义设置
- ✅ 会员状态根据当前日期自动判断

**HTTP 请求**：
```http
POST /api/v1/membership/students/5/membership
Content-Type: application/json

{
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-12-31T23:59:59.999Z"
}
```

#### 5.3 续费会员

**操作步骤**：
1. 点击"续费"按钮
2. 选择续费类型：`月卡`
3. 勾选"从当前到期日延长"
4. 点击"确认续费"

**期望结果**：
- ✅ 会员结束日期延长 30 天（从原到期日开始计算）
- ✅ 会员状态保持 `Active`

**HTTP 请求**：
```http
POST /api/v1/membership/students/5/membership/renew
Content-Type: application/json

{
  "membershipType": "month",
  "extendFromCurrent": true
}

# 预期响应（HTTP 200）：
{
  "success": true,
  "data": {
    "uid": 5,
    "membership_end_date": "2026-01-04T23:59:59.999Z",  // 延长 30 天
    ...
  }
}
```

#### 5.4 清除会员

**操作步骤**：
1. 点击"清除会员"按钮
2. 确认清除

**期望结果**：
- ✅ 会员开始日期和结束日期清空（设为 null）
- ✅ 会员状态更新为 `None`

**HTTP 请求**：
```http
DELETE /api/v1/membership/students/5/membership

# 预期响应（HTTP 200）：
{
  "success": true,
  "data": {
    "uid": 5,
    "membership_start_date": null,
    "membership_end_date": null,
    "is_membership_active": false,
    "membership_status": "None",
    ...
  }
}
```

#### 5.5 批量设置会员

**操作步骤**：
1. 在学员列表勾选多个学员（测试学员 6-10）
2. 点击"批量设置会员"按钮
3. 选择会员类型：`年卡`
4. 点击"确认"

**期望结果**：
- ✅ 所有选中学员会员开通成功
- ✅ 显示成功和失败统计
- ✅ 失败的学员显示错误原因

**HTTP 请求**：
```http
POST /api/v1/membership/batch
Content-Type: application/json

{
  "studentIds": [6, 7, 8, 9, 10],
  "membershipType": "year",
  "startFromToday": true
}

# 预期响应（HTTP 200）：
{
  "success": true,
  "data": {
    "updated": [
      { "uid": 6, "name": "测试学员006", ... },
      { "uid": 7, "name": "测试学员007", ... },
      ...
    ],
    "failed": [
      {
        "id": 8,
        "error": "学员不存在"
      }
    ]
  }
}
```

---

### 6. 仪表盘统计

#### 6.1 全局统计

**操作步骤**：
1. 导航到"仪表盘"页面
2. 页面自动加载统计数据

**期望结果**：
- ✅ 显示核心指标卡片：
  - 学员总数
  - 总收入（元，保留两位小数）
  - 总支出（元，保留两位小数）
  - 净收入（元，保留两位小数）
  - 平均成绩（保留一位小数）
  - 最高成绩
  - 活跃课程数
  - 活跃会员数
  - 活跃分期计划数
  - 逾期分期数

**HTTP 请求**：
```http
GET /api/v1/dashboard/stats

# 预期响应（HTTP 200）：
{
  "success": true,
  "data": {
    "total_students": 10,
    "total_revenue": 3500.00,
    "total_expense": 200.00,
    "net_income": 3300.00,
    "average_score": 9.6,
    "max_score": 10.0,
    "active_courses": 3,
    "active_members": 5,
    "active_installments": 2,
    "overdue_installments": 1
  }
}
```

#### 6.2 财务统计

**操作步骤**：
1. 在仪表盘切换到"财务统计"标签
2. 选择统计周期：`本月`
3. 点击"查询"

**期望结果**：
- ✅ 显示本月财务数据：
  - 统计周期（起止日期）
  - 总收入、总支出、净收入
  - 是否盈利
  - 分期总额、已支付、待支付、剩余金额
  - 交易数量
  - 学员收入排行榜（Top 10）

**HTTP 请求**：
```http
GET /api/v1/dashboard/financial-stats?period=ThisMonth

# 预期响应（HTTP 200）：
{
  "success": true,
  "data": {
    "period": "ThisMonth",
    "date_from": "2025-01-01T00:00:00.000Z",
    "date_to": "2025-01-31T23:59:59.999Z",
    "total_income": 3500.00,
    "total_expense": 200.00,
    "net_income": 3300.00,
    "net_profit": 3300.00,
    "is_profitable": true,
    "installment_total": 3000.00,
    "installment_paid": 500.00,
    "installment_pending": 2500.00,
    "installment_remaining": 2500.00,
    "transaction_count": 2,
    "student_income": [
      {
        "student_id": 3,
        "student_name": "测试学员003",
        "amount": 500.00
      },
      {
        "student_id": 4,
        "student_name": "测试学员004",
        "amount": 500.00
      }
    ]
  }
}
```

**统计周期测试**：
- `Today`: 今天
- `ThisWeek`: 本周
- `ThisMonth`: 本月
- `ThisYear`: 本年

#### 6.3 会员到期提醒

**操作步骤**：
1. 在仪表盘切换到"会员提醒"标签
2. 设置提醒天数: `30`（30 天内到期）
3. 点击"查询"

**期望结果**：
- ✅ 显示即将到期的会员列表
- ✅ 每个学员显示：姓名、会员结束日期、剩余天数
- ✅ 按剩余天数升序排列

**HTTP 请求**：
```http
GET /api/v1/dashboard/membership-expiring?days=30

# 预期响应（HTTP 200）：
{
  "success": true,
  "data": [
    {
      "uid": 5,
      "name": "测试学员005",
      "membership_end_date": "2025-02-04T23:59:59.999Z",
      "membership_days_remaining": 10,
      ...
    }
  ]
}
```

#### 6.4 学员个人统计

**操作步骤**：
1. 进入学员详情页
2. 切换到"统计"标签

**期望结果**：
- ✅ 显示学员个人数据：
  - 支付总额、支付次数
  - 平均成绩、最高成绩、最低成绩、成绩次数
  - 会员状态、剩余天数
  - 分期统计（总额、已支付、待支付、剩余金额、待支付期数）

**HTTP 请求**：
```http
GET /api/v1/dashboard/students/3/stats

# 预期响应（HTTP 200）：
{
  "success": true,
  "data": {
    "total_payments": 500.00,
    "payment_count": 1,
    "average_score": 9.7,
    "max_score": 10.0,
    "min_score": 9.3,
    "score_count": 5,
    "membership_status": "None",
    "membership_status_code": "None",
    "membership_is_active": false,
    "membership_days_remaining": null,
    "installment_stats": {
      "total_amount": 0,
      "paid_amount": 0,
      "pending_amount": 0,
      "pending_count": 0,
      "remaining_amount": 0
    }
  }
}
```

---

### 7. 适配器接口

**说明**：适配器接口 (`/api/v1/adapter`) 提供数据库桥接功能，支持 MongoDB 数据访问。如果前端暂未集成，可使用 curl 命令测试。

#### 7.1 适配器信息

**curl 命令**：
```bash
curl http://localhost:3001/api/v1/adapter/info
```

**预期响应（HTTP 200）**：
```json
{
  "success": true,
  "data": {
    "adapter_version": "1.0.0",
    "supported_databases": ["mongodb"],
    "features": {
      "mongodb": "Full support with Mongoose models"
    },
    "endpoints": {
      "students": {
        "get": "GET /adapter/students",
        "post": "POST /adapter/students"
      },
      "transactions": {
        "get": "GET /adapter/transactions"
      },
      "stats": {
        "get": "GET /adapter/financial-stats"
      },
      "health": {
        "get": "GET /adapter/health"
      }
    }
  }
}
```

#### 7.2 获取学生列表（适配器）

**curl 命令**：
```bash
curl http://localhost:3001/api/v1/adapter/students
```

**预期响应**：
- 与 `/api/v1/students` 响应格式一致
- 验证数据源来自 MongoDB

#### 7.3 添加学生（适配器）

**curl 命令**：
```bash
curl -X POST http://localhost:3001/api/v1/adapter/students \
  -H "Content-Type: application/json" \
  -d '{
    "name": "适配器测试学员",
    "age": 15,
    "phone": "13900139000",
    "class": "Year",
    "subject": "Archery"
  }'
```

**预期响应（HTTP 201）**：
```json
{
  "success": true,
  "data": {
    "uid": 11,
    "name": "适配器测试学员",
    ...
  }
}
```

#### 7.4 获取交易记录（适配器）

**curl 命令**：
```bash
curl http://localhost:3001/api/v1/adapter/transactions
```

#### 7.5 获取财务统计（适配器）

**curl 命令**：
```bash
curl http://localhost:3001/api/v1/adapter/financial-stats
```

#### 7.6 数据库健康检查（适配器）

**curl 命令**：
```bash
curl http://localhost:3001/api/v1/adapter/health
```

**预期响应（HTTP 200）**：
```json
{
  "success": true,
  "data": {
    "database_type": "mongodb",
    "connection_status": "healthy",
    "details": {
      "state": "connected",
      "host": "localhost",
      "port": 27017,
      "name": "qmx"
    }
  }
}
```

---

### 8. 错误处理

#### 8.1 参数校验失败（HTTP 400）

**测试场景**：创建学员时姓名为空

**curl 命令**：
```bash
curl -X POST http://localhost:3001/api/v1/students \
  -H "Content-Type: application/json" \
  -d '{
    "name": "",
    "class": "Year",
    "subject": "Shooting"
  }'
```

**预期响应（HTTP 400）**：
```json
{
  "success": false,
  "error": {
    "type": "InvalidInput",
    "message": "姓名不能为空",
    "details": {
      "field": "name"
    }
  }
}
```

**前端处理**：
- ✅ 显示错误提示："姓名不能为空"
- ✅ 高亮错误字段
- ✅ 不关闭表单对话框，允许修改后重试

#### 8.2 资源不存在（HTTP 404）

**测试场景**：查询不存在的学员

**curl 命令**：
```bash
curl http://localhost:3001/api/v1/students/99999
```

**预期响应（HTTP 404）**：
```json
{
  "success": false,
  "error": {
    "type": "NotFound",
    "message": "学员不存在",
    "code": "STUDENT_NOT_FOUND"
  }
}
```

**前端处理**：
- ✅ 显示错误提示："学员不存在"
- ✅ 自动返回列表页或显示 404 页面

#### 8.3 状态冲突（HTTP 409）

**测试场景**：删除已有交易记录的学员（如果后端限制）

**curl 命令**：
```bash
curl -X DELETE http://localhost:3001/api/v1/students/3
```

**预期响应（HTTP 409）**：
```json
{
  "success": false,
  "error": {
    "type": "State",
    "message": "该学员存在关联交易记录，无法删除",
    "details": {
      "transaction_count": 2
    }
  }
}
```

**前端处理**：
- ✅ 显示错误提示："该学员存在关联交易记录，无法删除"
- ✅ 提示用户先删除关联数据或提供"强制删除"选项

#### 8.4 速率限制（HTTP 429）

**测试场景**：短时间内发送大量请求

**curl 命令**：
```bash
# 循环发送 150 次请求（超过限制的 100 次）
for i in {1..150}; do
  curl http://localhost:3001/api/v1/students
done
```

**预期响应（HTTP 429，第 101 次请求开始）**：
```json
{
  "success": false,
  "error": {
    "type": "RateLimit",
    "message": "请求过于频繁，请在 60 秒后重试",
    "details": {
      "retryAfterSeconds": 60
    }
  }
}
```

**响应头**：
```
Retry-After: 60
```

**前端处理**：
- ✅ 显示错误提示："请求过于频繁，请稍后重试"
- ✅ 禁用操作按钮 60 秒
- ✅ 显示倒计时

#### 8.5 服务器错误（HTTP 500）

**测试场景**：数据库连接断开时执行操作

**步骤**：
1. 停止 MongoDB 服务
2. 尝试创建学员

**预期响应（HTTP 500）**：
```json
{
  "success": false,
  "error": {
    "type": "Other",
    "message": "服务器内部错误，请稍后重试"
  },
  "debug": {
    "stack": "...",
    "cause": "..."
  }
}
```

**前端处理**：
- ✅ 显示通用错误提示："服务器错误，请稍后重试"
- ✅ 记录错误日志（控制台）
- ✅ 提供"重试"按钮

#### 8.6 JSON 解析失败（HTTP 400）

**测试场景**：发送非法 JSON

**curl 命令**：
```bash
curl -X POST http://localhost:3001/api/v1/students \
  -H "Content-Type: application/json" \
  -d '{invalid json'
```

**预期响应（HTTP 400）**：
```json
{
  "success": false,
  "error": {
    "type": "InvalidInput",
    "message": "请求体解析失败，请检查数据格式"
  }
}
```

---

## 常见问题排查

### 1. 前端无法连接后端

**症状**：
- 前端显示"网络错误"或"连接失败"
- 浏览器控制台显示 `net::ERR_CONNECTION_REFUSED`

**排查步骤**：
1. 确认后端已启动：`curl http://localhost:3001/health`
2. 确认端口无冲突：`lsof -i :3001`（macOS/Linux）或 `netstat -ano | findstr :3001`（Windows）
3. 检查 Vite 代理配置：`vite.config.ts` 中的 `proxy.'/api'.target` 应为 `http://localhost:3001`
4. 检查防火墙设置

### 2. 数据库连接失败

**症状**：
- 后端启动时报错：`MongoDB连接失败`
- 健康检查接口返回 500 错误

**排查步骤**：
1. 检查 MongoDB 是否启动：
   ```bash
   # macOS/Linux
   sudo systemctl status mongod
   
   # 或使用 mongosh 连接
   mongosh mongodb://localhost:27017/qmx
   ```
2. 检查 `.env` 文件中的 `MONGODB_URI` 配置
3. 验证连接字符串格式：
   - 本地: `mongodb://localhost:27017/qmx`
   - Atlas: `mongodb+srv://username:password@cluster.mongodb.net/qmx`
4. 检查网络连接（Atlas 用户）

### 3. CORS 错误

**症状**：
- 浏览器控制台显示：`Access-Control-Allow-Origin` 错误

**排查步骤**：
1. 检查后端 `.env` 文件中的 `CORS_ORIGIN` 设置：
   ```env
   CORS_ORIGIN=http://localhost:1420
   ```
2. 确认前端访问地址与 `CORS_ORIGIN` 一致
3. 检查后端 `app.ts` 中的 CORS 中间件配置

### 4. 金额显示错误

**症状**：
- 前端显示金额不正确（如 50000 而非 500）

**原因**：
- 后端存储单位为"分"，前端显示单位为"元"

**解决方案**：
- 后端 API 已自动转换，前端无需二次转换
- 如果仍有问题，检查前端是否误用了 `cash` 字段（应使用 `amount` 字段）

### 5. 日期时区问题

**症状**：
- 日期显示与实际相差 8 小时（中国时区）

**原因**：
- 后端存储 UTC 时间，前端需转换为本地时区

**解决方案**：
```javascript
// 前端显示日期时转换
const localDate = new Date(student.membership_start_date);
const displayDate = localDate.toLocaleDateString('zh-CN');

// 提交日期时转 ISO 格式
const isoDate = new Date('2025-01-05').toISOString();
```

### 6. 分页数据加载失败

**症状**：
- 列表显示"加载中"，但数据不显示

**排查步骤**：
1. 检查 API 响应结构：
   ```javascript
   {
     success: true,
     data: [ ... ],         // 注意：data 是数组
     pagination: { ... }
   }
   ```
2. 前端解析：
   ```javascript
   const students = response.data.data;  // 注意双层 data
   const pagination = response.data.pagination;
   ```
3. 检查 ApiService 是否正确处理响应

### 7. 成绩范围验证失败

**症状**：
- 添加成绩时提示"成绩必须在 0-10 之间"，但输入值在范围内

**原因**：
- TypeScript 版成绩范围为 0-10（满分10环），Rust 版为 0-1000

**解决方案**：
- 确认前端输入框限制为 0-10
- 检查前端是否误用了旧版成绩范围

---

## TODO 清单

### 🟡 中优先级

#### 1. 认证授权
- [ ] 实现用户登录/注册接口
- [ ] 集成 JWT 认证中间件
- [ ] 前端添加登录页面和 Token 管理
- [ ] 实现角色权限控制（管理员/普通用户）

#### 2. 批量操作优化
- [ ] 实现学员批量更新接口 `POST /api/v1/students/batch-update`
- [ ] 实现交易记录批量导入
- [ ] 实现成绩批量导入（CSV）

#### 3. 数据导出功能
- [ ] 学员列表导出为 CSV/Excel
- [ ] 交易记录导出
- [ ] 财务报表导出

#### 4. 高级搜索优化
- [ ] 实现全文搜索（姓名、备注）
- [ ] 实现复合条件搜索保存
- [ ] 实现搜索历史记录

### 🟢 低优先级

#### 5. 性能优化
- [ ] 实现 API 响应缓存（Redis）
- [ ] 数据库查询优化（索引）
- [ ] 分页加载优化（虚拟滚动）

#### 6. 监控和日志
- [ ] 集成 APM 监控（如 New Relic）
- [ ] 实现详细的操作审计日志
- [ ] 错误追踪和报警（如 Sentry）

#### 7. 测试覆盖
- [ ] 编写前端单元测试（Vitest）
- [ ] 编写前端 E2E 测试（Playwright/Cypress）
- [ ] 实现 CI/CD 自动化测试流程

#### 8. 文档完善
- [ ] 生成 API 文档（Swagger/OpenAPI）
- [ ] 编写用户手册
- [ ] 编写部署指南

### 🔵 长期规划

#### 9. 功能扩展
- [ ] 学员考勤管理
- [ ] 课程排课功能
- [ ] 教练管理模块
- [ ] 消息通知系统（短信/邮件）

#### 10. 多语言支持
- [ ] 国际化（i18n）配置
- [ ] 中文/英文切换

---

## 验收完成标志

当以上所有验收流程均通过时，可认为前后端联调成功。验收报告应包含：

1. **通过的测试场景数量**
2. **发现的问题及修复状态**
3. **性能指标**（响应时间、并发处理能力）
4. **已知限制和待改进项**

**联调验收负责人签名**: _____________  
**验收日期**: _____________

---

**文档维护**: 本文档应随功能迭代持续更新，确保验收流程与实际功能保持同步。
