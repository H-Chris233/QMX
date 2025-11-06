[根目录](../../../CLAUDE.md) > [backend](../../) > [src](../) > **middleware**

# 中间件模块

## 变更记录 (Changelog)

### 2025-11-06T06:48:29+0000
- 初始化模块文档
- 记录中间件架构和安全机制

---

## 模块职责

Express中间件，处理请求拦截、验证、安全检查和错误处理。确保API安全性和数据完整性。

**核心价值**：
- 请求验证和安全检查
- 错误统一处理
- 速率限制和保护
- 日志记录和监控

## 入口与启动

**核心中间件文件**：
- `errorHandler.ts` - 错误处理中间件
- `validation.ts` - 数据验证中间件
- `rateLimiter.ts` - 速率限制中间件

## 对外接口

### 错误处理中间件

**errorHandler.ts** - 全局错误处理器
```typescript
// 主要功能：
- errorHandler()            // 全局错误处理
- notFound()                // 404错误处理
- asyncHandler()            // 异步错误包装
- AppError                  // 自定义错误类

// 错误类型：
- ValidationError          // 验证错误
- NotFoundError            // 资源不存在
- UnauthorizedError        // 未授权
- ForbiddenError           // 禁止访问
- ConflictError            // 冲突错误
```

**验证中间件** (`validation.ts`) - 请求数据验证
```typescript
// 主要功能：
- validateRequest()        // 请求体验证
- validateParams()         // 路径参数验证
- validateQuery()          // 查询参数验证
- validateFile()           // 文件上传验证

// 验证规则：
- Joi Schema定义
- 自定义验证器
- 错误信息格式化
```

**速率限制中间件** (`rateLimiter.ts`) - API调用频率控制
```typescript
// 主要功能：
- rateLimitMiddleware()    // 通用速率限制
- createRateLimiter()      // 自定义速率限制器
- get_client_ip()          // IP地址获取

// 限制策略：
- 基于IP的限制
- 基于用户的限制
- 端点特定限制
- 滑动窗口算法
```

## 关键依赖与配置

### 外部依赖
- **joi**: 数据验证库
- **rate-limiter-flexible**: 速率限制
- **helmet**: 安全头部
- **cors**: 跨域处理
- **compression**: 响应压缩

### 中间件配置
```typescript
// 错误处理配置
const errorConfig = {
  development: {
    showStack: true,
    logErrors: true
  },
  production: {
    showStack: false,
    logErrors: true,
    sendToSentry: true
  }
};

// 验证配置
const validationConfig = {
  abortEarly: false,    // 返回所有验证错误
  allowUnknown: false,  // 拒绝未知字段
  stripUnknown: true    // 移除未知字段
};

// 速率限制配置
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000,  // 15分钟
  max: 100,                  // 最大请求数
  skipSuccessfulRequests: false,
  skipFailedRequests: false
};
```

### 安全配置
```typescript
// CORS配置
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:1420'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// 安全头部配置
const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"]
    }
  }
};
```

## 中间件架构设计

### 执行顺序
```typescript
// Express中间件执行顺序
app.use(helmet(helmetOptions));        // 1. 安全头部
app.use(cors(corsOptions));            // 2. 跨域处理
app.use(compression());                // 3. 响应压缩
app.use(express.json());               // 4. 请求体解析
app.use(rateLimitMiddleware);          // 5. 速率限制
app.use(requestLogger);                // 6. 请求日志
app.use('/api/v1', routes);            // 7. 路由处理
app.use(notFound);                     // 8. 404处理
app.use(errorHandler);                 // 9. 错误处理
```

### 错误处理策略
```typescript
// 分层错误处理
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // 1. 记录错误日志
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // 2. 分类错误类型
  if (err instanceof ValidationError) {
    return handleValidationError(err, res);
  }

  if (err instanceof NotFoundError) {
    return handleNotFoundError(err, res);
  }

  // 3. 默认错误处理
  return handleGenericError(err, res);
};
```

### 验证流程
```typescript
// 验证中间件模式
const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const validationError = new ValidationError('Request validation failed');
      validationError.details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      return next(validationError);
    }

    req.body = value;  // 使用验证后的数据
    next();
  };
};
```

## 测试与质量

### 测试覆盖
- **单元测试**: 中间件函数测试
- **集成测试**: 中间件组合测试
- **安全测试**: 恶意请求测试

