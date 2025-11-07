# 测试基础设施文档

QMX项目的测试数据工厂与fixture系统完整指南。

## 概述

本项目提供了一套完整的测试基础设施，包括：

- **数据工厂** - 快速生成测试数据
- **Fixture系统** - 标准化的API响应模板
- **MSW集成** - 强大的API mock支持
- **断言助手** - 类型安全的测试断言
- **测试选择器** - 统一的DOM选择器管理

## 目录结构

```
tests/
├── README.md                    # 完整使用文档
├── MIGRATION_GUIDE.md           # 迁移指南
├── setup.ts                     # 全局测试设置
├── factories/                   # 测试数据工厂
│   ├── index.ts                # 统一导出
│   ├── utils.ts                # 工具函数
│   ├── StudentFactory.ts       # 学员工厂
│   ├── TransactionFactory.ts   # 交易工厂
│   ├── InstallmentFactory.ts   # 分期工厂
│   └── StatsFactory.ts         # 统计工厂
├── fixtures/                    # 测试fixture
│   ├── index.ts                # 统一导出
│   ├── responses.ts            # 响应模板
│   └── msw-helpers.ts          # MSW辅助函数
├── helpers/                     # 测试辅助工具
│   ├── index.ts                # 统一导出
│   ├── assertions.ts           # 断言助手
│   └── test-selectors.ts       # 测试选择器
├── mocks/msw/                   # MSW mock
│   ├── handlers.ts             # 原始handlers
│   └── handlers-enhanced.ts    # 增强handlers（使用工厂）
└── examples/                    # 使用示例
    └── factories-usage.test.ts # 完整示例测试
```

## 核心功能

### 1. 数据工厂 (Factories)

快速生成符合类型定义的测试数据。

**特性**：
- ✅ 类型安全 - 完整的TypeScript支持
- ✅ 链式API - 流畅的数据构建体验
- ✅ 批量生成 - `buildMany()` 快速创建多条数据
- ✅ 灵活覆盖 - 只设置需要的字段
- ✅ 场景方法 - 预定义的常用场景

**可用工厂**：
- `StudentFactory` - 学员数据
- `TransactionFactory` - 交易数据
- `InstallmentFactory` - 分期记录
- `InstallmentPlanFactory` - 分期计划
- `DashboardStatsFactory` - 仪表板统计
- `StudentStatsFactory` - 学员统计
- `FinancialStatsFactory` - 财务统计

**使用示例**：

```typescript
// 快速构建
const student = StudentFactory.build();

// 覆盖字段
const custom = StudentFactory.build({ name: '张三', age: 20 });

// 链式API
const detailed = StudentFactory.create()
  .withName('李四')
  .withMembership('2024-01-01', '2024-12-31')
  .build();

// 批量创建
const students = StudentFactory.buildMany(10);
```

### 2. Fixture系统

标准化的API响应和错误处理。

**特性**：
- ✅ 统一格式 - 符合项目API规范
- ✅ 错误模板 - 常见HTTP错误码
- ✅ 验证错误 - 表单验证错误支持
- ✅ 分页支持 - 自动计算分页信息

**可用fixture**：
- `createSuccessResponse()` - 成功响应
- `createErrorResponse()` - 错误响应
- `createPaginatedResponse()` - 分页响应
- `ErrorResponses.*` - 标准错误模板
- `ValidationErrors.*` - 验证错误模板

**使用示例**：

```typescript
// 成功响应
const response = createSuccessResponse(data);

// 错误响应
const error = ErrorResponses.notFound('学员');

// 分页响应
const paginated = createPaginatedResponse(items, 1, 10, 100);
```

### 3. MSW集成

增强的Mock Service Worker handlers。

**特性**：
- ✅ 完整API覆盖 - 所有主要端点
- ✅ 自动过滤排序 - 支持查询参数
- ✅ 数据管理 - 可重置的mock数据
- ✅ 灵活覆盖 - 测试中临时覆盖handlers

