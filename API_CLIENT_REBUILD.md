# API 客户端重建完成总结

## 新建文件

### 1. src/api/baseClient.ts
- 基于 axios 配置统一实例
- baseURL: `/api/v1` (通过 Vite 代理转发到 `http://localhost:3001`)
- JSON headers: `Content-Type: application/json`, `Accept: application/json`
- **请求拦截器**: 注入 Authorization 头 (从 localStorage 读取 token，预留功能)
- **响应拦截器**: 
  - 解包 `{ success, data, error }` 格式
  - 当 `success=false` 时抛出自定义 ApiError
  - ApiError 包含 `type` 和 `message` 属性
- 导出 `baseClient` 实例和 `apiCall` 包装函数

### 2. src/api/studentApi.ts
- `StudentApiService.getAllStudents(params?)` - 返回 `{ students, pagination }`
- `StudentApiService.searchStudents(params)` - 返回学员数组
- `StudentApiService.getStudentById(uid)`
- `StudentApiService.addStudent(student)` - 映射 `classType` -> `class`
- `StudentApiService.updateStudent(uid, data)` - 字段名映射
- `StudentApiService.deleteStudent(uid)`
- 成绩管理: `getStudentScores`, `addScore`, `deleteScore`, `updateScore`, `updateScoresBatch`

### 3. src/api/transactionApi.ts
- `TransactionApiService.getAllTransactions(params?)` - 返回 `{ items, pagination }`
- `TransactionApiService.searchTransactions(params)` - 返回数组
- `TransactionApiService.getTransactionById(uid)`
- `TransactionApiService.addCashTransaction(data)`
- `TransactionApiService.addInstallmentTransaction(data)`
- `TransactionApiService.deleteTransaction(uid)`

### 4. src/api/installmentsApi.ts
- `InstallmentsApiService.getInstallmentStatuses()`
- `InstallmentsApiService.getUpcomingInstallments(days?)`
- `InstallmentsApiService.updateInstallmentStatus(transactionUid, status)`
- `InstallmentsApiService.payNextInstallment(planId)`
- `InstallmentsApiService.cancelInstallmentPlan(planId)`
- `InstallmentsApiService.getInstallmentPlan(planId)`

### 5. src/api/statsApi.ts
- 定义 `StatsPeriod` 类型，支持:
  - 字符串: `'today' | 'week' | 'month' | 'year' | 'all'`
  - 大写格式: `'Today' | 'ThisWeek' | 'ThisMonth' | 'ThisYear'` (向后兼容)
  - 自定义范围: `{ date_from, date_to }` 或 `{ start, end }`
- `StatsApiService.getDashboardStats(period?)`
- `StatsApiService.getStudentStats(studentId, period?)`
- `StatsApiService.getGlobalStudentStats(period?)`
- `StatsApiService.getFinancialStats(period?)`
- `StatsApiService.getGlobalFinancialStats(period?)`
- `StatsApiService.getMembershipExpiringSoon(days)`

### 6. src/api/membershipApi.ts
- `MembershipApiService.setStudentMembership(studentId, membership)`
- `MembershipApiService.clearStudentMembership(studentId)`
- `MembershipApiService.setMembershipByType(studentId, type, startDate?)`
- `MembershipApiService.renewMembership(studentId, type)`
- `MembershipApiService.getMembershipStats()`
- `MembershipApiService.batchSetMembership(studentIds, membership)`

### 7. src/api/adapterApi.ts
- `AdapterApiService.getStudents(params?)`
- `AdapterApiService.addStudent(student)`
- `AdapterApiService.getTransactions(params?)`
- `AdapterApiService.getFinancialStats(params?)`
- `AdapterApiService.getHealthStatus()`
- `AdapterApiService.getAdapterInfo()`

## 更新文件

### src/api/ApiService.ts
- 导入所有新建的 service 模块
- 实现所有静态方法，调用对应的 service
- **所有方法都使用 `handleApiOperation` 包装**，提供统一错误处理
- **向后兼容性**:
  - `addStudent` 支持对象参数和多参数两种调用方式
  - `addCashTransaction` 支持对象参数和多参数
  - `addInstallmentTransaction` 支持对象参数和多参数
  - `updateStudentInfo` 自动转换 `classType` -> `class`
