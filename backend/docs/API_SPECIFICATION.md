# QMX Backend RESTful API 规范（v1）

> 目标：为后续“测试修复 / 行为对齐”提供**唯一、可执行**的 REST API 规范。
>
> 本文以当前后端代码（`backend/src/routes/*`、`backend/src/middleware/*`、`backend/src/controllers/*`）为依据整理；对“实现与测试/期望不一致”的地方，会在文末的 **实现检查清单** 中明确列出。

## API 规范总览

- **Base URL**：`/api/v1`
- **Content-Type**：`application/json; charset=utf-8`
- **版本策略**：URL 版本（`/api/v1`）。
- **ID 约定**：所有 `:id` 目前均为 **数字型 UID**（校验规则：正整数），例如 `1`、`12`。
- **命名约定**：
  - 查询参数、响应字段以 **snake_case** 为主。
  - 为兼容历史代码/前端，部分响应会同时提供 **camelCase** 影子字段（例如 `student_id` 与 `studentId`）。
- **时间/时区**：
  - 日期时间：ISO 8601（UTC），例如 `2025-01-01T00:00:00.000Z`。
  - “日期（无时间）”：`YYYY-MM-DD`（UTC 语义）用于会员起止日期等。
- **金额单位**：
  - **数据库存储**：分（cents，整数）。
  - **API 对外**：元（yuan，最多两位小数，`0` 不允许）。
  - 兼容字段：交易/分期等部分响应会额外返回 `*InCents`（分）字段。

## 通用请求/响应结构

### 成功响应（统一格式）

```json
{
  "success": true,
  "data": {},
  "message": "可选的人类可读信息",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 123,
    "total_pages": 7
  }
}
```

- `data`：对象或数组（端点说明中会明确）。
- `message`：可选。
- `pagination`：仅在列表接口出现。

### 分页规范

统一使用：
- `page`：从 1 开始，默认 1
- `limit`：默认 20，最大 100
- `total`：总条数
- `total_pages`：总页数

> 兼容提醒：当前实现中，部分端点在“非过滤”路径下仍可能返回 `totalPages` / `hasNext` / `hasPrev` 等字段（见 **实现检查清单**）。规范建议逐步收敛到 `total_pages`。

## 错误响应规范

后端统一错误处理中间件：`backend/src/middleware/errorHandler.ts`。

### 标准错误响应

```json
{
  "success": false,
  "error": {
    "type": "InvalidInput",
    "message": "查询参数验证失败: ID 必须是数字",
    "code": "可选",
    "details": {
      "field": "id"
    }
  }
}
```

- `type`：错误分类（枚举见 `backend/src/utils/errors.ts`）。
- `message`：面向用户/调用方的信息。
- `details`：可选，通常用于校验错误细节或业务冲突信息。
- `debug`：仅在 `NODE_ENV=development` 且异常为 `Error` 时附带（包含 stack）。

### 错误类型与 HTTP 状态码映射

| ErrorType | HTTP | 场景 |
|---|---:|---|
| `InvalidInput` | 400 | body/query/params 校验失败、类型转换失败、金额/日期格式不正确 |
| `Unauthorized` | 401 | JWT 无效或过期（当前 v1 路由多为公开，预留） |
| `Forbidden` | 403 | 权限不足（预留） |
| `NotFound` | 404 | 资源不存在（学员/交易/分期等） |
| `State` | 409 | 业务状态冲突（例如重复键、状态不允许） |
| `RateLimit` | 429 | 触发限流（响应会带 `Retry-After`） |
| `Other` | 500 | 未分类/内部错误 |

### 校验错误的表现

- 路径参数校验失败：前缀通常为 `路径参数验证失败: ...`
- 查询参数校验失败：前缀通常为 `查询参数验证失败: ...`
- body 校验失败：前缀通常为 `验证失败: ...`

## 查询参数规范

### 通用分页
- `page`：`integer >= 1`
- `limit`：`integer >= 1 && <= 100`

### 通用排序
当前 API 以“字段 + 顺序”两参数为主：
- `sort_by`：端点允许字段集合见各端点说明
- `sort_order`：`ASC | DESC`

### 过滤/搜索
- 统一使用 snake_case（例如 `name_contains`、`min_amount`、`date_from`）。
- 为兼容部分旧调用，某些端点会同时接受 camelCase 变体（例如 `studentId` 与 `student_id`）。

## 金额与日期处理规范

### 金额
- API 请求中的金额字段（如 `amount`, `total_amount`）以**元**传入：
  - 小数位：最多 2 位
  - 不允许 `0`
  - 交易支持正负：
    - `amount > 0`：收入
    - `amount < 0`：支出
