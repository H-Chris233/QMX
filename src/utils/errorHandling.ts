export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value?: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function handleApiError(error: unknown, context: string): never {
  console.error(`❌ [${context}] 调用失败:`, error);
  
  if (error instanceof Error) {
    throw new ApiError(`${context}失败: ${error.message}`, undefined, error);
  }
  
  throw new ApiError(`${context}失败: 未知错误`, undefined, error);
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function formatErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message;
  }
  
  if (isValidationError(error)) {
    return `字段 ${error.field} 验证失败: ${error.message}`;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return String(error);
}