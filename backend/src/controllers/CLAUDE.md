[根目录](../../../CLAUDE.md) > [backend](../../) > [src](../) > **controllers**

# 控制器模块

## 变更记录 (Changelog)

### 2026-01-08 - PostgreSQL迁移完成
- 所有7个控制器文件完成从MongoDB到PostgreSQL的迁移
- 移除所有MongoDB模型依赖（@/models/mongo, @/models/CashMongo 等）
- 采用Drizzle ORM + Repository模式
- 保持API兼容性（双命名：snake_case + camelCase）
- 金额转换统一：数据库存储分（cents），API返回元（yuan）

### 2025-11-06T06:48:29+0000
- 初始化模块文档
- 记录控制器架构和业务逻辑入口

---

## 模块职责

Express请求处理器，业务逻辑入口点。负责请求验证、响应格式化和错误处理。

**核心价值**：
- 统一的请求处理模式
- 标准化的响应格式
- 错误处理和用户反馈
- 业务逻辑编排

## 入口与启动

**控制器文件**（已全部迁移到PostgreSQL）：
- `studentController.ts` - 学员管理控制器
- `scoreController.ts` - 成绩管理控制器
- `cashController.ts` - 交易管理控制器
- `installmentController.ts` - 分期付款控制器
- `membershipController.ts` - 会员管理控制器
- `statsController.ts` - 统计数据控制器
- `adapterController.ts` - 数据库适配器控制器

## 对外接口

### 控制器模式

**标准控制器方法**：
```typescript
interface Controller {
  // CRUD 操作
  getAll(req: Request, res: Response, next: NextFunction): Promise<void>;
  getById(req: Request, res: Response, next: NextFunction): Promise<void>;
  create(req: Request, res: Response, next: NextFunction): Promise<void>;
  update(req: Request, res: Response, next: NextFunction): Promise<void>;
  delete(req: Request, res: Response, next: NextFunction): Promise<void>;

  // 查询操作
  search(req: Request, res: Response, next: NextFunction): Promise<void>;
}
```

**studentController.ts** - 学员管理控制器
```typescript
// 主要方法：
- getAllStudents()         // 获取学员列表（支持分页、搜索、筛选）
- getStudentById()         // 获取单个学员详情
- createStudent()          // 创建新学员
- updateStudent()          // 更新学员信息
- deleteStudent()          // 删除学员
- getStudentScores()       // 获取学员成绩
- addStudentScore()        // 添加学员成绩
- updateStudentScore()     // 更新学员成绩
- deleteStudentScore()     // 删除学员成绩
```

**cashController.ts** - 交易管理控制器
```typescript
// 主要方法：
- getAllTransactions()     // 获取交易列表
- getTransactionById()     // 获取单个交易
- createCashTransaction()  // 创建普通交易
- createInstallmentTransaction() // 创建分期交易
- updateTransaction()      // 更新交易信息
- deleteTransaction()      // 删除交易
- searchTransactions()     // 搜索交易
```

**statsController.ts** - 统计数据控制器
```typescript
// 主要方法：
- getDashboardStats()      // 仪表盘统计数据
- getStudentStats()        // 学员统计数据
- getFinancialStats()      // 财务统计数据
- getMembershipStats()     // 会员统计数据
```

## 关键依赖与配置

### 依赖模块
- **@/services**: 业务逻辑层
- **@/db/repositories**: 数据访问层（PostgreSQL Repository）
- **@/middleware**: 中间件
- **@/utils**: 工具函数

### 数据库架构（PostgreSQL + Drizzle ORM）

```typescript
// PostgreSQL数据库
PostgreSQL 15+
  ↓
Drizzle ORM (Type-safe SQL)
  ↓
Repository Pattern
  ↓
Controllers
  ↓
API Responses
```

