# 测试中的速率限制问题 (Rate Limiting in Tests)

## 问题概述

**严重程度**: 🟡 中  
**影响范围**: 交易API测试套件  
**失败测试数**: ~4个测试  
**问题类型**: 测试基础设施

## 问题描述

连续运行的API测试触发了速率限制器，导致后续测试因"请求过于频繁"而失败，并最终超时。

---

## 失败案例

**测试文件**: `transactions.api.spec.ts`

### 案例1: DELETE测试触发限流

```typescript
describe('DELETE /api/v1/transactions/:id', () => {
  it('deletes transaction', async () => {
    // ... 前面的测试已经发送了多个请求
    
    const response = await request(app)
      .delete(`/api/v1/transactions/${transaction.uid}`)
      .expect(200);  // ❌ 失败
  });
});
```

#### 错误信息:

```
AppError: API请求过于频繁，请在 60 秒后重试
```

### 案例2: 测试超时

```
thrown: "Exceeded timeout of 30000 ms for a test.
Add a timeout value to this test to increase the timeout, if this is a long-running test."
```

**原因**: 测试等待速率限制解除，但超过了Jest的30秒超时限制。

---

## 根本原因分析

### 原因1: 速率限制器在测试环境中启用

**文件**: `backend/src/middleware/rateLimiter.ts`（推测）

```typescript
import rateLimit from 'express-rate-limit';

// ❌ 问题：在所有环境中都启用限流
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 60秒窗口
  max: 100,             // 最多100个请求
  message: 'API请求过于频繁，请在 60 秒后重试',
});
```

### 原因2: 测试快速连续发送请求

单个测试套件可能在几秒内发送超过100个请求：

```typescript
describe('Transaction API', () => {
  // 每个测试发送3-5个请求
  it('test 1', ...);  // 5 requests
  it('test 2', ...);  // 4 requests
  it('test 3', ...);  // 3 requests
  // ...
  it('test 20', ...); // ❌ 超过限制
});
```

### 原因3: 限流器状态在测试间共享

```typescript
// 限流器使用内存存储，状态在所有测试间共享
const limiter = rateLimit({
  store: new MemoryStore(),  // ❌ 全局状态
});
```

---

## 解决方案

### 方案1: 在测试环境中禁用速率限制（推荐）

**文件**: `backend/src/middleware/rateLimiter.ts`

```typescript
import rateLimit from 'express-rate-limit';

// ✅ 根据环境决定是否启用
export const apiLimiter = 
  process.env.NODE_ENV === 'test'
    ? (req, res, next) => next()  // ✅ 测试环境直接跳过
    : rateLimit({
        windowMs: 60 * 1000,
        max: 100,
        message: 'API请求过于频繁，请在 60 秒后重试',
        standardHeaders: true,
        legacyHeaders: false,
      });

// 或者使用不同的配置
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 10000 : 100,  // ✅ 测试环境大幅提高限制
  message: 'API请求过于频繁，请在 60 秒后重试',
  skip: (req) => process.env.NODE_ENV === 'test',      // ✅ 或直接跳过
});
```

---

### 方案2: 每个测试重置限流器

**文件**: `backend/test/setupBackend.ts`

```typescript
import rateLimit from 'express-rate-limit';

// 导出重置函数
export function resetRateLimiter() {
  // 清除限流器的内存存储
  // 具体实现取决于使用的存储类型
}

// 在测试生命周期中使用
afterEach(async () => {
  await clearAllCollections();
  await resetAllSequences();
  resetRateLimiter();  // ✅ 重置限流器
});
```

---

### 方案3: 使用独立的限流器实例

为测试创建独立的Express应用，使用独立的限流器：

```typescript
// backend/test/setupBackend.ts
export async function createTestApp(): Promise<Express> {
  const app = express();
  
  // ✅ 测试应用不使用限流中间件
  if (process.env.NODE_ENV !== 'test') {
    app.use(apiLimiter);
  }
  
  // ... 其他中间件和路由
  
  return app;
}
```

---

### 方案4: 增加测试超时时间（不推荐）

虽然可以增加超时时间，但这不能解决根本问题：

```typescript
// ❌ 不推荐：掩盖问题
jest.setTimeout(60000);  // 60秒

describe('Tests', () => {
  it('test', async () => {
    // 如果触发限流，会等待60秒...
  });
});
```

---

## 配置示例

### 完整的限流器配置

**文件**: `backend/src/middleware/rateLimiter.ts`

