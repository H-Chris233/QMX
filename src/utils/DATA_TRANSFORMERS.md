# QMX 数据转换器文档

## 概述

`dataTransformers.ts` 提供了一套完整的数据验证、转换和格式化工具，用于处理 QMX 系统中的各类数据。

## 主要功能模块

### 1. 数字解析和验证

#### `safeParseNumber(value, fallback, options)`

安全解析数字，支持范围和小数控制。

**参数：**
- `value: unknown` - 要解析的值
- `fallback: number` - 解析失败时的默认值（默认 0）
- `options: ParseNumberOptions` - 解析选项
  - `min?: number` - 最小值
  - `max?: number` - 最大值
  - `decimals?: number` - 小数位数
  - `allowNegative?: boolean` - 是否允许负数（默认 true）

**示例：**
```typescript
// 基础用法
safeParseNumber("123.45", 0) // 123.45

// 范围控制
safeParseNumber(150, 0, { min: 0, max: 100 }) // 100

// 小数控制
safeParseNumber(123.456, 0, { decimals: 2 }) // 123.46

// 组合使用
safeParseNumber("-50", 0, { min: 0, max: 1000, decimals: 2, allowNegative: false }) // 0
```

### 2. 仪表板数据转换

#### `transformDashboardData(raw: DashboardStats)`

将后端返回的原始统计数据转换为前端使用的格式。

**注意：** 后端返回的金额已经是元（由 statsService 转换），这里只做数据映射和验证。

**示例：**
```typescript
const raw = {
  total_revenue: 12345.67,
  total_students: 150,
  average_score: 8.5,
  // ... 其他字段
};

const result = transformDashboardData(raw);
// {
//   totalRevenue: 12345.67,
//   activeStudents: 150,
//   averageGrade: 8.5
// }
```

### 3. 交易数据处理

#### `validateTransactionData(transaction)`

验证交易数据的完整性和有效性。

**返回：** `boolean` - 是否有效

#### `validateTransactionInput(input)`

验证交易输入数据，用于前端表单验证。

**返回：** `{ valid: boolean, errors: string[] }`

**示例：**
```typescript
const result = validateTransactionInput({
  amount: 100.50,
  student_id: 1,
  is_installment: true,
  installment_current: 1,
  installment_total: 3
});

if (!result.valid) {
  console.error('验证失败:', result.errors);
}
```

#### `validateSimplifiedTransaction(transaction)`

快速验证简化的交易数据，不返回详细错误信息。

**返回：** `boolean`

#### `safeMapApiTransactionToFrontend(transaction)`

安全映射 API 交易数据到前端格式。

**重要说明：**
- 后端返回的 `amount` 字段已经是元（由控制器转换）
- 此函数主要负责：
  1. 数据验证和容错处理
  2. 添加辅助字段（`is_income`、`is_expense`、`description` 等）
  3. 生成描述文案
  4. 提取分期信息

**示例：**
```typescript
const apiTransaction = {
  uid: 1,
  amount: 123.45, // 后端已转换为元
  note: "测试交易",
  is_installment: true,
  installment: { 
    installment_number: 1, 
    total_installments: 3 
  }
};

const result = safeMapApiTransactionToFrontend(apiTransaction);
// {
//   uid: 1,
//   amount: 123.45,
//   is_income: true,
//   is_expense: false,
//   description: "分期付款 1/3",
//   installment_current: 1,
//   installment_total: 3,
//   ...
// }
```

### 4. 成绩数据处理

#### `validateScoreInput(score)`

验证成绩输入。

**返回：** `{ valid: boolean, errors: string[] }`

**示例：**
```typescript
validateScoreInput(85.5) // { valid: true, errors: [] }
validateScoreInput(1500) // { valid: false, errors: ['成绩必须在 0 到 1000 之间'] }
```

#### `formatScore(score, fallback?)`

格式化成绩显示，兼容 `rings` 字段。

**示例：**
```typescript
formatScore(85.567) // "85.6"
formatScore("90") // "90.0"
formatScore(null, "N/A") // "N/A"
```

#### `calculateScoreStats(scores: number[])`

计算成绩统计信息，兼容 `rings` 数组。

**返回：** `{ average, max, min, count }`

**示例：**
```typescript
const rings = [450, 480, 520, 490, 510];
const stats = calculateScoreStats(rings);
// {
//   average: 490.0,
//   max: 520.0,
//   min: 450.0,
//   count: 5
// }
```

### 5. 会员数据处理

#### `normalizeMembershipRecord(record)`

标准化会员记录，确保数据一致性和完整性。

**示例：**
```typescript
const raw = {
  uid: 1,
  name: "张三",
  membership_start_date: "2024-01-01",
  membership_end_date: "2024-12-31",
  is_membership_active: true,
  membership_days_remaining: 30
};

const normalized = normalizeMembershipRecord(raw);
// {
//   uid: 1,
//   name: "张三",
//   membership_start_date: "2024-01-01",
//   membership_end_date: "2024-12-31",
//   is_membership_active: true,
//   membership_days_remaining: 30,
//   membership_status: "Active"
// }
```

#### `formatDateRange(startDate, endDate)`

格式化日期范围。

