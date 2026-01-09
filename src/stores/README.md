# QMX 状态管理架构

## 概述

基于 Pinia 的现代化状态管理架构，替代了原有的 provide/inject 和 props/emit 混乱状态。

## Store 模块结构

```
stores/
├── index.ts          # Pinia 实例和导出
├── app.ts            # 应用全局状态（loading、错误、系统信息）
├── auth.ts           # 用户认证状态（登录、权限）
├── student.ts        # 学生数据管理
├── transaction.ts    # 交易数据管理
├── installment.ts    # 分期付款管理
├── stats.ts          # 统计数据缓存
└── README.md         # 本文档
```

## Store 功能矩阵

| Store | 主要职责 | 核心数据 | 缓存策略 |
|-------|---------|---------|---------|
| **app** | 全局状态 | loading、errors、systemInfo | 内存状态 |
| **auth** | 认证授权 | user、token、permissions | localStorage + 内存 |
| **student** | 学生CRUD | students、pagination、searchParams | 5分钟 |
| **transaction** | 交易管理 | transactions、filters、pagination | 2分钟 |
| **installment** | 分期管理 | installments、paymentPlans | 3分钟 |
| **stats** | 统计数据 | dashboardStats、financialStats | 差异化缓存 |

## 使用指南

### 1. 基础用法

```typescript
// 在组件中使用
import { useStudentStore } from '@/stores';
import { useTransactionStore } from '@/stores';

const studentStore = useStudentStore();
const transactionStore = useTransactionStore();

// 获取数据
const students = studentStore.students;
const isLoading = studentStore.isLoading;

// 调用action
await studentStore.fetchStudents();
await transactionStore.createTransaction(data);
```

### 2. 计算属性

```typescript
// 使用store的computed
const activeStudents = computed(() => studentStore.activeStudents);
const totalIncome = computed(() => transactionStore.totalIncome);
const overdueInstallments = computed(() => installmentStore.overdueInstallments);
```

### 3. 错误处理

```typescript
// 统一的错误处理
const appStore = useAppStore();

// 显示错误
appStore.errorHandler.showError('操作失败', 'context');

// 清除错误
appStore.errorHandler.clearErrors();

// 获取最新错误
const latestError = appStore.latestError;
```

### 4. 加载状态

```typescript
// 全局loading
const isLoading = appStore.isLoading;

// API特定loading
const isFetchingStudents = appStore.apiLoading('fetchStudents');

// 设置loading
appStore.setApiLoading('customAction', true);
```

## Store 详细说明

### app.ts - 应用状态

```typescript
const appStore = useAppStore();

// 全局loading状态
appStore.setGlobalLoading(true);
appStore.setApiLoading('fetchData', true);
appStore.setComponentLoading('table', true);

// 错误管理
appStore.addError({
  message: '网络错误',
  context: 'fetchData',
  code: 'NETWORK_ERROR'
});

// 系统信息
appStore.updateSystemInfo({
  version: '1.0.0',
  adapterHealth: { status: 'ok' }
});

// 系统刷新（替代原来的refreshSystem）
await appStore.refreshSystem();
```

### auth.ts - 认证状态

```typescript
const authStore = useAuthStore();

// 登录
await authStore.login({
  username: 'admin',
  password: 'password',
  rememberMe: true
});

// 权限检查
if (authStore.canManageStudents) {
  // 可以管理学生
}

if (authStore.checkPermission('reports:view')) {
  // 可以查看报表
}

// 获取认证头
const authHeader = authStore.getAuthHeader();
```

### student.ts - 学生管理

```typescript
const studentStore = useStudentStore();

// 获取学生列表
await studentStore.fetchStudents({
  page: 1,
  limit: 20,
  keyword: '张三'
});

// 获取单个学生
await studentStore.fetchStudentById(123);

// 创建学生
await studentStore.createStudent({
  name: '张三',
  age: 18,
  class: ClassType.TEN_TRY,
  phone: '13800138000'
});

// 更新学生
await studentStore.updateStudent(123, {
  name: '李四',
  age: 19
});

// 删除学生
await studentStore.deleteStudent(123);

// 搜索学生
await studentStore.searchStudents('关键词');
```

### transaction.ts - 交易管理

```typescript
const transactionStore = useTransactionStore();

// 获取交易列表
await transactionStore.fetchTransactions({
  page: 1,
  limit: 50,
  startDate: '2024-01-01',
  endDate: '2024-12-31'
});

// 创建交易
await transactionStore.createTransaction({
  amount: 1000,
  student_id: 123,
  description: '学费',
  frequency: PaymentFrequency.MONTHLY,
  total_installments: 12
});

// 获取统计数据
const income = transactionStore.totalIncome;
const expense = transactionStore.totalExpense;
const netProfit = transactionStore.netProfit;
```

### installment.ts - 分期管理

```typescript
const installmentStore = useInstallmentStore();

// 获取分期列表
await installmentStore.fetchInstallments({
  studentId: '123',
  status: InstallmentStatus.PENDING
});

// 创建分期计划
await installmentStore.createInstallmentPlan({
  student_id: 123,
  total_amount: 12000,
  total_installments: 12,
  frequency: PaymentFrequency.MONTHLY,
  start_date: '2024-01-01'
});

// 支付分期
await installmentStore.payInstallment(456, {
  amount: 1000,
  payment_method: 'cash'
});

// 获取即将到期的分期
const upcoming = installmentStore.getUpcomingInstallments(7); // 7天内
```