### Repository依赖示例
```typescript
// studentController.ts 使用
import { StudentRepository } from "../db/repositories/studentRepository";

// cashController.ts 使用
import { CashRepository } from "../db/repositories/cashRepository";
import {
  InstallmentRepository,
  InstallmentPlanRepository,
} from "../db/repositories/installmentRepository";

// statsController.ts 使用
import { StudentRepository } from "../db/repositories/studentRepository";
import { CashRepository } from "../db/repositories/cashRepository";
import StatsService from "@/services/statsService";
```

### 请求处理流程
```typescript
// 标准处理流程
const handleRequest = async (req, res, next) => {
  try {
    // 1. 参数验证和提取
    const { params, query, body } = req;

    // 2. 调用Repository或Service层处理业务逻辑
    const result = await repository.method(params, query, body);
    // 或
    const result = await service.method(params, query, body);

    // 3. 格式化响应
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    // 4. 错误处理
    next(error);
  }
};
```

### 响应格式标准
```typescript
// 成功响应
{
  "success": true,
  "data": { /* 实际数据 */ }
}

// 分页响应
{
  "success": true,
  "data": [ /* 数据列表 */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}

// 创建响应
{
  "success": true,
  "data": { /* 创建的资源 */ },
  "message": "创建成功"
}
```

## 数据存储约定

### 金额转换
```typescript
// 数据库存储：分（cents）
const amountInCents = 100; // 数据库中存储100分

// API响应：元（yuan）
const amountInYuan = amountInCents / 100; // 返回1.00元

// 示例：cashController.ts
private presentTransaction(transaction: CashTransaction) {
  const amountYuan = transaction.amount / 100; // cents to yuan
  const isIncome = transaction.amount > 0;

  return {
    uid: transaction.uid,
    amount: amountYuan, // 元
    cash: transaction.amount, // 分（兼容旧前端）
    formatted_amount: isIncome
      ? `+¥${amountYuan.toFixed(2)}`
      : `-¥${Math.abs(amountYuan).toFixed(2)}`,
  };
}
```

### 命名约定（双命名兼容）
```typescript
// PostgreSQL字段：camelCase
// API字段：snake_case + camelCase

// 示例响应格式
{
  "uid": 1,              // PostgreSQL字段
  "student_id": 100,     // snake_case（前端使用）
  "studentId": 100,      // camelCase（新前端）
  "total_amount": 10000, // 分
  "totalAmount": 10000   // 分
}

// 转换示例
static toResponse(student: Student) {
  return {
    uid: student.uid,
    name: student.name,
    student_id: student.uid,    // 双命名
    studentId: student.uid,
    // ...
  };
}
```

## 控制器架构设计

### 分层架构
```
Controller Layer (控制器层)
    ↓
Service Layer (业务逻辑层 - StatsService等)
    ↓
Repository Layer (数据访问层 - StudentRepository等)
    ↓
Drizzle ORM (SQL生成)
    ↓
PostgreSQL (数据库)
```

### 控制器职责
1. **请求验证**: 验证输入参数格式和有效性
2. **业务编排**: 调用Repository或Service层完成业务逻辑
3. **数据转换**: 数据库格式 ↔ API响应格式转换
4. **响应格式化**: 统一输出格式
5. **错误处理**: 捕获和转换异常
6. **日志记录**: 记录操作日志

### 错误处理策略
```typescript
// 使用 catchAsync 包装器
import catchAsync from "@/utils/catchAsync";
import AppError from "@/utils/appError";

// 简化错误处理
export const getTransactionById = catchAsync(async (req, res, next) => {
  const transaction = await CashRepository.findByUid(Number(req.params.id));

  if (!transaction) {
    throw new AppError("交易不存在", 404);
  }

  res.json({
    success: true,
    data: presentTransaction(transaction),
  });
});
```

## 测试与质量

### 测试覆盖
- **单元测试**: 控制器方法测试
- **集成测试**: API端点测试
- **位置**: `backend/src/__tests__/api/*.spec.ts`

### 代码质量
- TypeScript严格模式
- 统一的错误处理（catchAsync + AppError）
- 输入验证和清理
- 请求日志记录

