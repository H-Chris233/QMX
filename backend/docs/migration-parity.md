# QMX 迁移差异分析文档

**文档版本**: 1.0  
**创建日期**: 2024  
**目标**: 建立 Rust 版 qmx_backend_lib 与当前 TypeScript 版之间的功能、数据与接口差异清单

---

## 📋 执行摘要

本文档详细对比了 QMX 系统的 Rust 版本（qmx_backend_lib）和当前 TypeScript/MongoDB 版本之间的差异。主要发现：

### 关键差异汇总
- **数据存储**: Rust 使用 JSON 文件持久化，TS 使用 MongoDB
- **API 模式**: Rust 使用 Tauri Commands，TS 使用 RESTful API
- **缺失组件**: 4 个核心模型文件在 TS 版本中缺失
- **功能完整性**: Rust 版本功能更完整，包含高级查询和统计功能
- **验证规则**: 两版本验证逻辑基本一致但实现方式不同

### 优先级建议
1. 🔴 **高优先级**: 创建缺失的 MongoDB 模型文件
2. 🟡 **中优先级**: 对齐数据结构和 API 响应格式
3. 🟢 **低优先级**: 实现高级查询和批量操作功能

---

## 🎯 模块对比矩阵

### 1. 学员管理模块 (Student Module)

| 功能 | Rust 版本 | TypeScript 版本 | 差异说明 | 风险评估 |
|------|-----------|----------------|----------|---------|
| **数据模型** | `Student` struct<br/>- JSON 序列化<br/>- 不可变设计 | `IStudentDoc` interface<br/>- Mongoose Schema<br/>- MongoDB 文档 | 存储机制完全不同 | 🟡 中 |
| **CRUD 操作** | ✅ 完整实现<br/>- Builder 模式创建<br/>- Updater 模式更新 | ✅ 完整实现<br/>- 直接对象创建<br/>- Mongoose 方法更新 | 实现模式不同 | 🟢 低 |
| **UID 生成** | 内置计数器<br/>自动递增 | CounterModel 生成<br/>**⚠️ 文件缺失** | TS 版本缺失 Counter 实现 | 🔴 高 |
| **字段列表** | uid, name, age, phone, class, subject, rings[], note, lesson_left, membership_start_date, membership_end_date | uid, name, age, phone, class, subject, rings[], note, lessonLeft, membershipStartDate, membershipEndDate | 字段名命名风格不同<br/>(snake_case vs camelCase) | 🟡 中 |
| **搜索功能** | ✅ `StudentQuery` 高级查询<br/>- 名称模糊搜索<br/>- 年龄范围<br/>- 成绩范围<br/>- 班级/科目筛选<br/>- 会员状态筛选 | ✅ 聚合查询实现<br/>- 支持分页<br/>- 支持排序<br/>- 类似查询条件 | 实现方式不同，功能相似 | 🟢 低 |
| **批量操作** | ✅ `update_multiple_students`<br/>批量更新支持 | ❌ 未实现 | TS 版本缺失批量功能 | 🟡 中 |
| **成绩管理** | ✅ 完整方法<br/>- add_ring()<br/>- remove_ring_at(index)<br/>- update_ring_at(index, score) | ✅ 完整方法<br/>- addScore()<br/>- removeScore(index)<br/>- updateScore(index, score) | 功能对等 | 🟢 低 |
| **会员管理** | ✅ 完整支持<br/>- 自定义日期<br/>- 月卡/年卡快捷设置<br/>- 剩余天数计算 | ✅ 完整支持<br/>- 自定义日期<br/>- 会员状态虚拟字段<br/>- 剩余天数计算 | 功能对等 | 🟢 低 |
| **验证规则** | validation.rs 集中管理<br/>- 姓名：1-50 字符<br/>- 年龄：3-120<br/>- 电话：最长 20 字符<br/>- 备注：最长 1000 字符 | Mongoose Schema 验证<br/>- 姓名：1-50 字符<br/>- 年龄：0-120<br/>- 电话：11 位或"未填写"<br/>- 备注：最长 1000 字符 | 年龄下限和电话验证略有差异 | 🟢 低 |

