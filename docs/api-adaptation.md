# QMX API 接口适配文档

**文档版本**: 1.0  
**创建日期**: 2024-11  
**目标**: 梳理 Rust 版 qmx_backend_lib 与当前 TypeScript 版后端接口差异，为前后端联调提供完整的适配指南

---

## 📋 概述

本文档详细对比了 QMX 系统 Rust 版（qmx_backend_lib，基于 Tauri Commands）和当前 TypeScript 版（backend/src/routes，基于 RESTful API）的接口差异，包括：

- **端点路径与 HTTP 方法差异**
- **请求体与响应体结构对比**
- **参数命名与格式转换规则**
- **错误处理与状态码策略**
- **认证授权现状说明**
- **金额、日期、ID 等特殊字段处理建议**

### 关键差异汇总

| 维度 | Rust 版本 | TypeScript 版本 | 适配要点 |
|------|-----------|----------------|---------|
| **API 模式** | Tauri Commands | RESTful API | 前端需改用 HTTP 调用 |
| **响应格式** | `Vec<T>` 或 `Result<T, String>` | `{ success, data?, error? }` | 统一解析 success 字段 |
| **错误结构** | `String` 错误消息 | `{ type, message, code?, details? }` | 解析 error 对象 |
| **金额单位** | 分（i64 整数） | 分（Number 整数） | 前端显示时转换为元 |
| **日期格式** | DateTime | ISO 8601 字符串 | 统一使用 ISO 格式 |
| **ID 类型** | u64 自增 | Number 自增 | 保持一致 |
| **字段命名** | snake_case | camelCase/snake_case 混合 | 后端支持双格式 |
| **认证方式** | 无 | JWT 配置但未实现登录 | 待补充登录端点 |

---

## 🎯 模块接口对照表

### 1. 学生管理模块 (Student Module)

#### 1.1 获取学生列表

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | `get_all_students()` | `GET /api/v1/students` |
| **参数** | 无 | Query: `page`, `limit`, `sort_by`, `sort_order`（可选筛选条件） |
| **响应结构** | `Vec<StudentResponse>` | `{ success: true, data: { data: IStudent[], pagination: {...} } }` |
| **分页支持** | ❌ 无 | ✅ 有（默认 page=1, limit=50） |
| **排序支持** | ❌ 无 | ✅ 支持（uid, name, age, created_at, updated_at） |
| **适配建议** | 前端需改用 `ApiService.get('/students', { params: { page, limit } })` | 解析 `response.data.data` 获取学生数组 |

**TypeScript 请求示例**：
```typescript
GET /api/v1/students?page=1&limit=20&sort_by=created_at&sort_order=DESC
```

