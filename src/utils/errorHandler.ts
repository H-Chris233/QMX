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
  // 移除全局错误状态管理，只记录到控制台
  console.log('Error recorded (global error state removed):', error);
}

// 移除removeError函数（已简化错误处理机制）
// export function removeError(errorId: string): void {
//   errors.value = errors.value.filter(error => error.id !== errorId);
// }

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
    
    // 直接显示错误模态框，设置高优先级
    const displayMessage = `操作失败: ${errorMessage}`;
    const displayTitle = `${operationName}失败 (高优先级)`;
    
    // 在浏览器环境中，我们希望通过UI显示错误
    // 但在Node.js环境中（如SSR），我们只能记录到控制台
    if (typeof window !== 'undefined' && (window as any).showError) {
      (window as any).showError(displayTitle, displayMessage, JSON.stringify({
        operation: operationName,
        context: options.context,
        originalError: errorMessage,
        timestamp: new Date().toISOString()
      }), options.retryable, 'high');
    } else if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
      // 尝试通过全局事件发送错误
      const event = new CustomEvent('showAppError', {
        detail: {
          title: displayTitle,
          message: displayMessage,
          details: JSON.stringify({
            operation: operationName,
            context: options.context,
            originalError: errorMessage,
            timestamp: new Date().toISOString()
          }),
          showRetry: options.retryable,
          priority: 'high'
        }
      });
      window.dispatchEvent(event);
    } else {
      console.error(`${displayTitle}: ${displayMessage}`, {
        operation: operationName,
        context: options.context,
        originalError: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
    
    // 重新抛出错误以确保调用方知道操作失败
    throw new Error(`${operationName}失败: ${errorMessage}`);
  }
}

// 输入验证错误
export function handleValidationError(
  field: string,
  message: string,
  value?: any
): void {
  // 直接显示错误模态框，设置低优先级
  const displayMessage = `输入验证错误: ${message}`;
  const displayTitle = '验证错误 (低优先级)';
  
  // 在浏览器环境中，我们希望通过UI显示错误
  // 但在Node.js环境中（如SSR），我们只能记录到控制台
  if (typeof window !== 'undefined' && (window as any).showError) {
    (window as any).showError(displayTitle, displayMessage, JSON.stringify({ field, value }), false, 'low');
  } else if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
    // 尝试通过全局事件发送错误
    const event = new CustomEvent('showAppError', {
      detail: {
        title: displayTitle,
        message: displayMessage,
        details: JSON.stringify({ field, value }),
        priority: 'low'
      }
    });
    window.dispatchEvent(event);
  } else {
    console.error(`${displayTitle} - ${field}: ${displayMessage}`, { field, value });
  }
  // 不抛出异常，只显示错误
}

// 网络错误处理
export function handleNetworkError(
  error: unknown,
  operationName: string
): never {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // 直接显示错误模态框，设置中优先级
  const displayMessage = `网络连接失败: ${errorMessage}`;
  const displayTitle = '网络错误 (中优先级)';
  
  // 在浏览器环境中，我们希望通过UI显示错误
  // 但在Node.js环境中（如SSR），我们只能记录到控制台
  if (typeof window !== 'undefined' && (window as any).showError) {
    (window as any).showError(displayTitle, displayMessage, JSON.stringify({
      operation: operationName,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), true, 'medium');
  } else if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
    // 尝试通过全局事件发送错误
    const event = new CustomEvent('showAppError', {
      detail: {
        title: displayTitle,
        message: displayMessage,
        details: JSON.stringify({
          operation: operationName,
          error: errorMessage,
          timestamp: new Date().toISOString()
        }),
        showRetry: true,
        priority: 'medium'
      }
    });
    window.dispatchEvent(event);
  } else {
    console.error(`${displayTitle}: ${displayMessage}`, {
      operation: operationName,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
  
  throw new Error(`网络错误: ${errorMessage}`);
}

// 移除reportError函数（已简化错误处理机制）
// function reportError(error: AppError): void {
//   // 移除错误上报功能，只记录到控制台
//   console.log('Error reporting disabled, logged to console:', error);
// }

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
// 移除全局错误状态导出（已简化错误处理机制）
// export const globalErrors = errors;

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