- 存储时转换为分（整数），例如：
  - `500` 元 → `50000` 分
  - `-150.50` 元 → `-15050` 分

### 日期
- 入参：优先使用 ISO 8601（UTC）字符串。
- 出参：
  - 日期时间字段：ISO 8601
  - 会员起止日期：`YYYY-MM-DD`（仅日期）

---

## API 端点规范（v1）

> 下列端点按**当前路由注册**整理：`backend/src/routes/index.ts`。

### 0. API 版本信息

#### GET `/api/v1`
返回 API 元信息与主要模块入口。

**200 响应示例**
```json
{
  "name": "QMX Backend API",
  "version": "1.0.0",
  "description": "启明星学生管理系统后端API",
  "endpoints": {
    "students": "/students",
    "scores": "/scores",
    "transactions": "/transactions",
    "installments": "/installments",
    "membership": "/membership",
    "dashboard": "/dashboard",
    "adapter": "/adapter",
    "health": "/health"
  },
  "documentation": "/docs"
}
```

---

## 1) 学生管理（Students）

路由文件：`backend/src/routes/studentRoutes.ts`

### GET `/api/v1/students`
获取学员列表（分页 + 过滤）。

**查询参数（支持）**
- `page`, `limit`
- `name_contains`：姓名模糊搜索
- `min_age`, `max_age`
- `min_score`, `max_score`：按“平均分”范围过滤（1 位小数）
- `class_type`：`TenTry | Month | Year | Others`
- `subject`：`Shooting | Archery | Others`
- `has_membership`：`boolean`
- `membership_active_at`：ISO 日期时间（筛选该时间点处于有效期的会员）
- `sort_by`：`uid | name | age | created_at | updated_at`
- `sort_order`：`ASC | DESC`