### 2. 财务管理模块 (Cash/Transaction Module)

| 功能 | Rust 版本 | TypeScript 版本 | 差异说明 | 风险评估 |
|------|-----------|----------------|----------|---------|
| **数据模型** | `Cash` struct<br/>- 包含可选 `Installment` | `ICashDoc` interface<br/>**⚠️ CashMongo.ts 缺失** | TS 模型文件不存在 | 🔴 高 |
| **字段列表** | uid, student_id, cash (i64), note, created_at, installment: Option<Installment> | uid, student_id, cash, note, created_at, updated_at | TS 版本缺少 installment 嵌套字段 | 🔴 高 |
| **金额单位** | 分（i64, 整数） | 分（Number, 整数） | 一致 | 🟢 低 |
| **金额范围** | -100万 ~ +100万 | 未明确限制 | TS 应添加验证 | 🟡 中 |
| **CRUD 操作** | ✅ 完整实现<br/>- CashBuilder 模式<br/>- CashUpdater 模式 | ✅ 基本实现<br/>cashController.ts | 功能基本对等 | 🟢 低 |
| **查询功能** | ✅ `CashQuery` 高级查询<br/>- 学员 ID 筛选<br/>- 金额范围<br/>- 日期范围<br/>- 分期状态筛选 | ✅ 支持类似查询<br/>- 分页<br/>- 排序 | 功能基本对等 | 🟢 低 |
| **分期付款集成** | ✅ 直接嵌套在 Cash 中<br/>Installment 作为 Option 字段 | ❌ 分离为独立集合<br/>通过 plan_id 关联 | 架构设计根本不同 | 🔴 高 |
| **Counter 模型** | 内置自动递增 | **⚠️ counter.ts 缺失** | TS 需要独立 Counter 实现 | 🔴 高 |

### 3. 分期付款模块 (Installment Module)

| 功能 | Rust 版本 | TypeScript 版本 | 差异说明 | 风险评估 |
|------|-----------|----------------|----------|---------|
| **数据模型** | `Installment` struct<br/>嵌套在 Cash 中 | `IInstallmentDoc`<br/>独立集合<br/>**⚠️ InstallmentMongo.ts 缺失** | 架构完全不同 | 🔴 高 |
| **字段对比** | plan_id, total_amount, total_installments, current_installment, frequency, due_date, status | uid, plan_id, student_id, total_amount, installment_number, total_installments, amount, frequency, custom_days, due_date, status, cash_uid | TS 版本字段更多，包含反向关联 | 🟡 中 |
| **分期计划** | ❌ 无独立 Plan 概念<br/>信息重复存储在每个 Installment | ✅ `InstallmentPlan` 独立模型<br/>**⚠️ InstallmentPlanMongo.ts 缺失** | TS 设计更规范，但文件缺失 | 🔴 高 |
| **付款频率** | Weekly, Monthly, Quarterly, Custom(u32) | weekly, monthly, quarterly, custom | 枚举值基本一致 | 🟢 低 |
| **状态管理** | Pending, Paid, Overdue, Cancelled | pending, paid, overdue, cancelled | 枚举值一致，大小写不同 | 🟢 低 |
| **生成下一期** | ✅ `generate_next_installment` | ✅ Controller 中实现 | 功能对等 | 🟢 低 |
| **取消计划** | ✅ `cancel_installment_plan`<br/>批量取消所有期数 | ✅ Controller 中实现 | 功能对等 | 🟢 低 |
| **查询功能** | ✅ `get_installments_by_plan`<br/>通过 plan_id 筛选 | ✅ 支持按 plan_id 查询 | 功能对等 | 🟢 低 |
| **逾期检测** | ❌ 无自动逾期更新 | ❌ 无自动逾期更新 | 两者都缺失定时任务 | 🟡 中 |

### 4. 统计分析模块 (Stats Module)

