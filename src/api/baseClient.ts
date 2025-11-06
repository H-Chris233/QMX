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

/**
 * 通用 API 调用包装器
 * 用于统一处理 API 响应和错误
 */
export async function apiCall<T>(
  request: Promise<any>,
  cacheKey?: string,
  params?: Record<string, unknown>,
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
      const apiResponse = response.data as ApiResponse<T>;

      // 如果有 data 字段，返回 data；否则返回整个响应
      let data: T;
      if ('data' in apiResponse && apiResponse.success) {
        data = apiResponse.data as T;
      } else {
        // 兼容某些直接返回数据的端点
        data = response.data as T;
      }

      // 缓存响应数据
      apiCache.set(cacheKey, data, params);
      return data;
    } catch (error) {
      // 如果API调用失败，尝试返回过期的缓存数据
      if (!forceRefresh) {
        const expiredData = apiCache.get<T>(cacheKey, params);
        if (expiredData !== null) {
          console.warn('API调用失败，返回过期缓存数据:', error);
          return expiredData;
        }
      }
      throw error;
    }
  }

  // 不使用缓存的原始调用
  try {
    const response = await request;
    const apiResponse = response.data as ApiResponse<T>;

    // 如果有 data 字段，返回 data；否则返回整个响应
    if ('data' in apiResponse && apiResponse.success) {
      return apiResponse.data as T;
    }

    // 兼容某些直接返回数据的端点
    return response.data as T;
  } catch (error) {
    // 已经被拦截器处理过的错误，直接抛出
    throw error;
  }
}
