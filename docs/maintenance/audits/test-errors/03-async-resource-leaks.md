# 异步资源泄漏问题 (Async Resource Leaks)

## 问题概述

**严重程度**: 🟡 中  
**影响范围**: 测试环境清理  
**表现**: Jest进程不退出

## 问题描述

测试运行完成后，Jest报告：

```
Jest did not exit one second after the test run has completed.
This usually means that there are asynchronous operations that weren't stopped in your tests.
Consider running Jest with `--detectOpenHandles` to troubleshoot this issue.
```

这表明存在未正确关闭的异步资源，导致Node.js进程保持活动状态。

---

## 症状

### 1. 进程不退出
- ✅ 所有测试执行完成
- ✅ 测试结果已输出
- ❌ Jest进程持续运行1秒以上
- ❌ 需要手动终止或超时退出

### 2. CI/CD影响
- 测试任务可能超时
- 资源未释放导致内存泄漏
- 并发测试可能受影响

---

## 可能的根本原因

### 1. MongoDB连接未关闭

**最可能的原因** ✅

#### 证据：
- 测试使用 MongoDB Memory Server
- 每个测试文件调用 `setupTestDatabase()` 和 `cleanupTestDatabase()`
- 可能存在连接池未完全关闭

#### 问题位置：

**文件**: `backend/test/setupBackend.ts`

```typescript
export async function cleanupTestDatabase(): Promise<void> {
  console.log('[setupBackend] 正在断开 mongoose 连接...');
  
  // ❌ 可能问题1: 连接未完全关闭
  await mongoose.connection.close();
  
  // ❌ 可能问题2: 断开时机
  await mongoose.disconnect();
  
  console.log('[setupBackend] 正在停止 MongoDB 服务器...');
  if (mongoServer) {
    // ❌ 可能问题3: Memory Server未完全停止
    await mongoServer.stop();
  }
}
```

#### 潜在问题：
1. **双重断开**: 调用了 `connection.close()` 和 `disconnect()`，可能冲突
2. **连接池**: Mongoose连接池可能有活动连接
3. **异步顺序**: 断开顺序可能不对

---

### 2. Express应用未关闭

#### 问题：

**文件**: `backend/test/setupBackend.ts:142-165`

```typescript
export async function createTestApp(): Promise<Express> {
  const app = express();
  
  // ... 设置路由
  
  // ❌ 问题：没有返回server实例
  // 测试结束时无法关闭HTTP服务器
  return app;
}
```

#### 测试文件使用：

```typescript
describe('Student API Integration Tests', () => {
  let app: any;  // ❌ 只保存了Express app，没有server
  
  beforeAll(async () => {
    await setupTestDatabase();
    app = await createTestApp();
  });
  
  afterAll(async () => {
    await cleanupTestDatabase();
    // ❌ 没有关闭HTTP服务器
  });
});
```

---

### 3. 定时器未清理

#### 可能的定时器：

**文件**: `backend/test/setupBackend.ts:152-160`

```typescript
// ⚠️ 异步加载路由
setTimeout(async () => {
  console.log('=== createTestApp: 开始加载实际路由 ===');
  const routes = (await import('../src/routes/index')).default;
  app.use('/api/v1', routes);
  console.log('=== createTestApp: 路由加载完成 ===');
}, 100);
```

**问题**: 虽然设置了200ms等待，但如果测试提前结束，定时器可能仍在运行。

---

### 4. MongoDB Memory Server子进程

MongoDB Memory Server启动了mongod子进程：

```bash
# 可能的僵尸进程
mongod --port 40131 --dbpath /tmp/...
```

**问题**: 
- 子进程可能未正确清理
- 文件句柄未关闭
- 临时文件夹未删除

---

## 诊断步骤

### 1. 检测开放句柄

```bash
cd backend
npm test -- --detectOpenHandles --runInBand
```

**预期输出**: Jest会列出所有未关闭的资源

### 2. 检查MongoDB连接

添加调试日志：

```typescript
// backend/test/setupBackend.ts
export async function cleanupTestDatabase(): Promise<void> {
  console.log('[Cleanup] Mongoose连接状态:', mongoose.connection.readyState);
  console.log('[Cleanup] 活动连接数:', mongoose.connections.length);
  
  await mongoose.connection.close();
  
  console.log('[Cleanup] 关闭后状态:', mongoose.connection.readyState);
}
```

### 3. 检查进程和端口

```bash
# 测试运行时，检查MongoDB进程
ps aux | grep mongod

# 检查占用的端口
lsof -i :27017
lsof -i :40000-50000  # MongoDB Memory Server使用的范围
```

---

## 解决方案

### 方案1: 强制关闭Mongoose连接（推荐）

```typescript
// backend/test/setupBackend.ts
export async function cleanupTestDatabase(): Promise<void> {
  console.log('[setupBackend] 正在断开 mongoose 连接...');
  
  try {
    // ✅ 方案1: 强制关闭所有连接
    await mongoose.connection.close(true);  // 添加 force=true
    
    // ✅ 移除第二次断开调用（避免冲突）
    // await mongoose.disconnect();  // ❌ 删除这行
    
    console.log('[setupBackend] Mongoose连接已关闭');
  } catch (error) {
    console.error('[setupBackend] 关闭Mongoose连接失败:', error);
  }
  
  console.log('[setupBackend] 正在停止 MongoDB 服务器...');
  if (mongoServer) {
    await mongoServer.stop({ doCleanup: true });  // ✅ 添加清理选项
    mongoServer = null;  // ✅ 清空引用
    console.log('[setupBackend] MongoDB服务器已停止');
  }
  
  console.log('🧹 测试数据库已清理');
}
```

