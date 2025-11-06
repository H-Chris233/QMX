[根目录](../../CLAUDE.md) > [src](../) > **stores**

# Pinia 状态管理模块

## 变更记录 (Changelog)

### 2025-11-06T11:37:40+0000
- 完成Pinia状态管理架构文档
- 记录从provide/inject到Pinia的迁移完成
- 添加状态管理测试工具文档

---

## 模块职责

Pinia状态管理中心，负责管理全局应用状态、业务数据和组件间通信。提供类型安全的状态管理和开发工具支持。

**核心价值**：
- 集中状态管理，避免prop drilling
- 响应式状态更新，自动UI同步
- 类型安全，编译时错误检查
- 开发工具支持，便于调试
- 模块化设计，按功能域分离

## 入口与启动

**主入口**：`index.ts` - Pinia实例创建和Store导出

**使用方式**：
```typescript
import { useAppStore } from '@/stores/app';
import { useStudentStore } from '@/stores/student';

// 在组件中使用
const appStore = useAppStore();
const studentStore = useStudentStore();
```

## 对外接口

### 核心Store模块

**app.ts** - 应用全局状态
```typescript
interface AppState {
  loading: LoadingState;           // 加载状态
  errors: ErrorInfo[];            // 错误信息
  systemInfo: SystemInfo;         // 系统信息
  isOnline: boolean;              // 网络状态
  confirmModal: ConfirmModalState; // 确认弹窗
}

// 主要方法：
- setGlobalLoading()              // 设置全局加载
- addError() / clearErrors()      // 错误管理
- showConfirm() / hideConfirm()   // 确认弹窗
- errorHandler                    // 简化错误处理
- refreshSystem()                 // 系统刷新
```

**student.ts** - 学员数据管理
```typescript
interface StudentState {
  students: Student[];            // 学员列表
  currentStudent: Student | null; // 当前学员
  searchParams: StudentSearchParams; // 搜索参数
  pagination: PaginationState;    // 分页信息
  loading: boolean;               // 加载状态
}

// 主要方法：
- fetchStudents()                 // 获取学员列表
- createStudent()                 // 创建学员
- updateStudent()                 // 更新学员
- deleteStudent()                 // 删除学员
- searchStudents()                // 搜索学员
- getStudentById()                // 根据ID获取学员
```

**transaction.ts** - 交易记录管理
```typescript
interface TransactionState {
  transactions: Transaction[];    // 交易列表
  currentTransaction: Transaction | null;
  searchParams: TransactionSearchParams;
  pagination: PaginationState;
  filterState: FilterState;       // 过滤状态
  selectedPeriod: string;         // 时间周期
}

// 主要方法：
- fetchTransactions()             // 获取交易列表
- createTransaction()             // 创建交易
- updateTransaction()             // 更新交易
- deleteTransaction()             // 删除交易
- updateFilterState()             // 更新过滤状态
```

**auth.ts** - 认证状态管理
```typescript
interface AuthState {
  user: User | null;              // 当前用户
  token: string | null;           // 访问令牌
  isAuthenticated: boolean;        // 认证状态
  permissions: string[];          // 权限列表
}

// 主要方法：
- login() / logout()              // 登录/登出
- refreshToken()                  // 刷新令牌
- checkPermissions()              // 权限检查
- updateUserInfo()                // 更新用户信息
```

## 关键依赖与配置

### Pinia配置
```typescript
// 开发环境配置
if (import.meta.env.DEV) {
  pinia.use(() => {
    // Vue DevTools集成
    if (typeof window !== 'undefined' &&
        (window as any).__PINIA_DEVTOOLS_GLOBAL_HOOK__) {
      (window as any).__PINIA_DEVTOOLS_GLOBAL_HOOK__.pinia = pinia;
    }
  });
}
```

### 状态管理架构
```
Components (Vue组件)
    ↓
    Actions (操作/异步逻辑)
    ↓
    State (响应式数据)
    ↓
    Getters (计算属性)
    ↓
    Components (UI更新)
```

## Store设计模式

### Composition API风格
```typescript
export const useStudentStore = defineStore('student', () => {
  // State
  const students = ref<Student[]>([]);
  const loading = ref(false);

  // Getters
  const activeStudents = computed(() =>
    students.value.filter(s => s.is_membership_active)
  );

  // Actions
  async function fetchStudents() {
    loading.value = true;
    try {
      const response = await ApiService.getAllStudents();
      students.value = response.students;
    } finally {
      loading.value = false;
    }
  }

  return {
    students,
    loading,
    activeStudents,
    fetchStudents
  };
});
```