**TypeScript 响应示例**：
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "uid": 1,
        "name": "张三",
        "age": 12,
        "phone": "13800138000",
        "class": "Year",
        "subject": "Shooting",
        "rings": [9.5, 9.8, 10.0],
        "note": "优秀学员",
        "lessonLeft": 10,
        "membershipStartDate": "2024-01-01T00:00:00.000Z",
        "membershipEndDate": "2024-12-31T23:59:59.999Z",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "total_pages": 5
    }
  }
}
```

#### 1.2 高级搜索学生

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | `search_students(...)` | `GET /api/v1/students/search` |
| **参数** | 多个命名参数 | Query: `name_contains`, `min_age`, `max_age`, `min_score`, `max_score`, `class_type`, `subject`, `has_membership`, `membership_active_at` |
| **响应结构** | `Vec<StudentResponse>` | `{ success: true, data: { data: IStudent[], pagination: {...} } }` |
| **适配建议** | 使用 query string 传递筛选条件 | 同获取列表 |

#### 1.3 获取单个学生详情

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | `get_student_by_id(uid)` | `GET /api/v1/students/:id` |
| **参数** | `uid: u64` | URL 参数 `:id` |
| **响应结构** | `StudentResponse` | `{ success: true, data: IStudent }` |
| **错误处理** | `Result<T, String>` | 404: `{ success: false, error: { type: "NotFound", message: "学员不存在" } }` |
| **适配建议** | 前端改用 `ApiService.get(\`/students/${id}\`)` | 解析 `response.data.data` |

#### 1.4 创建学生

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | `add_student(...)` | `POST /api/v1/students` |
| **请求体** | 多个命名参数 | JSON: `{ name, age?, phone?, class, subject, note?, lessonLeft?, membershipStartDate?, membershipEndDate?, rings? }` |
| **必填字段** | `name`, `class`, `subject` | `name`, `class`, `subject` |
| **默认值** | Rust Builder 提供 | `phone: "未填写"`, `note: ""`, `rings: []` |
| **响应结构** | `StudentResponse` | `{ success: true, data: IStudent }` |
| **验证规则** | validation.rs | Joi Schema（见下表） |
| **适配建议** | 前端发送 JSON 请求体 | 检查 success 字段判断成功 |

**字段验证对比**：

| 字段 | Rust 验证 | TypeScript 验证 | 差异 |
|------|-----------|----------------|------|
| `name` | 1-50 字符，无控制字符 | 1-50 字符 | 基本一致 |
| `age` | 3-120 | 0-120 | ⚠️ 年龄下限不同 |
| `phone` | 最长 20 字符 | 11 位数字或"未填写" | ⚠️ TS 更严格 |
| `note` | 最长 1000 字符 | 最长 1000 字符 | 一致 |
| `rings` | Vec<f64>, 0-1000 | Number[], 0-10, 1位小数 | ⚠️ 范围不同 |

**适配动作**：
- ✅ 前端统一年龄范围为 3-120
- ✅ 前端统一成绩范围为 0-10（满分10环）
- ✅ 电话号码优先验证 11 位格式

#### 1.5 更新学生信息

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | `update_student_info(uid, ...)` | `PUT /api/v1/students/:id` |
| **参数** | `uid` + 更新字段 | URL `:id` + JSON 请求体 |
| **部分更新** | ✅ 支持 | ✅ 支持（所有字段可选） |
| **响应结构** | `StudentResponse` | `{ success: true, data: IStudent }` |
| **适配建议** | 前端使用 `ApiService.put(\`/students/${id}\`, updateData)` | 只传需要更新的字段 |

#### 1.6 删除学生

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | `delete_student(uid)` | `DELETE /api/v1/students/:id` |
| **参数** | `uid: u64` | URL `:id` |
| **响应结构** | `Result<(), String>` | `{ success: true, message: "学员已删除" }` |
| **级联删除** | ❓ 未明确 | ✅ 相关交易、分期记录保留但标记 student_id |
| **适配建议** | 前端使用 `ApiService.delete(\`/students/${id}\`)` | 确认删除对话框 |

#### 1.7 批量更新学生（缺失）

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | `update_multiple_students(uids, updates)` | ❌ **未实现** |
| **适配动作** | 🟡 **中优先级**：TS 后端需实现 `POST /api/v1/students/batch-update` | 前端可暂时循环调用单个更新 |

---

### 2. 成绩管理模块 (Score Module)

#### 2.1 添加单个成绩

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | `add_score(uid, score)` | `POST /api/v1/students/:id/scores` |
| **请求体** | 参数：`uid`, `score` | JSON: `{ score: number }` |
| **验证** | 0-1000 | 0-10, 1位小数 |
| **响应结构** | `StudentResponse` | `{ success: true, data: IStudent }` |
| **适配建议** | 前端使用 `ApiService.post(\`/students/${id}/scores\`, { score })` | 注意成绩范围 0-10 |

#### 2.2 获取学生成绩列表

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | `get_student_scores(uid)` | `GET /api/v1/students/:id/scores` |
| **响应结构** | `Vec<f64>` | `{ success: true, data: { scores: number[], stats: {...} } }` |
| **额外信息** | ❌ 无 | ✅ 包含统计信息（average, max, min） |
| **适配建议** | 前端解析 `response.data.data.scores` | 可利用返回的统计信息 |

#### 2.3 更新指定索引的成绩

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | `update_student_score(uid, index, score)` | `PUT /api/v1/students/:id/scores/:scoreIndex` |
| **参数** | `uid`, `index`, `score` | URL `:id`, `:scoreIndex` + JSON: `{ newScore }` |
| **索引范围** | 0 起始 | 0 起始 |
| **响应结构** | `StudentResponse` | `{ success: true, data: IStudent }` |
| **适配建议** | 前端使用 `ApiService.put(\`/students/${id}/scores/${index}\`, { newScore })` | 索引越界返回 400 错误 |

#### 2.4 删除指定索引的成绩

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | `delete_student_score(uid, index)` | `DELETE /api/v1/students/:id/scores/:scoreIndex` |
| **参数** | `uid`, `index` | URL `:id`, `:scoreIndex` |
| **响应结构** | `StudentResponse` | `{ success: true, data: IStudent }` |
| **适配建议** | 前端使用 `ApiService.delete(\`/students/${id}/scores/${index}\`)` | 确认删除对话框 |

#### 2.5 批量添加成绩（新增）

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | ❌ 无 | `POST /api/v1/students/:id/scores/batch` |
| **请求体** | N/A | JSON: `{ scores: number[] }` （最多 50 个） |
| **响应结构** | N/A | `{ success: true, data: IStudent }` |
| **适配动作** | 🟢 **新功能**：前端可直接使用 | 提升批量导入效率 |

#### 2.6 清空所有成绩（新增）

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | ❌ 无 | `DELETE /api/v1/students/:id/scores` |
| **响应结构** | N/A | `{ success: true, data: IStudent }` |
| **适配动作** | 🟢 **新功能**：前端可添加"清空成绩"按钮 | 需二次确认 |

---

### 3. 交易记录模块 (Cash/Transaction Module)

#### 3.1 获取交易列表

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | `get_all_transactions()` | `GET /api/v1/transactions` |
| **参数** | 无 | Query: `page`, `limit`, `sort_by`, `sort_order`, 筛选条件 |
| **响应结构** | `Vec<CashResponse>` | `{ success: true, data: { data: ICash[], pagination: {...} } }` |
| **分页支持** | ❌ 无 | ✅ 有 |
| **适配建议** | 前端改用分页查询 | 金额字段统一处理（见下） |

#### 3.2 搜索交易记录

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | `search_cash(...)` | `GET /api/v1/transactions/search` |
| **筛选参数** | `student_id`, `min_amount`, `max_amount`, `date_from`, `date_to`, `has_installment` | 同左，Query 参数 |
| **金额单位** | 分（整数） | 分（整数） |
| **日期格式** | DateTime | ISO 8601 字符串 |
| **响应结构** | `Vec<CashResponse>` | `{ success: true, data: { data: ICash[], pagination: {...} } }` |
| **适配建议** | 前端金额统一转换：显示时 `amount / 100` 元，提交时 `amount * 100` 分 | 日期使用 `toISOString()` |

#### 3.3 获取单个交易详情

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | ❌ 无 | `GET /api/v1/transactions/:id` |
| **响应结构** | N/A | `{ success: true, data: ICash }` |
| **适配动作** | 🟢 **新功能**：前端可使用详情页 | 包含关联学生信息 |

#### 3.4 添加普通交易

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | `add_cash_transaction(...)` | `POST /api/v1/transactions` |
| **请求体字段** | `student_id`, `cash`, `note`, `installment?` | JSON: `{ student_id?, amount, note?, is_installment: false }` |
| **金额字段名** | `cash` | `amount` |
| **金额单位** | 分（i64） | 元（前端输入），后端自动转为分 |
| **分期支持** | 嵌套 `installment` 对象 | 分离接口（见 3.5） |
| **响应结构** | `CashResponse` | `{ success: true, data: ICash }` |
| **适配建议** | 前端普通交易使用 `POST /transactions`，金额需乘 100 | 分期交易使用专门接口 |

**金额处理重点**：
```typescript
// ❌ 错误：直接发送元
{ amount: 100.50 }

// ✅ 正确：转换为分（后端期望整数）
{ amount: Math.round(100.50 * 100) }  // 10050 分

// 显示时转回元
displayAmount = cash / 100;  // 100.50 元
```

#### 3.5 添加分期付款交易

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | `add_cash_transaction(...)` | `POST /api/v1/transactions/installment` |
| **请求体** | 包含 `installment: Installment` 对象 | JSON: `{ student_id?, total_amount, note?, total_installments, frequency, due_date, current_installment?, plan_id?, custom_days? }` |
| **架构差异** | 分期信息嵌套在 Cash 中 | 分期独立管理，Cash 记录引用 plan_id |
| **响应结构** | `CashResponse` | `{ success: true, data: { cash: ICash, plan: IInstallmentPlan, installment: IInstallment } }` |
| **适配建议** | 前端使用独立接口创建分期 | 返回值包含完整的计划和首期信息 |

#### 3.6 删除交易记录

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | `delete_cash_transaction(uid)` | `DELETE /api/v1/transactions/:id` |
| **参数** | `uid` | URL `:id` |
| **级联处理** | ❓ 未明确 | ⚠️ 关联分期不会删除 |
| **响应结构** | `Result<(), String>` | `{ success: true, message: "交易已删除" }` |
| **适配建议** | 前端删除前提示关联关系 | 分期交易需单独管理 |

---

### 4. 分期付款模块 (Installment Module)

#### 4.1 架构差异说明

| 维度 | Rust 版本 | TypeScript 版本 | 适配要点 |
|------|-----------|----------------|---------|
| **数据模型** | `Installment` 嵌套在 `Cash` 中 | `InstallmentPlan` + `Installment` 独立集合 | TS 版分离计划和期数 |
| **计划管理** | 无独立 Plan 概念 | `IInstallmentPlan` 管理整体计划 | TS 版更规范 |
| **查询方式** | 通过 `plan_id` 筛选 | 独立端点查询计划和期数 | 前端需分别调用 |

#### 4.2 获取分期计划列表

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | ❌ 无（需从 Cash 中筛选） | `GET /api/v1/installments` |
| **筛选参数** | N/A | Query: `student_id`, `status`, `page`, `limit`, `sort_by` |
| **响应结构** | N/A | `{ success: true, data: { data: IInstallmentPlan[], pagination: {...} } }` |
| **适配动作** | 🟢 **新功能**：前端可直接查询分期计划列表 | 返回计划主记录 |

#### 4.3 获取逾期分期列表（新增）

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | ❌ 无 | `GET /api/v1/installments/overdue` |
| **响应结构** | N/A | `{ success: true, data: IInstallment[] }` |
| **适配动作** | 🟢 **新功能**：前端可实现逾期提醒 | 自动计算逾期天数 |

#### 4.4 获取单个分期计划详情

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | `get_installments_by_plan(plan_id)` | `GET /api/v1/installments/:id` |
| **响应结构** | `Vec<Installment>` （期数列表） | `{ success: true, data: { plan: IInstallmentPlan, installments: IInstallment[] } }` |
| **差异** | 仅返回期数 | 返回计划+所有期数 |
| **适配建议** | 前端使用 TS 版详情接口 | 一次性获取完整信息 |

#### 4.5 创建分期计划

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | 通过 `add_cash_transaction` 创建 | `POST /api/v1/installments` |
| **请求体** | 嵌套在 Cash 中 | JSON: `{ student_id?, total_amount, total_installments, frequency, custom_days?, start_date, note? }` |
| **自动生成** | ❌ 不自动生成期数 | ✅ 自动生成所有期数 |
| **响应结构** | `CashResponse` | `{ success: true, data: { plan: IInstallmentPlan, installments: IInstallment[] } }` |
| **适配建议** | 前端使用 `POST /installments` 创建计划 | 创建后自动生成期数记录 |

**频率枚举对照**：

| Rust | TypeScript | 说明 |
|------|-----------|------|
| `Weekly` | `"Weekly"` | 每周 |
| `Monthly` | `"Monthly"` | 每月 |
| `Quarterly` | `"Quarterly"` | 每季度 |
| `Custom(u32)` | `"Custom"` + `custom_days: number` | 自定义天数 |

#### 4.6 更新分期付款状态

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | `update_installment_status(uid, status)` | `PUT /api/v1/installments/:id/payment` |
| **请求体** | `uid`, `status` | JSON: `{ status: InstallmentStatus, amount?: number }` |
| **状态枚举** | `Pending`, `Paid`, `Overdue`, `Cancelled` | `"Pending"`, `"Paid"`, `"Overdue"`, `"Cancelled"` |
| **自动记录** | ❌ 无 | ✅ Paid 状态自动记录 `paid_at` 和 `paid_amount` |
| **响应结构** | `Installment` | `{ success: true, data: IInstallment }` |
| **适配建议** | 前端标记支付时传 `status: "Paid"` 和 `amount` | 后端自动创建交易记录 |

#### 4.7 生成下一期（移除）

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | `generate_next_installment(plan_id, date)` | ❌ 已移除（创建时自动生成） |
| **适配动作** | ✅ **无需适配**：TS 版创建计划时自动生成所有期数 | 前端无需手动生成 |

#### 4.8 取消分期计划

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | `cancel_installment_plan(plan_id)` | `DELETE /api/v1/installments/:id` |
| **参数** | `plan_id` | URL `:id` |
| **级联处理** | 批量取消所有期数 | ✅ 同时标记计划和所有期数为 Cancelled |
| **响应结构** | `Result<(), String>` | `{ success: true, message: "分期计划已取消" }` |
| **适配建议** | 前端使用 DELETE 请求 | 已支付的期数不影响 |

---

### 5. 会员管理模块 (Membership Module)

#### 5.1 设置会员信息

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | `set_student_membership(uid, start, end)` | `POST /api/v1/membership/students/:id/membership` |
| **请求体** | `uid`, `start`, `end` | JSON: `{ startDate?: string, endDate?: string }` |
| **日期格式** | DateTime | ISO 8601 字符串 |
| **响应结构** | `StudentResponse` | `{ success: true, data: IStudent }` |
| **适配建议** | 前端使用 `POST` 请求，日期转 ISO 格式 | 两个日期都可选 |

#### 5.2 清除会员信息

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | `clear_student_membership(uid)` | `DELETE /api/v1/membership/students/:id/membership` |
| **参数** | `uid` | URL `:id` |
| **响应结构** | `StudentResponse` | `{ success: true, data: IStudent }` |
| **适配建议** | 前端使用 `DELETE` 请求 | 清除 membershipStartDate 和 membershipEndDate |

#### 5.3 按类型设置会员（月卡/年卡）

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | `set_membership_by_type(uid, type, ...)` | `POST /api/v1/membership/students/:id/membership/type` |
| **请求体** | `uid`, `type`, `start_from_today` | JSON: `{ membershipType: "month" \| "year", startFromToday?: boolean }` |
| **类型枚举** | 类似 | `"month"` (30天), `"year"` (365天) |
| **响应结构** | `StudentResponse` | `{ success: true, data: IStudent }` |
| **适配建议** | 前端使用 `POST` 请求 | `startFromToday=true` 从今天开始 |

#### 5.4 续费会员（新增）

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | ❌ 无 | `POST /api/v1/membership/students/:id/membership/renew` |
| **请求体** | N/A | JSON: `{ membershipType: "month" \| "year", extendFromCurrent?: boolean }` |
| **逻辑** | N/A | `extendFromCurrent=true` 从当前结束日期延长 |
| **响应结构** | N/A | `{ success: true, data: IStudent }` |
| **适配动作** | 🟢 **新功能**：前端可实现续费按钮 | 自动计算新到期日 |

#### 5.5 批量设置会员（新增）

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | ❌ 无 | `POST /api/v1/membership/batch` |
| **请求体** | N/A | JSON: `{ studentIds: number[], membershipType: "month" \| "year", startFromToday?: boolean }` |
| **限制** | N/A | 最多 100 个学员 |
| **响应结构** | N/A | `{ success: true, data: { updated: IStudent[], failed: Array<{id, error}> } }` |
| **适配动作** | 🟢 **新功能**：前端可实现批量会员管理 | 部分失败会返回详情 |

#### 5.6 获取会员统计（新增）

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | ❌ 无 | `GET /api/v1/membership/stats` |
| **响应结构** | N/A | `{ success: true, data: { total, active, expired, expiringSoon, upcomingMembers } }` |
| **适配动作** | 🟢 **新功能**：前端可在仪表板显示会员统计 | 无需参数 |

---

### 6. 统计分析模块 (Stats/Dashboard Module)

#### 6.1 获取仪表板统计

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | `get_dashboard_stats()` | `GET /api/v1/dashboard/stats` |
| **响应字段** | `total_students`, `total_revenue`, `total_expense`, `average_score`, `max_score`, `active_courses` | 同左 + `net_income`, `active_members`, `active_installments`, `overdue_installments` |
| **金额单位** | 分 | 元（后端自动转换） |
| **响应结构** | 直接对象 | `{ success: true, data: IDashboardStats }` |
| **适配建议** | 前端解析 `response.data.data` | 金额已转为元，无需二次转换 |

#### 6.2 获取财务统计

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | `get_financial_stats(period)` | `GET /api/v1/dashboard/financial-stats` |
| **周期参数** | 枚举：`Today`, `ThisWeek`, `ThisMonth`, `ThisYear` | Query: `period=Today|ThisWeek|ThisMonth|ThisYear` |
| **响应字段** | `total_income`, `total_expense`, `net_income`, `installment_...` | 同左 + `period`, `date_from`, `date_to` |
| **金额单位** | 分 | 元 |
| **响应结构** | 直接对象 | `{ success: true, data: IFinancialStats }` |
| **适配建议** | 前端使用 Query 参数 `?period=ThisMonth` | 默认本月 |

#### 6.3 获取全局学员统计（新增）

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | ❌ 无 | `GET /api/v1/dashboard/global-student-stats` |
| **响应结构** | N/A | `{ success: true, data: { total_students, by_class: {...}, by_subject: {...}, average_age, score_distribution } }` |
| **适配动作** | 🟢 **新功能**：前端可实现全局学员分析 | 包含分类统计 |

#### 6.4 获取全局财务统计（新增）

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | ❌ 无 | `GET /api/v1/dashboard/global-financial-stats` |
| **响应结构** | N/A | `{ success: true, data: { total_income, total_expense, net_income, top_students: [...] } }` |
| **适配动作** | 🟢 **新功能**：前端可显示全局财务概览 | 包含学员贡献排名 |

#### 6.5 获取即将到期的会员（新增）

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | ❌ 无 | `GET /api/v1/dashboard/membership-expiring` |
| **参数** | N/A | Query: `days=30` (默认 30 天内) |
| **响应结构** | N/A | `{ success: true, data: IStudent[] }` |
| **适配动作** | 🟢 **新功能**：前端可实现到期提醒 | 支持自定义天数 |

#### 6.6 获取学员个人统计

| 属性 | Rust 版本 | TypeScript 版本 |
|------|-----------|----------------|
| **命令/端点** | `get_student_stats(uid)` | `GET /api/v1/dashboard/students/:id/stats` |
| **参数** | `uid` | URL `:id` |
| **响应字段** | `total_payments`, `payment_count`, `average_score`, `score_count`, `membership_status` | 同左 + `installment_stats` 详情 |
| **响应结构** | 直接对象 | `{ success: true, data: IStudentStats }` |
| **适配建议** | 前端使用 `GET /dashboard/students/${id}/stats` | 包含分期统计 |

---

### 7. 适配器模块 (Adapter Module)

适配器模块是 TypeScript 版本为兼容不同数据库而设计的专用路由，Rust 版本无对应功能。

#### 7.1 适配器信息

| 端点 | 方法 | 功能 | 响应 |
|------|------|------|------|
| `/api/v1/adapter/info` | GET | 获取适配器版本和支持的数据库 | `{ success: true, data: { adapter_version, supported_databases, features, endpoints } }` |
| `/api/v1/adapter/health` | GET | 数据库健康检查 | `{ success: true, data: { database_type, connection_status, details } }` |
| `/api/v1/adapter/students` | GET | 获取学生（适配器版） | 同 `/students` |
| `/api/v1/adapter/students` | POST | 添加学生（适配器版） | 同 `/students` |
| `/api/v1/adapter/transactions` | GET | 获取交易（适配器版） | 同 `/transactions` |
| `/api/v1/adapter/financial-stats` | GET | 获取财务统计（适配器版） | 同 `/dashboard/financial-stats` |

**适配动作**：
- 🟢 **可选**：前端可使用 `/adapter/*` 路由作为备用
- ✅ 优先使用标准路由 `/api/v1/*`

---

### 8. 认证与健康检查模块

#### 8.1 认证现状

| 项目 | Rust 版本 | TypeScript 版本 | 状态 |
|------|-----------|----------------|------|
| **认证方式** | ❌ 无 | JWT (JSON Web Token) | 🟡 已配置但未实现 |
| **登录端点** | ❌ 无 | ❌ **未实现** | 🔴 需要补充 |
| **注册端点** | ❌ 无 | ❌ **未实现** | 🔴 需要补充 |
| **Token 刷新** | ❌ 无 | ❌ **未实现** | 🟡 待定 |
| **用户管理** | ❌ 无 | ❌ **未实现** | 🟡 待定 |
| **权限控制** | ❌ 无 | ❌ **未实现** | 🟡 待定 |

**JWT 配置（已存在）**：
```typescript
// backend/src/config/index.ts
security: {
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
}
```

**适配建议**：

1. **短期方案（本次迭代）**：
   - ✅ 前端暂不处理 Token，所有接口无需认证
   - ✅ 后端保留 JWT 配置待后续使用

2. **中期方案（下次迭代）**：
   - 🟡 实现 `POST /api/v1/auth/login` 端点
   - 🟡 实现 `POST /api/v1/auth/register` 端点
   - 🟡 添加认证中间件保护路由
   - 🟡 前端实现登录页面和 Token 管理

3. **前端 Token 处理建议**（待实现）：
```typescript
// 存储 Token
localStorage.setItem('qmx_token', token);

// 请求时携带 Token
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// 监听 401 错误自动跳转登录
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // 清除 Token 并跳转登录
      localStorage.removeItem('qmx_token');
      router.push('/login');
    }
    return Promise.reject(error);
  }
);
```

#### 8.2 健康检查

| 端点 | 方法 | 功能 | 响应 |
|------|------|------|------|
| `/health` | GET | 应用健康检查 | `{ status: "ok", timestamp, uptime, environment }` |
| `/api/v1/health/db` | GET | 数据库健康检查 | `{ success: true, data: { database_type, connection_status, details } }` |

**适配建议**：
- ✅ 前端可在启动时调用健康检查确保后端正常
- ✅ 部署时配置监控工具定期检查健康端点

---

## 📊 数据结构适配指南

### 1. 字段命名规范

TypeScript 后端同时支持 snake_case 和 camelCase，但优先推荐使用 camelCase（符合 JavaScript 惯例）。

#### 双格式支持字段对照表

| snake_case | camelCase | 类型 | 说明 |
|------------|-----------|------|------|
| `lesson_left` | `lessonLeft` | `number \| null` | 剩余课时 |
| `membership_start_date` | `membershipStartDate` | `string \| null` | 会员开始日期 |
| `membership_end_date` | `membershipEndDate` | `string \| null` | 会员结束日期 |
| `student_id` | `studentId` | `number \| null` | 学员 ID |
| `created_at` | `createdAt` | `Date \| string` | 创建时间 |
| `updated_at` | `updatedAt` | `Date \| string` | 更新时间 |
| `plan_id` | `planId` | `number` | 分期计划 ID |
| `total_amount` | `totalAmount` | `number` | 总金额 |
| `total_installments` | `totalInstallments` | `number` | 总期数 |
| `current_installment` | `currentInstallment` | `number` | 当前期数 |
| `due_date` | `dueDate` | `Date \| string` | 到期日期 |
| `custom_days` | `customDays` | `number \| null` | 自定义天数 |

**前端适配建议**：
- ✅ 优先使用 camelCase 发送请求
- ✅ 后端会自动兼容 snake_case
- ✅ 响应数据可能包含两种格式，优先读取 camelCase

### 2. 金额字段处理（重要）

#### 存储规则
- **后端存储单位**：分（整数）
- **前端显示单位**：元（保留两位小数）
- **转换规则**：`元 = 分 / 100`，`分 = 元 * 100`

#### 相关字段对照

| 后端字段 | 类型 | 单位 | 前端处理 |
|---------|------|------|---------|
| `cash` | `number` | 分 | 显示：`cash / 100`，输入：`Math.round(amount * 100)` |
| `amount` | `number` | 元 | API 参数以元传递，后端自动转换 |
| `total_amount` | `number` | 元 | 同上 |
| `paid_amount` | `number` | 分 | 显示：`paid_amount / 100` |
| `installment_amount` | `number` | 分 | 显示：`installment_amount / 100` |

**前端转换示例**：
```typescript
// 1. 显示交易金额
const displayAmount = (cash: number) => {
  return (cash / 100).toFixed(2);  // "100.50"
};

// 2. 提交交易（新版 API 使用 amount 字段，单位为元）
const submitTransaction = async (amountInYuan: number) => {
  await ApiService.post('/transactions', {
    amount: amountInYuan,  // 100.50（元），后端自动转换
    note: '学费',
  });
};

// 3. 格式化显示
const formatCurrency = (cash: number) => {
  return `¥${(cash / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  // "¥100.50"
};
```

**后端转换逻辑（已实现）**：
```typescript
// 控制器层自动转换
const amountInCents = Math.round(req.body.amount * 100);  // 元转分
const amountInYuan = cash / 100;  // 分转元（响应时）
```

### 3. 日期字段处理

#### 格式规范
- **后端存储**：MongoDB Date 对象
- **API 传输**：ISO 8601 字符串（`YYYY-MM-DDTHH:mm:ss.sssZ`）
- **前端显示**：本地化格式

#### 相关字段

| 字段 | 类型 | 示例 | 前端处理 |
|------|------|------|---------|
| `created_at` / `createdAt` | `string` | `"2024-11-15T08:30:00.000Z"` | `new Date(createdAt).toLocaleString()` |
| `updated_at` / `updatedAt` | `string` | `"2024-11-15T10:45:30.500Z"` | 同上 |
| `membershipStartDate` | `string \| null` | `"2024-01-01T00:00:00.000Z"` | 日期选择器 |
| `membershipEndDate` | `string \| null` | `"2024-12-31T23:59:59.999Z"` | 日期选择器 |
| `dueDate` | `string` | `"2024-12-15T00:00:00.000Z"` | 日期选择器 |

**前端转换示例**：
```typescript
// 1. 日期选择器值提交（使用原生 Date 或日期库）
const submitMembership = async (startDate: Date, endDate: Date) => {
  await ApiService.post(`/membership/students/${studentId}/membership`, {
    startDate: startDate.toISOString(),  // "2024-11-15T00:00:00.000Z"
    endDate: endDate.toISOString(),
  });
};

// 2. 显示日期（本地化）
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });  // "2024/11/15"
};

