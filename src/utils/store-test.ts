/**
 * 状态管理测试工具
 * 用于验证Pinia store的功能
 */

import { useAppStore } from '../stores/app';
import { useStudentStore } from '../stores/student';
import { useTransactionStore } from '../stores/transaction';
import { useAuthStore } from '../stores/auth';

/**
 * 测试应用状态管理
 */
export function testAppStore() {
  console.log('🧪 测试 App Store...');

  const appStore = useAppStore();

  // 测试错误处理
  appStore.addError({
    message: '测试错误',
    context: 'test',
    code: 'TEST_ERROR'
  });

  console.log('✅ 错误添加:', appStore.hasErrors);
  console.log('✅ 最新错误:', appStore.latestError?.message);

  // 测试loading状态
  appStore.setGlobalLoading(true);
  console.log('✅ 全局loading:', appStore.isLoading);

  appStore.setGlobalLoading(false);
  appStore.clearErrors();

  console.log('✅ App Store 测试完成\n');
}

/**
 * 测试认证状态管理
 */
export function testAuthStore() {
  console.log('🧪 测试 Auth Store...');

  const authStore = useAuthStore();

  // 测试登录状态
  console.log('✅ 初始认证状态:', authStore.isAuthenticated);

  // 测试权限检查
  console.log('✅ 管理员权限:', authStore.isAdmin);
  console.log('✅ 是否有密码:', authStore.hasPassword);

  // 测试错误状态
  console.log('✅ 错误状态:', authStore.error);

  console.log('✅ Auth Store 测试完成\n');
}

/**
 * 测试学生状态管理
 */
export function testStudentStore() {
  console.log('🧪 测试 Student Store...');

  const studentStore = useStudentStore();

  // 测试搜索参数
  const searchParams = {
    page: 1,
    limit: 10,
    keyword: '测试',
    class: 'TenTry',
    subject: 'Shooting'
  };

  studentStore.updateSearchParams(searchParams);
  console.log('✅ 搜索参数更新:', studentStore.currentSearchParams);

  // 测试计算属性
  console.log('✅ 学生列表长度:', studentStore.students.length);
  console.log('✅ 活跃学生数:', studentStore.activeStudents.length);
  console.log('✅ 非活跃学生数:', studentStore.inactiveStudents.length);

  // 测试分组
  const studentsByClass = studentStore.studentsByClass;
  console.log('✅ 班级分组:', Object.keys(studentsByClass));

  console.log('✅ Student Store 测试完成\n');
}

/**
 * 测试交易状态管理
 */
export function testTransactionStore() {
  console.log('🧪 测试 Transaction Store...');

  const transactionStore = useTransactionStore();

  // 测试搜索参数
  const searchParams = {
    page: 1,
    limit: 20,
    studentId: '123',
    transactionType: 'income'
  };

  transactionStore.updateSearchParams(searchParams);
  console.log('✅ 交易搜索参数:', transactionStore.currentSearchParams);

  // 测试计算属性
  console.log('✅ 交易列表长度:', transactionStore.transactions.length);
  console.log('✅ 收入交易数:', transactionStore.incomeTransactions.length);
  console.log('✅ 支出交易数:', transactionStore.expenseTransactions.length);
  console.log('✅ 总收入:', transactionStore.totalIncome);
  console.log('✅ 总支出:', transactionStore.totalExpense);
  console.log('✅ 净利润:', transactionStore.netProfit);

  // 测试过滤状态
  transactionStore.updateFilterState({
    transaction_type: 'income',
    student_name: '张三'
  });
  console.log('✅ 过滤状态:', transactionStore.filterState);

  // 测试时间周期
  transactionStore.setSelectedPeriod('ThisMonth');
  console.log('✅ 选中周期:', transactionStore.selectedPeriod);

  console.log('✅ Transaction Store 测试完成\n');
}

/**
 * 运行所有状态管理测试
 */
export function runAllStoreTests() {
  console.log('🚀 开始状态管理测试...\n');

  try {
    testAppStore();
    testAuthStore();
    testStudentStore();
    testTransactionStore();

    console.log('🎉 所有状态管理测试完成！');
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

/**
 * 测试store间数据流
 */
export function testStoreDataFlow() {
  console.log('🔄 测试 Store 数据流...');

  const appStore = useAppStore();
  const studentStore = useStudentStore();

  // 测试全局loading的联动
  appStore.setGlobalLoading(true);
  console.log('✅ 全局loading状态同步:', appStore.isLoading);

  // 测试错误处理的联动
  studentStore.fetchStudents().catch(() => {
    // 错误会自动添加到appStore中
    console.log('✅ 错误状态同步到全局:', appStore.hasErrors);
  });

  appStore.setGlobalLoading(false);

  console.log('✅ Store 数据流测试完成\n');
}

// 导出测试函数，可以在浏览器控制台中调用
if (typeof window !== 'undefined') {
  (window as any).storeTests = {
    testAppStore,
    testAuthStore,
    testStudentStore,
    testTransactionStore,
    testStoreDataFlow,
    runAllStoreTests
  };

  console.log('💡 在浏览器控制台中使用以下命令测试:');
  console.log('  - window.storeTests.runAllStoreTests()');
  console.log('  - window.storeTests.testAppStore()');
  console.log('  - window.storeTests.testAuthStore()');
  console.log('  - window.storeTests.testStudentStore()');
  console.log('  - window.storeTests.testTransactionStore()');
}