### 性能优化
- 分页查询限制（limit <= 100）
- 数据库查询优化（索引、聚合）
- 复杂统计使用Service层
- 异步处理

## 常见问题 (FAQ)

**Q: 控制器应该包含多少业务逻辑？**
A: 控制器应该是"薄"的，主要负责：
- 请求验证和参数提取
- 调用Repository或Service层方法
- 数据格式转换（如金额分/元转换）
- 格式化响应
- 错误处理

复杂业务逻辑应该放在Service层，数据访问应该放在Repository层。

**Q: 如何处理大量数据的分页？**
A:
```typescript
const page = parseInt(query.page) || 1;
const limit = Math.min(parseInt(query.limit) || 20, 100); // 限制最大值

const result = await Repository.findWithPagination({
  page,
  limit,
  // ...其他过滤条件
});

res.json({
  success: true,
  data: result.data,
  pagination: result.pagination,
});
```

**Q: 如何优化查询性能？**
A:
1. 使用PostgreSQL索引（在schema中定义）
2. 选择性字段查询
3. 分页限制结果集
4. 复杂聚合使用Service层的StatsService
5. 使用Drizzle的优化查询构建器

**Q: 金额转换如何处理？**
A:
```typescript
// 数据库存储：分（cents）
// API返回：元（yuan）

// 创建交易
const amountInYuan = parseFloat(req.body.amount); // 前端传入元
const amountInCents = Math.round(amountInYuan * 100); // 转换为分

const transaction = await CashRepository.create({
  amount: amountInCents,
  // ...
});

// 响应
res.json({
  success: true,
  data: {
    amount: amountInYuan,          // 元
    cash: amountInCents,          // 分（兼容旧前端）
  },
});
```

## 控制器使用示例

### 学员管理控制器（PostgreSQL版本）
```typescript
export const getAllStudents = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, search, class: classType } = req.query;

  const result = await StudentRepository.findWithPagination({
    page: Number(page),
    limit: Number(limit),
    nameContains: search as string,
  });

  // 转换为API响应格式
  const data = result.data.map(presentStudent);

  res.json({
    success: true,
    data,
    pagination: result.pagination,
  });
});

export const addStudentScore = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { score } = req.body;

  const student = await StudentRepository.findByUid(Number(id));
  if (!student) {
    throw new AppError("学员不存在", 404);
  }

  // 更新成绩数组
  const newRings = [...(student.rings || []), Number(score)];
  const updated = await StudentRepository.updateByUid(Number(id), {
    rings: newRings,
  });

  res.json({
    success: true,
    data: presentStudent(updated),
    message: "成绩添加成功",
  });
});
```

### 交易管理控制器（PostgreSQL版本）
```typescript
export const getAllTransactions = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, studentId } = req.query;

  let result;
  if (studentId) {
    result = await CashRepository.findWithPagination({
      page: Number(page),
      limit: Number(limit),
      student_id: Number(studentId),
    });
  } else {
    result = await CashRepository.findWithPagination({
      page: Number(page),
      limit: Number(limit),
    });
  }

  const data = result.data.map(presentTransaction);

  res.json({
    success: true,
    data,
    pagination: result.pagination,
  });
});

export const createInstallmentTransaction = catchAsync(
  async (req, res, next) => {
    const { installment_uid, paidAmount, note, studentId } = req.body;

    // 查找分期
    const installment = await InstallmentRepository.findByUid(
      Number(installment_uid)
    );
    if (!installment) {
      throw new AppError("分期计划不存在", 404);
    }

    // 金额转换：元 → 分
    const paidAmountCents = Math.round(parseFloat(paidAmount) * 100);

    // 创建交易
    const transaction = await CashRepository.create({
      studentId: Number(studentId),
      amount: paidAmountCents,
      note,
      installmentSnapshot: {
        uid: installment.uid,
        planId: installment.planId,
        installmentNumber: installment.installmentNumber,
      },
    });

    // 更新分期
    const newPaidAmount = (installment.paidAmount ?? 0) + paidAmountCents;
    await InstallmentRepository.updateByUid(installment.uid, {
      paidAmount: newPaidAmount,
      status: "PAID",
      paidDate: new Date().toISOString().split("T")[0],
    });

    // 刷新计划状态
    await InstallmentRepository.refreshPlanStatus(installment.planId);

    res.json({
      success: true,
      data: presentTransaction(transaction, {
        formatted_amount: `+¥${parseFloat(paidAmount).toFixed(2)}`,
      }),
      message: "分期交易创建成功",
    });
  }
);
```

