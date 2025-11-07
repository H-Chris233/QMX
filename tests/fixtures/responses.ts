/**
 * 通用响应模板和fixture
 * 提供标准化的API响应结构
 */

import type { ApiResponse } from '@/types/api';

/**
 * 分页信息接口
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

/**
 * 创建成功响应
 * @param data - 响应数据
 * @param message - 附加消息（可选）
 */
export function createSuccessResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message }),
  };
}

/**
 * 创建错误响应
 * @param error - 错误信息
 * @param message - 详细消息（可选）
 */
export function createErrorResponse(error: string, message?: string): ApiResponse<never> {
  return {
    success: false,
    error,
    ...(message && { message }),
  };
}

/**
 * 创建分页响应
 * @param data - 数据数组
 * @param page - 当前页码
 * @param limit - 每页条数
 * @param total - 总记录数
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number = 1,
  limit: number = 10,
  total: number = 0
): ApiResponse<T[]> & { pagination: PaginationInfo } {
  const totalPages = Math.ceil(total / limit);
  
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
    },
  };
}

/**
 * 创建空分页响应
 * @param page - 当前页码
 * @param limit - 每页条数
 */
export function createEmptyPaginatedResponse<T>(
  page: number = 1,
  limit: number = 10
): ApiResponse<T[]> & { pagination: PaginationInfo } {
  return createPaginatedResponse<T>([], page, limit, 0);
}

/**
 * 标准错误响应模板
 */
export const ErrorResponses = {
  /**
   * 400 - 请求参数错误
   */
  badRequest(message: string = '请求参数错误'): ApiResponse<never> {
    return createErrorResponse('Bad Request', message);
  },

  /**
   * 401 - 未授权
   */
  unauthorized(message: string = '未授权，请先登录'): ApiResponse<never> {
    return createErrorResponse('Unauthorized', message);
  },

  /**
   * 403 - 权限不足
   */
  forbidden(message: string = '权限不足，无法访问该资源'): ApiResponse<never> {
    return createErrorResponse('Forbidden', message);
  },

  /**
   * 404 - 资源不存在
   */
  notFound(resource: string = '资源'): ApiResponse<never> {
    return createErrorResponse('Not Found', `${resource}不存在`);
  },

  /**
   * 409 - 冲突
   */
  conflict(message: string = '资源冲突'): ApiResponse<never> {
    return createErrorResponse('Conflict', message);
  },

  /**
   * 422 - 验证错误
   */
  validationError(errors: Record<string, string[]>): ApiResponse<never> & { details: Record<string, string[]> } {
    return {
      success: false,
      error: 'Validation Error',
      message: '数据验证失败',
      details: errors,
    };
  },

  /**
   * 500 - 服务器内部错误
   */
  serverError(message: string = '服务器内部错误，请稍后重试'): ApiResponse<never> {
    return createErrorResponse('Internal Server Error', message);
  },

  /**
   * 503 - 服务不可用
   */
  serviceUnavailable(message: string = '服务暂时不可用，请稍后重试'): ApiResponse<never> {
    return createErrorResponse('Service Unavailable', message);
  },
};

/**
 * HTTP状态码常量
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * 常用验证错误响应
 */
export const ValidationErrors = {
  /**
   * 必填字段缺失
   */
  required(field: string): ApiResponse<never> {
    return ErrorResponses.validationError({
      [field]: [`${field}不能为空`],
    });
  },

  /**
   * 格式错误
   */
  invalidFormat(field: string, format: string): ApiResponse<never> {
    return ErrorResponses.validationError({
      [field]: [`${field}格式不正确，应为${format}`],
    });
  },

  /**
   * 范围错误
   */
  outOfRange(field: string, min: number, max: number): ApiResponse<never> {
    return ErrorResponses.validationError({
      [field]: [`${field}必须在${min}到${max}之间`],
    });
  },

  /**
   * 长度错误
   */
  invalidLength(field: string, minLength: number, maxLength?: number): ApiResponse<never> {
    const message = maxLength
      ? `${field}长度必须在${minLength}到${maxLength}之间`
      : `${field}长度至少为${minLength}`;
    
    return ErrorResponses.validationError({
      [field]: [message],
    });
  },

  /**
   * 唯一性冲突
   */
  duplicate(field: string): ApiResponse<never> {
    return ErrorResponses.validationError({
      [field]: [`${field}已存在，不能重复`],
    });
  },
};