**200 响应（分页列表）**
```json
{
  "success": true,
  "data": [
    {
      "uid": 1,
      "name": "Alice",
      "phone": "13800138000",
      "class": "Month",
      "subject": "Shooting",
      "rings": [8.5, 9.0],
      "lessonLeft": 10,
      "lesson_left": 10,
      "membershipStartDate": "2025-01-01",
      "membership_start_date": "2025-01-01",
      "membershipEndDate": "2025-02-01",
      "membership_end_date": "2025-02-01",
      "membershipStatus": "Active",
      "membership_status": "Active",
      "isMembershipActive": true,
      "is_membership_active": true,
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

### GET `/api/v1/students/search`
高级搜索学员。

- 当前实现：与 `GET /students` 使用相同的查询参数 schema，并最终走 `studentController.searchStudents`。
- 规范建议：长期可把 `/search` 视作别名或迁移路径。

### POST `/api/v1/students`
创建学员。

**请求体**
- `name`（必填）
- `age`（可选）
- `class`（可选，默认 `Others`）
- `subject`（可选，默认 `Others`）
- `phone`（可选；手机号格式为 `^1[3-9]\d{9}$`，允许空字符串；默认值可能为“未填写”）
- `note`（可选，最长 1000）
- `lesson_left` / `lessonLeft`（可选）
- `membership_start_date` / `membershipStartDate`（可选，ISO）
- `membership_end_date` / `membershipEndDate`（可选，ISO）
- `rings`（可选，成绩数组，0-10，1 位小数）

**201 响应**：`data` 为 `PresentedStudent`。

### GET `/api/v1/students/:id`
获取学员详情。

- **404**：学员不存在
- **400**：`id` 非正整数

### PUT `/api/v1/students/:id`
更新学员。

- 允许部分字段更新；字段名同创建接口。

### DELETE `/api/v1/students/:id`
删除学员。

- **200**：成功时通常只返回 `success` + `message`

---

## 2) 成绩管理（Scores）

路由文件：`backend/src/routes/scoreRoutes.ts`

### 重要说明：路由挂载差异

- **规范/README 期望路径**：`/api/v1/students/:id/scores...`
- **当前路由注册（代码）**：`scoreRoutes` 在 `backend/src/routes/index.ts` 中被挂载为 `router.use('/', scoreRoutes)`，其内部路径为 `/:id/scores...`。

因此，**当前可匹配的路径是**：
- `POST /api/v1/:id/scores`
- `GET /api/v1/:id/scores`
- `PUT /api/v1/:id/scores/:scoreIndex`
- `DELETE /api/v1/:id/scores/:scoreIndex`
- `POST /api/v1/:id/scores/batch`
- `DELETE /api/v1/:id/scores`（清空）

> 后续建议：将 scoreRoutes 挂载到 `/students`，使其与 README/测试/REST 语义一致。

### POST `/api/v1/:id/scores`
为学员添加单个成绩。

**请求体**
```json
{ "score": 8.5 }
```

**201 响应要点**
- `data.scores`：更新后的成绩数组
- `data.average_score`：平均分（后端计算）

### GET `/api/v1/:id/scores`
获取学员成绩列表。

### PUT `/api/v1/:id/scores/:scoreIndex`
更新指定索引成绩。

**请求体**
```json
{ "newScore": 9.0 }
```

### DELETE `/api/v1/:id/scores/:scoreIndex`
删除指定索引成绩。

### POST `/api/v1/:id/scores/batch`
批量添加成绩（最多 50 个）。

### DELETE `/api/v1/:id/scores`
清空全部成绩。

---

## 3) 交易（Transactions）

路由文件：`backend/src/routes/cashRoutes.ts`

### GET `/api/v1/transactions`
获取交易列表（分页 + 过滤）。

**查询参数（支持）**
- `student_id`（可空）
- `min_amount`, `max_amount`（元）
- `has_installment`（boolean）
- `date_from`, `date_to`（ISO）
- `page`, `limit`
- `sort_by`：`uid | student_id | cash | created_at | updated_at`
- `sort_order`：`ASC | DESC`

**200 响应（列表）**
- `data[*].cash` / `amount_in_cents` / `amountInCents`：分
- `data[*].amount`：元
- `data[*].student_id` 与 `studentId` 同时存在
- `data[*].is_income` 与 `isIncome` 同时存在

### GET `/api/v1/transactions/search`
搜索交易记录。

- 当前实现与 `GET /transactions` 共享查询 schema/搜索逻辑。
- 规范建议：可作为别名保留。

### GET `/api/v1/transactions/:id`
获取交易详情（包含可选 `student` 信息）。

### POST `/api/v1/transactions`
创建一条现金交易。

**请求体（示例：收入）**
```json
{ "student_id": 1, "amount": 500, "note": "Tuition" }
```

**请求体（示例：支出）**
```json
{ "amount": -150.5, "note": "Rent" }
```

**校验规则要点**
- `amount`：必须为数字，最多 2 位小数，且不能为 0

### POST `/api/v1/transactions/installment`
创建“分期付款交易”。

- 该端点会创建：分期计划（Plan）+ 分期明细（Installments）+ 首期支付对应的现金交易（Transaction）。
- 请求体字段详见路由校验（`cashRoutes.ts` 的 `addInstallmentTransactionSchema`）。

### DELETE `/api/v1/transactions/:id`
删除交易。

---

## 4) 分期（Installments）

路由文件：`backend/src/routes/installmentRoutes.ts`

### GET `/api/v1/installments`
获取分期计划列表（分页 + 过滤）。

**查询参数（支持）**
- `page`, `limit`
- `student_id`
- `status`：`Active | Completed | Cancelled`
- `sort_by`：`created_at | start_date | total_amount | status`
- `sort_order`：`ASC | DESC`

### GET `/api/v1/installments/overdue`
获取逾期分期统计/列表。

> 当前实现返回结构为 `{ success: true, data: { overdue_installments: [...], total_overdue_count, ... } }`（不是简单数组）。

### GET `/api/v1/installments/:id`
获取单个分期计划详情（包含 installments 明细）。

### POST `/api/v1/installments`
创建分期计划。

**请求体（示例）**
```json
{
  "student_id": 1,
  "total_amount": 1200,
  "total_installments": 4,
  "frequency": "Monthly",
  "start_date": "2025-01-01T00:00:00.000Z",
  "note": "Annual course"
}
```

### PUT `/api/v1/installments/:id/payment`
更新“某一期分期（Installment）”的支付状态。

**请求体**
```json
{ "status": "Paid", "amount": 300 }
```

- `status`：`Pending | Paid | Overdue | Cancelled`
- `amount`（可选）：本次支付金额（元）。

### DELETE `/api/v1/installments/:id`
删除分期计划（会连带删除该计划下 installments）。

### 与目标规范的差异（待对齐）
用户目标中提到：
- `PUT /installments/:id`（更新计划）
- `POST /installments/:id/payments`（记录支付）

当前实现对应为：
- **无** `PUT /installments/:id`
- 支付更新使用 `PUT /installments/:id/payment`

---

## 5) 仪表板 / 统计（Dashboard / Stats）

路由文件：`backend/src/routes/statsRoutes.ts`

该模块存在两套路由入口：
- **主入口**：`/api/v1/dashboard/*`
- **别名**：`/api/v1/stats/*`

### GET `/api/v1/dashboard/stats`
获取全局仪表盘统计。

**响应字段（snake_case）**
- `total_students`
- `total_revenue`（元）
- `total_expense`（元）
- `net_income`（元）
- `average_score`
- `max_score`
- `active_courses`
- `active_members`
- `active_installments`
- `overdue_installments`

### GET `/api/v1/stats/dashboard`（别名）
与 `/dashboard/stats` 返回相同数据。

### GET `/api/v1/dashboard/students/:id/stats`
获取指定学员统计。

### GET `/api/v1/stats/student/:id`（别名）
与 `/dashboard/students/:id/stats` 相同。

### GET `/api/v1/dashboard/financial-stats`
获取财务统计。

**查询参数**
- `period`：`Today | ThisWeek | ThisMonth | ThisYear`（默认 `ThisMonth`）

### GET `/api/v1/stats/financial`（别名）
与 `/dashboard/financial-stats` 相同。

### 其他 dashboard 扩展端点（当前实现存在）
- `GET /api/v1/dashboard/global-student-stats`
- `GET /api/v1/dashboard/global-financial-stats`
- `GET /api/v1/dashboard/membership-expiring?days=30`

---

## 6) 健康检查（Health）

- `GET /health`：应用级健康检查（不在 `/api/v1` 下，定义于 `backend/src/app.ts`）。
- `GET /api/v1/health/*`：v1 内的健康检查模块（`backend/src/routes/healthRoutes.ts`）。
- `GET /api/v1/health/db`：数据库健康检查（定义于 `backend/src/app.ts`，不通过 routes/index.ts）。

---

## 数据类型与格式定义（摘要）

### Student（PresentedStudent）
- 主字段：`uid`, `name`, `phone`, `class`, `subject`, `rings`, `note`
- 课时字段：`lessonLeft` + `lesson_left`
- 会员字段：`membershipStartDate`/`membershipEndDate`（`YYYY-MM-DD`）+ 对应 snake_case
- 时间戳：`created_at`, `updated_at`（ISO 8601）

### Transaction（ICash）
- `cash` / `amount_in_cents` / `amountInCents`：分（整数）
- `amount`：元（number，最多两位小数）
- `student_id` + `studentId`
- `is_income` + `isIncome`
- `is_expense` + `isExpense`
- `installment`：可选分期快照

### InstallmentPlan / Installment
- 计划（plan）：通常包含 `total_amount`（元）与 `totalAmountInCents`（分）等混合字段
- 明细（installment）：包含 `installment_amount`（元）与 `installmentAmountInCents`（分）等混合字段

---

## 实现检查清单（用于后续测试修复/代码对齐）

1. **Score 路由挂载**：将 `scoreRoutes` 从 `router.use('/', scoreRoutes)` 调整为 `router.use('/students', scoreRoutes)`，以符合 `/students/:id/scores` 规范路径。
2. **分页字段统一**：确保所有分页响应使用 `pagination.total_pages`（必要时保留 `totalPages` 兼容字段）。
3. **金额单位一致**：
   - 对外字段（如 `amount`, `total_amount`, `installment_amount`）应统一为“元”。
   - “分”字段应使用显式命名：`*InCents` 或 `*_in_cents`。
4. **Stats/Dashboard 字段命名**：确认 `/stats/*` 别名路由是否应返回 camelCase（测试期望）或 snake_case（当前实现）。规范建议保持 snake_case，并在迁移期提供 camelCase 影子字段。
5. **错误响应一致性**：所有错误必须通过 `errorHandler` 输出 `{ success:false, error:{type,message,...} }`，避免出现 `error: string` 的旧格式。
6. **查询参数兼容性**：
   - 规范以 snake_case 为主。
   - 对旧参数（camelCase）保留兼容入口时，必须在文档中列出。
7. **安装/支付端点对齐**：如需支持 `POST /installments/:id/payments` 或 `PUT /installments/:id`，应在 routes/controller 中新增并在本文追加定义。

---

## 参考文档

- `backend/README.md`（API 概览、错误响应格式、金额单位说明）
- `backend/docs/test-errors/02-api-endpoint-mismatches.md`
- `backend/docs/test-errors/08-response-format-inconsistencies.md`
- 路由实现：`backend/src/routes/*.ts`
- 错误处理：`backend/src/middleware/errorHandler.ts`、`backend/src/utils/errors.ts`
