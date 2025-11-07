/**
 * Store Action 统一错误处理工具
 * 为所有 Pinia store action 提供标准化的错误处理逻辑
 */
import type { ApiError } from '../api/baseClient';

/**
 * Store Action 错误处理选项
 */
export interface StoreActionOptions {
  /** 操作名称，用于错误信息 */
  operationName: string;
  /** 是否可重试 */
  retryable?: boolean;
  /** 重试回调函数 */
  retryCallback?: () => Promise<void>;
  /** 附加上下文信息 */
  context?: Record<string, any>;
  /** 是否抛出错误（默认true，设为false只记录不抛出） */
  throwOnError?: boolean;
  /** 自定义错误处理 */
  customErrorHandler?: (error: unknown) => void;
}

/**
 * Store Action 执行结果
 */
export interface StoreActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  originalError?: unknown;
}

/**
 * 标准 Store Action 包装器
 * 提供统一的错误处理、加载状态管理和错误记录
 */
export async function storeActionWrapper<T>(
  action: () => Promise<T>,
  options: StoreActionOptions
): Promise<T> {
  const {
    operationName,
    retryable = false,
    retryCallback,
    context = {},
    throwOnError = true,
    customErrorHandler
  } = options;

  try {
    const result = await action();
    console.debug(`✅ ${operationName} 成功完成`, context);
    return result;
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    const operationId = `${operationName}_${Date.now()}`;

    // 记录错误详情
    console.group(`🚨 ${operationName} 失败 [${operationId}]`);
    console.error('错误信息:', errorMessage);
    console.error('原始错误:', error);
    console.error('上下文:', context);
    console.error('可重试:', retryable);
    console.groupEnd();

    // 自定义错误处理
    if (customErrorHandler) {
      try {
        customErrorHandler(error);
      } catch (handlerError) {
        console.error('自定义错误处理失败:', handlerError);
      }
    }

    // 显示用户友好的错误信息
    showUserError(operationName, errorMessage, retryable, context);

    // 创建标准化错误对象
    const standardizedError = new Error(`${operationName}失败: ${errorMessage}`);
    (standardizedError as any).originalError = error;
    (standardizedError as any).operationId = operationId;
    (standardizedError as any).context = context;
    (standardizedError as any).retryable = retryable;
    (standardizedError as any).retryCallback = retryCallback;

    if (throwOnError) {
      throw standardizedError;
    }

    return undefined as any;
  }
}

/**
 * 带 loading 状态的 Store Action 包装器
 */
export async function storeActionWithLoading<T>(
  action: () => Promise<T>,
  loadingRef: { value: boolean },
  options: StoreActionOptions
): Promise<T> {
  loadingRef.value = true;
  try {
    return await storeActionWrapper(action, options);
  } finally {
    loadingRef.value = false;
  }
}

/**
 * 获取友好的错误信息
 */
function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    // API错误特殊处理
    if (error.name === 'ApiError') {
      const apiError = error as ApiError;
      return apiError.message || getApiErrorTypeMessage(apiError.type);
    }

    return error.message || '未知错误';
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }

  return '操作失败，请重试';
}

/**
 * 获取API错误类型的用户友好信息
 */
function getApiErrorTypeMessage(type: string): string {
  switch (type) {
    case 'NETWORK_ERROR':
      return '网络连接失败，请检查网络设置';
    case 'HTTP_ERROR':
      return '服务器请求失败，请稍后重试';
    case 'REQUEST_ERROR':
      return '请求配置错误';
    case 'BACKEND_ERROR':
      return '服务器处理失败';
    case 'TIMEOUT_ERROR':
      return '请求超时，请重试';
    default:
      return 'API调用失败';
  }
}

/**
 * 显示用户友好的错误信息
 */
function showUserError(
  operationName: string,
  errorMessage: string,
  retryable: boolean,
  context: Record<string, any>
): void {
  const errorDetail = {
    operation: operationName,
    message: errorMessage,
    retryable,
    context,
    timestamp: new Date().toISOString()
  };

  // 尝试使用全局错误显示机制
  if (typeof window !== 'undefined') {
    // 方式1: 全局错误函数
    if ((window as any).showError) {
      (window as any).showError(
        `${operationName}失败`,
        errorMessage,
        JSON.stringify(errorDetail, null, 2),
        retryable
      );
      return;
    }

    // 方式2: 自定义事件
    if ((window as any).dispatchEvent) {
      const event = new CustomEvent('showAppError', {
        detail: {
          title: `${operationName}失败`,
          message: errorMessage,
          details: JSON.stringify(errorDetail, null, 2),
          showRetry: retryable,
          priority: retryable ? 'medium' : 'high'
        }
      });
      (window as any).dispatchEvent(event);
      return;
    }
  }

  // 降级到控制台输出
  console.group('🚨 用户错误提示');
  console.error(`${operationName}失败:`, errorMessage);
  console.error('详细信息:', errorDetail);
  console.groupEnd();
}

/**
 * 创建重试函数
 */
export function createRetryFunction(
  originalAction: () => Promise<any>,
  options: StoreActionOptions
): () => Promise<any> {
  return async () => {
    return storeActionWrapper(originalAction, {
      ...options,
      operationName: `${options.operationName} (重试)`
    });
  };
}

/**
 * 批量操作包装器
 */
export async function batchStoreActionWrapper<T>(
  actions: Array<() => Promise<T>>,
  options: StoreActionOptions
): Promise<T[]> {
  const { operationName, throwOnError = true } = options;
  const results: T[] = [];
  const errors: Array<{ index: number; error: unknown }> = [];

  console.debug(`🔄 开始批量操作: ${operationName} (${actions.length}项)`);

  for (let i = 0; i < actions.length; i++) {
    try {
      const result = await storeActionWrapper(
        actions[i],
        { ...options, operationName: `${operationName} - 第${i + 1}项` }
      );
      results.push(result);
    } catch (error) {
      errors.push({ index: i, error });

      if (throwOnError) {
        throw new Error(
          `${operationName} 批量操作在第${i + 1}项时失败: ${getErrorMessage(error)}`
        );
      }
    }
  }

  if (errors.length > 0) {
    console.warn(`${operationName} 批量操作部分失败:`, {
      total: actions.length,
      success: results.length,
      failed: errors.length,
      errors
    });
  }

  return results;
}

/**
 * 常用操作的预设配置
 */
export const StoreActionPresets = {
  // 创建操作
  create: (entityName: string): StoreActionOptions => ({
    operationName: `创建${entityName}`,
    retryable: false,
    throwOnError: true
  }),

  // 更新操作
  update: (entityName: string): StoreActionOptions => ({
    operationName: `更新${entityName}`,
    retryable: false,
    throwOnError: true
  }),

  // 删除操作
  delete: (entityName: string): StoreActionOptions => ({
    operationName: `删除${entityName}`,
    retryable: false,
    throwOnError: true
  }),

  // 获取操作
  fetch: (entityName: string): StoreActionOptions => ({
    operationName: `获取${entityName}`,
    retryable: true,
    throwOnError: true
  }),

  // 搜索操作
  search: (entityName: string): StoreActionOptions => ({
    operationName: `搜索${entityName}`,
    retryable: true,
    throwOnError: true
  })
};

/**
 * 错误重试工具
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        break;
      }

      console.warn(`操作失败，${delay}ms后进行第${attempt + 1}次重试:`, error);
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError;
}