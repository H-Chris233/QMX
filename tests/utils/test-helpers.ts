import { vi, expect } from 'vitest';
import { VueWrapper } from '@vue/test-utils';
import { flushPromises } from '../helpers/mount';

/**
 * 测试辅助工具集合
 * 提供常见的测试场景处理函数
 */

/**
 * 等待异步操作完成的通用函数
 */
export const waitForAsync = async (ms: number = 0): Promise<void> => {
  await flushPromises();
  if (ms > 0) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }
};

/**
 * 抑制控制台错误和警告
 */
export const suppressConsoleErrors = () => {
  const originalError = console.error;
  const originalWarn = console.warn;

  beforeEach(() => {
    console.error = vi.fn();
    console.warn = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
    console.warn = originalWarn;
  });
};

/**
 * 模拟API错误
 */
export const mockApiError = (apiService: any, method: string, error: Error | string) => {
  const spy = vi.spyOn(apiService, method);
  spy.mockRejectedValue(typeof error === 'string' ? new Error(error) : error);
  return spy;
};

/**
 * 模拟API成功响应
 */
export const mockApiSuccess = (apiService: any, method: string, response: any) => {
  const spy = vi.spyOn(apiService, method);
  spy.mockResolvedValue(response);
  return spy;
};

/**
 * 验证错误处理
 */
export const expectErrorHandled = (wrapper: VueWrapper, errorMessage: string) => {
  const appStore = wrapper.vm.$pinia._s.get('app');
  expect(appStore.errors.length).toBeGreaterThan(0);
  expect(appStore.errors[appStore.errors.length - 1].message).toContain(errorMessage);
};

/**
 * 验证成功消息
 */
export const expectSuccessMessage = (wrapper: VueWrapper, successMessage: string) => {
  const appStore = wrapper.vm.$pinia._s.get('app');
  expect(appStore.successMessages.length).toBeGreaterThan(0);
  expect(appStore.successMessages[appStore.successMessages.length - 1]).toContain(successMessage);
};

/**
 * 创建测试用的表单数据
 */
export const createTestFormData = (overrides: Record<string, any> = {}) => ({
  name: '测试学生',
  age: 20,
  phone: '13800138000',
  class: 'Month',
  subject: 'Shooting',
  note: '测试备注',
  lesson_left: 10,
  membership_start_date: '2024-01-01',
  membership_end_date: '2024-12-31',
  ...overrides,
});

/**
 * 模拟用户输入
 */
export const simulateUserInput = async (
  wrapper: VueWrapper,
  selector: string,
  value: string
) => {
  const element = wrapper.find(selector);
  await element.setValue(value);
  await element.trigger('input');
  await element.trigger('change');
  await waitForAsync();
};

/**
 * 模拟按钮点击
 */
export const simulateButtonClick = async (
  wrapper: VueWrapper,
  selector: string
) => {
  const button = wrapper.find(selector);
  await button.trigger('click');
  await waitForAsync();
};

/**
 * 等待元素出现并验证
 */
export const waitForElementAndVerify = async (
  wrapper: VueWrapper,
  selector: string,
  timeout: number = 5000
) => {
  await vi.waitFor(
    () => {
      const element = wrapper.find(selector);
      expect(element.exists()).toBe(true);
      return element;
    },
    { timeout }
  );
};

/**
 * 验证分页状态
 */
export const expectPaginationState = (
  wrapper: VueWrapper,
  expectedPage: number,
  expectedTotalPages: number,
  expectedTotal: number
) => {
  expect(wrapper.vm.currentPage).toBe(expectedPage);
  expect(wrapper.vm.totalPages).toBe(expectedTotalPages);
  expect(wrapper.vm.totalStudents).toBe(expectedTotal);
};

/**
 * 验证搜索参数
 */
export const expectSearchParams = (apiSpy: any, expectedParams: Record<string, any>) => {
  expect(apiSpy).toHaveBeenCalledWith(
    expect.objectContaining(expectedParams)
  );
};

/**
 * 创建测试用的学生数据
 */
export const createTestStudent = (overrides: Record<string, any> = {}) => ({
  uid: 1,
  name: '测试学生',
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
  ...overrides,
});

/**
 * 创建测试用的学生列表响应
 */
export const createTestStudentResponse = (
  students: any[] = [],
  page: number = 1,
  limit: number = 20,
  total: number = 0
) => ({
  students,
  pagination: {
    page,
    limit,
    total,
    total_pages: Math.ceil(total / limit),
    has_next: page * limit < total,
    has_prev: page > 1,
  },
});

/**
 * 清理测试环境
 */
export const cleanupTest = (wrapper?: VueWrapper) => {
  if (wrapper) {
    wrapper.unmount();
  }
  vi.clearAllMocks();
  document.body.innerHTML = '';
};

/**
 * 设置固定时间用于测试
 */
export const setupFixedTime = (dateString: string = '2024-01-01T00:00:00.000Z') => {
  beforeAll(() => {
    vi.setSystemTime(new Date(dateString));
  });

  afterAll(() => {
    vi.useRealTimers();
  });
};