| 功能 | Rust 版本 | TypeScript 版本 | 差异说明 | 风险评估 |
|------|-----------|----------------|----------|---------|
| **仪表板统计** | ✅ `get_dashboard_stats`<br/>- total_students<br/>- total_revenue<br/>- total_expense<br/>- average_score<br/>- max_score<br/>- active_courses | ✅ statsController<br/>类似字段 | 功能基本对等 | 🟢 低 |
| **学员统计** | ✅ `get_student_stats`<br/>- total_payments<br/>- payment_count<br/>- average_score<br/>- score_count<br/>- membership_status | ✅ 支持个人统计 | 功能对等 | 🟢 低 |
| **财务统计** | ✅ `get_financial_stats`<br/>支持时间段：<br/>- Today<br/>- ThisWeek<br/>- ThisMonth<br/>- ThisYear | ✅ 支持日期范围查询<br/>自定义开始/结束日期 | 时间筛选方式不同 | 🟡 中 |
| **成绩统计** | ✅ 学员级别<br/>- average_score<br/>- max_score<br/>- min_score | ✅ 学员级别统计<br/>聚合查询 | 功能对等 | 🟢 低 |

### 5. 数据库与存储模块 (Database Module)

| 功能 | Rust 版本 | TypeScript 版本 | 差异说明 | 风险评估 |
|------|-----------|----------------|----------|---------|
| **存储方式** | JSON 文件<br/>- students.json<br/>- cash.json<br/>- 自动保存 | MongoDB<br/>- 集合：students<br/>- 集合：cash_transactions<br/>- 集合：installments<br/>- 集合：installment_plans<br/>- 集合：counters | 完全不同的持久化方案 | 🔴 高 |
| **管理器** | QmxManager 单例<br/>全局状态管理 | Express + Mongoose<br/>无状态 REST API | 架构哲学不同 | 🟡 中 |
| **事务支持** | ❌ 无事务<br/>依赖文件锁 | ✅ MongoDB 事务支持<br/>（当前未使用） | TS 版本可扩展性更好 | 🟡 中 |
| **备份/恢复** | ❌ 依赖文件系统备份 | ✅ MongoDB 备份工具 | TS 更专业 | 🟢 低 |
| **初始化** | QmxManager::new(auto_save) | mongoose.connect() + 索引创建 | 方式不同 | 🟢 低 |
| **健康检查** | ❌ 无专门接口 | ✅ `/health` 端点<br/>`checkMongoHealth()` | TS 更完善 | 🟢 低 |

### 6. 错误处理模块 (Error Handling)

| 功能 | Rust 版本 | TypeScript 版本 | 差异说明 | 风险评估 |
|------|-----------|----------------|----------|---------|
| **错误类型** | Result<T, String><br/>简单字符串错误 | 中间件 catchAsync<br/>统一错误响应 | TS 更结构化 | 🟢 低 |
| **验证错误** | validation.rs<br/>返回 Result 类型 | Mongoose 验证 +<br/>Controller 层验证 | 分层不同 | 🟢 低 |
| **日志记录** | log crate<br/>简单 logger | Winston 日志库<br/>- 文件日志<br/>- 控制台日志<br/>- 日志轮转 | TS 日志更完善 | 🟢 低 |
| **HTTP 错误码** | N/A (Tauri) | ✅ 标准 HTTP 状态码<br/>400, 404, 500 等 | 协议不同 | N/A |

---

## 📊 数据结构映射表

### Student 字段映射

| Rust JSON 字段 | MongoDB Schema 字段 | 类型映射 | 默认值 | 备注 |
|---------------|-------------------|---------|--------|------|
| `uid` | `uid` | u64 → Number | 自动生成 | 需要 Counter 模型 |
| `name` | `name` | String → String | required | 最大 50 字符 |
| `age` | `age` | Option<u8> → Number\|null | null | Rust: 3-120, TS: 0-120 |
| `phone` | `phone` | String → String | "未填写" | Rust 验证较宽松 |
| `class` | `class` | Class enum → String enum | required | 枚举值一致 |
| `subject` | `subject` | Subject enum → String enum | required | 枚举值一致 |
| `rings` | `rings` | Vec<f64> → Number[] | [] | 成绩数组 |
| `note` | `note` | String → String | "" | 最大 1000 字符 |
| `lesson_left` | `lessonLeft` | Option<u32> → Number\|null | null | ⚠️ 命名不一致 |
| `membership_start_date` | `membershipStartDate` | Option<DateTime> → Date\|null | null | ⚠️ 命名不一致 |
| `membership_end_date` | `membershipEndDate` | Option<DateTime> → Date\|null | null | ⚠️ 命名不一致 |
| N/A | `createdAt` | N/A → Date | auto | TS 新增 |
| N/A | `updatedAt` | N/A → Date | auto | TS 新增 |