// 3. 相对时间（如"3天前"）
import dayjs from 'dayjs';
const relativeTime = dayjs(createdAt).fromNow();  // "3天前"
```

### 4. ID 字段类型

| 字段 | Rust 类型 | TypeScript 类型 | 生成方式 | 范围 |
|------|-----------|----------------|---------|------|
| `uid` | `u64` | `number` | Counter 自增 | 1 ~ 2^53-1 |
| `student_id` | `Option<u64>` | `number \| null` | 引用学员 uid | 同上 |
| `plan_id` | `u64` | `number` | Counter 自增 | 同上 |

**注意事项**：
- ✅ TypeScript `number` 类型安全范围：`Number.MIN_SAFE_INTEGER` ~ `Number.MAX_SAFE_INTEGER`（约 ±9×10^15）
- ✅ 后端使用 Counter 模型保证全局唯一自增
- ⚠️ 前端不应手动生成 ID，由后端自动分配

### 5. 枚举类型对照

#### ClassType（班级类型）

| Rust | TypeScript | 显示名称 |
|------|-----------|---------|
| `TenTry` | `"TenTry"` | 十次试练 |
| `Month` | `"Month"` | 月卡 |
| `Year` | `"Year"` | 年卡 |
| `Others` | `"Others"` | 其他 |

#### SubjectType（科目类型）

| Rust | TypeScript | 显示名称 |
|------|-----------|---------|
| `Shooting` | `"Shooting"` | 射击 |
| `Archery` | `"Archery"` | 射箭 |
| `Others` | `"Others"` | 其他 |

#### InstallmentStatus（分期状态）

| Rust | TypeScript | 显示名称 | 颜色建议 |
|------|-----------|---------|---------|
| `Pending` | `"Pending"` | 待支付 | 🟡 黄色 |
| `Paid` | `"Paid"` | 已支付 | 🟢 绿色 |
| `Overdue` | `"Overdue"` | 已逾期 | 🔴 红色 |
| `Cancelled` | `"Cancelled"` | 已取消 | ⚪ 灰色 |

#### PaymentFrequency（付款频率）

| Rust | TypeScript | 显示名称 |
|------|-----------|---------|
| `Weekly` | `"Weekly"` | 每周 |
| `Monthly` | `"Monthly"` | 每月 |
| `Quarterly` | `"Quarterly"` | 每季度 |
| `Custom(u32)` | `"Custom"` + `custom_days` | 自定义 |

#### MembershipStatus（会员状态）

| TypeScript | 显示名称 | 说明 |
|-----------|---------|------|
| `"None"` | 无会员 | 未设置会员 |
| `"Active"` | 活跃 | 当前日期在有效期内 |
| `"Expired"` | 已过期 | 结束日期早于今天 |
| `"Upcoming"` | 即将开始 | 开始日期晚于今天 |

---

## 🚨 错误处理对照

### 1. 错误格式差异

#### Rust 版本

```rust
// 成功
Ok(StudentResponse { uid: 1, name: "张三", ... })

