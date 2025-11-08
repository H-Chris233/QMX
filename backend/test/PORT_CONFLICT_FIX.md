# MongoDB Memory Server 端口冲突修复

## 问题描述

在 CI 环境中并发运行测试时，多个测试套件会同时尝试启动 MongoDB Memory Server，由于之前配置了固定端口（27018），导致出现端口占用冲突（EADDRINUSE）错误。

## 根本原因

在 `test/setupBackend.ts` 中，MongoDB Memory Server 配置使用了固定端口：

```typescript
const mongoConfig = {
  instance: {
    dbName: 'qmx-test-db',
    port: 27018, // 固定端口导致并发冲突
  },
  ...
};
```

当 Jest 使用 `maxWorkers` 并发运行多个测试文件时，每个测试文件都会尝试在端口 27018 上启动自己的 MongoDB Memory Server 实例，导致端口冲突。

## 解决方案

移除固定端口配置，让 MongoDB Memory Server 自动选择可用的随机端口：

```typescript
const mongoConfig = {
  instance: {
    dbName: 'qmx-test-db',
    // 不指定端口，让系统自动分配随机可用端口，避免并发测试时的端口冲突
  },
  binary: {
    version: '7.0.0',
  },
  autoStart: false,
};
```

## 优势

1. **并发安全**：每个测试进程都会获得独立的随机端口，完全隔离
2. **CI 友好**：在 CI 环境中可以安全地并发运行测试，提高执行速度
3. **无需配置**：不需要为每个测试进程手动分配端口范围
4. **零冲突**：系统自动选择空闲端口，避免任何端口冲突风险

## 验证

修复后，使用以下命令验证并发测试：

```bash
# 并发运行 API 测试（3个worker）
npm test -- --maxWorkers=3 --testPathPattern="api"

# 并发运行所有测试（50%的CPU核心）
npm test -- --maxWorkers=50%
```

测试结果：
- ✅ 无端口冲突错误
- ✅ 测试可以并发运行
- ✅ 每个测试进程独立隔离

## 相关文件

- `backend/test/setupBackend.ts` - 测试数据库设置
- `backend/jest.config.ts` - Jest 配置（maxWorkers: '50%'）

## 日期

2025-01-XX - 修复 CI 环境端口冲突问题
