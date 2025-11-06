[根目录](../../CLAUDE.md) > [src](../) > **types**

# 类型定义模块

## 变更记录 (Changelog)

### 2025-11-06T06:48:29+0000
- 初始化模块文档
- 记录类型系统和API接口定义

---

## 模块职责

TypeScript类型定义中心，确保前后端类型一致性。提供编译时类型检查，减少运行时错误。

**核心价值**：
- 类型安全，编译时发现错误
- 前后端类型同步，避免数据不一致
- 智能代码提示，提升开发效率
- 接口文档化，便于维护

## 入口与启动

**主入口**：`api.ts` - API相关类型定义，与后端保持同步

**类型文件分工**：
- `api.ts` - API接口类型、枚举、数据模型
- `forms.ts` - 表单相关类型定义
- `frontend.ts` - 前端专用类型
- `global.d.ts` - 全局类型声明

## 对外接口

### 核心类型文件

**api.ts** - API接口类型
```typescript
// 主要类型：
export enum ClassType { TEN_TRY, MONTH, YEAR, OTHERS }
export enum SubjectType { SHOOTING, ARCHERY, OTHERS }
export enum MembershipStatus { NONE, ACTIVE, EXPIRED, UPCOMING }
export interface Student { /* 学员数据结构 */ }
export interface Transaction { /* 交易数据结构 */ }
export interface ApiResponse<T> { /* API响应格式 */ }
```

**forms.ts** - 表单类型
```typescript
// 主要类型：
export interface StudentFormData { /* 学员表单数据 */ }
export interface TransactionFormData { /* 交易表单数据 */ }
export interface FormValidationErrors { /* 表单验证错误 */ }
```

**frontend.ts** - 前端专用类型
```typescript
// 主要类型：
export interface ComponentState { /* 组件状态 */ }
export interface NavigationItem { /* 导航项 */ }
export interface TableColumn { /* 表格列配置 */ }
```

**global.d.ts** - 全局声明
```typescript
// 主要声明：
declare module '*.vue';
declare global { /* 全局变量和函数 */ }
```

## 关键依赖与配置

### 外部依赖
- 无外部运行时依赖
- 仅TypeScript编译时使用

### 配置项
- **tsconfig.json**: TypeScript编译配置
- **严格模式**: 启用所有严格类型检查
- **路径映射**: 支持@别名导入

## 类型系统架构

### 基础类型层次
```
基础类型 (primitives)
    ↓
枚举类型 (enums)
    ↓
接口类型 (interfaces)
    ↓
复合类型 (complex types)
    ↓
API类型 (api contracts)
```

### API类型结构
```typescript
// 请求类型
export interface StudentCreateRequest {
  name: string;
  age?: number;
  class: ClassType;
  // ...
}

// 响应类型
export interface StudentResponse {
  uid: number;
  name: string;
  age?: number;
  // ...
}

// 分页类型
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
```

### 表单类型结构
```typescript
// 表单数据
export interface StudentFormData {
  name: string;
  age?: number;
  phone: string;
  class: ClassType;
  subject: SubjectType;
  note?: string;
}

// 表单状态
export interface FormState<T> {
  data: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  submitting: boolean;
}
```

## 测试与质量

### 类型检查
- **TypeScript编译**: `tsc --noEmit`
- **严格模式**: 所有严格选项启用
- **类型覆盖**: 100% TypeScript文件

### 代码质量
- 统一命名约定（PascalCase for types）
- 详细的JSDoc注释
- 类型导出控制（避免export *）
- 前后端类型同步机制

### 类型同步策略
1. **后端优先**: 后端定义主类型
2. **自动生成**: 脚本同步类型到前端
3. **手动验证**: 定期检查类型一致性
4. **版本控制**: 类型变更记录在changelog

## 常见问题 (FAQ)

**Q: 如何添加新的API类型？**
A:
1. 在后端定义类型
2. 同步到 `src/types/api.ts`
3. 更新相关的请求/响应类型
4. 添加表单类型（如需要）

**Q: 类型不匹配怎么办？**
A:
1. 检查前后端类型定义是否一致
2. 确认数据转换器是否正确
3. 查看API响应格式是否变化
4. 更新类型定义并重新编译

**Q: 如何处理可选字段？**
A: 使用 `?` 标记可选字段，使用 `| null` 表示可空字段：
```typescript
interface Student {
  name: string;        // 必填
  age?: number;        // 可选
  phone: string | null; // 可空
}
```

**Q: 如何扩展类型定义？**
A: 使用接口继承或交叉类型：
```typescript
interface ExtendedStudent extends Student {
  membership: MembershipData;
}

// 或
type StudentWithExtras = Student & {
  customField: string;
};
```

## 类型同步检查清单

### 后端类型检查
- [ ] `ClassType`, `SubjectType`, `MembershipStatus` 枚举
- [ ] `Student`, `Transaction`, `Installment` 接口
- [ ] API请求/响应类型
- [ ] 数据库Schema类型

### 前端类型检查
- [ ] 表单数据类型
- [ ] 组件Props类型
- [ ] 状态管理类型
- [ ] 工具函数类型

### 同步验证
- [ ] 运行类型同步脚本
- [ ] TypeScript编译无错误
- [ ] 运行时类型检查通过
- [ ] API测试数据匹配

## 相关文件清单

```
src/types/
├── api.ts              # API接口类型（主文件）
├── forms.ts            # 表单相关类型
├── frontend.ts         # 前端专用类型
└── global.d.ts         # 全局类型声明
```

## 类型依赖图

```
┌─────────────────────────────────────────┐
│              api.ts                     │
│  (枚举 + 核心接口 + API类型)             │
└──────────────┬──────────────────────────┘
               │
      ┌────────┴────────┐
      ▼                 ▼
┌──────────┐      ┌──────────┐
│ forms.ts │      │frontend  │
│ (表单类型) │      │ (UI类型) │
└────┬─────┘      └────┬─────┘
     │                 │
     └────────┬────────┘
              ▼
     ┌─────────────────┐
     │  global.d.ts    │
     │ (全局声明)       │
     └─────────────────┘
              │
              ▼
     ┌─────────────────┐
     │   TypeScript    │
     │   编译器检查     │
     └─────────────────┘
```

---

**最后更新**: 2025-11-06T06:48:29+0000