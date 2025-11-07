# 测试工厂迁移指南

如何在现有测试中采用新的测试数据工厂和fixture系统。

## 快速迁移

### 之前：手动构造测试数据

```typescript
// ❌ 旧方式 - 手动构造
const mockStudents = [
  {
    uid: 1,
    name: '张三',
    age: 20,
    phone: '13800138000',
    class: 'Month',
    subject: 'Shooting',
    rings: [8, 9, 7],
    lesson_left: 10,
    membership_start_date: '2024-01-01',
    membership_end_date: '2024-12-31',
    membership_status: 'Active',
    is_membership_active: true,
    membership_days_remaining: 100,
    note: '测试学员',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  // ... 更多数据
];
```

### 之后：使用工厂

```typescript
// ✅ 新方式 - 使用工厂
import { StudentFactory } from '@/tests/factories';

const mockStudents = StudentFactory.buildMany(10, {
  // 只覆盖关键字段
  class: 'Month',
  subject: 'Shooting',
});
```

## 分步迁移策略

### 第1步：导入工厂

在测试文件顶部添加导入：

```typescript
import {
  StudentFactory,
  TransactionFactory,
  InstallmentFactory,
  InstallmentPlanFactory,
} from '@/tests/factories';
import {
  createSuccessResponse,
  createPaginatedResponse,
  ErrorResponses,
} from '@/tests/fixtures';
import {
  assertSuccess,
  assertError,
  assertStudentStructure,
} from '@/tests/helpers';
```

### 第2步：替换测试数据构造

#### 示例1：学员列表

```typescript
// 之前
const mockStudents = [
  { uid: 1, name: '张三', /* ... 大量字段 */ },
  { uid: 2, name: '李四', /* ... 大量字段 */ },
];

// 之后
const mockStudents = StudentFactory.buildMany(2);
```

#### 示例2：特定场景的学员

```typescript
// 之前
const expiredStudent = {
  uid: 1,
  name: '过期会员',
  membership_start_date: '2023-01-01',
  membership_end_date: '2023-12-31',
  membership_status: 'Expired',
  is_membership_active: false,
  // ... 更多字段
};

// 之后
const expiredStudent = StudentFactory.create()
  .withName('过期会员')
  .withExpiredMembership()
  .build();
```

### 第3步：更新MSW handlers

#### 之前：手动构造响应

```typescript
import { http, HttpResponse } from 'msw';

http.get('/api/v1/students', () => {
  return HttpResponse.json({
    success: true,
    data: {
      students: mockStudents,
      pagination: {
        page: 1,
        limit: 10,
        total: mockStudents.length,
        total_pages: 1,
        has_next: false,
        has_prev: false,
      },
    },
  });
});
```

#### 之后：使用fixture辅助函数

```typescript
import { http } from 'msw';
import { jsonPaginated } from '@/tests/fixtures';
import { StudentFactory } from '@/tests/factories';

http.get('/api/v1/students', () => {
  const students = StudentFactory.buildMany(10);
  return jsonPaginated(students, 1, 10, students.length);
});
```

### 第4步：更新错误场景测试

#### 之前：手动构造错误响应

```typescript
http.get('/api/v1/students/999', () => {
  return HttpResponse.json({
    success: false,
    error: 'Not Found',
    message: '学员不存在',
  }, { status: 404 });
});
```

#### 之后：使用标准错误响应

```typescript
import { ErrorHttpResponses } from '@/tests/fixtures';

http.get('/api/v1/students/999', () => {
  return ErrorHttpResponses.notFound('学员');
});
```

### 第5步：更新断言

#### 之前：手动断言

```typescript
expect(response.success).toBe(true);
expect(response.data).toBeDefined();
expect(response.data.uid).toBeGreaterThan(0);
expect(response.data.name).toBeTruthy();
```

#### 之后：使用断言助手

```typescript
import { assertSuccess, assertStudentStructure } from '@/tests/helpers';

assertSuccess(response);
assertStudentStructure(response.data);
```

## 常见迁移场景

### 场景1：API集成测试

