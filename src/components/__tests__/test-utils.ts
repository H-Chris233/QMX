/**
 * 组件测试工具函数
 *
 * 提供 Vue Test Utils 封装，支持 Pinia 状态管理和常见测试模式
 */

import { mount, type VueWrapper, type ComponentMountingOptions } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { nextTick } from 'vue';

/**
 * 创建测试专用的 Pinia 实例
 */
export function createTestPinia(): Pinia {
  const pinia = createPinia();
  setActivePinia(pinia);
  return pinia;
}

/**
 * 挂载带 Pinia 的组件
 */
export function mountWithPinia<T = any>(
  component: any,
  options: ComponentMountingOptions<T> = {}
): VueWrapper<T> {
  const pinia = createTestPinia();
  return mount(component, {
    global: {
      plugins: [pinia],
      ...options.global
    },
    ...options
  });
}

/**
 * 等待 DOM 更新
 */
export async function waitForDOMUpdate(timeout = 100): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, timeout));
  await nextTick();
}

/**
 * 刷新所有 Promises
 */
export async function flushPromises(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
  await nextTick();
}

/**
 * 测试数据工厂 - 创建模拟学员数据
 */
export function createMockStudent(overrides: Record<string, any> = {}) {
  return {
    uid: 1,
    name: '张三',
    age: 20,
    phone: '13800138000',
    class: 'Month',
    subject: 'Shooting',
    rings: [85, 90, 88],
    note: '测试备注',
    lesson_left: 10,
    membership_start_date: '2024-01-01T00:00:00.000Z',
    membership_end_date: '2024-12-31T23:59:59.999Z',
    is_membership_active: true,
    membership_days_remaining: 365,
    membership_status: 'Active',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    ...overrides
  };
}

/**
 * 测试数据工厂 - 创建模拟交易数据
 */
export function createMockTransaction(overrides: Record<string, any> = {}) {
  return {
    uid: 1,
    student_id: 1,
    amount: 10000,
    note: '测试交易',
    transaction_type: 'INCOME',
    is_installment: false,
    installment: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    ...overrides
  };
}

/**
 * 测试数据工厂 - 创建模拟分期数据
 */
export function createMockInstallment(overrides: Record<string, any> = {}) {
  return {
    uid: 1,
    student_id: 1,
    installment_amount: 1000,
    installment_number: 1,
    total_installments: 12,
    due_date: '2024-02-01T00:00:00.000Z',
    status: 'PENDING',
    paid_at: null,
    installment: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    ...overrides
  };
}

/**
 * 测试数据工厂 - 创建模拟仪表盘统计数据
 */
export function createMockDashboardStats(overrides: Record<string, any> = {}) {
  return {
    totalStudents: 100,
    totalRevenue: 50000,
    averageGrade: 8.5,
    ...overrides
  };
}

/**
 * 创建模拟的confirmModal状态
 */
export function createMockConfirmState(overrides: Record<string, any> = {}) {
  return {
    show: false,
    title: '',
    message: '',
    confirmText: '确定',
    cancelText: '取消',
    confirmType: 'primary' as const,
    onConfirm: null,
    onCancel: null,
    ...overrides
  };
}

/**
 * 模拟 localStorage
 */
export function mockLocalStorage() {
  const store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach(key => delete store[key]); }),
    store
  };
}

/**
 * 模拟 window.matchMedia
 */
export function mockMatchMedia(prefersDark = true) {
  return vi.fn().mockImplementation((query: string) => ({
    matches: prefersDark,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
}

/**
 * 模拟 window.alert
 */
export function mockAlert() {
  return vi.fn();
}

/**
 * 创建模拟的API错误
 */
export function createMockApiError(message: string, status = 400) {
  return {
    message,
    response: {
      status,
      data: { success: false, error: message }
    }
  };
}

/**
 * 生成随机测试数据
 */
export function generateRandomId(): number {
  return Math.floor(Math.random() * 10000) + 1;
}

/**
 * 创建测试用的日期
 */
export function createTestDate(daysFromNow = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
}
