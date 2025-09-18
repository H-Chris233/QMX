// 标准化错误处理工具
import { ref } from 'vue';

// 错误类型定义
export interface AppError {
  id: string;
  title: string;
  message: string;
  details?: string;
  timestamp: Date;
  retryable: boolean;
  retryCallback?: (() => Promise<void>) | undefined;
  category: 'api' | 'validation' | 'network' | 'database' | 'unknown';
}

// 全局错误状态
const errors = ref<AppError[]>([]);

// 错误工厂函数
export function createError(
  message: string,
  options: {
    title?: string;
    details?: string;
    retryable?: boolean;
    retryCallback?: (() => Promise<void>) | undefined;
    category?: AppError['category'];
  } = {}
): AppError {
  const {
    title = '错误',
    details,
    retryable = false,
    retryCallback,
    category = 'unknown'
  } = options;

  return {
    id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title,
    message,
    details: details || '',
    timestamp: new Date(),
    retryable,
    retryCallback,
    category
  };
}

// 添加错误到全局状态
export function addError(error: AppError): void {
  errors.value.push(error);
  
  // 自动清理旧错误（保留最近10个）
  if (errors.value.length > 10) {
    errors.value = errors.value.slice(-10);
  }
}

// 清除特定错误
export function removeError(errorId: string): void {
  errors.value = errors.value.filter(error => error.id !== errorId);
}

// 清除所有错误
export function clearAllErrors(): void {
  errors.value = [];
}

// API错误处理包装器
export async function handleApiOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  options: {
    retryable?: boolean;
    retryCallback?: () => Promise<void>;
    context?: Record<string, any>;
  } = {}
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    const appError = createError(
      `操作失败: ${errorMessage}`,
      {
        title: `${operationName}失败`,
        details: JSON.stringify({
          operation: operationName,
          context: options.context,
          originalError: errorMessage,
          timestamp: new Date().toISOString()
        }, null, 2),
        retryable: options.retryable ?? false,
        retryCallback: options.retryCallback,
        category: 'api'
      }
    );

    addError(appError);
    
    // 重新抛出错误以确保调用方知道操作失败
    throw new Error(`${operationName}失败: ${errorMessage}`);
  }
}

// 输入验证错误
export function handleValidationError(
  field: string,
  message: string,
  value?: any
): never {
  const error = createError(
    `验证失败: ${message}`,
    {
      title: '输入验证错误',
      details: JSON.stringify({
        field,
        value,
        message,
        timestamp: new Date().toISOString()
      }, null, 2),
      category: 'validation'
    }
  );

  addError(error);
  throw new Error(message);
}

// 网络错误处理
export function handleNetworkError(
  error: unknown,
  operationName: string
): never {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  const appError = createError(
    `网络连接失败: ${errorMessage}`,
    {
      title: '网络错误',
      details: JSON.stringify({
        operation: operationName,
        error: errorMessage,
        timestamp: new Date().toISOString()
      }, null, 2),
      retryable: true,
      category: 'network'
    }
  );

  addError(appError);
  throw new Error(`网络错误: ${errorMessage}`);
}

// 导出全局错误状态
export const globalErrors = errors;