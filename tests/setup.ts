import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ApiService } from '@/api/ApiService';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/msw/handlers';

/**
 * 全局测试设置
 * - 初始化 Pinia 状态管理
 * - Mock AppStore
 * - Mock ApiService
 * - 设置 MSW 服务器
 */

// MSW 服务器设置
const mswServer = setupServer(...handlers);

beforeAll(() => {
  // 启动 MSW 服务器
  mswServer.listen({ onUnhandledRequest: 'error' });
  
  // 初始化 Pinia
  setActivePinia(createPinia());
});

afterEach(() => {
  // 重置 MSW 处理器
  mswServer.resetHandlers();
  
  // 重置所有 mock
  vi.clearAllMocks();
});

afterAll(() => {
  // 关闭 MSW 服务器
  mswServer.close();
});

/**
 * Mock ApiService 的方法
 * 每个测试可以通过 vi.spyOn(ApiService, 'method') 来覆盖
 */
vi.spyOn(ApiService, 'getAllStudents').mockResolvedValue({
  students: [],
  pagination: { page: 1, limit: 10, total: 0, pages: 0 }
});

vi.spyOn(ApiService, 'getStudentById').mockResolvedValue({
  uid: 1,
  name: '测试学员',
  age: 20,
  phone: '13800138000',
  class: 'Month',
  subject: 'Shooting',
  rings: [],
  lesson_left: 10,
  membership_start_date: '2024-01-01',
  membership_end_date: '2024-12-31',
  membership_status: 'Active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_membership_active: true,
});

vi.spyOn(ApiService, 'addStudent').mockResolvedValue({
  uid: 1,
  name: '测试学员',
  age: 20,
  phone: '13800138000',
  class: 'Month',
  subject: 'Shooting',
  rings: [],
  lesson_left: 10,
  membership_start_date: '2024-01-01',
  membership_end_date: '2024-12-31',
  membership_status: 'Active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_membership_active: true,
});

vi.spyOn(ApiService, 'updateStudentInfo').mockResolvedValue({
  uid: 1,
  name: '测试学员',
  age: 20,
  phone: '13800138000',
  class: 'Month',
  subject: 'Shooting',
  rings: [],
  lesson_left: 10,
  membership_start_date: '2024-01-01',
  membership_end_date: '2024-12-31',
  membership_status: 'Active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_membership_active: true,
});

vi.spyOn(ApiService, 'deleteStudent').mockResolvedValue(undefined);

vi.spyOn(ApiService, 'getAllTransactions').mockResolvedValue({
  transactions: [],
  pagination: { page: 1, limit: 10, total: 0, pages: 0 }
});

vi.spyOn(ApiService, 'addCashTransaction').mockResolvedValue({
  id: 1,
  student_id: 1,
  amount: 100.00,
  transaction_type: 'income',
  note: '测试交易',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

vi.spyOn(ApiService, 'getDashboardStats').mockResolvedValue({
  totalRevenue: 10000,
  activeStudents: 50,
  averageGrade: 85,
});

vi.spyOn(ApiService, 'getStudentStats').mockResolvedValue({
  total: 50,
  active: 40,
  inactive: 10,
});

vi.spyOn(ApiService, 'getFinancialStats').mockResolvedValue({
  totalIncome: 10000,
  totalExpense: 2000,
  netIncome: 8000,
});

// 导出 mswServer 用于测试中访问
export { mswServer };