// 失败
Err("学员不存在".to_string())
```

#### TypeScript 版本

**成功响应**：
```json
{
  "success": true,
  "data": {
    "uid": 1,
    "name": "张三",
    ...
  }
}
```

**失败响应**：
```json
{
  "success": false,
  "error": {
    "type": "NotFound",
    "message": "学员不存在",
    "code": "STUDENT_NOT_FOUND",
    "details": { "student_id": 999 }
  }
}
```

**开发环境额外信息**：
```json
{
  "success": false,
  "error": { ... },
  "debug": {
    "stack": "Error: 学员不存在\n    at ...",
    "cause": null
  }
}
```

### 2. ErrorType 枚举

| ErrorType | HTTP 状态码 | 说明 | 前端处理 |
|-----------|------------|------|---------|
| `InvalidInput` | 400 | 请求参数无效 | 显示错误提示，高亮错误字段 |
| `NotFound` | 404 | 资源不存在 | 显示"未找到"页面或提示 |
| `State` | 409 | 状态冲突（如重复数据） | 提示用户检查输入 |
| `Unauthorized` | 401 | 未认证 | 跳转登录页（待实现） |
| `Forbidden` | 403 | 无权限 | 显示权限不足提示 |
| `RateLimit` | 429 | 请求过于频繁 | 提示稍后再试 |
| `Other` | 500 | 服务器内部错误 | 显示通用错误页 |

### 3. 常见错误示例

#### 验证错误（400 - InvalidInput）

```json
{
  "success": false,
  "error": {
    "type": "InvalidInput",
    "message": "数据验证失败: \"name\" 不能为空, \"age\" 必须大于等于 0",
    "details": [
      "\"name\" 不能为空",
      "\"age\" 必须大于等于 0"
    ]
  }
}
```

#### 资源不存在（404 - NotFound）

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

#### 重复数据（409 - State）

```json
{
  "success": false,
  "error": {
    "type": "State",
    "message": "数据已存在，请检查唯一性约束",
    "details": { "uid": 1 }
  }
}
```

#### Token 无效（401 - Unauthorized）

```json
{
  "success": false,
  "error": {
    "type": "Unauthorized",
    "message": "无效的访问令牌"
  }
}
```

#### 速率限制（429 - RateLimit）

```json
{
  "success": false,
  "error": {
    "type": "RateLimit",
    "message": "请求过于频繁，请稍后再试",
    "details": {
      "retry_after": 60
    }
  }
}
```

### 4. 前端错误处理建议

#### 统一错误解析函数

```typescript
import { AppError } from '@/types/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: AppError;
}

