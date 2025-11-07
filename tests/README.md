# 测试数据工厂与Fixture库

统一的前端测试数据工厂与fixture系统，提供一致、易用的测试数据生成和断言工具。

## 目录

- [快速开始](#快速开始)
- [数据工厂](#数据工厂)
- [Fixture与响应模板](#fixture与响应模板)
- [MSW集成](#msw集成)
- [工具函数](#工具函数)
- [断言助手](#断言助手)
- [测试选择器](#测试选择器)
- [最佳实践](#最佳实践)

## 快速开始

### 安装依赖

项目已包含所有必需依赖，无需额外安装。

### 基本使用

```typescript
import { StudentFactory, TransactionFactory } from '@/tests/factories';
import { createSuccessResponse, ErrorResponses } from '@/tests/fixtures';
import { assertSuccess, assertStudentStructure } from '@/tests/helpers';

// 创建测试学员
const student = StudentFactory.build({ name: '张三' });

// 创建API响应
const response = createSuccessResponse(student);

// 断言
assertSuccess(response);
assertStudentStructure(student);
```

## 数据工厂

### StudentFactory - 学员数据工厂

快速创建学员测试数据。

#### 快速构建

```typescript
// 使用默认值
const student = StudentFactory.build();

// 覆盖特定字段
const customStudent = StudentFactory.build({
  name: '张三',
  age: 20,
  phone: '13800138000',
});

// 批量创建
const students = StudentFactory.buildMany(10);
```

#### 链式API

```typescript
const student = StudentFactory.create()
  .withName('李四')
  .withAge(22)
  .withPhone('13800138001')
  .withClass(ClassType.YEAR)
  .withSubject(SubjectType.ARCHERY)
  .withRings([9, 8, 9, 9])
  .withMembership('2024-01-01', '2024-12-31', MembershipStatus.ACTIVE)
  .withNote('优秀学员')
  .build();
```

#### 特殊场景

```typescript
// 无会员学员
const noMembershipStudent = StudentFactory.create()
  .withName('王五')
  .withoutMembership()
  .build();

// 已过期会员
const expiredStudent = StudentFactory.create()
  .withName('赵六')
  .withExpiredMembership()
  .build();

// 即将开始的会员
const upcomingStudent = StudentFactory.create()
  .withName('孙七')
  .withUpcomingMembership()
  .build();
```

### TransactionFactory - 交易数据工厂

创建收入、支出和分期付款交易。

#### 快速构建

```typescript
// 收入交易
const income = TransactionFactory.buildIncome(100.50, studentId);

// 支出交易
const expense = TransactionFactory.buildExpense(50.00, '设备采购');

// 分期付款交易
const installment = TransactionFactory.buildInstallment(
  100,      // 金额
  1,        // 学员ID
  1,        // 计划ID
  2,        // 当前期数
  12        // 总期数
);
```

#### 链式API

```typescript
const transaction = TransactionFactory.create()
  .withAmount(200)
  .withStudentId(5)
  .withNote('年费')
  .withInstallment({
    plan_uid: 1,
    installment_number: 1,
    total_installments: 12,
  })
  .build();
```

### InstallmentFactory - 分期数据工厂

创建分期付款记录。

```typescript
// 待支付分期
const pending = InstallmentFactory.buildPending(planId, 100, 3, 12);

// 已支付分期
const paid = InstallmentFactory.buildPaid(planId, 100, 1, 12);

// 逾期分期
const overdue = InstallmentFactory.buildOverdue(planId, 100, 2, 12);

// 自定义分期
const custom = InstallmentFactory.create()
  .withPlanId(1)
  .withAmount(1000)
  .withInstallmentNumber(5, 12)
  .withDueDate('2024-06-01')
  .withStatus(InstallmentStatus.PENDING)
  .build();
```

### InstallmentPlanFactory - 分期计划工厂

创建分期付款计划。

```typescript
// 月付计划
const monthlyPlan = InstallmentPlanFactory.buildMonthly(studentId, 12000, 12);

// 周付计划
const weeklyPlan = InstallmentPlanFactory.buildWeekly(studentId, 1200, 4);

// 季付计划
const quarterlyPlan = InstallmentPlanFactory.buildQuarterly(studentId, 3600, 4);

// 自定义周期
const customPlan = InstallmentPlanFactory.create()
  .withStudentId(1)
  .withTotalAmount(10000)
  .withTotalInstallments(10)
  .withCustomDays(15)  // 每15天一期
  .withStartDate('2024-01-01')
  .build();
```

### StatsFactory - 统计数据工厂

创建各类统计数据。

```typescript
// 仪表板统计
const dashboardStats = DashboardStatsFactory.build({
  totalRevenue: 50000,
  activeStudents: 100,
  averageGrade: 85,
});

// 学员统计
const studentStats = StudentStatsFactory.buildDetailed(
  5000,   // 总支付金额
  10,     // 支付次数
  85,     // 平均成绩
  20      // 成绩次数
);

// 带分期统计的学员统计
const statsWithInstallment = StudentStatsFactory.buildWithInstallment(
  12000,  // 总金额
  3000,   // 已支付
  9       // 待支付期数
);

// 财务统计 - 盈利
const profitStats = FinancialStatsFactory.buildProfit(50000, 10000);

// 财务统计 - 亏损
const lossStats = FinancialStatsFactory.buildLoss(30000, 40000);
```

## Fixture与响应模板

### 标准响应

```typescript
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createPaginatedResponse,
  ErrorResponses 
} from '@/tests/fixtures';

// 成功响应
const success = createSuccessResponse(data);
const successWithMessage = createSuccessResponse(data, '操作成功');

// 错误响应
const error = createErrorResponse('Not Found', '资源不存在');

// 分页响应
const paginated = createPaginatedResponse(items, 1, 10, 100);
```

### 标准错误响应

```typescript
// 400 - 请求参数错误
const badRequest = ErrorResponses.badRequest('参数格式错误');

// 401 - 未授权
const unauthorized = ErrorResponses.unauthorized();

// 403 - 权限不足
const forbidden = ErrorResponses.forbidden();

// 404 - 资源不存在
const notFound = ErrorResponses.notFound('学员');

// 409 - 冲突
const conflict = ErrorResponses.conflict('数据已存在');

// 422 - 验证错误
const validationError = ErrorResponses.validationError({
  name: ['姓名不能为空'],
  phone: ['手机号格式不正确'],
});

// 500 - 服务器错误
const serverError = ErrorResponses.serverError();

// 503 - 服务不可用
const serviceUnavailable = ErrorResponses.serviceUnavailable();
```

### 常用验证错误

```typescript
import { ValidationErrors } from '@/tests/fixtures';

// 必填字段
ValidationErrors.required('name');

// 格式错误
ValidationErrors.invalidFormat('phone', '11位手机号');

// 范围错误
ValidationErrors.outOfRange('age', 0, 120);

// 长度错误
ValidationErrors.invalidLength('password', 6, 20);

// 唯一性冲突
ValidationErrors.duplicate('phone');
```

## MSW集成

### 使用增强的Handlers

```typescript
// tests/setup.ts
import { setupServer } from 'msw/node';
import { handlers } from './mocks/msw/handlers-enhanced';

const mswServer = setupServer(...handlers);
```

### 自定义Mock响应

```typescript
import { http } from 'msw';
import { mswServer } from '@/tests/setup';
import { 
  jsonSuccess, 
  jsonError, 
  ErrorHttpResponses 
} from '@/tests/fixtures';
import { StudentFactory } from '@/tests/factories';

// 测试中覆盖handler
it('应该处理API错误', async () => {
  mswServer.use(
    http.get('/api/v1/students/999', () => {
      return ErrorHttpResponses.notFound('学员');
    })
  );
  
  // 测试代码...
});

// 测试成功响应
it('应该获取学员列表', async () => {
  const students = StudentFactory.buildMany(5);
  
  mswServer.use(
    http.get('/api/v1/students', () => {
      return jsonSuccess({ 
        students,
        pagination: {
          page: 1,
          limit: 10,
          total: 5,
          total_pages: 1,
          has_next: false,
          has_prev: false,
        }
      });
    })
  );
  
  // 测试代码...
});
```

### 重置Mock数据

```typescript
import { resetMockData } from '@/tests/mocks/msw/handlers-enhanced';

beforeEach(() => {
  resetMockData();
});
```

## 工具函数

### 金额转换

```typescript
import { yuanToCents, centsToYuan } from '@/tests/factories';

// 元转分
const cents = yuanToCents(100.50);  // 10050
const cents2 = yuanToCents("100.50");  // 10050

// 分转元
const yuan = centsToYuan(10050);  // 100.50
```

### 日期转换

```typescript
import { isoToYYYYMMDD, yyyymmddToISO, addDays, addMonths } from '@/tests/factories';

// ISO转YYYY-MM-DD
const ymd = isoToYYYYMMDD('2024-01-15T10:30:00Z');  // '2024-01-15'

// YYYY-MM-DD转ISO
const iso = yyyymmddToISO('2024-01-15');  // '2024-01-15T00:00:00.000Z'

// 日期计算
const tomorrow = addDays(new Date(), 1);
const nextMonth = addMonths(new Date(), 1);
```

### 随机数据生成

```typescript
import { 
  randomInt, 
  randomFloat, 
  randomPick,
  randomChineseName,
  randomPhoneNumber,
  randomEmail,
  generateObjectId 
} from '@/tests/factories';

// 随机整数
const age = randomInt(18, 60);

// 随机浮点数
const score = randomFloat(60, 100, 1);  // 保留1位小数

// 随机选择
const classType = randomPick(['Month', 'Year', 'TenTry']);

// 随机中文姓名
const name = randomChineseName();

// 随机手机号
const phone = randomPhoneNumber();

// 随机邮箱
const email = randomEmail();

// MongoDB ObjectId
const objectId = generateObjectId();
```

## 断言助手

### API响应断言

```typescript
import { 
  assertSuccess, 
  assertError, 
  assertPaginatedResponse,
  assertErrorMessage 
} from '@/tests/helpers';

// 断言成功响应
const response = createSuccessResponse(data);
assertSuccess(response);
// TypeScript现在知道response.data存在且类型正确

// 断言错误响应
const errorResponse = createErrorResponse('Error');
assertError(errorResponse);
// TypeScript现在知道response.error存在

// 断言分页响应
assertPaginatedResponse(response, 10, 100);

// 断言错误消息
assertErrorMessage(response, '学员不存在');
assertErrorMessage(response, /not found/i);
```

### 数据结构断言

```typescript
import { 
  assertStudentStructure,
  assertTransactionStructure,
  assertInstallmentStructure 
} from '@/tests/helpers';

// 断言学员数据结构
const student = StudentFactory.build();
assertStudentStructure(student);

// 断言交易数据结构
const transaction = TransactionFactory.build();
assertTransactionStructure(transaction);

// 断言分期数据结构
const installment = InstallmentFactory.build();
assertInstallmentStructure(installment);
```

### 格式断言

```typescript
import { 
  assertDateFormat,
  assertISODateFormat,
  assertAmountFormat,
  assertPhoneFormat,
  assertInRange 
} from '@/tests/helpers';

// 日期格式
assertDateFormat('2024-01-15');
assertISODateFormat('2024-01-15T10:30:00Z');

// 金额格式
assertAmountFormat(100.50);

// 手机号格式
assertPhoneFormat('13800138000');

// 数值范围
assertInRange(85, 0, 100);
```

## 测试选择器

### 使用TestIds常量

```typescript
import { TestIds, Selectors } from '@/tests/helpers';

// 获取选择器字符串
const selector = Selectors.byTestId(TestIds.studentList);

// 学员相关选择器
const studentList = Selectors.student.list();
const studentItem = Selectors.student.item(1);
const studentForm = Selectors.student.form();
const addButton = Selectors.student.addButton();

// 交易相关选择器
const transactionList = Selectors.transaction.list();
const amountInput = Selectors.transaction.amountInput();

// 分页选择器
const prevButton = Selectors.pagination.prev();
const nextButton = Selectors.pagination.next();
const page2 = Selectors.pagination.page(2);
```

### 在组件中使用

```vue
<template>
  <div :data-testid="TestIds.studentList">
    <button :data-testid="TestIds.studentAddButton">添加学员</button>
    <div 
      v-for="student in students" 
      :key="student.uid"
      :data-testid="`${TestIds.studentItem}-${student.uid}`"
    >
      {{ student.name }}
    </div>
  </div>
</template>
```

### 在测试中使用

```typescript
import { screen } from '@testing-library/vue';
import { Selectors } from '@/tests/helpers';

it('应该显示学员列表', () => {
  const list = screen.getByTestId(Selectors.student.list());
  expect(list).toBeInTheDocument();
});
```

## 最佳实践

### 1. 工厂优先

优先使用工厂创建测试数据，而不是手动构造对象：

```typescript
// ❌ 不推荐
const student = {
  uid: 1,
  name: '张三',
  age: 20,
  // ... 容易遗漏字段
};

// ✅ 推荐
const student = StudentFactory.build({ name: '张三', age: 20 });
```

### 2. 最小化覆盖

只覆盖测试关注的字段：

```typescript
// ❌ 过度指定
const student = StudentFactory.build({
  uid: 1,
  name: '张三',
  age: 20,
  phone: '13800138000',
  class: ClassType.MONTH,
  // ... 测试可能不需要这么多
});

// ✅ 只设置关键字段
const student = StudentFactory.build({ name: '张三' });
```

### 3. 重置计数器

在测试套件间重置工厂计数器：

```typescript
import { StudentFactory } from '@/tests/factories';

describe('Student Tests', () => {
  beforeEach(() => {
    StudentFactory.resetCounter();
  });
  
  // 测试...
});
```

### 4. 使用类型安全的断言

使用断言助手获得更好的类型推断：

```typescript
import { assertSuccess } from '@/tests/helpers';

const response = await apiCall();
assertSuccess(response);
// TypeScript现在知道response.data存在
const data = response.data;  // 类型安全
```

### 5. 组合使用工厂和Fixture

```typescript
import { StudentFactory } from '@/tests/factories';
import { createSuccessResponse, ErrorResponses } from '@/tests/fixtures';
import { jsonSuccess, ErrorHttpResponses } from '@/tests/fixtures';

// 成功场景
it('应该创建学员', async () => {
  const student = StudentFactory.build();
  
  mswServer.use(
    http.post('/api/v1/students', () => {
      return jsonSuccess(student, 201);
    })
  );
  
  // 测试...
});

// 错误场景
it('应该处理验证错误', async () => {
  mswServer.use(
    http.post('/api/v1/students', () => {
      return ErrorHttpResponses.validationError({
        name: ['姓名不能为空'],
      });
    })
  );
  
  // 测试...
});
```

### 6. 场景化测试数据

为不同场景创建专用的工厂方法：

```typescript
// 在测试文件中扩展工厂
class TestStudentFactory extends StudentFactory {
  static buildVIPStudent() {
    return this.create()
      .withClass(ClassType.YEAR)
      .withMembership(/* 长期会员 */)
      .withNote('VIP学员')
      .build();
  }
  
  static buildNewStudent() {
    return this.create()
      .withClass(ClassType.TEN_TRY)
      .withLessonLeft(10)
      .withoutMembership()
      .build();
  }
}
```

## 常见问题

### Q: 如何在E2E测试中使用工厂？

A: 工厂同样适用于E2E测试，用于准备测试数据：

```typescript
import { test } from '@playwright/test';
import { StudentFactory } from '@/tests/factories';

test('学员管理流程', async ({ page }) => {
  const student = StudentFactory.build({ name: '测试学员' });
  
  // 使用student数据填写表单
  await page.fill('[data-testid="student-name"]', student.name);
  // ...
});
```

### Q: 如何处理复杂的关联数据？

A: 使用工厂组合创建关联数据：

```typescript
// 创建学员和相关交易
const student = StudentFactory.build();
const transactions = Array.from({ length: 5 }, () => 
  TransactionFactory.buildIncome(randomFloat(100, 1000), student.uid)
);

// 创建分期计划和分期记录
const plan = InstallmentPlanFactory.buildMonthly(student.uid, 12000, 12);
const installments = Array.from({ length: 12 }, (_, i) =>
  InstallmentFactory.buildPending(plan.uid, 1000, i + 1, 12)
);
```

### Q: 如何测试边界条件？

A: 使用工厂创建边界数据：

```typescript
// 最小年龄
const youngStudent = StudentFactory.build({ age: 0 });

// 最大年龄
const oldStudent = StudentFactory.build({ age: 120 });

// 空成绩
const noScores = StudentFactory.build({ rings: [] });

// 过期会员
const expiredStudent = StudentFactory.create()
  .withExpiredMembership()
  .build();
```

## 更新日志

### v1.0.0 (2024-01-15)

- ✨ 初始版本发布
- 🎉 支持Student、Transaction、Installment、Plan、Stats工厂
- 🛠️ 提供完整的fixture和MSW集成
- 📝 包含工具函数、断言助手和测试选择器
- 📚 完整的文档和示例

## 贡献指南

欢迎贡献新的工厂、fixture和断言助手！请遵循以下规范：

1. 所有工厂必须支持`.build()`和`.buildMany()`方法
2. 提供链式API用于复杂场景
3. 为每个公开方法添加JSDoc注释和使用示例
4. 在`tests/examples/`中添加使用示例
5. 更新此README文档

## 许可证

MIT License