### Cash/Transaction 字段映射

| Rust JSON 字段 | MongoDB Schema 字段 | 类型映射 | 默认值 | 备注 |
|---------------|-------------------|---------|--------|------|
| `uid` | `uid` | u64 → Number | 自动生成 | 需要 Counter 模型 |
| `student_id` | `student_id` | Option<u64> → Number\|null | null | 可关联学员 |
| `cash` | `cash` | i64 → Number | required | 金额（分） |
| `note` | `note` | String → String\|null | null | 备注 |
| `created_at` | `created_at` | DateTime → Date | auto | 创建时间 |
| `installment` | N/A | Option<Installment> → **分离集合** | N/A | ⚠️ 架构差异 |
| N/A | `updated_at` | N/A → Date | auto | TS 新增 |

### Installment 字段映射

| Rust 嵌套字段 | MongoDB 独立字段 | 类型映射 | 备注 |
|--------------|----------------|---------|------|
| `plan_id` | `plan_id` | u64 → Number | 计划 ID |
| `total_amount` | `total_amount` | i64 → Number | 总金额（分） |
| `total_installments` | `total_installments` | u32 → Number | 总期数 |
| `current_installment` | `installment_number` | u32 → Number | ⚠️ 字段名不同 |
| N/A | `student_id` | N/A → Number | TS 新增冗余字段 |
| N/A | `amount` | N/A → Number | TS 新增当期金额 |
| `frequency` | `frequency` | PaymentFrequency → String enum | 付款频率 |
| N/A | `custom_days` | N/A → Number[] | TS 新增自定义天数 |
| `due_date` | `due_date` | DateTime → Date | 到期日期 |
| `status` | `status` | InstallmentStatus → String enum | 状态 |
| N/A | `cash_uid` | N/A → Number | TS 新增反向关联 |
| N/A | `uid` | N/A → Number | TS 新增独立 ID |

---

## 🔌 API 端点对照表

### Rust Tauri Commands vs TypeScript REST API

