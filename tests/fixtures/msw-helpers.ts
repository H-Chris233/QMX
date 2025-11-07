/**
 * MSW辅助函数
 * 提供常用的MSW响应构建工具
 */

import { HttpResponse } from 'msw';
import type { ApiResponse } from '@/types/api';
import {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  ErrorResponses,
  HttpStatus,
} from './responses';

/**
 * 延迟响应（模拟网络延迟）
 * @param ms - 延迟毫秒数
 */
export async function delay(ms: number = 100): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 创建成功的JSON响应
 */
export function jsonSuccess<T>(data: T, status: number = HttpStatus.OK) {
  return HttpResponse.json(createSuccessResponse(data), { status });
}

/**
 * 创建错误的JSON响应
 */
export function jsonError(
  error: string,
  message?: string,
  status: number = HttpStatus.BAD_REQUEST
) {
  return HttpResponse.json(createErrorResponse(error, message), { status });
}

/**
 * 创建分页响应
 */
export function jsonPaginated<T>(
  data: T[],
  page: number = 1,
  limit: number = 10,
  total?: number,
  status: number = HttpStatus.OK
) {
  const actualTotal = total ?? data.length;
  return HttpResponse.json(createPaginatedResponse(data, page, limit, actualTotal), { status });
}

/**
 * 标准错误响应构建器
 */
export const ErrorHttpResponses = {
  badRequest(message?: string) {
    return HttpResponse.json(ErrorResponses.badRequest(message), {
      status: HttpStatus.BAD_REQUEST,
    });
  },

  unauthorized(message?: string) {
    return HttpResponse.json(ErrorResponses.unauthorized(message), {
      status: HttpStatus.UNAUTHORIZED,
    });
  },

  forbidden(message?: string) {
    return HttpResponse.json(ErrorResponses.forbidden(message), {
      status: HttpStatus.FORBIDDEN,
    });
  },

  notFound(resource?: string) {
    return HttpResponse.json(ErrorResponses.notFound(resource), {
      status: HttpStatus.NOT_FOUND,
    });
  },

  conflict(message?: string) {
    return HttpResponse.json(ErrorResponses.conflict(message), {
      status: HttpStatus.CONFLICT,
    });
  },

  validationError(errors: Record<string, string[]>) {
    return HttpResponse.json(ErrorResponses.validationError(errors), {
      status: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  },

  serverError(message?: string) {
    return HttpResponse.json(ErrorResponses.serverError(message), {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  },

  serviceUnavailable(message?: string) {
    return HttpResponse.json(ErrorResponses.serviceUnavailable(message), {
      status: HttpStatus.SERVICE_UNAVAILABLE,
    });
  },
};

/**
 * URL参数解析辅助
 */
export class RequestHelpers {
  /**
   * 从URL中获取分页参数
   */
  static getPaginationParams(request: Request): { page: number; limit: number } {
    const url = new URL(request.url);
    return {
      page: parseInt(url.searchParams.get('page') || '1', 10),
      limit: parseInt(url.searchParams.get('limit') || '10', 10),
    };
  }

  /**
   * 从URL中获取搜索关键字
   */
  static getSearchQuery(request: Request, paramName: string = 'q'): string {
    const url = new URL(request.url);
    return url.searchParams.get(paramName) || '';
  }

  /**
   * 从URL中获取排序参数
   */
  static getSortParams(
    request: Request
  ): { sortBy: string | null; sortOrder: 'ASC' | 'DESC' } {
    const url = new URL(request.url);
    const sortBy = url.searchParams.get('sort_by');
    const sortOrder = (url.searchParams.get('sort_order') || 'ASC').toUpperCase() as 'ASC' | 'DESC';
    
    return { sortBy, sortOrder };
  }

  /**
   * 从URL中获取所有查询参数
   */
  static getAllParams(request: Request): Record<string, string> {
    const url = new URL(request.url);
    const params: Record<string, string> = {};
    
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    return params;
  }

  /**
   * 解析请求体JSON
   */
  static async getBody<T = any>(request: Request): Promise<T> {
    try {
      return await request.json() as T;
    } catch (error) {
      throw new Error('Invalid JSON in request body');
    }
  }
}

/**
 * 数据过滤辅助
 */
export class DataFilterHelpers {
  /**
   * 按关键字过滤学员
   */
  static filterStudentsByQuery<T extends { name?: string; phone?: string; uid?: number }>(
    students: T[],
    query: string
  ): T[] {
    if (!query) return students;
    
    const lowerQuery = query.toLowerCase();
    return students.filter(
      (s) =>
        s.name?.toLowerCase().includes(lowerQuery) ||
        s.phone?.includes(query) ||
        s.uid?.toString().includes(query)
    );
  }

  /**
   * 按学员ID过滤交易
   */
  static filterTransactionsByStudentId<T extends { student_id?: number | null }>(
    transactions: T[],
    studentId: number | null
  ): T[] {
    if (studentId === null || studentId === undefined) return transactions;
    return transactions.filter((t) => t.student_id === studentId);
  }

  /**
   * 分页处理
   */
  static paginate<T>(data: T[], page: number, limit: number): T[] {
    const start = (page - 1) * limit;
    const end = start + limit;
    return data.slice(start, end);
  }

  /**
   * 排序处理
   */
  static sort<T>(
    data: T[],
    sortBy: keyof T | null,
    sortOrder: 'ASC' | 'DESC' = 'ASC'
  ): T[] {
    if (!sortBy) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      if (aVal === bVal) return 0;
      
      const comparison = aVal < bVal ? -1 : 1;
      return sortOrder === 'ASC' ? comparison : -comparison;
    });
  }
}