const handleApiError = (error: any): string => {
  if (error.response) {
    const apiError = error.response.data?.error;
    if (apiError) {
      // 优先显示错误消息
      if (apiError.message) {
        return apiError.message;
      }
      // 根据类型提供默认消息
      switch (apiError.type) {
        case 'InvalidInput':
          return '输入数据不合法，请检查';
        case 'NotFound':
          return '请求的资源不存在';
        case 'Unauthorized':
          return '未登录或登录已过期';
        case 'Forbidden':
          return '权限不足';
        case 'RateLimit':
          return '请求过于频繁，请稍后再试';
        default:
          return '服务器错误，请稍后再试';
      }
    }
  }
  return error.message || '网络错误';
};
```

#### 全局错误拦截器

```typescript
// src/api/ApiService.ts
axios.interceptors.response.use(
  response => {
    // 检查业务成功标志
    if (response.data && response.data.success === false) {
      const errorMsg = handleApiError({ response });
      // 显示全局通知
      ElMessage.error(errorMsg);
      return Promise.reject(new Error(errorMsg));
    }
    return response;
  },
  error => {
    const errorMsg = handleApiError(error);
    
    // 401 错误自动跳转登录（待实现）
    if (error.response?.status === 401) {
      // router.push('/login');
    }
    
    // 显示全局通知
    ElMessage.error(errorMsg);
    return Promise.reject(error);
  }
);
```

#### 组件级错误处理

```typescript
const loadStudents = async () => {
  try {
    loading.value = true;
    const response = await ApiService.get('/students', {
      params: { page: 1, limit: 20 }
    });
    
    if (response.data.success) {
      students.value = response.data.data.data;
    }
  } catch (error: any) {
    // 错误已在拦截器中处理
    console.error('加载学生列表失败:', error);
  } finally {
    loading.value = false;
  }
};
```

---

## 🔐 认证授权现状说明

### 当前状态

| 功能 | 状态 | 说明 |
|------|------|------|
| **JWT 配置** | ✅ 已配置 | `backend/src/config/index.ts` 中已定义 |
| **登录端点** | ❌ 未实现 | 需补充 `POST /api/v1/auth/login` |
| **注册端点** | ❌ 未实现 | 需补充 `POST /api/v1/auth/register` |
| **认证中间件** | ⚠️ 部分实现 | 错误处理支持 JWT 错误，但未强制验证 |
| **用户模型** | ❌ 未实现 | 需创建 User Schema |
| **权限控制** | ❌ 未实现 | 无角色/权限系统 |

### JWT 配置详情

```typescript
// 环境变量配置
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12
```

**配置项说明**：
- `JWT_SECRET`：JWT 签名密钥（⚠️ 生产环境必须修改）
- `JWT_EXPIRES_IN`：Token 有效期（默认 7 天）
- `BCRYPT_SALT_ROUNDS`：密码哈希轮数（默认 12 轮）

### 待实现的认证流程

#### 1. 登录流程（推荐）

```typescript
// POST /api/v1/auth/login
// 请求体
{
  "username": "admin",
  "password": "password123"
}