**使用示例**：

```typescript
import { mswServer } from '@/tests/setup';
import { ErrorHttpResponses } from '@/tests/fixtures';

// 测试中覆盖
mswServer.use(
  http.get('/api/v1/students/999', () => {
    return ErrorHttpResponses.notFound('学员');
  })
);
```

### 4. 断言助手

类型安全的测试断言，提供更好的类型推断。

**特性**：
- ✅ 类型断言 - TypeScript类型收窄
- ✅ 结构验证 - 验证数据完整性
- ✅ 格式验证 - 日期、金额、电话等
- ✅ 语义化 - 清晰的断言意图

**可用断言**：
- `assertSuccess()` / `assertError()` - 响应状态
- `assertStudentStructure()` - 学员数据结构
- `assertTransactionStructure()` - 交易数据结构
- `assertDateFormat()` - 日期格式
- `assertAmountFormat()` - 金额格式

**使用示例**：

```typescript
const response = await api.getStudent(1);
assertSuccess(response);
// TypeScript现在知道response.data存在
const student = response.data;
assertStudentStructure(student);
```

### 5. 测试选择器

统一的data-testid管理。

**特性**：
- ✅ 类型安全 - 避免魔法字符串
- ✅ 分类管理 - 按功能模块组织
- ✅ 动态选择器 - 支持参数化
- ✅ 多种选择器 - testid、role、aria-label等

**使用示例**：

```typescript
import { Selectors, TestIds } from '@/tests/helpers';

// 在组件中
<button :data-testid="TestIds.studentAddButton">添加</button>

// 在测试中
const button = screen.getByTestId(Selectors.student.addButton());
```

## 工具函数

### 金额转换

```typescript
import { yuanToCents, centsToYuan } from '@/tests/factories';

yuanToCents(100.50)  // => 10050
centsToYuan(10050)   // => 100.50
```

### 日期转换

```typescript
import { isoToYYYYMMDD, yyyymmddToISO } from '@/tests/factories';

isoToYYYYMMDD('2024-01-15T10:30:00Z')  // => '2024-01-15'
yyyymmddToISO('2024-01-15')  // => '2024-01-15T00:00:00.000Z'
```

### 随机数据生成

```typescript
import { 
  randomInt,
  randomChineseName,
  randomPhoneNumber,
  generateObjectId,
} from '@/tests/factories';

randomInt(1, 100)         // 随机整数
randomChineseName()       // 随机中文姓名
randomPhoneNumber()       // 随机手机号
generateObjectId()        // MongoDB ObjectId
```

## 完整示例

### 单元测试

```typescript
import { describe, it, expect } from 'vitest';
import { StudentFactory } from '@/tests/factories';
import { assertStudentStructure } from '@/tests/helpers';

describe('Student Utils', () => {
  it('should calculate average score', () => {
    const student = StudentFactory.build({
      rings: [8, 9, 7, 9, 8],
    });
    
    assertStudentStructure(student);
    const avg = calculateAverage(student.rings);
    expect(avg).toBe(8.2);
  });
});
```

### API集成测试

```typescript
import { describe, it } from 'vitest';
import { mswServer } from '@/tests/setup';
import { StudentFactory } from '@/tests/factories';
import { jsonPaginated, ErrorHttpResponses } from '@/tests/fixtures';
import { assertSuccess, assertError } from '@/tests/helpers';
import { apiService } from '@/api/ApiService';

describe('Student API', () => {
  it('should fetch students successfully', async () => {
    const students = StudentFactory.buildMany(5);
    
    mswServer.use(
      http.get('/api/v1/students', () => {
        return jsonPaginated(students, 1, 10, 5);
      })
    );
    
    const result = await apiService.getStudents();
    assertSuccess(result);
    expect(result.data).toHaveLength(5);
  });
  
  it('should handle not found error', async () => {
    mswServer.use(
      http.get('/api/v1/students/999', () => {
        return ErrorHttpResponses.notFound('学员');
      })
    );
    
    const result = await apiService.getStudent(999);
    assertError(result);
  });
});
```

