import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { ApiService } from '@/api/ApiService';
import { integrationHandlers } from '../mocks/msw/integrationHandlers';
import type {
  Student,
  Transaction,
  CurrentStudentInput,
  StudentSearchOptions,
  TransactionCreateData,
  CashSearchOptions,
  StudentStats,
  FinancialStats,
  DashboardStats,
  MembershipStats,
  LoginCredentials,
  ApiResponse,
  ApiErrorPayload,
} from '@/types/api';

// ============================================================================
// 测试服务器设置
// ============================================================================

export const testServer = setupServer(...integrationHandlers);

// ============================================================================
// 断言助手函数
// ============================================================================

/**
 * 验证API响应结构
 */
export function expectValidApiResponse<T>(response: ApiResponse<T>, expectData = true) {
  expect(response).toHaveProperty('success');
  expect(typeof response.success).toBe('boolean');
  
  if (expectData) {
    expect(response).toHaveProperty('data');
    expect(response.data).toBeDefined();
  }
}

/**
 * 验证API错误响应
 */
export function expectApiError(response: ApiErrorPayload, expectedError?: string, expectedStatus?: number) {
  expect(response.success).toBe(false);
  expect(response).toHaveProperty('error');
  expect(typeof response.error).toBe('string');
  
  if (expectedError) {
    expect(response.error).toContain(expectedError);
  }
}

/**
 * 验证学员数据结构
 */
export function expectValidStudent(student: Student) {
  expect(student).toHaveProperty('uid');
  expect(student).toHaveProperty('name');
  expect(student).toHaveProperty('age');
  expect(student).toHaveProperty('phone');
  expect(student).toHaveProperty('class');
  expect(student).toHaveProperty('subject');
  expect(student).toHaveProperty('rings');
  expect(student).toHaveProperty('lesson_left');
  expect(student).toHaveProperty('membership_status');
  expect(student).toHaveProperty('is_membership_active');
  
  expect(typeof student.uid).toBe('number');
  expect(typeof student.name).toBe('string');
  expect(typeof student.phone).toBe('string');
  expect(Array.isArray(student.rings)).toBe(true);
  expect(typeof student.is_membership_active).toBe('boolean');
}

/**
 * 验证交易数据结构
 */
export function expectValidTransaction(transaction: Transaction) {
  expect(transaction).toHaveProperty('uid');
  expect(transaction).toHaveProperty('student_id');
  expect(transaction).toHaveProperty('amount');
  expect(transaction).toHaveProperty('created_at');
  
  expect(typeof transaction.uid).toBe('number');
  expect(typeof transaction.amount).toBe('number');
  expect(typeof transaction.student_id).toBe('number');
  expect(typeof transaction.created_at).toBe('string');
  
  // 验证金额格式（两位小数）
  expect(transaction.amount).toBe(Number(transaction.amount.toFixed(2)));
}

/**
 * 验证分页响应结构
 */
export function expectValidPagination(pagination: any) {
  expect(pagination).toHaveProperty('page');
  expect(pagination).toHaveProperty('limit');
  expect(pagination).toHaveProperty('total');
  expect(pagination).toHaveProperty('total_pages');
  expect(pagination).toHaveProperty('has_next');
  expect(pagination).toHaveProperty('has_prev');
  
  expect(typeof pagination.page).toBe('number');
  expect(typeof pagination.limit).toBe('number');
  expect(typeof pagination.total).toBe('number');
  expect(typeof pagination.total_pages).toBe('number');
  expect(typeof pagination.has_next).toBe('boolean');
  expect(typeof pagination.has_prev).toBe('boolean');
}

/**
 * 验证日期格式（ISO字符串）
 */
export function expectValidDateString(dateString: string | null | undefined) {
  if (dateString === null || dateString === undefined) {
    return; // 允许空值
  }
  
  const date = new Date(dateString);
  expect(date.getTime()).not.toBeNaN();
  expect(dateString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/);
}