```typescript
// 之前
describe('Student API', () => {
  it('should fetch students', async () => {
    const mockData = [
      { uid: 1, name: '张三', /* ... */ },
      { uid: 2, name: '李四', /* ... */ },
    ];
    
    mswServer.use(
      http.get('/api/v1/students', () => {
        return HttpResponse.json({
          success: true,
          data: { students: mockData, pagination: { /* ... */ } },
        });
      })
    );
    
    const result = await apiService.getStudents();
    expect(result.success).toBe(true);
  });
});

// 之后
describe('Student API', () => {
  it('should fetch students', async () => {
    const mockStudents = StudentFactory.buildMany(2);
    
    mswServer.use(
      http.get('/api/v1/students', () => {
        return jsonPaginated(mockStudents, 1, 10, 2);
      })
    );
    
    const result = await apiService.getStudents();
    assertSuccess(result);
  });
});
```

### 场景2：组件测试

```typescript
import { mount } from '@vue/test-utils';
import { StudentFactory } from '@/tests/factories';
import StudentList from '@/components/StudentList.vue';

// 之前
const wrapper = mount(StudentList, {
  props: {
    students: [
      { uid: 1, name: '张三', /* ... 大量字段 */ },
    ],
  },
});

// 之后
const wrapper = mount(StudentList, {
  props: {
    students: StudentFactory.buildMany(5),
  },
});
```

### 场景3：复杂数据关联

```typescript
// 创建学员及其相关交易
const student = StudentFactory.build();
const transactions = Array.from({ length: 5 }, (_, i) =>
  TransactionFactory.buildIncome(
    randomFloat(100, 1000),
    student.uid
  )
);

// 创建分期计划及其分期记录
const plan = InstallmentPlanFactory.buildMonthly(student.uid, 12000, 12);
const installments = Array.from({ length: 12 }, (_, i) =>
  InstallmentFactory.buildPending(plan.uid, 1000, i + 1, 12)
);
```

## 向后兼容性

所有现有测试仍然可以工作，无需立即迁移。可以渐进式地采用新工厂：

1. **新测试**：直接使用工厂
2. **现有测试修改时**：逐步迁移到工厂
3. **重构测试时**：全面采用工厂

## 性能优化

工厂创建的数据是轻量级的，但如果需要大量数据：

```typescript
// 一次性创建并重用
const students = StudentFactory.buildMany(100);

beforeEach(() => {
  // 重置而不是重新创建
  StudentFactory.resetCounter();
});
```

## 获取帮助

- 查看 `tests/README.md` 获取完整文档
- 查看 `tests/examples/factories-usage.test.ts` 获取示例
- 参考现有的工厂实现扩展新工厂

## 常见问题

### Q: 我需要特定的数据格式怎么办？

A: 使用 `.build()` 方法的覆盖参数或链式API：

```typescript
const student = StudentFactory.build({
  name: '特定名称',
  age: 25,
});

// 或
const student = StudentFactory.create()
  .withName('特定名称')
  .withAge(25)
  .build();
```

### Q: 如何处理null值？

A: 工厂支持显式设置null：

```typescript
const student = StudentFactory.create()
  .withAge(null)  // 显式null
  .withoutMembership()  // 会员字段为null
  .build();
```

### Q: 现有的mock数据数组怎么迁移？

A: 使用 `buildMany` 并根据需要覆盖字段：

```typescript
// 之前
const students = [
  { uid: 1, name: 'A', class: 'Month' },
  { uid: 2, name: 'B', class: 'Year' },
];

// 之后（简单方式）
const students = StudentFactory.buildMany(2);

// 之后（保持特定数据）
const students = [
  StudentFactory.build({ uid: 1, name: 'A', class: 'Month' }),
  StudentFactory.build({ uid: 2, name: 'B', class: 'Year' }),
];
```

## 推荐迁移顺序

1. ✅ **单元测试** - 最简单，收益最大
2. ✅ **集成测试** - 使用MSW的测试
3. ✅ **组件测试** - Vue组件测试
4. ⚠️ **E2E测试** - 谨慎使用，主要用于测试数据准备

## 检查清单

迁移完成后检查：

- [ ] 删除了重复的测试数据构造代码
- [ ] 使用工厂替代手动创建对象
- [ ] 使用fixture辅助函数构建响应
- [ ] 使用断言助手代替重复的断言
- [ ] 测试仍然通过
- [ ] 测试更易读和维护
