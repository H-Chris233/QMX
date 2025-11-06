[根目录](../../CLAUDE.md) > [src](../) > **utils**

# 前端工具模块

## 变更记录 (Changelog)

### 2025-11-06T06:48:29+0000
- 初始化模块文档
- 记录工具函数和数据转换逻辑

---

## 模块职责

前端工具函数库，提供数据转换、验证、错误处理等通用功能。确保数据一致性和代码复用性。

**核心价值**：
- 数据标准化，统一数据格式
- 输入验证，确保数据有效性
- 错误处理，提供用户友好的错误信息
- 类型转换，桥接前后端数据差异

## 入口与启动

**主要工具文件**：
- `dataTransformers.ts` - 数据转换核心逻辑
- `errorHandler.ts` - 错误处理和用户反馈
- `validation.ts` - 数据验证工具
- `typeGuards.ts` - 类型守卫函数
- `errorHandling.ts` - 通用错误处理

## 对外接口

### 核心工具类

**dataTransformers.ts** - 数据转换器
```typescript
// 主要功能：
- transformStudent()       // 学员数据转换
- transformTransaction()   // 交易数据转换
- normalizePhone()         // 手机号格式化
- formatDate()            // 日期格式化
- formatCurrency()        // 货币格式化
```

**errorHandler.ts** - 错误处理器
```typescript
// 主要功能：
- handleApiOperation()     // API操作包装
- createErrorModal()       // 错误弹窗创建
- logError()              // 错误日志记录
- getUserFriendlyMessage() // 用户友好错误信息
```

**validation.ts** - 验证工具
```typescript
// 主要功能：
- validateStudentForm()    // 学员表单验证
- validateTransactionForm() // 交易表单验证
- validatePhone()          // 手机号验证
- validateEmail()          // 邮箱验证
```

**typeGuards.ts** - 类型守卫
```typescript
// 主要功能：
- isStudent()              // 学员类型判断
- isTransaction()          // 交易类型判断
- isApiError()            // API错误类型判断
- isValidDate()           // 日期有效性判断
```

## 关键依赖与配置

### 外部依赖
- **libphonenumber-js**: 手机号解析和格式化
- **@/types/api**: 类型定义

### 配置项
- **日期格式**: `YYYY-MM-DD`
- **货币格式**: `¥#,###.00`
- **手机号地区**: `CN`
- **错误显示时间**: 5秒

## 数据转换架构

### 转换器模式
```typescript
interface DataTransformer<From, To> {
  transform(data: From): To;
  reverse?(data: To): From;
}

// 学员数据转换器
const studentTransformer: DataTransformer<BackendStudent, FrontendStudent> = {
  transform: (backend) => ({
    id: backend.uid,
    name: backend.name,
    // ... 字段映射
  }),
  reverse: (frontend) => ({
    uid: frontend.id,
    name: frontend.name,
    // ... 反向映射
  })
};
```

### 验证链模式
```typescript
interface ValidationRule<T> {
  validate: (value: T) => boolean;
  message: string;
}

const phoneValidation: ValidationRule<string>[] = [
  { validate: v => v.length > 0, message: '手机号不能为空' },
  { validate: v => /^1[3-9]\d{9}$/.test(v), message: '手机号格式不正确' }
];
```

## 测试与质量

### 测试覆盖
- **单元测试**: `dataTransformers.test.ts`
- **覆盖率**: 核心函数100%覆盖
- **测试工具**: Vitest

### 代码质量
- TypeScript严格模式
- 纯函数设计，无副作用
- 详细的JSDoc注释
- 错误边界处理

### 性能优化
- 记忆化转换函数
- 防抖验证
- 懒加载验证规则

## 常见问题 (FAQ)

**Q: 数据转换失败怎么办？**
A:
1. 检查数据类型是否匹配
2. 确认字段映射是否正确
3. 查看转换器日志
4. 提供默认值或fallback

**Q: 如何添加新的验证规则？**
A:
```typescript
// 在validation.ts中添加
export const customRule: ValidationRule<string> = {
  validate: value => /* 验证逻辑 */,
  message: '错误信息'
};

// 使用
validateField(value, [customRule, ...existingRules]);
```

**Q: 错误处理不生效？**
A:
1. 确认错误处理器已正确导入
2. 检查错误类型是否匹配
3. 验证错误日志配置
4. 确认UI组件正确显示错误

**Q: 如何调试数据转换？**
A:
1. 在转换器中添加console.log
2. 使用TypeScript调试器
3. 检查转换前后的数据结构
4. 添加单元测试验证转换逻辑

## 工具函数使用示例

### 数据转换示例
```typescript
import { transformStudent, formatCurrency } from './dataTransformers';

// 后端数据转换
const frontendStudent = transformStudent(backendStudent);

// 货币格式化
const formattedAmount = formatCurrency(1234.5); // "¥1,234.50"
```

### 错误处理示例
```typescript
import { handleApiOperation } from './errorHandler';

// API操作包装
const result = await handleApiOperation(
  () => ApiService.createStudent(data),
  '创建学员',
  { retryable: false }
);
```

### 验证使用示例
```typescript
import { validateStudentForm } from './validation';

// 表单验证
const errors = validateStudentForm(formData);
if (Object.keys(errors).length > 0) {
  // 显示验证错误
}
```

## 相关文件清单

```
src/utils/
├── dataTransformers.ts      # 数据转换核心
├── errorHandler.ts          # 错误处理
├── validation.ts            # 数据验证
├── typeGuards.ts           # 类型守卫
├── errorHandling.ts        # 通用错误处理
└── __tests__/
    └── dataTransformers.test.ts  # 单元测试
```

## 架构图

```
┌─────────────────────────────────────────┐
│           Components                    │
│     (Vue组件)                          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│           Utils Layer                   │
│  ┌─────────────┬─────────────┬────────┐ │
│  │Data Transform│ErrorHandler │Validation│ │
│  │     ers      │             │         │ │
│  └─────────────┴─────────────┴────────┘ │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│           External Libraries            │
│  (libphonenumber-js, Joi, etc.)        │
└─────────────────────────────────────────┘
```

---

**最后更新**: 2025-11-06T06:48:29+0000