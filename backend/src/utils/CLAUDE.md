[根目录](../../../CLAUDE.md) > [backend](../../) > [src](../) > **utils**

# 后端工具模块

## 变更记录 (Changelog)

### 2026-01-10 - 文档补全
- 添加后端工具模块完整文档
- 记录错误处理、金额转换、日期处理等工具函数
- 补全日志记录工具文档

---

## 模块职责

后端工具函数库，提供错误处理、金额转换、日期处理、数值工具和日志记录等通用功能。

**核心价值**：
- 统一的错误类型定义和处理
- 金额分/元安全转换
- 日期格式标准化
- 结构化日志记录

## 入口与启动

**核心工具文件**：
- `errors.ts` - 错误类型定义和处理
- `money.ts` - 金额转换工具
- `date.ts` - 日期处理工具
- `numberUtils.ts` - 数值工具
- `logger.ts` - 日志记录

## 对外接口

### 错误处理 (errors.ts)

**AppError 类** - 应用错误
```typescript
// 错误类型枚举
enum ErrorType {
  InvalidInput = 'InvalidInput',   // 400 - 输入验证失败
  NotFound = 'NotFound',           // 404 - 资源不存在
  State = 'State',                 // 409 - 状态冲突
  Unauthorized = 'Unauthorized',   // 401 - 未授权
  Forbidden = 'Forbidden',         // 403 - 禁止访问
  RateLimit = 'RateLimit',         // 429 - 速率限制
  Other = 'Other',                 // 500 - 其他错误
}

// 静态工厂方法
class AppError {
  static invalidInput(message: string, options?: AppErrorOptions): AppError
  static notFound(message: string, options?: AppErrorOptions): AppError
  static state(message: string, options?: AppErrorOptions): AppError
  static unauthorized(message: string, options?: AppErrorOptions): AppError
  static forbidden(message: string, options?: AppErrorOptions): AppError
  static rateLimited(message: string, options?: AppErrorOptions): AppError
  static other(message: string, options?: AppErrorOptions): AppError
}

// 错误转换
toAppError(input: unknown, fallback?: AppErrorFallbackOptions): AppError
ensureAppError(input: unknown, fallback?: AppErrorFallbackOptions): AppError

// 错误序列化
serializeError(error: AppError): SerializedError

// 类型守卫
isAppError(value: unknown): value is AppError
mapErrorTypeToStatus(type: ErrorType): number
```

**错误选项**
```typescript
interface AppErrorOptions {
  statusCode?: number;    // HTTP 状态码
  code?: string;          // 错误代码
  details?: unknown;      // 详细错误信息
  cause?: unknown;        // 原始错误
  expose?: boolean;       // 是否暴露给客户端
}
```

### 金额转换 (money.ts)

**核心功能**：
```typescript
// 分转元
centsToYuan(cents: number): number

// 元转分
yuanToCents(yuan: number): number

// 格式化金额（分）
formatMoneyCents(cents: number): string

// 格式化金额（元，带货币符号）
formatMoneyYuan(yuan: number): string

// 验证金额
isValidAmount(amount: number): boolean

// 金额范围检查
isAmountInRange(amount: number, min: number, max: number): boolean
```

### 日期处理 (date.ts)

**核心功能**：
```typescript
// 格式化日期
formatDate(date: Date | string, format?: string): string

// 解析日期
parseDate(date: string): Date | null

// 日期比较
compareDates(date1: Date | string, date2: Date | string): number

// 获取日期差（天）
getDaysDifference(date1: Date | string, date2: Date | string): number

// 添加天数
addDays(date: Date | string, days: number): Date

// 获取月份第一天
getFirstDayOfMonth(date: Date | string): Date

// 获取月份最后一天
getLastDayOfMonth(date: Date | string): Date

// 检查日期是否有效
isValidDate(date: any): boolean
```

### 数值工具 (numberUtils.ts)

**核心功能**：
```typescript
// 安全解析数字
safeParseNumber(value: unknown, fallback?: number): number

// 检查是否为有限数字
isFiniteNumber(value: unknown): boolean

// 范围限制
clamp(value: number, min: number, max: number): number

// 格式化数字（千分位）
formatNumber(num: number): string
```

### 日志记录 (logger.ts)

**logger 实例**：
```typescript
// 日志级别
logger.level: 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly'

// 日志方法
logger.error(message: string, meta?: object): void
logger.warn(message: string, meta?: object): void
logger.info(message: string, meta?: object): void
logger.http(message: string, meta?: object): void
logger.verbose(message: string, meta?: object): void
logger.debug(message: string, meta?: object): void
logger.silly(message: string, meta?: object): void

// 日志格式
// 开发环境：彩色控制台输出
// 生产环境：JSON 格式 + 文件输出

// 日志文件
logs/app.log           // 所有日志
logs/app-error.log     // 错误日志
logs/app-exceptions.log // 未捕获异常
```

## 关键依赖与配置