| 功能模块 | Rust Tauri Command | TypeScript REST API | 参数差异 | 响应格式差异 |
|---------|-------------------|-------------------|---------|------------|
| **初始化** | `init_manager()` | N/A (自动连接 MongoDB) | - | - |
| **学员-列表** | `get_all_students()` | `GET /api/v1/students` | 一致 | Rust: `Vec<StudentResponse>`<br/>TS: `{success, data: []}` |
| **学员-创建** | `add_student(...)` | `POST /api/v1/students` | 参数一致 | 响应格式略有差异 |
| **学员-更新** | `update_student_info(uid, ...)` | `PUT /api/v1/students/:id` | TS 使用 URL 参数 | - |
| **学员-删除** | `delete_student(uid)` | `DELETE /api/v1/students/:id` | TS 使用 URL 参数 | - |
| **学员-搜索** | `search_students(...)` | `GET /api/v1/students/search` | Rust 多参数，TS query string | - |
| **学员-批量更新** | `update_multiple_students(uids, updates)` | ❌ 未实现 | - | TS 缺失 |
| **成绩-添加** | `add_score(uid, score)` | `POST /api/v1/students/:id/scores` | TS 使用 URL 参数 | - |
| **成绩-删除** | `delete_student_score(uid, index)` | `DELETE /api/v1/students/:id/scores/:index` | TS 使用 URL 参数 | - |
| **成绩-更新** | `update_student_score(uid, index, score)` | `PUT /api/v1/students/:id/scores/:index` | TS 使用 URL 参数 | - |
| **成绩-获取** | `get_student_scores(uid)` | `GET /api/v1/students/:id/scores` | TS 使用 URL 参数 | - |
| **会员-设置** | `set_student_membership(uid, start, end)` | `POST /api/v1/membership/:id` | 参数一致 | - |
| **会员-清除** | `clear_student_membership(uid)` | `DELETE /api/v1/membership/:id` | TS 使用 URL 参数 | - |
| **会员-快捷设置** | `set_membership_by_type(uid, type, ...)` | `POST /api/v1/membership/:id/preset` | 类似 | - |
| **交易-创建** | `add_cash_transaction(...)` | `POST /api/v1/transactions` | Rust 参数更多（含分期） | - |
| **交易-列表** | `get_all_transactions()` | `GET /api/v1/transactions` | 一致 | - |
| **交易-删除** | `delete_cash_transaction(uid)` | `DELETE /api/v1/transactions/:id` | TS 使用 URL 参数 | - |
| **交易-搜索** | `search_cash(...)` | `GET /api/v1/transactions/search` | 参数一致 | - |
| **学员交易** | `get_student_cash(uid)` | `GET /api/v1/transactions?student_id=:id` | TS 使用 query | - |
| **分期-更新状态** | `update_installment_status(uid, status)` | `PATCH /api/v1/installments/:id/status` | TS 使用 URL 参数 | - |
| **分期-生成下一期** | `generate_next_installment(plan_id, date)` | `POST /api/v1/installments/plans/:id/next` | TS 使用 URL 参数 | - |
| **分期-取消计划** | `cancel_installment_plan(plan_id)` | `DELETE /api/v1/installments/plans/:id` | TS 使用 URL 参数 | - |
| **分期-按计划查询** | `get_installments_by_plan(plan_id)` | `GET /api/v1/installments?plan_id=:id` | TS 使用 query | - |
| **统计-仪表板** | `get_dashboard_stats()` | `GET /api/v1/dashboard/stats` | 一致 | - |
| **统计-学员** | `get_student_stats(uid)` | `GET /api/v1/dashboard/student/:id` | TS 使用 URL 参数 | - |
| **统计-财务** | `get_financial_stats(period)` | `GET /api/v1/dashboard/financial?period=...` | Rust 枚举，TS query | - |

**响应格式差异总结**:
- **Rust**: 直接返回数据或 Result<T, String>
- **TypeScript**: 统一 `{ success: boolean, data?: any, error?: string }`

---

## ⚠️ 缺失组件清单

### 1. 模型文件缺失

#### CounterModel (counter.ts) - 🔴 严重
**位置**: `backend/src/models/counter.ts`  
**引用**: `backend/src/models/mongo.ts:2`

**用途**: 
- 为 Student, Cash, Installment 等生成自增 UID
- 替代 MongoDB 自动生成的 ObjectId

**推荐实现**:
```typescript
import mongoose, { Schema, Document } from 'mongoose';

interface ICounterDoc extends Document {
  _id: string;
  sequence_value: number;
}

const counterSchema = new Schema<ICounterDoc>({
  _id: { type: String, required: true },
  sequence_value: { type: Number, default: 1 }
});

export default mongoose.model<ICounterDoc>('Counter', counterSchema);
```

---

#### CashMongo 模型 (CashMongo.ts) - 🔴 严重
**位置**: `backend/src/models/CashMongo.ts`  
**引用**: `backend/src/models/index.ts:2`

**问题**:
- index.ts 导入 `CashClass` from `'./CashMongo'`，但文件不存在
- 现有 `Cash.ts` 功能简单，可能不是 CashClass

**推荐方案**:
- 创建 CashMongo.ts 实现 CashClass 包装类
- 或修改 index.ts 使用现有 Cash 模型

---

#### InstallmentMongo 模型 (InstallmentMongo.ts) - 🔴 严重
**位置**: `backend/src/models/InstallmentMongo.ts`  
**引用**: `backend/src/models/index.ts:3`

**问题**:
- index.ts 导入 `Installment` from `'./InstallmentMongo'`
- 现有 `Installment.ts` 仅定义 Schema，缺少包装类

**推荐实现**:
- 参考 Student 模型模式，添加静态方法类

---

