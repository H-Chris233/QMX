/**
 * 基础 API 客户端
 * 提供配置好的 axios 实例，包含请求/响应拦截器
 */
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '../types/api';
import { apiCache } from './cacheManager';

/**
 * 自定义 API 错误类
 */
export class ApiError extends Error {
  type: string;
  details?: unknown;
  statusCode?: number | undefined;

  constructor(message: string, type: string = 'API_ERROR', details?: unknown, statusCode?: number | undefined) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.details = details;
    this.statusCode = statusCode;
  }
}

/**
 * 从 localStorage 或其他存储读取 token
 * 预留功能，未来实现认证时使用
 */
function getAuthToken(): string | null {
  try {
    return localStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

/**
 * 创建配置好的 axios 实例
 */
function createAxiosInstance(): AxiosInstance {
  const instance = axios.create({
    baseURL: '/api/v1',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    timeout: 30000, // 30秒超时
  });

  // 请求拦截器：注入 Authorization 头
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = getAuthToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  // 响应拦截器：解包 { success, data, error } 格式
  instance.interceptors.response.use(
    (response) => {
      const apiResponse = response.data as ApiResponse<unknown>;
      
      // 如果后端返回 success=false，抛出自定义错误
      if (apiResponse.success === false) {
        const errorMessage = apiResponse.error || apiResponse.message || '未知错误';
        throw new ApiError(
          errorMessage,
          'BACKEND_ERROR',
          apiResponse,
          response.status
        );
      }

      // 返回解包后的数据（保留完整的响应结构以支持分页等）
      return response;
    },
    (error: AxiosError) => {
      // 处理网络错误或其他非 2xx 响应
      if (error.response) {
        // 服务器返回了错误状态码
        const responseData = error.response.data as ApiResponse<unknown>;
        const errorMessage = responseData?.error || responseData?.message || `请求失败: ${error.response.status}`;
        
        throw new ApiError(
          errorMessage,
          'HTTP_ERROR',
          {
            status: error.response.status,
            data: responseData,
            url: error.config?.url,
          },
          error.response.status
        );
      } else if (error.request) {
        // 请求已发送但没有收到响应
        throw new ApiError(
          '网络连接失败，请检查网络设置',
          'NETWORK_ERROR',
          { url: error.config?.url },
          0
        );
      } else {
        // 请求配置错误
        throw new ApiError(
          error.message || '请求配置错误',
          'REQUEST_ERROR',
          { url: error.config?.url }
        );
      }
    }
  );

  return instance;
}

/**
 * 全局 axios 实例
 */
export const baseClient = createAxiosInstance();

function unwrapApiResponse<T>(response: unknown): T {
  if (response && typeof response === 'object' && 'data' in (response as Record<string, unknown>)) {
    const rawData = (response as { data: unknown }).data;

    if (rawData && typeof rawData === 'object' && rawData !== null && 'success' in (rawData as Record<string, unknown>)) {
      const apiResponse = rawData as ApiResponse<T>;

      if (apiResponse.success && 'data' in apiResponse) {
        return apiResponse.data as T;
      }

      return rawData as T;
    }

    return rawData as T;
  }

  return response as T;
}

/**
 * 通用 API 调用包装器
 * 用于统一处理 API 响应和错误
 */
export async function apiCall<T>(
  request: Promise<any>,
  cacheKey?: string,
  params?: Record<string, any>,
  forceRefresh = false
): Promise<T> {
  // 如果提供了缓存键，尝试使用缓存
  if (cacheKey) {
    if (!forceRefresh) {
      const cached = apiCache.get<T>(cacheKey, params);
      if (cached !== null) {
        return cached;
      }
    }

    try {
      const response = await request;
      const data = unwrapApiResponse<T>(response);

      apiCache.set(cacheKey, data, params);
      return data;
    } catch (error) {
      // 如果API调用失败，尝试返回过期的缓存数据
      if (!forceRefresh) {
        const expiredData = apiCache.get<T>(cacheKey, params);
        if (expiredData !== null) {
          // 返回过期缓存数据，错误已由拦截器记录
          return expiredData;
        }
      }
      throw error;
    }
  }

  // 不使用缓存的原始调用
  try {
    const response = await request;
    return unwrapApiResponse<T>(response);
  } catch (error) {
    // 已经被拦截器处理过的错误，直接抛出
    throw error;
  }
}