### 外部依赖
- **winston**: 日志框架
- **date-fns**: 日期处理（如果使用）

### 日志配置
```typescript
// config.logging
{
  level: 'info',           // 日志级别
  file: './logs/app.log'   // 日志文件路径
}
```

### 日志格式
```typescript
// JSON 格式（生产环境）
{
  "level": "error",
  "message": "Database connection failed",
  "timestamp": "2026-01-10T12:00:00.000Z",
  "service": "qmx-backend",
  "stack": "Error: ...",
  "meta": { /* 额外数据 */ }
}

// 控制台格式（开发环境）
2026-01-10 12:00:00 [error]: Database connection failed
```

## 测试与质量

### 测试覆盖
- **单元测试**: 金额转换、日期处理测试 (`date-money-consistency.spec.ts`)
- **错误处理测试**: `errorHandling.spec.ts`

### 代码质量
- TypeScript 严格模式
- 完善的类型定义
- 边界条件处理
- 错误信息国际化

### 性能优化
- 金额转换使用位运算（如果适用）
- 日期格式化缓存
- 日志异步写入

## 常见问题 (FAQ)

**Q: 如何添加新的错误类型？**
A:
```typescript
// 1. 在 ErrorType 枚举中添加
enum ErrorType {
  CustomError = 'CustomError',
}

// 2. 更新默认状态码映射
const DEFAULT_STATUS_CODE: Record<ErrorType, number> = {
  [ErrorType.CustomError]: 418,
};

// 3. 添加静态工厂方法
static customError(message: string, options?: AppErrorOptions): AppError {
  return new AppError(message, ErrorType.CustomError, options);
}
```

**Q: 金额转换精度问题？**
A:
```typescript
// 正确：使用 Math.round 避免浮点问题
const cents = Math.round(yuan * 100);

// 错误：直接相乘可能有精度问题
const cents = yuan * 100;
```

**Q: 日志文件过大怎么办？**
A:
```typescript
// 已配置日志轮转
new winston.transports.File({
  filename: 'app.log',
  maxsize: 5242880,  // 5MB
  maxFiles: 5,       // 保留5个文件
});
```

**Q: 如何在日志中排除敏感信息？**
A:
```typescript
// 手动过滤敏感字段
logger.info('User operation', {
  userId: user.id,
  // 排除 password, token 等
  password: undefined,
  token: undefined,
});
```

## 工具使用示例

### 错误处理示例
```typescript
import { AppError } from '@/utils/errors';

// 创建错误
if (!student) {
  throw AppError.notFound('学员不存在');
}

// 转换未知错误
try {
  await operation();
} catch (error) {
  throw toAppError(error, { type: ErrorType.Internal });
}

// 错误响应
res.status(error.statusCode).json({
  success: false,
  error: serializeError(error),
});
```

### 金额转换示例
```typescript
import { centsToYuan, yuanToCents, formatMoneyYuan } from '@/utils/money';

// API 接收元，存储分
const amountInYuan = parseFloat(req.body.amount);
const amountInCents = yuanToCents(amountInYuan);

// API 返回元
const responseAmount = centsToYuan(transaction.amount);

// 格式化显示
const formatted = formatMoneyYuan(1234.56); // "¥1,234.56"
```

### 日志记录示例
```typescript
import logger from '@/utils/logger';

// 基本日志
logger.info('学员创建成功', { uid: student.uid, name: student.name });

// 错误日志（包含堆栈）
logger.error('数据库错误', { error: error.message, query: 'SELECT...' });

// 结构化日志
logger.info('API请求', {
  method: req.method,
  url: req.originalUrl,
  statusCode: res.statusCode,
  duration: Date.now() - startTime,
});
```

## 相关文件清单

```
backend/src/utils/
├── errors.ts             # 错误类型和处理
├── money.ts              # 金额转换工具
├── date.ts               # 日期处理工具
├── numberUtils.ts        # 数值工具
└── logger.ts             # 日志记录
```

## 工具模块架构图

```
┌─────────────────────────────────────────┐
│         Controller / Service            │
│         (业务逻辑层)                     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│           Utils Layer                   │
│  ┌───────────────────────────────────┐  │
│  │  Error Handling                   │  │
│  │  ├── AppError                     │  │
│  │  ├── toAppError()                 │  │
│  │  └── serializeError()             │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  Data Transformers                │  │
│  │  ├── money.ts (金额)              │  │
│  │  ├── date.ts (日期)               │  │
│  │  └── numberUtils.ts (数值)        │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  Logging                          │  │
│  │  ├── logger                       │  │
│  │  ├── transports                   │  │
│  │  └── formatters                   │  │
│  └───────────────────────────────────┘  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         External Libraries              │
│  ├── winston (日志)                     │
│  ├── date-fns (日期 - 可选)             │
│  └── JavaScript Math (数值计算)         │
└─────────────────────────────────────────┘
```

---

**最后更新**: 2026-01-10
**维护者**: H-Chris233