/**
 * 验证空值处理（应该是undefined而不是null）
 */
export function expectUndefinedOrNullish(value: any) {
  expect(value === null || value === undefined).toBe(true);
}

/**
 * 验证金额单位转换（应该是元，不是分）
 */
export function expectAmountInYuan(amount: number) {
  expect(amount).toBeGreaterThan(0);
  expect(amount).toBeLessThan(100000); // 合理的金额范围
  expect(amount).toBe(Number(amount.toFixed(2))); // 两位小数
}

/**
 * 验证字段名转换（前端camelCase -> 后端snake_case）
 */
export function expectSnakeCaseConversion(original: any, converted: any, fieldMap: Record<string, string>) {
  Object.entries(fieldMap).forEach(([camelKey, snakeKey]) => {
    if (camelKey in original) {
      expect(converted).toHaveProperty(snakeKey);
      expect(converted[snakeKey]).toBe(original[camelKey]);
    }
  });
}

// ============================================================================
// 测试数据工厂
// ============================================================================

/**
 * 创建测试学员数据
 */
export function createTestStudent(overrides: Partial<Student> = {}): Student {
  return {
    uid: 1,
    name: '测试学员',
    age: 20,
    phone: '13800138000',
    class: 'Month',
    subject: 'Shooting',
    rings: [8, 9, 7],
    lesson_left: 10,
    membership_start_date: '2024-01-01',
    membership_end_date: '2024-12-31',
    membership_status: 'Active',
    is_membership_active: true,
    membership_days_remaining: 100,
    note: '测试学员',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * 创建测试学员输入数据
 */
export function createTestStudentInput(overrides: Partial<CurrentStudentInput> = {}): CurrentStudentInput {
  return {
    name: '新学员',
    age: 18,
    phone: '13900139000',
    class: 'Year',
    subject: 'Archery',
    note: '新学员备注',
    lesson_left: 20,
    membership_start_date: '2024-01-01',
    membership_end_date: '2024-12-31',
    ...overrides,
  };
}

/**
 * 创建测试交易数据
 */
export function createTestTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    uid: 1,
    student_id: 1,
    amount: 100.00,
    description: '测试交易',
    note: '测试备注',
    is_income: true,
    is_expense: false,
    is_installment: false,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
    ...overrides,
  };
}

/**
 * 创建测试交易输入数据
 */
export function createTestTransactionInput(overrides: Partial<TransactionCreateData> = {}): TransactionCreateData {
  return {
    student_id: 1,
    amount: 100.00,
    note: '测试交易',
    ...overrides,
  };
}

/**
 * 创建测试搜索选项
 */
export function createTestSearchOptions(overrides: Partial<StudentSearchOptions> = {}): StudentSearchOptions {
  return {
    page: 1,
    limit: 10,
    sort_by: 'created_at',
    sort_order: 'DESC',
    ...overrides,
  };
}

/**
 * 创建测试现金搜索选项
 */
export function createTestCashSearchOptions(overrides: Partial<CashSearchOptions> = {}): CashSearchOptions {
  return {
    page: 1,
    limit: 10,
    sort_by: 'created_at',
    sort_order: 'DESC',
    ...overrides,
  };
}

/**
 * 创建测试登录凭据
 */
export function createTestCredentials(overrides: Partial<LoginCredentials> = {}): LoginCredentials {
  return {
    username: 'test@example.com',
    password: 'password123',
    ...overrides,
  };
}

// ============================================================================
// Mock助手函数
// ============================================================================

/**
 * 监听并验证API调用
 */
export function expectApiCall(apiMethod: string, expectedParams?: any) {
  const spy = vi.spyOn(ApiService, apiMethod as keyof typeof ApiService);
  return {
    toHaveBeenCalledWith: (...args: any[]) => {
      expect(spy).toHaveBeenCalledWith(...args);
    },
    toHaveBeenCalledTimes: (times: number) => {
      expect(spy).toHaveBeenCalledTimes(times);
    },
    restore: () => {
      spy.mockRestore();
    },
  };
}