### 错误处理模式
```typescript
// 统一错误处理包装器
async function createStudent(data: CurrentStudentInput) {
  return storeActionWrapper(async () => {
    const newStudent = await ApiService.addStudent(data);
    students.value = [newStudent, ...students.value];
    return newStudent;
  }, {
    ...StoreActionPresets.create('学生'),
    context: { data }
  });
}
```

## 测试与质量

### 测试工具
- **测试文件**: `src/utils/store-test.ts`
- **测试方法**: `runAllStoreTests()`, `testAppStore()`, `testStudentStore()`
- **开发环境**: 自动运行store测试

### 调试功能
```typescript
// 开发环境暴露测试方法
if (typeof window !== 'undefined') {
  (window as any).storeTests = {
    runAllStoreTests,
    testAppStore,
    testStudentStore,
    testTransactionStore
  };
}
```

### 代码质量
- TypeScript严格模式
- 完整的类型定义
- 统一的错误处理
- 性能优化（shallowRef, computed缓存）

## 常见问题 (FAQ)

**Q: 如何添加新的Store？**
A:
1. 在`src/stores/`创建新文件
2. 使用`defineStore`定义Store
3. 在`index.ts`中导出
4. 添加测试用例

**Q: 状态不更新怎么办？**
A:
1. 检查是否正确使用ref/reactive
2. 确认组件中正确解构store
3. 查看Vue DevTools中的状态变化
4. 检查异步操作的错误处理

**Q: 如何处理跨Store通信？**
A:
1. 在一个Store中调用另一个Store的actions
2. 使用watch监听其他Store的状态变化
3. 通过事件总线进行通信（不推荐）

**Q: 性能优化建议？**
A:
1. 使用shallowRef减少深度响应式
2. 合理使用computed缓存
3. 避免在actions中进行大量同步操作
4. 使用分页和懒加载

## Store使用示例

### 在组件中使用
```typescript
<script setup lang="ts">
import { useStudentStore } from '@/stores/student';

const studentStore = useStudentStore();

// 响应式数据
const { students, loading, activeStudents } = storeToRefs(studentStore);

// 方法调用
const handleCreateStudent = async (data: StudentFormData) => {
  await studentStore.createStudent(data);
};

// 生命周期
onMounted(() => {
  studentStore.fetchStudents();
});
</script>
```

### 跨Store操作
```typescript
// 在一个Store中使用另一个Store
export const useTransactionStore = defineStore('transaction', () => {
  const studentStore = useStudentStore();

  async function createTransaction(data: TransactionData) {
    const transaction = await ApiService.createTransaction(data);

    // 更新相关学员信息
    if (data.student_id) {
      await studentStore.fetchStudentById(data.student_id);
    }

    return transaction;
  }

  return { createTransaction };
});
```

## 相关文件清单

```
src/stores/
├── index.ts                  # Pinia实例和Store导出
├── app.ts                    # 应用全局状态
├── student.ts                # 学员数据管理
├── transaction.ts            # 交易记录管理
├── auth.ts                   # 认证状态管理
├── installment.ts            # 分期付款管理
├── stats.ts                  # 统计数据管理
└── README.md                 # Store使用说明
```

## 状态管理架构图

```
┌─────────────────────────────────────────┐
│           Vue Components                │
│         (模板 + 脚本 + 样式)              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│           Pinia Stores                  │
│  ┌─────────────┬─────────────────────┐  │
│  │   App Store │  Student Store      │ │ │
│  │ (全局状态)   │  (学员数据)         │ │ │
│  └─────────────┴─────────────────────┘  │ │
│  ┌─────────────┬─────────────────────┐  │ │
│  │Auth Store   │ Transaction Store  │ │ │
│  │ (认证管理)   │  (交易数据)         │ │ │
│  └─────────────┴─────────────────────┘  │ │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         API Services                    │
│       (HTTP请求封装)                     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│           Backend API                   │
│         (数据处理与存储)                  │
└─────────────────────────────────────────┘
```

## 迁移日志

### 从provide/inject迁移到Pinia (2025-11-06)

**迁移原因**：
- provide/inject缺少类型安全
- 没有开发工具支持
- 状态管理复杂度高
- 测试困难

**迁移收益**：
- ✅ 完整的TypeScript支持
- ✅ Vue DevTools集成
- ✅ 更好的代码组织
- ✅ 内置测试支持
- ✅ 性能优化
- ✅ 模块化设计

**迁移文件**：
- `src/stores/index.ts` - 新增
- `src/stores/app.ts` - 从provide/inject迁移
- `src/stores/student.ts` - 从provide/inject迁移
- `src/main.ts` - 更新为使用Pinia
- `src/MainApp.vue` - 更新Store使用方式

---

**最后更新**: 2025-11-06T11:37:40+0000