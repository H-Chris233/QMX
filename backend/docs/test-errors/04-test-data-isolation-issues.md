# 测试数据隔离问题 (Test Data Isolation Issues)

## 问题概述

**严重程度**: 🟡 中  
**影响范围**: 测试可靠性和可重复性  
**潜在影响**: 测试间相互干扰

## 问题描述

虽然当前测试框架实现了基本的数据隔离机制，但在某些场景下可能存在测试间数据污染，导致：
1. 测试结果依赖于执行顺序
2. 单独运行时通过，批量运行时失败（或相反）
3. 计数器/序列号冲突

---

## 当前隔离机制

### 实现方式

**文件**: `backend/test/setupBackend.ts`

```typescript
// ✅ 每个测试文件独立的数据库实例
export async function setupTestDatabase(): Promise<void> {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
}

// ✅ 测试间清理
export async function clearAllCollections(): Promise<void> {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

// ✅ 序列号重置
export async function resetAllSequences(): Promise<void> {
  await Counter.deleteMany({});
}
```

### 测试生命周期

```typescript
describe('Test Suite', () => {
  beforeAll(async () => {
    await setupTestDatabase();  // ✅ 独立数据库
    app = await createTestApp();
  });
  
  afterEach(async () => {
    await clearAllCollections();  // ✅ 清理数据
    await resetAllSequences();    // ✅ 重置计数器
  });
  
  afterAll(async () => {
    await cleanupTestDatabase();  // ✅ 清理资源
  });
});
```

---

## 潜在问题场景

### 场景1: beforeEach数据准备可能冲突

#### 问题案例：

**文件**: `students.api.spec.ts:282-301`

```typescript
describe('Advanced Filtering', () => {
  beforeEach(async () => {
    // ⚠️ 每次创建相同的测试数据
    await TestDataFactory.createStudent({
      name: 'High Scorer',
      rings: [9.5, 9.8, 9.2],
      membership: { startDate: ..., endDate: ... },
    });
    
    await TestDataFactory.createStudent({
      name: 'Low Scorer',
      rings: [5.5, 6.0],
    });
    
    await TestDataFactory.createStudent({
      name: 'No Scores',
    });
  });
  
  // ✅ 第一个测试
  it('filters by score range', async () => {
    // 期望3个学生
  });
  
  // ⚠️ 第二个测试 - 如果beforeEach没有正确清理
  it('filters by membership status', async () => {
    // 可能看到6个学生（前一个测试的残留）
  });
});
```

#### 问题：

1. **清理时机**: `afterEach` 在测试后执行，但下一个测试的 `beforeEach` 之前
2. **异步顺序**: 如果清理未完成，`beforeEach` 可能看到旧数据
3. **计数器**: UID可能不是从1开始

---

### 场景2: 并发测试冲突

#### 问题：

```bash
# 并发运行测试
npm test -- --maxWorkers=4
```

虽然每个测试文件有独立的MongoDB实例，但可能存在：

1. **端口冲突**: MongoDB Memory Server端口分配
2. **文件系统**: 临时文件路径冲突
3. **全局状态**: Mongoose连接状态

#### 证据：

```
MongoDB Memory Server: Port 27017 already in use
```

---

### 场景3: 测试数据累积

#### 问题模式：

```typescript
describe('Multiple operations', () => {
  it('creates student 1', async () => {
    await TestDataFactory.createStudent({ name: 'A' });
    // ✅ 1个学生
  });
  
  // ⚠️ afterEach应该清理
  
  it('creates student 2', async () => {
    await TestDataFactory.createStudent({ name: 'B' });
    const all = await Student.find();
    // ❌ 可能看到2个学生（A和B）而不是1个
  });
});
```

---

## 根本原因分析

### 1. 异步清理竞态条件

```typescript
afterEach(async () => {
  // ⚠️ 问题：两个异步操作可能不按顺序完成
  await clearAllCollections();  // 可能很快
  await resetAllSequences();    // 可能很快
});

beforeEach(async () => {
  // ❌ 如果上面的清理还未完成...
  await TestDataFactory.createStudent(...);  // 可能看到旧数据
});
```

### 2. Mongoose缓存

Mongoose可能缓存查询结果：

```typescript
// ⚠️ 第一次查询
const students = await Student.find();  // 3个学生

// 清理
await Student.deleteMany({});

// ⚠️ 第二次查询 - 可能返回缓存结果
const studentsAgain = await Student.find();  // 仍然是3个？
```