### 组件测试

```typescript
import { mount } from '@vue/test-utils';
import { StudentFactory } from '@/tests/factories';
import { Selectors } from '@/tests/helpers';
import StudentList from '@/components/StudentList.vue';

describe('StudentList', () => {
  it('should render student cards', () => {
    const students = StudentFactory.buildMany(3);
    
    const wrapper = mount(StudentList, {
      props: { students },
    });
    
    const cards = wrapper.findAll(Selectors.student.item());
    expect(cards).toHaveLength(3);
  });
});
```

## 测试运行

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- tests/examples/factories-usage.test.ts

# 监听模式
npm test -- --watch

# 覆盖率报告
npm test -- --coverage
```

## 最佳实践

### 1. 优先使用工厂

```typescript
// ❌ 不推荐
const student = { uid: 1, name: '张三', /* ... */ };

// ✅ 推荐
const student = StudentFactory.build({ name: '张三' });
```

### 2. 最小化覆盖

```typescript
// ❌ 过度指定
const student = StudentFactory.build({
  uid: 1, name: '张三', age: 20, phone: '13800138000',
  class: 'Month', subject: 'Shooting', /* ... */
});

// ✅ 只设置关键字段
const student = StudentFactory.build({ name: '张三' });
```

### 3. 使用类型安全断言

```typescript
// ❌ 手动断言
expect(response.success).toBe(true);
expect(response.data).toBeDefined();

// ✅ 使用断言助手
assertSuccess(response);
// TypeScript现在知道response.data存在
```

### 4. 重用Mock数据

```typescript
describe('Suite', () => {
  let students: Student[];
  
  beforeEach(() => {
    StudentFactory.resetCounter();
    students = StudentFactory.buildMany(10);
  });
  
  // 测试...
});
```

## 扩展指南

### 添加新工厂

1. 在 `tests/factories/` 创建新文件
2. 实现 `.build()` 和 `.buildMany()` 方法
3. 提供链式API方法
4. 添加场景方法
5. 在 `tests/factories/index.ts` 导出

### 添加新Fixture

1. 在 `tests/fixtures/` 相应文件添加函数
2. 确保返回符合 `ApiResponse<T>` 类型
3. 添加JSDoc文档
4. 在 `tests/fixtures/index.ts` 导出

### 添加新断言

1. 在 `tests/helpers/assertions.ts` 添加函数
2. 使用 `asserts` 类型谓词
3. 添加JSDoc文档
4. 在 `tests/helpers/index.ts` 导出

## 性能考虑

- 工厂创建的对象是轻量级的
- 批量创建使用 `buildMany()` 而不是循环
- 在 `beforeEach` 中重置计数器
- 避免在循环中创建大量对象

## 故障排除

### 工厂生成的UID重复

```typescript
// 重置计数器
beforeEach(() => {
  StudentFactory.resetCounter();
});
```

### MSW handlers不工作

```typescript
// 确保handlers在使用前注册
import { handlers } from './mocks/msw/handlers-enhanced';
const mswServer = setupServer(...handlers);
```

### TypeScript类型错误

```typescript
// 使用断言助手获得类型收窄
const response = await api.call();
assertSuccess(response);
// 现在response.data是类型安全的
```

## 资源

- [完整文档](tests/README.md)
- [迁移指南](tests/MIGRATION_GUIDE.md)
- [使用示例](tests/examples/factories-usage.test.ts)
- [Vitest文档](https://vitest.dev/)
- [MSW文档](https://mswjs.io/)

## 贡献

欢迎贡献新的工厂、fixture和断言！请参考：
- 现有实现的代码风格
- 完整的JSDoc注释
- 使用示例
- 类型安全

## 许可证

MIT License

---

**维护者**: QMX开发团队  
**最后更新**: 2024-01-15  
**版本**: 1.0.0