### 统计数据控制器（PostgreSQL版本）
```typescript
export const getDashboardStats = catchAsync(async (req, res) => {
  const stats = await StatsService.getDashboardStats();

  res.json({
    success: true,
    data: {
      totalStudents: stats.totalStudents,
      totalRevenue: stats.totalRevenue / 100, // 分 → 元
      activeStudents: stats.activeStudents,
      membershipStats: stats.membership,
    },
  });
});

export const getFinancialStats = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;

  const stats = await CashRepository.getFinancialStats(
    startDate as string,
    endDate as string
  );

  res.json({
    success: true,
    data: {
      totalIncome: stats.totalIncome / 100,      // 分 → 元
      totalExpense: stats.totalExpense / 100,    // 分 → 元
      netIncome: stats.netIncome / 100,          // 分 → 元
      transactionCount: stats.transactionCount,
    },
  });
});
```

## 相关文件清单

```
backend/src/controllers/
├── studentController.ts        # 学员管理控制器（已迁移PostgreSQL）
├── scoreController.ts          # 成绩管理控制器（已迁移PostgreSQL）
├── cashController.ts           # 交易管理控制器（已迁移PostgreSQL）
├── installmentController.ts    # 分期付款控制器（已迁移PostgreSQL）
├── membershipController.ts     # 会员管理控制器（已迁移PostgreSQL）
├── statsController.ts          # 统计数据控制器（已迁移PostgreSQL）
└── adapterController.ts        # 数据库适配器控制器（已迁移PostgreSQL）
```

## 控制器架构图

```
┌─────────────────────────────────────────┐
│           HTTP Request                  │
│         (Express Router)                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│           Controller                    │
│  ┌─────────────────────────────────────┐ │
│  │  Request Validation & Parsing       │ │
│  │  Amount Conversion (cents↔yuan)     │ │
│  │  Business Logic Orchestration       │ │
│  │  Response Formatting (dual naming)  │ │
│  │  Error Handling (catchAsync)        │ │
│  └─────────────────────────────────────┘ │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴──────┐
        ▼             ▼
┌──────────────┐  ┌──────────────┐
│   Service    │  │  Repository  │
│     Layer    │  │    Layer     │
│  (StatsSvc)  │  │  (Student,   │
│              │  │   Cash, etc) │
└──────┬───────┘  └──────┬───────┘
       │                 │
       └────────┬────────┘
                ▼
┌─────────────────────────────────────────┐
│           Drizzle ORM                   │
│       (Type-safe SQL Generaton)         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│           PostgreSQL                    │
│         (15+ with ARRAY, CASE)          │
└─────────────────────────────────────────┘
```

## 迁移检查清单
- [x] studentController.ts - 迁移完成
- [x] cashController.ts - 迁移完成
- [x] membershipController.ts - 迁移完成
- [x] scoreController.ts - 迁移完成
- [x] statsController.ts - 迁移完成
- [x] adapterController.ts - 迁移完成
- [x] installmentController.ts - 迁移完成
- [x] 移除所有MongoDB依赖
- [x] 采用Repository模式
- [x] 金额分/元转换一致
- [x] 双命名兼容性保持

---

**最后更新**: 2026-01-08
**迁移状态**: PostgreSQL迁移完成（7/7控制器）
**维护者**: H-Chris233