#### InstallmentPlanMongo 模型 (InstallmentPlanMongo.ts) - 🔴 严重
**位置**: `backend/src/models/InstallmentPlanMongo.ts`  
**引用**: `backend/src/models/index.ts:4`

**用途**:
- 管理分期付款计划主记录
- 包含：plan_id, total_amount, total_installments, frequency, student_id

**推荐 Schema**:
```typescript
{
  plan_id: Number (unique, indexed),
  student_id: Number (indexed),
  total_amount: Number,
  total_installments: Number,
  frequency: PaymentFrequency enum,
  custom_days: Number[],
  status: 'active' | 'completed' | 'cancelled',
  created_at: Date,
  updated_at: Date
}
```

---

### 2. 功能缺失

| 功能 | Rust 已有 | TS 缺失 | 优先级 |
|-----|----------|--------|--------|
| 学员批量更新 | ✅ | ❌ | 🟡 中 |
| 自动逾期检测 | ❌ | ❌ | 🟡 中 |
| 文件导入/导出 | ❌ | ❌ | 🟢 低 |
| 数据库迁移工具 | ❌ | ⚠️ 部分实现 | 🟡 中 |
| API 文档 | ❌ | ⚠️ README 简单说明 | 🟢 低 |

---

## 🚨 风险评估

### 高风险项 (🔴)

1. **缺失模型文件导致系统无法运行**
   - Counter, CashMongo, InstallmentMongo, InstallmentPlanMongo
   - **影响**: 学员创建、交易记录、分期付款功能全部失效
   - **解决方案**: 立即创建缺失文件

2. **Installment 架构差异**
   - Rust 嵌套设计 vs TS 独立集合
   - **影响**: 查询性能、数据一致性
   - **解决方案**: 确认 TS 架构设计优势，保持独立集合

3. **数据迁移路径不清晰**
   - JSON → MongoDB 无自动化工具
   - **影响**: 旧数据丢失风险
   - **解决方案**: 开发迁移脚本

### 中风险项 (🟡)

1. **字段命名不一致**
   - snake_case (Rust) vs camelCase (TS)
   - **影响**: API 对接、前端兼容性
   - **解决方案**: 统一命名规范或添加转换层

2. **验证规则差异**
   - 年龄下限：Rust 3岁，TS 0岁
   - **影响**: 数据质量
   - **解决方案**: 对齐到更合理的规则

3. **批量操作缺失**
   - **影响**: 大数据量操作效率低
   - **解决方案**: 添加批量更新 API

### 低风险项 (🟢)

1. 日志系统差异 - TS 已有更好实现
2. 错误处理方式不同 - 不影响功能
3. API 响应格式略有差异 - 前端适配即可

---

## 💡 解决方案与建议

### 第一阶段：修复缺失组件 (1-2 天)

**任务列表**:
1. ✅ 创建 `backend/src/models/counter.ts`
   - 实现自增 ID 生成器
   - 支持多种 ID 类型（studentId, cashId, planId）

2. ✅ 创建 `backend/src/models/CashMongo.ts`
   - 定义 CashClass 包装类
   - 实现静态 CRUD 方法

3. ✅ 创建 `backend/src/models/InstallmentMongo.ts`
   - 添加 Installment 包装类
   - 实现查询方法

4. ✅ 创建 `backend/src/models/InstallmentPlanMongo.ts`
   - 定义 InstallmentPlan Schema
   - 实现计划管理方法

5. ✅ 更新 `backend/src/models/index.ts`
   - 修正导入路径
   - 确保所有模型正确导出

**验收标准**:
- 所有 import 错误消失
- `npm run build` 成功
- 基础 CRUD 操作测试通过

---

### 第二阶段：数据结构对齐 (2-3 天)

**任务列表**:
1. 统一字段命名
   - 决策：保持 camelCase（MongoDB 惯例）
   - 前端/API 保持一致

2. 同步验证规则
   - 年龄：统一为 3-120
   - 电话：明确规则（11 位中国手机号或"未填写"）
   - 金额：添加范围验证

3. 完善 TypeScript 类型定义
   - 确保 types/index.ts 覆盖所有字段
   - 添加 Zod 或 Joi 运行时验证