---

### 方案2: 统一资源管理

创建全局清理函数：

```typescript
// backend/test/globalTeardown.ts
export default async function globalTeardown() {
  console.log('🧹 全局清理开始...');
  
  // 1. 关闭所有Mongoose连接
  await mongoose.connection.close(true);
  await mongoose.disconnect();
  
  // 2. 停止所有MongoDB Memory Server实例
  // （需要全局跟踪实例）
  
  // 3. 清理临时文件
  
  // 4. 等待所有异步操作完成
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('✅ 全局清理完成');
}
```

配置Jest：

```javascript
// backend/jest.config.ts
export default {
  // ...
  globalTeardown: '<rootDir>/test/globalTeardown.ts',
};
```

---

### 方案3: 改进测试生命周期

每个测试文件：

```typescript
describe('Student API Tests', () => {
  let app: Express;
  let server: Server;  // ✅ 保存server实例
  
  beforeAll(async () => {
    await setupTestDatabase();
    app = await createTestApp();
    // server = app.listen(0);  // 如果需要实际监听
  });
  
  afterAll(async () => {
    // ✅ 1. 先关闭HTTP服务器
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    
    // ✅ 2. 再关闭数据库
    await cleanupTestDatabase();
    
    // ✅ 3. 等待清理完成
    await new Promise(resolve => setTimeout(resolve, 100));
  });
});
```

---

### 方案4: 使用Jest环境

创建自定义Jest环境：

```typescript
// backend/test/MongoEnvironment.ts
import NodeEnvironment from 'jest-environment-node';
import { MongoMemoryServer } from 'mongodb-memory-server';

class MongoEnvironment extends NodeEnvironment {
  private mongoServer?: MongoMemoryServer;
  
  async setup() {
    await super.setup();
    this.mongoServer = await MongoMemoryServer.create();
    this.global.__MONGO_URI__ = this.mongoServer.getUri();
  }
  
  async teardown() {
    await this.mongoServer?.stop({ doCleanup: true });
    await super.teardown();
  }
}

export default MongoEnvironment;
```

配置：

```javascript
// jest.config.ts
export default {
  testEnvironment: '<rootDir>/test/MongoEnvironment.ts',
};
```

---

## 验证修复

### 测试1: 快速退出

```bash
cd backend
time npm test

# 预期：测试完成后立即退出（不等待1秒）
```

### 测试2: 无开放句柄

```bash
npm test -- --detectOpenHandles

# 预期：无警告信息
```

### 测试3: 进程清理

```bash
# 测试前
ps aux | grep mongo | wc -l

# 运行测试
npm test &
TEST_PID=$!

# 测试中
sleep 10
ps aux | grep mongo  # 应该看到mongod进程

# 测试后等待
wait $TEST_PID
sleep 2
ps aux | grep mongo  # 应该没有残留进程
```

---

## 相关配置文件

### 1. Jest配置

**文件**: `backend/jest.config.ts`

```typescript
export default {
  testTimeout: 30000,
  detectOpenHandles: true,  // ✅ 添加此选项（开发时）
  forceExit: false,         // ❌ 不要使用强制退出
  // ...
};
```

### 2. MongoDB Memory Server配置

**文件**: `backend/test/setupBackend.ts`

```typescript
const mongoServer = await MongoMemoryServer.create({
  instance: {
    dbName: 'test',
  },
  binary: {
    version: '7.0.0',  // 使用稳定版本
  },
});
```

---

## 注意事项

### ⚠️ 不要使用 `--forceExit`

虽然 `jest --forceExit` 可以强制退出，但这会：
- ❌ 隐藏真正的问题
- ❌ 可能导致数据损坏
- ❌ CI环境中不可靠

### ✅ 正确做法

1. 找到并修复所有资源泄漏
2. 确保清理函数正确执行
3. 使用 `--detectOpenHandles` 诊断问题

---

## 监控和日志

### 添加清理日志

```typescript
export async function cleanupTestDatabase(): Promise<void> {
  const startTime = Date.now();
  console.log('[Cleanup] 开始清理...');
  
  try {
    console.log('[Cleanup] Mongoose状态:', mongoose.connection.readyState);
    await mongoose.connection.close(true);
    console.log('[Cleanup] Mongoose已关闭');
    
    if (mongoServer) {
      console.log('[Cleanup] 停止MongoDB Memory Server...');
      await mongoServer.stop({ doCleanup: true });
      console.log('[Cleanup] MongoDB Memory Server已停止');
    }
    
    const duration = Date.now() - startTime;
    console.log(`[Cleanup] 清理完成，耗时: ${duration}ms`);
  } catch (error) {
    console.error('[Cleanup] 清理失败:', error);
    throw error;
  }
}
```

---

## 相关问题

可能的连锁反应：
- [[04-test-data-isolation.md]] - 资源泄漏可能导致测试数据污染
- [[02-api-endpoint-mismatches.md]] - HTTP服务器未关闭可能影响端口占用

---

## 参考资料

- [Jest: Detecting Async Operations](https://jestjs.io/docs/troubleshooting#tests-are-extremely-slow-on-docker-andor-continuous-integration-ci-server)
- [MongoDB Memory Server: Cleanup](https://github.com/nodkz/mongodb-memory-server)
- [Mongoose: Connection Management](https://mongoosejs.com/docs/connections.html)

---

**文档创建时间**: 2025-11-12  
**最后更新**: 2025-11-12  
**优先级**: 中（影响开发体验，但不阻塞测试）
