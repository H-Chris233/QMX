import { vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse, delay } from 'msw';

/**
 * 错误场景测试工具
 * 提供各种错误场景的模拟处理器
 */

const API_BASE_URL = 'http://localhost:3001/api/v1';

/**
 * 网络错误场景
 */
export const networkErrorHandlers = [
  http.get(`${API_BASE_URL}/students/network-error`, () => {
    return HttpResponse.error();
  }),
  
  http.post(`${API_BASE_URL}/students/network-error`, () => {
    return HttpResponse.error();
  }),
  
  http.put(`${API_BASE_URL}/students/:uid/network-error`, () => {
    return HttpResponse.error();
  }),
  
  http.delete(`${API_BASE_URL}/students/:uid/network-error`, () => {
    return HttpResponse.error();
  }),
];

/**
 * 404 错误场景
 */
export const notFoundErrorHandlers = [
  http.get(`${API_BASE_URL}/students/not-found`, () => {
    return HttpResponse.json(
      {
        success: false,
        error: '学员不存在',
      },
      { status: 404 }
    );
  }),
  
  http.get(`${API_BASE_URL}/students/:uid/not-found`, ({ params }) => {
    return HttpResponse.json(
      {
        success: false,
        error: `学员 ${params.uid} 不存在`,
      },
      { status: 404 }
    );
  }),
];

/**
 * 500 服务器错误场景
 */
export const serverErrorHandlers = [
  http.get(`${API_BASE_URL}/students/server-error`, () => {
    return HttpResponse.json(
      {
        success: false,
        error: '服务器内部错误',
      },
      { status: 500 }
    );
  }),
  
  http.post(`${API_BASE_URL}/students/server-error`, () => {
    return HttpResponse.json(
      {
        success: false,
        error: '服务器内部错误',
      },
      { status: 500 }
    );
  }),
];

/**
 * 超时场景
 */
export const timeoutHandlers = [
  http.get(`${API_BASE_URL}/students/timeout`, async () => {
    await delay(10000); // 10秒延迟模拟超时
    return HttpResponse.json({ success: true, data: null });
  }),
  
  http.post(`${API_BASE_URL}/students/timeout`, async () => {
    await delay(10000);
    return HttpResponse.json({ success: true, data: null });
  }),
];

/**
 * 权限错误场景
 */
export const permissionErrorHandlers = [
  http.delete(`${API_BASE_URL}/students/permission-denied`, () => {
    return HttpResponse.json(
      {
        success: false,
        error: 'Permission denied',
      },
      { status: 403 }
    );
  }),
  
  http.put(`${API_BASE_URL}/students/:uid/permission-denied`, () => {
    return HttpResponse.json(
      {
        success: false,
        error: '没有权限修改此学员',
      },
      { status: 403 }
    );
  }),
];

/**
 * 数据验证错误场景
 */
export const validationErrorHandlers = [
  http.post(`${API_BASE_URL}/students/validation-error`, () => {
    return HttpResponse.json(
      {
        success: false,
        error: '数据验证失败',
        details: {
          name: '姓名不能为空',
          phone: '手机号格式不正确',
        },
      },
      { status: 400 }
    );
  }),
  
  http.put(`${API_BASE_URL}/students/:uid/validation-error`, () => {
    return HttpResponse.json(
      {
        success: false,
        error: '数据验证失败',
        details: {
          age: '年龄必须在 1-120 之间',
        },
      },
      { status: 400 }
    );
  }),
];

/**
 * 数据库连接错误场景
 */
export const databaseErrorHandlers = [
  http.get(`${API_BASE_URL}/students/db-error`, () => {
    return HttpResponse.json(
      {
        success: false,
        error: '数据库连接失败',
      },
      { status: 503 }
    );
  }),
];

/**
 * 并发冲突错误场景
 */
export const conflictErrorHandlers = [
  http.put(`${API_BASE_URL}/students/:uid/conflict`, () => {
    return HttpResponse.json(
      {
        success: false,
        error: '数据已被其他用户修改，请刷新后重试',
      },
      { status: 409 }
    );
  }),
];

/**
 * 速率限制错误场景
 */
export const rateLimitErrorHandlers = [
  http.get(`${API_BASE_URL}/students/rate-limit`, () => {
    return HttpResponse.json(
      {
        success: false,
        error: '请求过于频繁，请稍后重试',
        retryAfter: 60,
      },
      { 
        status: 429,
        headers: {
          'Retry-After': '60',
        },
      }
    );
  }),
];

/**
 * 创建错误场景服务器
 */
export const createErrorServer = (...handlerGroups: any[][]) => {
  const allHandlers = handlerGroups.flat();
  return setupServer(...allHandlers);
};

/**
 * 常用错误场景组合
 */
export const commonErrorScenarios = {
  network: createErrorServer(networkErrorHandlers),
  notFound: createErrorServer(notFoundErrorHandlers),
  server: createErrorServer(serverErrorHandlers),
  timeout: createErrorServer(timeoutHandlers),
  permission: createErrorServer(permissionErrorHandlers),
  validation: createErrorServer(validationErrorHandlers),
  database: createErrorServer(databaseErrorHandlers),
  conflict: createErrorServer(conflictErrorHandlers),
  rateLimit: createErrorServer(rateLimitErrorHandlers),
};

/**
 * 错误测试辅助函数
 */
export const testErrorScenario = async (
  apiService: any,
  method: string,
  scenario: keyof typeof commonErrorScenarios,
  testFn: () => Promise<void>
) => {
  const server = commonErrorScenarios[scenario];
  
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
  
  await testFn();
};

/**
 * 模拟特定端点的错误
 */
export const mockEndpointError = (
  endpoint: string,
  method: 'get' | 'post' | 'put' | 'delete',
  status: number,
  error: string
) => {
  const httpMethod = http[method];
  
  return httpMethod(`${API_BASE_URL}${endpoint}`, () => {
    return HttpResponse.json(
      {
        success: false,
        error,
      },
      { status }
    );
  });
};

/**
 * 模拟网络延迟
 */
export const mockNetworkDelay = (
  endpoint: string,
  method: 'get' | 'post' | 'put' | 'delete',
  delayMs: number
) => {
  const httpMethod = http[method];
  
  return httpMethod(`${API_BASE_URL}${endpoint}`, async () => {
    await delay(delayMs);
    return HttpResponse.json({ success: true, data: null });
  });
};