- 导出类型: `StudentListResponse`, `TransactionListResponse`, `MembershipStats`, `HealthStatus`, `AdapterInfo`, `StatsPeriod`

### src/types/api.ts
- 更新 `StudentSearchOptions` 和 `CashSearchOptions`，所有可选字段支持 `undefined` (解决 exactOptionalPropertyTypes 问题)

## 关键特性

### 1. 错误处理
- 自定义 `ApiError` 类包含 `type` 和 `message`
- 响应拦截器自动抛出错误当 `success=false`
- 网络错误、HTTP 错误、请求错误分别处理
- 所有 API 调用通过 `handleApiOperation` 统一处理和显示错误

### 2. 类型安全
- 所有 service 和方法都有完整的 TypeScript 类型签名
- 导出的类型便于组件使用
- 查询参数、请求体、响应数据都有类型定义

### 3. 数据转换
- 请求拦截器注入认证 token (预留)
- 响应拦截器解包 API 格式
- 查询参数自动序列化和过滤空值
- 字段名映射 (前端 `classType` <-> 后端 `class`)

### 4. 分页支持
- `getAllStudents` 返回 `{ students, pagination }`
- `getAllTransactions` 返回 `{ items, pagination }`
- 分页信息包含: `page`, `limit`, `total`, `total_pages`

### 5. 向后兼容
- 保留旧的多参数方法签名
- 支持大写和小写的周期参数格式
- 字段名自动转换

## 使用示例

```typescript
// 获取学员列表
const result = await ApiService.getAllStudents({
  page: 1,
  limit: 20,
  name_contains: 'John',
  class_type: 'Month'
});
console.log(result.students, result.pagination);

// 新增学员 (新格式)
await ApiService.addStudent({
  name: '张三',
  age: 25,
  phone: '13800138000',
  class: 'Month',
  subject: 'Shooting',
  note: '备注'
});

// 新增学员 (旧格式 - 向后兼容)
await ApiService.addStudent('张三', 25, 'Month', '13800138000', '备注', 'Shooting');

// 获取统计数据
const stats = await ApiService.getDashboardStats('ThisMonth'); // 或 'month'
const customStats = await ApiService.getFinancialStats({
  start: '2024-01-01',
  end: '2024-12-31'
});

// 新增交易
await ApiService.addCashTransaction({
  student_id: 1,
  amount: 100,
  note: '学费'
});

// 分期交易
await ApiService.addInstallmentTransaction({
  student_id: 1,
  amount: 1000,
  total_installments: 10,
  frequency: 'Monthly',
  note: '分期学费'
});
```

## 验收标准检查

- ✅ 新增 service 文件组织清晰
- ✅ 所有 ApiService 静态方法均调用新的 service/基类
- ✅ 导出类型与组件期望一致
- ✅ axios 实例能正确处理 success=false 的场景
- ✅ 抛出携带后端错误信息的异常
- ✅ baseURL 指向 /api/v1
- ✅ JSON headers 设置
- ✅ 请求拦截器注入 Authorization (预留)
- ✅ 响应拦截器解包和错误处理
- ✅ 查询参数序列化
- ✅ 请求体命名转换
- ✅ 分页结果解包
- ✅ 使用 handleApiOperation 封装错误提示

## 注意事项

1. **组件适配**: 部分组件仍使用旧的数据结构 (如 `installment_status` 直接在 Transaction 上，而非 `installment.status`)，需要组件层面适配新的类型定义

2. **Token 认证**: Authorization header 注入已实现，但 token 获取逻辑为预留功能，从 localStorage 读取 `auth_token`

3. **错误显示**: 所有错误通过 `handleApiOperation` 统一处理，会自动显示错误模态框

4. **类型兼容**: 添加了 `undefined` 到可选字段类型，以满足 `exactOptionalPropertyTypes` 要求