```typescript
import rateLimit, { Options } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

// 基础配置
const baseConfig: Partial<Options> = {
  windowMs: 60 * 1000,  // 60秒窗口
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'API请求过于频繁，请稍后重试' },
};

// 生产环境配置（使用Redis）
const productionLimiter = rateLimit({
  ...baseConfig,
  max: 100,
  store: new RedisStore({
    client: createClient({ url: process.env.REDIS_URL }),
  }),
});

// 开发环境配置（使用内存）
const developmentLimiter = rateLimit({
  ...baseConfig,
  max: 1000,  // 更宽松的限制
});

// 测试环境配置（无限制）
const testLimiter = (req, res, next) => next();

// 根据环境选择
export const apiLimiter = 
  process.env.NODE_ENV === 'production' ? productionLimiter :
  process.env.NODE_ENV === 'development' ? developmentLimiter :
  testLimiter;

// 更严格的限制（登录等）
export const strictLimiter = 
  process.env.NODE_ENV === 'test'
    ? testLimiter
    : rateLimit({
        ...baseConfig,
        windowMs: 15 * 60 * 1000,  // 15分钟
        max: 5,                     // 最多5次
        message: { error: '尝试次数过多，请15分钟后重试' },
      });
```

---

## 应用到路由

### 选择性应用限流

```typescript
// backend/src/routes/index.ts
import express from 'express';
import { apiLimiter, strictLimiter } from '@/middleware/rateLimiter';

const router = express.Router();

// 全局限流（仅生产环境）
if (process.env.NODE_ENV === 'production') {
  router.use(apiLimiter);
}

// 特定端点使用严格限流
router.post('/auth/login', strictLimiter, authController.login);
router.post('/auth/register', strictLimiter, authController.register);

// 其他路由
router.use('/students', studentRoutes);
router.use('/transactions', transactionRoutes);

export default router;
```

---

## 测试策略

### 策略1: 单元测试限流器

```typescript
// backend/src/__tests__/middleware/rateLimiter.spec.ts
import request from 'supertest';
import express from 'express';
import { apiLimiter } from '@/middleware/rateLimiter';

describe('Rate Limiter', () => {
  let app: express.Express;
  
  beforeEach(() => {
    app = express();
    app.use(apiLimiter);
    app.get('/test', (req, res) => res.json({ ok: true }));
  });
  
  it('allows requests within limit', async () => {
    for (let i = 0; i < 10; i++) {
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
    }
  });
  
  it('blocks requests exceeding limit', async () => {
    // 如果需要测试限流行为
    // 使用专门的测试配置
  });
});
```

### 策略2: 集成测试跳过限流

```typescript
// backend/src/__tests__/api/transactions.api.spec.ts
describe('Transaction API', () => {
  beforeAll(async () => {
    // 确保测试环境变量
    process.env.NODE_ENV = 'test';
    
    await setupTestDatabase();
    app = await createTestApp();  // 会跳过限流器
  });
  
  // 测试正常进行，不受限流影响
});
```

---

## 监控和调试

### 添加限流日志

```typescript
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  onLimitReached: (req, res, options) => {
    console.warn(`限流触发: ${req.ip} - ${req.method} ${req.path}`);
  },
  skip: (req) => {
    const shouldSkip = process.env.NODE_ENV === 'test';
    if (shouldSkip) {
      console.log(`[限流器] 跳过测试环境请求: ${req.method} ${req.path}`);
    }
    return shouldSkip;
  },
});
```

### 检查限流状态

```bash
# 查看响应头
curl -I http://localhost:3001/api/v1/students

# 生产环境会返回：
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 95
# X-RateLimit-Reset: 1678901234

# 测试环境不应该有这些头
```

---

## 验证修复

### 测试1: 环境变量检查

```bash
cd backend

# 确保测试使用正确的环境
NODE_ENV=test npm test

# 检查日志，应该看到限流器被跳过
```

### 测试2: 运行失败的测试

```bash
# 运行交易API测试
npm test -- --testPathPattern="transactions.api"

# 应该不再有限流错误
# ✅ 无 "API请求过于频繁" 错误
# ✅ 无超时错误
```

### 测试3: 手动压力测试

```bash
# 快速发送多个请求（测试环境）
for i in {1..200}; do
  curl -s http://localhost:3001/api/v1/students > /dev/null &
done
wait

# 应该全部成功（无限流）
```

---

## 生产环境考虑

### 使用Redis存储

内存存储在多实例部署时不共享状态：

```typescript
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL,
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:',  // Redis key前缀
  }),
});
```

### 分级限流

不同端点不同的限制：

```typescript
// 查询操作 - 宽松
export const readLimiter = rateLimit({ max: 1000 });

// 写入操作 - 中等
export const writeLimiter = rateLimit({ max: 100 });

// 认证操作 - 严格
export const authLimiter = rateLimit({ max: 5 });

// 应用
router.get('/students', readLimiter, controller.getAll);
router.post('/students', writeLimiter, controller.create);
router.post('/login', authLimiter, authController.login);
```

---

## 相关文档

- [[00-overview-and-summary.md]] - 整体测试状态
- [[06-validation-failures.md]] - 输入验证
- [[03-async-resource-leaks.md]] - 资源管理

---

## 参考资源

- [express-rate-limit文档](https://github.com/express-rate-limit/express-rate-limit)
- [Rate Limiting最佳实践](https://blog.logrocket.com/rate-limiting-node-js/)

---

**文档创建**: 2025-11-12  
**最后更新**: 2025-11-12  
**优先级**: 🟡 中  
**预计工作量**: 1-2小时  
**修复后预期**: 所有限流相关测试失败消除
