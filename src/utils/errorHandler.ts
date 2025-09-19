// 标准化错误处理工具
import { ref } from 'vue';

// 错误优先级定义
export enum ErrorPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

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
  priority: ErrorPriority;
  // 新增错误上报字段
  reported: boolean;
  stack?: string | undefined;
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
    priority?: ErrorPriority;
    stack?: string | undefined;
  } = {}
): AppError {
  const {
    title = '错误',
    details,
    retryable = false,
    retryCallback,
    category = 'unknown',
    priority = ErrorPriority.MEDIUM,
    stack
  } = options;

  return {
    id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title,
    message,
    details: details || '',
    timestamp: new Date(),
    retryable,
    retryCallback,
    category,
    priority,
    reported: false,
    stack: stack || undefined
  };
}

// 添加错误到全局状态
export function addError(error: AppError): void {
  errors.value.push(error);
  
  // 自动清理旧错误（保留最近20个）
  if (errors.value.length > 20) {
    // 优先保留高优先级错误
    const sortedErrors = [...errors.value].sort((a, b) => {
      const priorityOrder = {
        [ErrorPriority.CRITICAL]: 4,
        [ErrorPriority.HIGH]: 3,
        [ErrorPriority.MEDIUM]: 2,
        [ErrorPriority.LOW]: 1
      };
      
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    errors.value = sortedErrors.slice(-20);
  }
  
  // 触发错误上报
  reportError(error);
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
    priority?: ErrorPriority;
  } = {}
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
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
        category: 'api',
        priority: options.priority ?? ErrorPriority.MEDIUM,
        stack: errorStack || undefined
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
      category: 'validation',
      priority: ErrorPriority.HIGH
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
  const errorStack = error instanceof Error ? error.stack : undefined;
  
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
      category: 'network',
      priority: ErrorPriority.HIGH,
      stack: errorStack || undefined
    }
  );

  addError(appError);
  throw new Error(`网络错误: ${errorMessage}`);
}

// 模拟错误上报函数
function reportError(error: AppError): void {
  // 避免重复上报
  if (error.reported) return;
  
  // 标记为已上报
  (error as any).reported = true;
  
  // 在生产环境中，这里会将错误上报到错误监控服务
  // 例如 Sentry、LogRocket 等
  if (import.meta.env?.MODE === 'production') {
    console.log(`[ERROR REPORTING] Sending error to monitoring service: ${error.id}`);
    // 实际实现中，这里会调用具体的错误上报API
    // sendToErrorService(error);
  } else {
    console.log(`[ERROR REPORTING] Error captured (dev mode): ${error.id}`, error);
  }
}

// 获取错误优先级的用户友好描述
export function getPriorityDescription(priority: ErrorPriority): string {
  switch (priority) {
    case ErrorPriority.CRITICAL:
      return '严重';
    case ErrorPriority.HIGH:
      return '高';
    case ErrorPriority.MEDIUM:
      return '中';
    case ErrorPriority.LOW:
      return '低';
    default:
      return '未知';
  }
}

// 根据优先级获取错误显示样式
export function getPriorityClass(priority: ErrorPriority): string {
  switch (priority) {
    case ErrorPriority.CRITICAL:
      return 'error-critical';
    case ErrorPriority.HIGH:
      return 'error-high';
    case ErrorPriority.MEDIUM:
      return 'error-medium';
    case ErrorPriority.LOW:
      return 'error-low';
    default:
      return 'error-medium';
  }
}

// 导出全局错误状态
export const globalErrors = errors;

// 测试错误处理功能的函数
export function testErrorHandling(): void {
  // 创建不同优先级的测试错误
  const lowPriorityError = createError('这是一个低优先级错误', {
    title: '测试错误',
    priority: ErrorPriority.LOW,
    category: 'unknown'
  });
  
  const mediumPriorityError = createError('这是一个中优先级错误', {
    title: '测试错误',
    priority: ErrorPriority.MEDIUM,
    category: 'unknown'
  });
  
  const highPriorityError = createError('这是一个高优先级错误', {
    title: '测试错误',
    priority: ErrorPriority.HIGH,
    category: 'unknown'
  });
  
  const criticalPriorityError = createError('这是一个严重错误', {
    title: '测试错误',
    priority: ErrorPriority.CRITICAL,
    category: 'unknown'
  });
  
  // 添加错误到全局状态
  addError(lowPriorityError);
  addError(mediumPriorityError);
  addError(highPriorityError);
  addError(criticalPriorityError);
  
  console.log('错误处理测试完成，已添加4个测试错误到全局状态');
}