// 响应
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 604800,  // 7 天（秒）
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin"
    }
  }
}
```

#### 2. Token 使用（推荐）

```typescript
// 前端发送请求时携带 Token
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// 或在每个请求中单独设置
ApiService.get('/students', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

#### 3. Token 刷新（可选）

```typescript
// POST /api/v1/auth/refresh
// 请求头
Authorization: Bearer <old_token>

// 响应
{
  "success": true,
  "data": {
    "token": "new_token_string",
    "expires_in": 604800
  }
}
```

### 前端 Token 管理建议

#### 存储方案

| 方案 | 优点 | 缺点 | 推荐场景 |
|------|------|------|---------|
| `localStorage` | 持久化，刷新页面不丢失 | XSS 攻击风险 | 一般应用 |
| `sessionStorage` | 关闭标签页自动清除 | 刷新页面丢失 | 高安全要求 |
| `Cookie (HttpOnly)` | 最安全（JS 无法访问） | 需后端配合，CSRF 风险 | 企业应用 |

**推荐方案**（localStorage + 定期刷新）：

```typescript
// 1. 登录后存储 Token
const login = async (username: string, password: string) => {
  const response = await ApiService.post('/auth/login', { username, password });
  if (response.data.success) {
    const { token, expires_in } = response.data.data;
    localStorage.setItem('qmx_token', token);
    localStorage.setItem('qmx_token_expires', Date.now() + expires_in * 1000);
    
    // 设置全局请求头
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

// 2. 应用启动时恢复 Token
const restoreToken = () => {
  const token = localStorage.getItem('qmx_token');
  const expires = localStorage.getItem('qmx_token_expires');
  
  if (token && expires && Date.now() < parseInt(expires)) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    return true;
  } else {
    logout();
    return false;
  }
};

// 3. 登出
const logout = () => {
  localStorage.removeItem('qmx_token');
  localStorage.removeItem('qmx_token_expires');
  delete axios.defaults.headers.common['Authorization'];
  // router.push('/login');
};

// 4. 401 错误自动登出
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      logout();
    }
    return Promise.reject(error);
  }
);
```

### 后端待实现清单（优先级）

| 优先级 | 任务 | 说明 |
|--------|------|------|
| 🔴 高 | 创建 User 模型 | `backend/src/models/User.ts` |
| 🔴 高 | 实现登录端点 | `POST /api/v1/auth/login` |
| 🟡 中 | 实现认证中间件 | 保护需要登录的路由 |
| 🟡 中 | 实现注册端点 | `POST /api/v1/auth/register` |
| 🟢 低 | Token 刷新端点 | `POST /api/v1/auth/refresh` |
| 🟢 低 | 权限系统 | 角色/权限管理 |

### 临时方案（本次迭代）

**当前所有接口无需认证，前端可直接调用。** 待认证系统实现后，前端需进行以下调整：

1. ✅ 添加登录页面
2. ✅ 实现 Token 存储和管理
3. ✅ 在请求中携带 Token
4. ✅ 处理 401 错误并跳转登录

---

## 📐 统一规范与建议

### 1. 命名规范

| 位置 | 规范 | 示例 | 备注 |
|------|------|------|------|
| **前端组件** | PascalCase | `StudentList.vue` | Vue 组件文件名 |
| **前端变量** | camelCase | `studentList`, `isLoading` | JavaScript 变量 |
| **前端常量** | UPPER_SNAKE_CASE | `MAX_PAGE_SIZE` | 全大写 |
| **API 端点** | kebab-case | `/students`, `/financial-stats` | URL 路径 |
| **JSON 字段** | camelCase（推荐）| `studentId`, `createdAt` | API 请求响应 |
| **JSON 字段（兼容）** | snake_case | `student_id`, `created_at` | 后端支持 |
| **数据库字段** | snake_case | `student_id`, `created_at` | MongoDB 字段 |
| **TypeScript 接口** | PascalCase + I 前缀 | `IStudent`, `IApiResponse` | 类型定义 |
| **TypeScript 枚举** | PascalCase | `ClassType`, `SubjectType` | 枚举名 |
| **枚举值** | PascalCase | `TenTry`, `Monthly` | 枚举成员 |

### 2. 响应格式规范

#### 标准成功响应

```typescript
{
  "success": true,
  "data": T  // 数据类型取决于接口
}
```

#### 分页响应

```typescript
{
  "success": true,
  "data": {
    "data": T[],  // 数据数组
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "total_pages": 5
    }
  }
}
```

#### 错误响应

```typescript
{
  "success": false,
  "error": {
    "type": "InvalidInput",
    "message": "错误描述",
    "code": "ERROR_CODE",  // 可选
    "details": { ... }     // 可选
  }
}
```

### 3. 分页参数规范

| 参数 | 类型 | 默认值 | 范围 | 说明 |
|------|------|--------|------|------|
| `page` | `number` | 1 | 1 ~ ∞ | 页码（从 1 开始） |
| `limit` | `number` | 50 | 1 ~ 100 | 每页条数 |
| `sort_by` | `string` | `created_at` | 字段名 | 排序字段 |
| `sort_order` | `"ASC" \| "DESC"` | `DESC` | - | 排序方向 |

**前端使用示例**：
```typescript
const loadStudents = async (page: number = 1, limit: number = 20) => {
  const response = await ApiService.get('/students', {
    params: {
      page,
      limit,
      sort_by: 'created_at',
      sort_order: 'DESC',
    }
  });
  return response.data.data;
};
```

### 4. 日期时间规范

| 场景 | 格式 | 示例 | 说明 |
|------|------|------|------|
| **API 传输** | ISO 8601 | `"2024-11-15T08:30:00.000Z"` | UTC 时区 |
| **前端显示（日期）** | 本地化 | `"2024年11月15日"` | 用户本地时区 |
| **前端显示（时间）** | 本地化 | `"2024-11-15 16:30:00"` | 用户本地时区 |
| **数据库存储** | Date 对象 | MongoDB Date | 自动处理时区 |

### 5. 金额显示规范

| 场景 | 格式 | 示例 | 实现 |
|------|------|------|------|
| **输入框** | 小数 | `100.50` | `<input type="number" step="0.01">` |
| **列表/表格** | 货币符号+千分位 | `¥1,234.56` | `toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })` |
| **统计数字** | 货币符号+千分位 | `¥12,345.67` | 同上 |
| **API 传输（新）** | 小数（元） | `100.50` | 后端自动转换为分 |
| **后端存储** | 整数（分） | `10050` | MongoDB Number |

---

## 🔗 后续联调注意事项

### 1. 前端改造清单

#### 高优先级（本次迭代）

- [ ] **修改 ApiService 基础 URL**
  - 从 Tauri Commands 改为 REST API
  - 配置 `axios.defaults.baseURL = 'http://localhost:3001/api/v1'`
  
- [ ] **统一响应解析**
  - 所有 API 调用解析 `response.data.data`
  - 检查 `success` 字段判断成功/失败
  
- [ ] **金额字段转换**
  - 显示时：分转元（`cash / 100`）
  - 提交时：元转分（`Math.round(amount * 100)`）或直接传元（新 API）
  
- [ ] **日期字段转换**
  - 提交时：转 ISO 8601 字符串（`date.toISOString()`）
  - 显示时：本地化（`new Date(dateStr).toLocaleString()`）
  
- [ ] **分页逻辑改造**
  - 添加分页组件（Element Plus Pagination）
  - 处理 `pagination` 响应对象

- [ ] **错误处理改造**
  - 解析 `error.type` 和 `error.message`
  - 根据 ErrorType 显示不同提示

#### 中优先级（下次迭代）

- [ ] **认证系统集成**
  - 实现登录页面
  - Token 存储和管理
  - 401 错误处理

- [ ] **新功能适配**
  - 批量添加成绩
  - 清空成绩
  - 会员续费
  - 批量设置会员
  - 逾期分期提醒

- [ ] **搜索功能增强**
  - 利用高级搜索参数
  - 实现筛选器组件

#### 低优先级（可选）

- [ ] **性能优化**
  - 实现虚拟滚动（大列表）
  - 添加请求缓存
  - 实现乐观更新

- [ ] **用户体验优化**
  - 添加骨架屏
  - 优化加载状态
  - 添加操作确认对话框

### 2. 后端待补充功能

| 优先级 | 功能 | 端点 | 说明 |
|--------|------|------|------|
| 🔴 高 | 认证登录 | `POST /api/v1/auth/login` | JWT 登录 |
| 🔴 高 | 用户注册 | `POST /api/v1/auth/register` | 管理员注册 |
| 🟡 中 | 批量更新学生 | `POST /api/v1/students/batch-update` | 批量操作 |
| 🟡 中 | 自动逾期检测 | 定时任务 | 每日检查逾期分期 |
| 🟢 低 | 数据导出 | `GET /api/v1/export/...` | Excel/CSV 导出 |
| 🟢 低 | 数据导入 | `POST /api/v1/import/...` | 批量导入 |

### 3. 测试建议

#### 单元测试重点

- [ ] 金额转换函数（元↔分）
- [ ] 日期格式化函数
- [ ] 错误处理函数
- [ ] 枚举值映射

#### 集成测试重点

- [ ] 创建学生 → 获取详情 → 更新 → 删除
- [ ] 创建交易 → 搜索 → 筛选
- [ ] 创建分期计划 → 更新状态 → 取消
- [ ] 设置会员 → 续费 → 清除

#### 端到端测试重点

- [ ] 完整的学生生命周期管理
- [ ] 分期付款流程（创建 → 支付 → 完成）
- [ ] 会员管理流程（设置 → 续费 → 到期）
- [ ] 财务报表生成

### 4. 性能优化建议

#### 前端优化

- [ ] **按需加载**：路由懒加载（`() => import(...)`）
- [ ] **虚拟列表**：大数据列表使用虚拟滚动
- [ ] **请求合并**：使用 `Promise.all` 并行加载
- [ ] **缓存策略**：使用 Vuex/Pinia 缓存常用数据
- [ ] **防抖节流**：搜索输入使用 `debounce`

#### 后端优化

- [ ] **数据库索引**：为常用查询字段添加索引
- [ ] **分页查询**：避免全表扫描
- [ ] **查询优化**：使用聚合管道优化复杂查询
- [ ] **连接池**：合理配置 MongoDB 连接池大小
- [ ] **缓存**：使用 Redis 缓存热点数据（可选）

### 5. 安全建议

#### 前端安全

- [ ] **XSS 防护**：使用 Vue 自动转义，避免 `v-html`
- [ ] **CSRF 防护**：使用 CSRF Token（待后端实现）
- [ ] **敏感数据**：不在前端存储敏感信息
- [ ] **HTTPS**：生产环境强制 HTTPS

#### 后端安全

- [ ] **输入验证**：所有输入使用 Joi 验证（✅ 已实现）
- [ ] **SQL/NoSQL 注入**：使用 ORM/ODM（✅ Mongoose 已防护）
- [ ] **速率限制**：防止暴力攻击（✅ 已实现）
- [ ] **密码哈希**：使用 bcrypt（⚠️ 待认证系统实现）
- [ ] **JWT 安全**：使用强密钥，合理设置过期时间
- [ ] **错误消息**：生产环境不暴露敏感信息

### 6. 部署前检查清单

#### 环境配置

- [ ] **生产环境变量**
  - `NODE_ENV=production`
  - `MONGODB_URI=<生产数据库>`
  - `JWT_SECRET=<强随机密钥>`
  - `CORS_ORIGIN=<前端域名>`

- [ ] **安全配置**
  - 启用 HTTPS
  - 配置 CSP 策略
  - 启用 Helmet 安全头部

#### 性能配置

- [ ] **数据库索引**：确认所有索引已创建
- [ ] **连接池**：合理配置大小
- [ ] **日志级别**：生产环境设置为 `warn` 或 `error`
- [ ] **压缩**：启用 Gzip/Brotli 压缩

#### 监控配置

- [ ] **健康检查**：配置 `/health` 监控
- [ ] **错误追踪**：集成 Sentry 等服务（可选）
- [ ] **性能监控**：APM 工具（可选）
- [ ] **日志收集**：集中式日志管理（可选）

---

## 📚 附录

### A. 快速参考表

#### API 基础路径

```
开发环境：http://localhost:3001/api/v1
生产环境：https://your-domain.com/api/v1
```

#### 核心模块端点总览

| 模块 | 基础路径 | 主要操作 |
|------|---------|---------|
| 学生管理 | `/students` | GET, POST, PUT, DELETE |
| 成绩管理 | `/students/:id/scores` | GET, POST, PUT, DELETE |
| 交易记录 | `/transactions` | GET, POST, DELETE |
| 分期付款 | `/installments` | GET, POST, PUT, DELETE |
| 会员管理 | `/membership` | POST, DELETE |
| 统计分析 | `/dashboard` | GET |
| 适配器 | `/adapter` | GET, POST |
| 健康检查 | `/health` | GET |

### B. TypeScript 类型定义速查

```typescript
// 学生
interface IStudent {
  uid: number;
  name: string;
  age: number | null;
  phone: string;
  class: ClassType;
  subject: SubjectType;
  rings: number[];
  note: string;
  lessonLeft: number | null;
  membershipStartDate: string | null;
  membershipEndDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// 交易
interface ICash {
  uid: number;
  student_id: number | null;
  cash: number;  // 分
  amount: number;  // 元
  note: string | null;
  installment?: ICashInstallmentSnapshot | null;
  created_at: Date | string;
  updated_at: Date | string;
}

// 分期计划
interface IInstallmentPlan {
  uid: number;
  student_id: number | null;
  total_amount: number;
  total_installments: number;
  frequency: PaymentFrequency;
  custom_days?: number | null;
  start_date: Date | string;
  status: InstallmentPlanStatus;
  created_at: Date | string;
  updated_at: Date | string;
}

// 分期期数
interface IInstallment {
  uid: number;
  plan_id: number;
  installment_amount: number;
  current_installment: number;
  total_installments: number;
  due_date: Date | string;
  status: InstallmentStatus;
  paid_amount: number;
  paid_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

// API 响应
interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    type: ErrorType;
    message: string;
    code?: string;
    details?: any;
  };
}
```

### C. 常用 API 调用示例

#### 获取学生列表（分页）

```typescript
const response = await axios.get('/api/v1/students', {
  params: {
    page: 1,
    limit: 20,
    sort_by: 'created_at',
    sort_order: 'DESC'
  }
});

const { data, pagination } = response.data.data;
```

#### 创建学生

```typescript
const response = await axios.post('/api/v1/students', {
  name: '张三',
  age: 12,
  phone: '13800138000',
  class: 'Year',
  subject: 'Shooting',
  note: '优秀学员'
});

const student = response.data.data;
```

#### 添加交易（元为单位）

```typescript
const response = await axios.post('/api/v1/transactions', {
  student_id: 1,
  amount: 100.50,  // 元
  note: '学费'
});

const transaction = response.data.data;
```

#### 创建分期计划

```typescript
const response = await axios.post('/api/v1/installments', {
  student_id: 1,
  total_amount: 3000,  // 元
  total_installments: 12,
  frequency: 'Monthly',
  start_date: new Date().toISOString(),
  note: '年费分期'
});

const { plan, installments } = response.data.data;
```

#### 设置会员

```typescript
const response = await axios.post(`/api/v1/membership/students/${studentId}/membership/type`, {
  membershipType: 'year',
  startFromToday: true
});

const student = response.data.data;
```

### D. 故障排查指南

#### 问题：金额显示不正确

**可能原因**：
- 前端未将分转换为元
- 后端返回的金额单位不一致

**解决方案**：
```typescript
// 统一处理：显示时除以 100
const displayAmount = (cash: number) => (cash / 100).toFixed(2);
```

#### 问题：日期显示为 UTC 时间

**可能原因**：
- 未转换为本地时区

**解决方案**：
```typescript
// 使用本地化方法
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN');
};
```

#### 问题：分页数据重复

**可能原因**：
- `page` 参数从 0 开始（应该从 1 开始）
- 排序不稳定

**解决方案**：
```typescript
// 确保 page 从 1 开始
const loadPage = (page: number) => {
  if (page < 1) page = 1;
  // ...
};

// 添加稳定排序字段（如 uid）
params: {
  sort_by: 'created_at,uid',
  sort_order: 'DESC'
}
```

#### 问题：401 错误但未实现登录

**说明**：
- 当前版本所有接口无需认证
- 如果出现 401 错误，检查是否误配了认证中间件

**临时方案**：
- 移除请求中的 `Authorization` 头部

---

## 📝 文档维护

**文档版本**: 1.0  
**最后更新**: 2024-11  
**维护者**: QMX 开发团队

### 更新记录

- **v1.0 (2024-11)**: 初始版本
  - 完整对比 Rust 版和 TypeScript 版接口差异
  - 详细说明请求响应结构、字段命名、金额日期处理
  - 提供错误处理、认证现状、统一规范
  - 附带前后端适配清单和联调注意事项

### 反馈方式

如发现文档错误或需要补充内容，请：
1. 提交 Issue 到项目仓库
2. 直接修改并提交 Pull Request
3. 联系开发团队

---

**文档结束**