### stats.ts - 统计数据

```typescript
const statsStore = useStatsStore();

// 获取仪表盘统计
const dashboardStats = await statsStore.fetchDashboardStats();

// 获取财务统计
const financialStats = await statsStore.fetchFinancialStats();

// 批量获取所有统计
const allStats = await statsStore.fetchAllStats();

// 刷新特定统计
await statsStore.refreshStats('dashboard');

// 检查缓存是否过期
const expired = statsStore.isCacheExpired('dashboard');
```

## 迁移指南

### 从 provide/inject 迁移

**原来：**
```typescript
// MainApp.vue
provide('errorHandler', errorHandler);
provide('refreshSystem', refreshSystem);

// 组件中
const errorHandler = inject<ErrorHandler>('errorHandler');
const refreshSystem = inject<RefreshSystem>('refreshSystem');
```

**现在：**
```typescript
// 组件中
const appStore = useAppStore();

// 使用errorHandler
appStore.errorHandler.showError('错误信息');
appStore.errorHandler.showSuccess('操作成功');

// 使用refreshSystem
await appStore.refreshSystem();
```

### 从 props/emit 迁移

**原来：**
```typescript
// 父组件
<StudentForm
  v-model="studentData"
  @save="handleSave"
  @cancel="handleCancel"
/>

// 子组件
const props = defineProps<Props>();
const emit = defineEmits<Emits>();
```

**现在：**
```typescript
// 组件中
const studentStore = useStudentStore();

// 直接操作store
await studentStore.createStudent(data);
await studentStore.updateStudent(id, data);
```

## 最佳实践

### 1. 数据获取

```typescript
// ✅ 好的做法：使用store的异步方法
const studentStore = useStudentStore();
onMounted(async () => {
  try {
    await studentStore.fetchStudents();
  } catch (error) {
    // 错误已经在store中处理
  }
});

// ❌ 避免的做法：直接调用API
// const students = await ApiService.getAllStudents();
```

### 2. 缓存管理

```typescript
// ✅ 强制刷新
await studentStore.refresh(); // 忽略缓存
await studentStore.fetchStudents({}, true); // 强制刷新

// ✅ 检查缓存
if (!studentStore.isCacheExpired) {
  return studentStore.students; // 使用缓存
}
```

### 3. 错误处理

```typescript
// ✅ 统一错误处理
const appStore = useAppStore();
try {
  await someAsyncOperation();
} catch (error) {
  // store会自动处理错误显示
  // 可选择进行额外处理
}

// ❌ 避免重复错误处理
try {
  await someAsyncOperation();
} catch (error) {
  showToast('操作失败'); // 重复处理
  console.error(error); // 重复处理
}
```

### 4. 类型安全

```typescript
// ✅ 使用store的类型
import type { Student, StudentCreateData } from '@/types/api';

const studentData: StudentCreateData = {
  name: '张三',
  class: ClassType.TEN_TRY
};

// ❌ 避免使用any
const data: any = { /* ... */ };
```

## 性能优化

### 1. 按需加载

```typescript
// ✅ 只在需要时获取数据
const showStudentsModal = ref(false);

const openStudentsModal = async () => {
  if (!studentStore.students.length) {
    await studentStore.fetchStudents();
  }
  showStudentsModal.value = true;
};
```

### 2. 缓存策略

```typescript
// ✅ 根据数据更新频率设置不同的缓存时间
// student store: 5分钟（变化较少）
// transaction store: 2分钟（变化较多）
// stats store: 差异化缓存
```

### 3. 批量操作

```typescript
// ✅ 使用批量API
await statsStore.fetchAllStats(); // 并行请求
// 而不是逐个调用
await statsStore.fetchDashboardStats();
await statsStore.fetchStudentStats();
await statsStore.fetchFinancialStats();
```

## 调试技巧

### 1. Vue DevTools

安装 Vue DevTools 扩展，可以看到所有store的状态和actions。

### 2. Store状态监控

```typescript
// 在开发环境中监控store变化
if (import.meta.env.DEV) {
  watch(() => studentStore.students, (newStudents) => {
    console.log('Students updated:', newStudents.length);
  }, { deep: true });
}
```

### 3. 网络请求调试

```typescript
// store中的loading状态可以帮助调试
console.log('Loading states:', {
  fetchStudents: appStore.apiLoading('fetchStudents'),
  createTransaction: appStore.apiLoading('createTransaction')
});
```

## 故障排除

### 常见问题

1. **Store未初始化**
   ```typescript
   // 确保在main.ts中正确配置了Pinia
   app.use(pinia);
   ```

2. **类型错误**
   ```typescript
   // 确保正确导入了类型
   import type { Student } from '@/types/api';
   ```

3. **缓存问题**
   ```typescript
   // 强制清除缓存
   studentStore.clearStudents();
   await studentStore.refresh();
   ```

4. **权限问题**
   ```typescript
   // 检查认证状态
   if (!authStore.isAuthenticated) {
     await authStore.login(credentials);
   }
   ```

---

**更新时间**: 2025-01-09
**维护者**: 老王