**示例：**
```typescript
formatDateRange("2024-01-01", "2024-12-31") // "2024-01-01 至 2024-12-31"
formatDateRange("2024-01-01", null) // "2024-01-01 起"
formatDateRange(null, "2024-12-31") // "至 2024-12-31"
formatDateRange(null, null) // "--"
```

#### `calculateMembershipDaysRemaining(endDate)`

计算会员剩余天数。

**返回：** `number | null`

#### `isMembershipExpiringSoon(daysRemaining, warningDays?)`

判断会员是否即将过期。

**参数：**
- `daysRemaining: number | null` - 剩余天数
- `warningDays: number` - 提醒天数阈值（默认 7）

### 6. 格式化工具

#### `formatDate(date, format?)`

格式化日期为可读格式。

**参数：**
- `date: string | Date | null` - 日期
- `format: 'date' | 'datetime' | 'time'` - 格式类型（默认 'date'）

**示例：**
```typescript
formatDate("2024-01-15T10:30:00Z") // "2024-01-15"
formatDate("2024-01-15T10:30:00Z", "datetime") // "2024-01-15 10:30:00"
formatDate("2024-01-15T10:30:00Z", "time") // "10:30:00"
```

#### `formatCurrency(amount, showSign?)`

格式化货币显示。

**参数：**
- `amount: number` - 金额（单位：元）
- `showSign: boolean` - 是否显示正负号（默认 false）

**示例：**
```typescript
formatCurrency(1234.56) // "¥1,234.56"
formatCurrency(-100) // "-¥100.00"
formatCurrency(123.45, true) // "+¥123.45"
```

### 7. 辅助工具

#### `safeJsonStringify(data, fallback?)`

安全的 JSON 序列化。

#### `safeJsonParse<T>(json, fallback)`

安全的 JSON 解析。

#### `debounce<T>(fn, delay)`

防抖函数。

#### `throttle<T>(fn, delay)`

节流函数。

## 常量定义

### 金额相关

- `MAX_SAFE_AMOUNT = 999999999999` - 最大安全金额（元），9999亿
- `MIN_AMOUNT = -999999999999` - 最小金额（元），允许负数表示支出
- `AMOUNT_DECIMALS = 2` - 金额小数位数
- `CENTS_TO_YUAN = 100` - 分到元的转换比率（仅作参考，实际转换由后端完成）

### 成绩相关

- `MAX_SCORE = 1000` - 最大成绩值
- `MIN_SCORE = 0` - 最小成绩值
- `SCORE_DECIMALS = 1` - 成绩小数位数

### 学生相关

- `MAX_STUDENTS = 100000` - 最大学生数量

### 会员相关

- `MEMBERSHIP_EXPIRY_WARNING_DAYS = 7` - 会员到期提醒天数

## 数据流说明

### 金额处理流程

```
后端数据库（cents） 
  ↓ [statsService/controllers 转换]
后端API响应（yuan，2位小数）
  ↓ [前端接收]
dataTransformers 验证和格式化（yuan）
  ↓ [组件使用]
显示给用户（yuan，带货币符号）
```

**重要：**
- 后端在返回数据时已经将金额从分转换为元
- 前端的 dataTransformers 主要负责验证、格式化和显示
- 所有金额相关函数的输入和输出单位都是**元**，保留2位小数

### 成绩数据说明

- 后端使用 `rings` 字段存储成绩数组
- 前端兼容 `scores` 和 `rings` 两种命名
- 所有成绩处理函数都支持 `rings` 数组

## 使用建议

1. **统一使用 dataTransformers**：避免在组件中直接进行数据转换，使用本模块提供的函数确保一致性。

2. **错误处理**：验证函数返回详细的错误信息，方便调试和用户提示。

3. **类型安全**：所有函数都有完整的 TypeScript 类型定义，充分利用类型检查。

4. **性能考虑**：对于频繁调用的场景，可以使用 `debounce` 或 `throttle` 优化性能。

5. **测试**：参考 `dataTransformers.demo.ts` 中的示例进行测试和验证。

## 完整使用示例

```typescript
import { 
  safeParseNumber, 
  transformDashboardData,
  safeMapApiTransactionToFrontend,
  validateScoreInput,
  formatCurrency 
} from '@/utils/dataTransformers';

// 1. 处理用户输入的金额
const userInput = "123.456";
const amount = safeParseNumber(userInput, 0, {
  min: 0,
  max: 999999,
  decimals: 2
}); // 123.46

// 2. 转换仪表板数据
const dashboardStats = await ApiService.getDashboardStats();
const dashboardData = transformDashboardData(dashboardStats);

// 3. 处理交易列表
const transactions = await ApiService.getTransactions();
const mappedTransactions = transactions
  .map(tx => safeMapApiTransactionToFrontend(tx))
  .filter(tx => tx !== null);

// 4. 验证成绩输入
const scoreValidation = validateScoreInput(userScoreInput);
if (!scoreValidation.valid) {
  showError(scoreValidation.errors.join('；'));
}

// 5. 格式化显示
const formattedAmount = formatCurrency(123.45); // "¥123.45"
```

## 更新日志

### v1.0.0 (2024-01)
- ✅ 实现所有核心数据转换函数
- ✅ 支持金额、成绩、会员数据处理
- ✅ 提供完整的验证和格式化工具
- ✅ 导出所有必需的常量
- ✅ 添加详细的 JSDoc 注释和使用示例
