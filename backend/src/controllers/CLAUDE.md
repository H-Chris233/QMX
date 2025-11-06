[根目录](../../../CLAUDE.md) > [backend](../../) > [src](../) > **controllers**

# 控制器模块

## 变更记录 (Changelog)

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

**控制器文件**：
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
- **@/models**: 数据模型层
- **@/middleware**: 中间件
- **@/utils**: 工具函数

### 请求处理流程
```typescript
// 标准处理流程
const handleRequest = async (req, res, next) => {
  try {
    // 1. 参数验证和提取
    const { params, query, body } = req;

    // 2. 调用服务层处理业务逻辑
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

## 控制器架构设计

### 分层架构
```
Controller Layer (控制器层)
    ↓
Service Layer (业务逻辑层)
    ↓
Model Layer (数据访问层)
    ↓
Database Layer (数据库层)
```

### 控制器职责
1. **请求验证**: 验证输入参数格式和有效性
2. **业务编排**: 调用服务层完成业务逻辑
3. **响应格式化**: 统一输出格式
4. **错误处理**: 捕获和转换异常
5. **日志记录**: 记录操作日志

### 错误处理策略
```typescript
// 统一错误处理
const handleControllerError = (error, req, res, next) => {
  if (error instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details
    });
  }

  if (error instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      error: 'Resource not found'
    });
  }

  // 其他错误传递给全局错误处理器
  next(error);
};
```

## 测试与质量

### 测试覆盖
- **单元测试**: 控制器方法测试
- **集成测试**: API端点测试
- **测试文件**: `__tests__/api/*.spec.ts`

### 代码质量
- TypeScript严格模式
- 统一的错误处理
- 输入验证和清理
- 请求日志记录

### 性能优化
- 分页查询限制
- 数据库查询优化
- 缓存热点数据
- 异步处理

## 常见问题 (FAQ)

**Q: 控制器应该包含多少业务逻辑？**
A: 控制器应该是"薄"的，主要负责：
- 请求验证和参数提取
- 调用服务层方法
- 格式化响应
- 错误处理

复杂业务逻辑应该放在Service层。

**Q: 如何处理大量数据的分页？**
A:
```typescript
const page = parseInt(query.page) || 1;
const limit = Math.min(parseInt(query.limit) || 20, 100); // 限制最大值
const skip = (page - 1) * limit;

const result = await service.getData({ skip, limit, ...query });
```

**Q: 如何优化查询性能？**
A:
1. 使用数据库索引
2. 选择性字段查询
3. 分页限制结果集
4. 缓存常用数据

**Q: 如何处理并发请求？**
A:
1. 使用数据库事务
2. 实现乐观锁机制
3. 队列处理长时间操作
4. 速率限制API调用

## 控制器使用示例

### 学员管理控制器
```typescript
// 获取学员列表
export const getAllStudents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, search, class: classType } = req.query;

    const result = await studentQuery.searchStudents({
      page: Number(page),
      limit: Number(limit),
      search: search as string,
      class: classType as string
    });

    res.json({
      success: true,
      data: result.students,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};
```

### 交易管理控制器
```typescript
// 创建交易
export const createTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transactionData = transactionCreateSchema.parse(req.body);
    const transaction = await cashBuilder.create(transactionData);

    res.status(201).json({
      success: true,
      data: transaction,
      message: '交易创建成功'
    });
  } catch (error) {
    next(error);
  }
};
```

## 相关文件清单

```
backend/src/controllers/
├── studentController.ts        # 学员管理控制器
├── scoreController.ts          # 成绩管理控制器
├── cashController.ts           # 交易管理控制器
├── installmentController.ts    # 分期付款控制器
├── membershipController.ts     # 会员管理控制器
├── statsController.ts          # 统计数据控制器
└── adapterController.ts        # 数据库适配器控制器
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
│  │  Business Logic Orchestration       │ │
│  │  Response Formatting                │ │
│  │  Error Handling                     │ │
│  └─────────────────────────────────────┘ │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│           Service Layer                 │
│    (Business Logic Implementation)      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│           Model Layer                   │
│      (Data Access & Validation)         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│           Database                      │
│         (MongoDB)                       │
└─────────────────────────────────────────┘
```

---

**最后更新**: 2025-11-06T06:48:29+0000