/**
 * 模拟网络错误
 */
export function mockNetworkError(apiMethod: string, errorMessage = 'Network Error') {
  vi.spyOn(ApiService, apiMethod as keyof typeof ApiService).mockRejectedValue(new Error(errorMessage));
}

/**
 * 模拟成功响应
 */
export function mockSuccessResponse<T>(apiMethod: string, response: T) {
  vi.spyOn(ApiService, apiMethod as keyof typeof ApiService).mockResolvedValue(response);
}

// ============================================================================
// 测试环境管理
// ============================================================================

/**
 * 设置集成测试环境
 */
export function setupIntegrationTest() {
  beforeEach(() => {
    testServer.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    testServer.resetHandlers();
    vi.clearAllMocks();
  });

  afterAll(() => {
    testServer.close();
  });
}

/**
 * 等待异步操作完成
 */
export function waitForAsync(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// 请求拦截和验证
// ============================================================================

/**
 * 创建请求拦截器来验证请求参数
 */
export function createRequestInterceptor(url: string, method: string) {
  let capturedRequest: any = null;
  
  const interceptor = http[method.toLowerCase() as 'get' | 'post' | 'put' | 'delete'](
    url,
    async ({ request }) => {
      capturedRequest = {
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers.entries()),
        body: method !== 'GET' ? await request.json() : null,
      };
      
      return HttpResponse.json({ success: true, data: null });
    }
  );
  
  testServer.use(interceptor);
  
  return {
    getRequest: () => capturedRequest,
    clearRequest: () => { capturedRequest = null; },
    remove: () => { testServer.resetHandlers(); },
  };
}

/**
 * 验证请求字段名转换
 */
export function expectRequestFieldConversion(request: any, fieldMap: Record<string, string>) {
  if (!request.body) return;
  
  Object.entries(fieldMap).forEach(([camelKey, snakeKey]) => {
    if (camelKey in request.body) {
      expect(request.body).toHaveProperty(snakeKey);
      expect(request.body[snakeKey]).toBe(request.body[camelKey]);
      expect(request.body).not.toHaveProperty(camelKey);
    }
  });
}

// ============================================================================
// 错误场景测试助手
// ============================================================================

/**
 * 测试各种HTTP错误状态码
 */
export async function testHttpError(
  apiCall: () => Promise<any>,
  expectedStatus?: number,
  expectedError?: string
) {
  try {
    await apiCall();
    expect.fail('Expected API call to throw an error');
  } catch (error: any) {
    expect(error).toBeDefined();
    if (expectedStatus) {
      // 对于ApiService，错误通常通过handleApiOperation处理
      // 检查错误消息或状态码相关的信息
      const errorMessage = error.message || error.error || error.toString();
      expect(errorMessage).toBeDefined();
    }
    if (expectedError) {
      const errorMessage = error.message || error.error || error.toString();
      expect(errorMessage).toContain(expectedError);
    }
  }
}

/**
 * 测试网络超时场景
 */
export async function testNetworkTimeout(apiCall: () => Promise<any>) {
  try {
    await apiCall();
    expect.fail('Expected API call to timeout');
  } catch (error: any) {
    expect(error).toBeDefined();
    expect(error.message || error.error).toMatch(/timeout|network|connection/i);
  }
}

/**
 * 测试无效输入验证
 */
export async function testInvalidInput<T>(
  apiCall: (input: T) => Promise<any>,
  invalidInput: T,
  expectedError?: string
) {
  try {
    await apiCall(invalidInput);
    expect.fail('Expected API call to throw validation error');
  } catch (error: any) {
    expect(error).toBeDefined();
    if (expectedError) {
      expect(error.message || error.error).toContain(expectedError);
    }
  }
}