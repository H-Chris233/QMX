[根目录](../../CLAUDE.md) > [src](../) > **api**

# API 客户端模块

## 变更记录 (Changelog)

### 2025-11-05T15:29:13Z
- 初始化模块文档
- 记录API客户端架构和接口

---

## 模块职责

前端API客户端层，封装所有与后端的HTTP通信。提供类型安全的API调用接口，统一处理错误重试、响应转换和异常处理。

**核心价值**：
- 统一API调用入口，避免重复代码
- 类型安全，编译时检查API参数和返回值
- 自动错误处理和重试机制
- 响应数据标准化

## 入口与启动

**统一入口**：`index.ts` - 推荐从这里导入所有 API 服务

**使用方式**：
```typescript
// ✅ 推荐：从统一入口导入
import { ApiService, type Student } from '@/api';

// 获取学员列表
const students = await ApiService.getAllStudents({ page: 1, limit: 20 });

// 创建交易记录
const transaction = await ApiService.addCashTransaction(data);
```

**旧方式（仍兼容，但推荐迁移）**：
```typescript
// ❌ 不推荐：直接导入具体模块
import { ApiService } from '@/api/ApiService';
import { StudentApiService } from '@/api/studentApi';
```

## 新增功能：API 方法别名

为解决多程序员开发时的命名不一致问题，提供 `ApiAliases`：

```typescript
import { ApiService, ApiAliases } from '@/api';

// 使用别名（统一命名风格）
await ApiService[ApiAliases.students.list]({ page: 1 });

// 直接调用
await ApiService.getAllStudents({ page: 1 });
```

## 对外接口

### 核心API服务类

**ApiService** (`ApiService.ts`)
- 学员管理：`getAllStudents()`, `getStudentById()`, `createStudent()`, `updateStudent()`, `deleteStudent()`
- 交易管理：`getAllTransactions()`, `createTransaction()`, `updateTransaction()`, `deleteTransaction()`
- 分期管理：`getInstallmentsByStudent()`, `createInstallmentPlan()`, `payInstallment()`
- 统计数据：`getDashboardStats()`, `getStudentStats()`, `getFinancialStats()`
- 会员管理：`getMembershipStats()`, `getMembershipAlerts()`
- 适配器：`getAdapterHealth()`, `getAdapterInfo()`

### 模块化API服务

| 文件 | 职责 | 主要方法 |
|------|------|---------|
| `studentApi.ts` | 学员CRUD操作 | getAllStudents, getStudentById, createStudent, updateStudent, deleteStudent |
| `transactionApi.ts` | 交易记录管理 | getAllTransactions, createTransaction, updateTransaction, deleteTransaction |
| `installmentsApi.ts` | 分期付款管理 | getInstallmentsByStudent, createInstallmentPlan, payInstallment, cancelInstallment |
| `statsApi.ts` | 统计数据查询 | getDashboardStats, getStudentStats, getFinancialStats |
| `membershipApi.ts` | 会员信息查询 | getMembershipStats, getMembershipAlerts |
| `adapterApi.ts` | 数据库适配器 | getAdapterHealth, getAdapterInfo |
| `baseClient.ts` | HTTP客户端基础 | 配置axios实例、拦截器、重试逻辑 |

## 关键依赖与配置

### 外部依赖
- **axios**: HTTP客户端库
- **@/types/api**: API类型定义
- **@/utils/errorHandler**: 错误处理工具

### 配置项
- **API_BASE_URL**: `/api` (通过Vite代理到 `http://localhost:3001/api/v1`)
- **超时时间**: 30秒
- **重试策略**: 最多3次，指数退避

### 请求拦截器
```typescript
// 自动添加请求头
// 记录请求日志
// 处理请求参数
```

### 响应拦截器
```typescript
// 统一响应格式解析
// 错误状态码处理
// 自动重试机制
```

## 数据模型

### 请求参数类型
- `StudentSearchOptions`: 学员搜索参数（分页、关键词、班级、科目等）
- `CashSearchOptions`: 交易搜索参数（学员ID、日期范围、类型等）
- `StudentUpdateData`: 学员更新数据
- `TransactionCreateData`: 交易创建数据

### 响应数据类型
- `StudentListResponse`: 学员列表响应（包含分页信息）
- `TransactionListResponse`: 交易列表响应
- `DashboardStats`: 仪表盘统计数据
- `StudentStats`: 学员统计数据
- `FinancialStats`: 财务统计数据
- `MembershipStats`: 会员统计数据

## 测试与质量

### 测试覆盖
- **单元测试**: 无（API客户端通常通过集成测试覆盖）
- **集成测试**: 后端API测试覆盖（`backend/src/__tests__/api/`）

### 错误处理
- 网络错误自动重试（最多3次）
- 超时错误提示用户
- 4xx错误显示后端错误信息
- 5xx错误显示通用错误提示

### 代码质量
- TypeScript严格模式
- 所有API方法都有类型定义
- 使用`handleApiOperation`统一错误处理

## 常见问题 (FAQ)

**Q: 如何添加新的API端点？**
A:
1. 在对应的`*Api.ts`文件中添加方法
2. 在`ApiService.ts`中暴露静态方法
3. 确保类型定义在`@/types/api.ts`中

**Q: API调用失败如何调试？**
A:
1. 检查浏览器Network面板查看请求详情
2. 查看控制台错误日志
3. 确认后端服务是否正常运行（端口3001）
4. 检查Vite代理配置（`vite.config.ts`）

**Q: 如何禁用自动重试？**
A: 在`handleApiOperation`的第三个参数中设置`retryable: false`

**Q: 响应数据格式不一致怎么办？**
A: 后端统一返回`{ success: boolean, data?: any, error?: string }`格式，前端自动解析

## 相关文件清单

```
src/api/
├── index.ts               # 统一导出入口（推荐使用）
├── ApiService.ts          # 统一API服务类（主入口）
├── baseClient.ts          # axios客户端配置
├── studentApi.ts          # 学员API
├── transactionApi.ts      # 交易API
├── installmentsApi.ts     # 分期API
├── statsApi.ts            # 统计API
├── membershipApi.ts       # 会员API
├── authApi.ts             # 认证API
└── adapterApi.ts          # 适配器API
```

## 架构图

```
┌─────────────────────────────────────────┐
│         Vue Components                  │
│  (Dashboard, StudentManagement, etc.)   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         ApiService (统一入口)            │
│  - getAllStudents()                     │
│  - createTransaction()                  │
│  - getDashboardStats()                  │
└──────────────┬──────────────────────────┘
               │
      ┌────────┴────────┐
      ▼                 ▼
┌──────────┐      ┌──────────┐
│ Student  │      │Transaction│
│   Api    │ ...  │   Api    │
└────┬─────┘      └────┬─────┘
     │                 │
     └────────┬────────┘
              ▼
     ┌─────────────────┐
     │  baseClient     │
     │  (axios + 重试)  │
     └────────┬────────┘
              │
              ▼
     ┌─────────────────┐
     │  Backend API    │
     │ (port 3001)     │
     └─────────────────┘
```

---

**最后更新**: 2025-11-05T15:29:13Z