### 代码质量
- TypeScript严格模式
- 错误类型定义
- 性能监控
- 安全扫描

### 性能优化
- 缓存验证结果
- 异步错误处理
- 内存使用监控
- 响应时间优化

## 常见问题 (FAQ)

**Q: 中间件执行顺序有什么要求？**
A: 中间件执行顺序很重要：
1. 安全相关中间件（helmet, cors）应该最先
2. 基础解析中间件（json, urlencoded）在中间
3. 业务逻辑中间件（验证, 认证）在后面
4. 错误处理中间件必须最后

**Q: 如何处理异步错误？**
A:
1. 使用try-catch包装异步代码
2. 使用asyncHandler包装器
3. 确保next(error)被调用
4. 不要在异步函数中抛出错误

**Q: 如何自定义错误类型？**
A:
```typescript
class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  public details: any[];

  constructor(message: string, details?: any[]) {
    super(message, 400);
    this.details = details || [];
  }
}
```

**Q: 如何优化速率限制？**
A:
1. 使用Redis存储限制计数
2. 实现分层限制策略
3. 考虑不同端点的不同限制
4. 监控限制效果

## 中间件使用示例

### 自定义验证中间件
```typescript
import Joi from 'joi';
import { validateRequest } from '@/middleware/validation';

// 定义验证Schema
const studentCreateSchema = Joi.object({
  name: Joi.string().required().min(1).max(50),
  age: Joi.number().integer().min(0).max(120).optional(),
  phone: Joi.string().pattern(/^1[3-9]\d{9}$/).required(),
  class: Joi.string().valid('TenTry', 'Month', 'Year', 'Others').required(),
  subject: Joi.string().valid('Shooting', 'Archery', 'Others').required()
});

// 在路由中使用
router.post('/students',
  validateRequest(studentCreateSchema),
  studentController.createStudent
);
```

### 自定义错误处理
```typescript
import { AppError } from '@/middleware/errorHandler';

// 在控制器中使用
export const getStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const student = await Student.findByUid(req.params.uid);

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    next(error);
  }
};
```

### 自定义速率限制
```typescript
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { createRateLimiter } from '@/middleware/rateLimiter';

// 创建API特定的速率限制器
const apiRateLimiter = createRateLimiter({
  keyGenerator: (req) => req.ip,
  points: 100,           // 请求数
  duration: 60,          // 时间窗口（秒）
  blockDuration: 60      // 阻塞时间（秒）
});

// 在路由中使用
router.use('/api/v1', apiRateLimiter);
```

## 相关文件清单

```
backend/src/middleware/
├── errorHandler.ts          # 错误处理中间件
├── validation.ts            # 数据验证中间件
└── rateLimiter.ts           # 速率限制中间件
```

## 中间件架构图

```
┌─────────────────────────────────────────┐
│           HTTP Request                  │
│         (Client Request)                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│           Security Layer                │
│  ┌─────────────┬─────────────────────┐  │
│  │   Helmet    │        CORS         │  │
│  │ (Headers)   │     (Cross-Origin)  │  │
│  └─────────────┴─────────────────────┘  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│           Parsing Layer                 │
│  ┌─────────────┬─────────────────────┐  │
│  │   JSON      │     URL Encoded     │  │
│  │   Parser    │      Parser         │  │
│  └─────────────┴─────────────────────┘  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│           Protection Layer              │
│  ┌─────────────┬─────────────────────┐  │
│  │ Rate Limit  │    Request Logger   │  │
│  │  Middleware │      Middleware     │  │
│  └─────────────┴─────────────────────┘  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│           Validation Layer              │
│  ┌─────────────┬─────────────────────┐  │
│  │   Input     │    Authentication  │  │
│  │ Validation  │      Middleware    │  │
│  └─────────────┴─────────────────────┘  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│           Route Handler                 │
│         (Controller Logic)              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│           Error Handling                │
│  ┌─────────────┬─────────────────────┐  │
│  │   404       │    Global Error     │  │
│  │  Handler    │     Handler         │  │
│  └─────────────┴─────────────────────┘  │
└─────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│           HTTP Response                 │
│        (Client Response)                │
└─────────────────────────────────────────┘
```

---

**最后更新**: 2025-11-06T06:48:29+0000