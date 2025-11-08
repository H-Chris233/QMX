# QMX 后端测试指南

## 测试环境

本项目使用 Jest 和 MongoDB Memory Server 进行后端测试。每个测试文件都会启动独立的内存数据库实例，确保测试之间完全隔离。

## 运行测试

### 基本命令

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- --testPathPattern="students"

# 运行特定测试套件
npm test -- --testPathPattern="api"

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

### 并发测试

```bash
# 使用2个worker并发运行
npm test -- --maxWorkers=2

# 使用50%的CPU核心（默认配置）
npm test -- --maxWorkers=50%

# 使用4个worker
npm test -- --maxWorkers=4

# 串行运行（调试时有用）
npm test -- --runInBand
```

## 测试架构

### 数据库设置

每个测试文件遵循以下生命周期：

```typescript
import {
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllCollections,
  resetAllSequences,
  createTestApp,
  TestDataFactory
} from '../../../test/setupBackend';

describe('My Test Suite', () => {
  let app: any;

  // 启动测试数据库（使用随机端口）
  beforeAll(async () => {
    await setupTestDatabase();
    app = await createTestApp(); // 仅API测试需要
  });

  // 清理每个测试的数据
  afterEach(async () => {
    await clearAllCollections();
    await resetAllSequences();
  });

  // 关闭测试数据库
  afterAll(async () => {
    await cleanupTestDatabase();
  });

  it('should work', async () => {
    // 测试代码
  });
});
```

### 测试数据工厂

使用 `TestDataFactory` 创建测试数据：

```typescript
// 创建学生
const student = await TestDataFactory.createStudent({
  name: 'John Doe',
  phone: '13800138000',
  class: ClassType.MONTH,
  subject: SubjectType.SHOOTING
});

// 创建交易
const transaction = await TestDataFactory.createCashTransaction(100, {
  studentId: student.uid,
  note: 'Payment'
});

// 创建分期计划
const plan = await TestDataFactory.createInstallmentPlan(
  1200,
  4,
  PaymentFrequency.MONTHLY,
  new Date(),
  { studentId: student.uid }
);
```

## CI/CD 环境

### 端口配置

MongoDB Memory Server 会自动选择可用的随机端口，无需手动配置。这确保了：

- ✅ 并发测试不会发生端口冲突
- ✅ CI环境可以安全地并行运行测试
- ✅ 每个测试进程完全隔离

### GitHub Actions 示例

```yaml
name: Backend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        working-directory: ./backend
```

## 故障排查

### 测试超时

如果测试超时，增加超时时间：

```typescript
jest.setTimeout(30000); // 30秒
```

### 数据库连接问题

如果遇到 MongoDB 连接问题：

1. 确保每个测试文件都正确调用了 `setupTestDatabase()` 和 `cleanupTestDatabase()`
2. 检查是否在 `afterEach` 中清理了数据
3. 使用 `--runInBand` 串行运行以排除并发问题

### 端口冲突（已修复）

如果遇到 `EADDRINUSE` 错误：

- ✅ 已修复：MongoDB Memory Server 现在使用随机端口
- 详见：`backend/test/PORT_CONFLICT_FIX.md`

### 验证修复

运行验证脚本：

```bash
cd backend/test
./verify-port-fix.sh
```

## 测试覆盖率

当前测试覆盖情况：

- Counter 工具: 100%
- 错误处理: 100%
- 统计服务: 100%
- API 端点: 部分覆盖（持续改进中）

目标：≥75% 整体覆盖率

## 最佳实践

1. **独立性**: 每个测试应该独立运行，不依赖其他测试
2. **清理**: 使用 `afterEach` 清理测试数据
3. **工厂模式**: 使用 `TestDataFactory` 创建测试数据
4. **时区**: 使用 UTC 时间，避免时区问题
5. **描述性**: 测试名称应该清楚描述测试内容

## 相关文档

- [端口冲突修复说明](./PORT_CONFLICT_FIX.md)
- [测试基础设施](./setupBackend.ts)
- [Jest 配置](../jest.config.ts)