**验收标准**:
- 所有验证规则文档化
- 单元测试覆盖验证逻辑

---

### 第三阶段：功能增强 (3-5 天)

**任务列表**:
1. 实现批量操作 API
   - `POST /api/v1/students/batch-update`
   - `DELETE /api/v1/students/batch-delete`

2. 添加定时任务
   - 逾期分期付款状态自动更新
   - 会员到期提醒

3. 优化查询性能
   - 添加数据库索引
   - 实现查询缓存

**验收标准**:
- API 文档更新
- 性能测试通过

---

### 第四阶段：数据迁移工具 (2-3 天)

**任务列表**:
1. 开发 JSON → MongoDB 迁移脚本
   - `backend/scripts/migrate-from-json.ts`
   - 支持增量迁移
   - 数据校验

2. 测试迁移流程
   - 使用 Rust 版本生成的 JSON 数据
   - 验证迁移后数据完整性

**验收标准**:
- 迁移脚本文档化
- 数据一致性测试 100% 通过

---

## 📝 后续任务引用

基于本文档，建议创建以下任务：

### 开发任务
1. **TASK-001**: 创建缺失的 4 个模型文件（高优先级）
2. **TASK-002**: 统一字段命名和验证规则（中优先级）
3. **TASK-003**: 实现批量操作 API（中优先级）
4. **TASK-004**: 开发数据迁移脚本（中优先级）
5. **TASK-005**: 添加定时任务系统（低优先级）

### 文档任务
1. **DOC-001**: 完善 API 文档（Swagger/OpenAPI）
2. **DOC-002**: 编写数据库 Schema 文档
3. **DOC-003**: 创建开发者指南

### 测试任务
1. **TEST-001**: 编写模型单元测试
2. **TEST-002**: 编写 API 集成测试
3. **TEST-003**: 性能测试和优化

---

## 📌 附录

### A. Rust 验证规则完整列表

参考文件: `src-tauri/src/validation.rs`

- **姓名**: 1-50 字符，不含控制字符和 `<>&`
- **年龄**: 3-120
- **电话**: 最长 20 字符
- **备注**: 最长 1000 字符
- **金额**: -1,000,000.00 ~ +1,000,000.00（分为单位）
- **成绩**: 0-1000
- **分期数**: 1-360

### B. MongoDB 集合清单

| 集合名 | 用途 | 关键索引 |
|--------|-----|---------|
| `students` | 学员信息 | uid, name, phone, class, subject |
| `cash_transactions` | 交易记录 | uid, student_id, created_at |
| `installments` | 分期付款详情 | uid, plan_id, student_id, status, due_date |
| `installment_plans` | 分期计划主表 | plan_id, student_id |
| `counters` | ID 生成器 | _id |
| `system_configs` | 系统配置（未使用） | key |

### C. 关键决策记录

| 决策点 | Rust 方案 | TS 方案 | 最终决策 | 理由 |
|--------|----------|---------|---------|------|
| 数据存储 | JSON 文件 | MongoDB | MongoDB | 扩展性、并发性 |
| Installment 设计 | 嵌套在 Cash | 独立集合 | 独立集合 | 查询性能、数据规范 |
| 字段命名 | snake_case | camelCase | camelCase | MongoDB/JS 惯例 |
| API 模式 | Tauri Commands | REST API | REST API | Web 架构 |
| UID 生成 | 内置计数器 | Counter 模型 | Counter 模型 | MongoDB 原子操作 |

### D. 参考资源

- Rust 版本: `src-tauri/src/lib.rs`
- TS 模型: `backend/src/models/`
- TS 控制器: `backend/src/controllers/`
- API 路由: `backend/src/routes/index.ts`
- 类型定义: `backend/src/types/index.ts`

---

## 🔄 文档维护

**当前版本**: 1.0  
**最后更新**: 2024  
**维护者**: 开发团队  

**更新记录**:
- v1.0 (2024): 初始版本，完整对比 Rust 与 TS 版本

**反馈方式**:
如发现文档错误或需要补充，请提交 Issue 或 Pull Request。

---

**END OF DOCUMENT**