### 3. 计数器状态不一致

```typescript
// 测试1
const student1 = await TestDataFactory.createStudent({ name: 'A' });
// student1.uid = 1

// afterEach: resetAllSequences()

// 测试2
const student2 = await TestDataFactory.createStudent({ name: 'B' });
// ⚠️ student2.uid 应该是1，但可能是2（如果计数器未重置）
```

---

## 解决方案

### 方案1: 增强清理机制（推荐）

```typescript
// backend/test/setupBackend.ts
export async function clearAllCollections(): Promise<void> {
  console.log('[清理] 开始清理所有集合...');
  
  const collections = mongoose.connection.collections;
  
  // ✅ 并行清理所有集合
  await Promise.all(
    Object.keys(collections).map(async (key) => {
      const result = await collections[key].deleteMany({});
      console.log(`[清理] ${key}: 删除 ${result.deletedCount} 条记录`);
    })
  );
  
  console.log('[清理] 集合清理完成');
}

export async function resetAllSequences(): Promise<void> {
  console.log('[清理] 重置序列号...');
  
  // ✅ 确保计数器集合存在
  const Counter = mongoose.connection.collection('counters');
  const result = await Counter.deleteMany({});
  
  console.log(`[清理] 重置了 ${result.deletedCount} 个计数器`);
}
```

---

### 方案2: 添加验证步骤

```typescript
export async function verifyCleanState(): Promise<void> {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const count = await collections[key].countDocuments();
    
    if (count > 0) {
      console.warn(`⚠️ 集合 ${key} 未清空：还有 ${count} 条记录`);
      
      // 再次清理
      await collections[key].deleteMany({});
    }
  }
}

// 在afterEach中使用
afterEach(async () => {
  await clearAllCollections();
  await resetAllSequences();
  await verifyCleanState();  // ✅ 验证清理完成
});
```

---

### 方案3: 隔离每个测试

最严格的隔离：

```typescript
// 每个测试使用独立的数据库实例
describe('Student API', () => {
  beforeEach(async () => {
    // ✅ 每个测试都重新设置数据库
    await setupTestDatabase();
    app = await createTestApp();
  });
  
  afterEach(async () => {
    // ✅ 每个测试都完全清理
    await cleanupTestDatabase();
  });
  
  it('test 1', async () => {
    // 完全独立的环境
  });
  
  it('test 2', async () => {
    // 完全独立的环境
  });
});
```

**缺点**: 性能开销大（每个测试启动/停止MongoDB）

---

### 方案4: 使用事务（MongoDB 4.0+）

```typescript
describe('With transactions', () => {
  let session: ClientSession;
  
  beforeEach(async () => {
    session = await mongoose.startSession();
    session.startTransaction();
  });
  
  afterEach(async () => {
    // ✅ 回滚事务 - 自动清理所有数据
    await session.abortTransaction();
    session.endSession();
  });
  
  it('test with auto rollback', async () => {
    // 所有操作在事务中
    await Student.create([{ name: 'Test' }], { session });
    // 测试结束后自动回滚
  });
});
```

**优点**: 快速、可靠  
**缺点**: 需要MongoDB副本集（Memory Server默认不支持）

---

## 调试和诊断

### 1. 添加测试数据快照

```typescript
async function databaseSnapshot(): Promise<any> {
  const collections = mongoose.connection.collections;
  const snapshot: any = {};
  
  for (const key in collections) {
    snapshot[key] = await collections[key].find({}).toArray();
  }
  
  return snapshot;
}

// 在测试中使用
it('test with snapshots', async () => {
  const before = await databaseSnapshot();
  console.log('测试前:', JSON.stringify(before, null, 2));
  
  // 执行测试
  
  const after = await databaseSnapshot();
  console.log('测试后:', JSON.stringify(after, null, 2));
});
```

### 2. 检测数据泄漏

```typescript
beforeEach(async () => {
  const studentCount = await Student.countDocuments();
  
  if (studentCount > 0) {
    console.error(`❌ 测试开始前发现 ${studentCount} 个学生残留`);
    console.error('残留数据:', await Student.find());
    
    // 强制清理
    await clearAllCollections();
    await resetAllSequences();
  }
});
```

### 3. 运行测试诊断

```bash
# 串行运行（排除并发问题）
npm test -- --runInBand

# 运行特定顺序
npm test -- --testNamePattern="filters by score range"
npm test -- --testNamePattern="filters by membership status"

# 随机顺序（检测依赖）
npm test -- --randomize
```

---

## 测试最佳实践

### ✅ 推荐做法

1. **每个测试独立**: 不依赖其他测试的状态
2. **显式数据准备**: 在测试内部或beforeEach中创建数据
3. **验证初始状态**: 测试开始时确认数据库为空
4. **完整清理**: afterEach中彻底清理
5. **串行关键测试**: 对数据敏感的测试使用 `--runInBand`

### ❌ 避免做法

1. **全局测试数据**: 不要在describe外创建数据
2. **假设UID顺序**: 不要假设学生UID从1开始
3. **依赖测试顺序**: 测试应该可以以任意顺序运行
4. **共享对象引用**: 不要在测试间共享对象引用

---

## 改进的测试模板

```typescript
describe('Well-isolated tests', () => {
  let app: Express;
  
  beforeAll(async () => {
    await setupTestDatabase();
    app = await createTestApp();
  });
  
  afterAll(async () => {
    await cleanupTestDatabase();
  });
  
  // ✅ 每个测试清理和验证
  afterEach(async () => {
    console.log('[AfterEach] 开始清理...');
    await clearAllCollections();
    await resetAllSequences();
    
    // 验证清理完成
    const count = await Student.countDocuments();
    if (count > 0) {
      throw new Error(`清理失败：还有 ${count} 条学生记录`);
    }
    
    console.log('[AfterEach] 清理完成');
  });
  
  it('test 1', async () => {
    // 显式创建测试数据
    const student = await TestDataFactory.createStudent({ name: 'Test1' });
    
    // 执行测试
    const response = await request(app).get(`/api/v1/students/${student.uid}`);
    
    // 断言
    expect(response.body.data.name).toBe('Test1');
    
    // ✅ 不需要手动清理 - afterEach会处理
  });
  
  it('test 2', async () => {
    // 独立的测试数据
    const student = await TestDataFactory.createStudent({ name: 'Test2' });
    
    // 不受test1影响
    const allStudents = await Student.find();
    expect(allStudents).toHaveLength(1);  // ✅ 只有test2的数据
  });
});
```

---

## 性能优化

### 平衡隔离和性能

```typescript
// 1. 轻量级测试：共享数据库实例
describe('Fast unit tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();  // 一次性设置
  });
  
  afterEach(async () => {
    await clearAllCollections();  // 快速清理
  });
  
  afterAll(async () => {
    await cleanupTestDatabase();
  });
});

// 2. 重量级测试：独立数据库实例
describe('Complex integration tests', () => {
  beforeEach(async () => {
    await setupTestDatabase();  // 每个测试独立
  });
  
  afterEach(async () => {
    await cleanupTestDatabase();  // 完全隔离
  });
});
```

---

## 监控指标

### 测试隔离质量指标

1. **通过率稳定性**: 测试结果不因运行顺序改变
2. **并发安全性**: `--maxWorkers=4` 结果与 `--runInBand` 一致
3. **清理耗时**: `afterEach` 执行时间 < 100ms
4. **残留数据**: 测试间无数据残留（0条记录）

### 测量脚本

```bash
#!/bin/bash
# 测试隔离质量

echo "=== 测试1: 串行运行 ==="
npm test -- --runInBand > /tmp/serial.log
SERIAL_PASS=$(grep "Tests:" /tmp/serial.log | awk '{print $2}')

echo "=== 测试2: 并发运行 ==="
npm test -- --maxWorkers=4 > /tmp/parallel.log
PARALLEL_PASS=$(grep "Tests:" /tmp/parallel.log | awk '{print $2}')

echo "=== 测试3: 随机顺序 ==="
npm test -- --randomize > /tmp/random.log
RANDOM_PASS=$(grep "Tests:" /tmp/random.log | awk '{print $2}')

echo "串行通过: $SERIAL_PASS"
echo "并发通过: $PARALLEL_PASS"
echo "随机通过: $RANDOM_PASS"

if [ "$SERIAL_PASS" == "$PARALLEL_PASS" ] && [ "$SERIAL_PASS" == "$RANDOM_PASS" ]; then
  echo "✅ 测试隔离良好"
else
  echo "❌ 测试隔离有问题"
fi
```

---

## 相关文档

- [[03-async-resource-leaks.md]] - 资源清理可能影响数据隔离
- [[01-query-filter-failures.md]] - 过滤器问题可能由数据污染导致

---

**文档创建时间**: 2025-11-12  
**最后更新**: 2025-11-12  
**优先级**: 中（影响测试可靠性）
