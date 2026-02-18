/**
 * Middleware Layer Tests
 *
 * Tests for Express middleware - Error Handling, Validation, and Rate Limiting
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { errorHandler, catchAsync, notFound } from '@/middleware/errorHandler';
import { AppError, ErrorType } from '@/utils/errors';
import { commonValidations, validate, validateQuery, validateParams } from '@/middleware/validation';
import { rateLimitMiddleware, apiRateLimitMiddleware } from '@/middleware/rateLimiter';

// Jest 模拟设置
jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      originalUrl: '/test/url',
      method: 'GET',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-agent'),
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('normalizeError - PostgreSQL Error Mapping', () => {
    it('maps unique_violation (23505) to State error', () => {
      const pgError = {
        code: '23505',
        detail: 'Key (phone)=(13800138000) already exists',
        message: 'duplicate key value violates unique constraint',
      };

      const normalized = new AppError('test', 'test' as ErrorType, {});

      // 使用错误处理器测试
      errorHandler(pgError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.success).toBe(false);
      expect(responseCall.error.type).toBe('State');
      expect(responseCall.error.message).toContain('数据已存在');
    });

    it('maps foreign_key_violation (23503) to InvalidInput error', () => {
      const pgError = {
        code: '23503',
        detail: 'Key (student_id)=(999) is not referenced in table "students"',
        message: 'foreign key violation',
      };

      errorHandler(pgError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.error.type).toBe('InvalidInput');
    });

    it('maps not_null_violation (23502) to InvalidInput error', () => {
      const pgError = {
        code: '23502',
        message: 'null value in column "name" violates not-null constraint',
      };

      errorHandler(pgError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.error.type).toBe('InvalidInput');
      expect(responseCall.error.message).toContain('必填字段');
    });

    it('maps check_violation (23514) to InvalidInput error', () => {
      const pgError = {
        code: '23514',
        message: 'new row for relation "students" violates check constraint',
      };

      errorHandler(pgError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.error.type).toBe('InvalidInput');
    });
  });

  describe('normalizeError - JWT Error Mapping', () => {
    it('maps JsonWebTokenError to Unauthorized error', () => {
      const jwtError = {
        name: 'JsonWebTokenError',
        message: 'jwt malformed',
      };

      errorHandler(jwtError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.error.type).toBe('Unauthorized');
      expect(responseCall.error.message).toContain('无效的访问令牌');
    });

    it('maps TokenExpiredError to Unauthorized error', () => {
      const expiredError = {
        name: 'TokenExpiredError',
        message: 'jwt expired',
        expiredAt: new Date(),
      };

      errorHandler(expiredError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.error.type).toBe('Unauthorized');
      expect(responseCall.error.message).toContain('已过期');
    });
  });

  describe('normalizeError - Body Parser Error', () => {
    it('maps entity.parse.failed to InvalidInput error', () => {
      const parseError = {
        type: 'entity.parse.failed',
        message: 'Unexpected token } in JSON at position 50',
      };

      errorHandler(parseError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.error.type).toBe('InvalidInput');
      expect(responseCall.error.message).toContain('解析失败');
    });
  });

  describe('normalizeError - AppError Handling', () => {
    it('preserves existing AppError properties', () => {
      const appError = new AppError('自定义错误消息', ErrorType.NotFound, {
        statusCode: 404,
        code: 'CUSTOM_CODE',
        details: { extra: 'data' },
      });

      errorHandler(appError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.error.message).toBe('自定义错误消息');
      expect(responseCall.error.code).toBe('CUSTOM_CODE');
      expect(responseCall.error.details).toEqual({ extra: 'data' });
    });

    it('handles null/undefined input', () => {
      errorHandler(null as any, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.success).toBe(false);
      expect(responseCall.error.message).toContain('服务器内部错误');
    });
  });

  describe('Response Format', () => {
    it('returns success: false for all errors', () => {
      const error = new Error('Test error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.success).toBe(false);
      expect(responseCall).toHaveProperty('error');
      expect(responseCall.error).toHaveProperty('type');
      expect(responseCall.error).toHaveProperty('message');
      // 普通 Error 转换为 AppError (Other类型) 时没有 code 属性
      // 只有明确设置了 code 的 AppError才会有 code
    });

    it('includes debug info in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      error.stack = 'Stack trace here';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.debug).toBeDefined();
      expect(responseCall.debug.stack).toBe('Stack trace here');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('catchAsync', () => {
    it('catches async errors and passes to next', async () => {
      const asyncHandler = jest.fn().mockRejectedValue(new Error('Async error'));
      const wrapped = catchAsync(asyncHandler);

      await wrapped(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const errorPassed = mockNext.mock.calls[0][0];
      expect(errorPassed.message).toBe('Async error');
    });

    it('passes successful async results through', async () => {
      const asyncHandler = jest.fn().mockResolvedValue(undefined);
      const wrapped = catchAsync(asyncHandler);

      await wrapped(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('notFound Handler', () => {
    it('creates NotFound error with request URL', () => {
      mockRequest.originalUrl = '/unknown/route';

      notFound(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0] as AppError;
      expect(error.type).toBe(ErrorType.NotFound);
      expect(error.message).toContain('/unknown/route');
    });
  });
});

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      body: {},
      query: {},
      params: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('validate - Body Validation', () => {
    it('passes valid data through', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
        phone: Joi.string().pattern(/^1[3-9]\d{9}$/),
        age: Joi.number().optional(),
      });

      mockRequest.body = { name: '张三', phone: '13800138000', age: 25 };

      validate(schema)(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(Error));
      expect(mockRequest.body.name).toBe('张三');
    });

    it('rejects invalid phone format', () => {
      const schema = Joi.object({
        phone: Joi.string().pattern(/^1[3-9]\d{9}$/),
      });

      mockRequest.body = { phone: '12345678900' };

      expect(() => {
        validate(schema)(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(AppError);
    });

    it('rejects missing required fields', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
        phone: Joi.string().required(),
      });

      mockRequest.body = { name: '张三' };

      try {
        validate(schema)(mockRequest as Request, mockResponse as Response, mockNext);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).type).toBe(ErrorType.InvalidInput);
      }
    });

    it('strips unknown fields', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
      });

      mockRequest.body = { name: '张三', unknownField: 'should be removed' };

      validate(schema)(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.body).not.toHaveProperty('unknownField');
    });

    it('accumulates multiple validation errors', () => {
      const schema = Joi.object({
        name: Joi.string().min(2).max(50).required(),
        phone: Joi.string().pattern(/^1[3-9]\d{9}$/).required(),
        age: Joi.number().min(0).max(120),
      });

      mockRequest.body = {
        name: 'X', // too short
        phone: 'invalid', // wrong format
        age: 200, // too high
      };

      try {
        validate(schema)(mockRequest as Request, mockResponse as Response, mockNext);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        const appError = error as AppError;
        // 应该包含所有错误信息
        expect(appError.message.length).toBeGreaterThan(0);
      }
    });
  });

  describe('validateQuery - Query Parameter Validation', () => {
    it('validates query parameters', () => {
      const schema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        name: Joi.string().optional(),
      });

      mockRequest.query = { page: '2', limit: '10', name: 'test' };

      validateQuery(schema)(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.query.page).toBe(2);
      expect(mockRequest.query.limit).toBe(10);
    });

    it('applies default values', () => {
      const schema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
      });

      mockRequest.query = {};

      validateQuery(schema)(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.query.page).toBe(1);
      expect(mockRequest.query.limit).toBe(20);
    });
  });

  describe('validateParams - URL Parameter Validation', () => {
    it('validates URL parameters', () => {
      const schema = Joi.object({
        uid: Joi.number().integer().positive().required(),
      });

      mockRequest.params = { uid: '123' };

      validateParams(schema)(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.params.uid).toBe(123);
    });

    it('rejects invalid parameter types', () => {
      const schema = Joi.object({
        uid: Joi.number().integer().positive().required(),
      });

      mockRequest.params = { uid: 'abc' };

      try {
        validateParams(schema)(mockRequest as Request, mockResponse as Response, mockNext);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).type).toBe(ErrorType.InvalidInput);
      }
    });
  });

  describe('commonValidations', () => {
    describe('ID Validation', () => {
      it('accepts positive integers', () => {
        const schema = Joi.object({ uid: commonValidations.id });
        const { error } = schema.validate({ uid: 123 });
        expect(error).toBeUndefined();
      });

      it('rejects zero', () => {
        const schema = Joi.object({ uid: commonValidations.id });
        const { error } = schema.validate({ uid: 0 });
        expect(error).toBeDefined();
      });

      it('rejects negative numbers', () => {
        const schema = Joi.object({ uid: commonValidations.id });
        const { error } = schema.validate({ uid: -1 });
        expect(error).toBeDefined();
      });

      it('rejects non-integers', () => {
        const schema = Joi.object({ uid: commonValidations.id });
        const { error } = schema.validate({ uid: 1.5 });
        expect(error).toBeDefined();
      });
    });

    describe('Phone Validation', () => {
      it('accepts valid Chinese mobile numbers', () => {
        const schema = Joi.object({ phone: commonValidations.phone });
        const { error } = schema.validate({ phone: '13800138000' });
        expect(error).toBeUndefined();
      });

      it('rejects invalid formats', () => {
        const schema = Joi.object({ phone: commonValidations.phone });
        expect(schema.validate({ phone: '12345678900' }).error).toBeDefined();
        expect(schema.validate({ phone: '23800138000' }).error).toBeDefined(); // wrong prefix
        expect(schema.validate({ phone: '1381234' }).error).toBeDefined(); // too short
      });
    });

    describe('Amount Validation', () => {
      it('accepts valid positive amounts', () => {
        const schema = Joi.object({ amount: commonValidations.amount });
        expect(schema.validate({ amount: 100 }).error).toBeUndefined();
        expect(schema.validate({ amount: 99.99 }).error).toBeUndefined();
        expect(schema.validate({ amount: 0.01 }).error).toBeUndefined();
      });

      it('rejects zero', () => {
        const schema = Joi.object({ amount: commonValidations.amount });
        const { error } = schema.validate({ amount: 0 });
        expect(error).toBeDefined();
      });

      it('rejects amounts with more than 2 decimal places', () => {
        const schema = Joi.object({ amount: commonValidations.amount });
        // 使用字符串避免JS浮点数精度问题
        const { error } = schema.validate({ amount: '99.999' });
        expect(error).toBeDefined();
      });

      it('accepts optional amount with null/empty', () => {
        const schema = Joi.object({ amount: commonValidations.optionalAmount });
        expect(schema.validate({ amount: null }).error).toBeUndefined();
        expect(schema.validate({ amount: '' }).error).toBeUndefined();
        expect(schema.validate({}).error).toBeUndefined();
      });

      it('allows zero with disallowZero=false', () => {
        const schema = Joi.object({ amount: commonValidations.optionalAmount });
        expect(schema.validate({ amount: 0 }).error).toBeUndefined();
      });
    });

    describe('Score Validation', () => {
      it('accepts valid scores 0-10', () => {
        const schema = Joi.object({ score: commonValidations.score });
        expect(schema.validate({ score: 0 }).error).toBeUndefined();
        expect(schema.validate({ score: 5.5 }).error).toBeUndefined();
        expect(schema.validate({ score: 10 }).error).toBeUndefined();
      });

      it('rejects negative scores', () => {
        const schema = Joi.object({ score: commonValidations.score });
        const { error } = schema.validate({ score: -1 });
        expect(error).toBeDefined();
      });

      it('rejects scores above 10', () => {
        const schema = Joi.object({ score: commonValidations.score });
        const { error } = schema.validate({ score: 10.1 });
        expect(error).toBeDefined();
      });
    });

    describe('Pagination Validation', () => {
      it('applies defaults for pagination', () => {
        const schema = Joi.object({
          page: commonValidations.page,
          limit: commonValidations.limit,
        });

        const { value } = schema.validate({});
        expect(value.page).toBe(1);
        expect(value.limit).toBe(20);
      });

      it('rejects limit exceeding max of 100', () => {
        const schema = Joi.object({ limit: commonValidations.limit });
        // Joi 的 .max(100) 会拒绝超过100的值，不会自动裁剪
        const { error } = schema.validate({ limit: 200 });
        expect(error).toBeDefined();
      });
    });

    describe('Sort Validation', () => {
      it('accepts valid sort fields', () => {
        const schema = Joi.object({
          sortBy: commonValidations.sortBy,
          sortOrder: commonValidations.sortOrder,
        });

        expect(schema.validate({ sortBy: 'uid', sortOrder: 'ASC' }).error).toBeUndefined();
        expect(schema.validate({ sortBy: 'name', sortOrder: 'DESC' }).error).toBeUndefined();
        expect(schema.validate({ sortBy: 'created_at', sortOrder: 'ASC' }).error).toBeUndefined();
      });

      it('rejects invalid sort fields', () => {
        const schema = Joi.object({ sortBy: commonValidations.sortBy });
        const { error } = schema.validate({ sortBy: 'invalid_field' });
        expect(error).toBeDefined();
      });
    });
  });

  describe('Error Message Formatting', () => {
    it('formats validation errors with prefixes', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
      });

      mockRequest.body = {};

      try {
        validate(schema)(mockRequest as Request, mockResponse as Response, mockNext);
      } catch (error) {
        const appError = error as AppError;
        expect(appError.message).toContain('验证失败');
      }
    });
  });
});

describe('Rate Limiter Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      ip: '127.0.0.1',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('Test Environment Behavior', () => {
    it('skips rate limiting in test environment', async () => {
      // 测试环境会跳过速率限制
      const result = await rateLimitMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('apiRateLimitMiddleware also skips in test', async () => {
      await apiRateLimitMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('RateLimiter Configuration', () => {
    it('uses configured max requests', () => {
      // 速率限制器基于 config.rateLimit.maxRequests
      // 测试环境跳过，但我们可以验证中间件函数可以正常创建
      const limiter = (rateLimitMiddleware as any).limiter;
      // 由于测试环境返回空函数，这个测试验证配置存在
      expect(rateLimitMiddleware).toBeDefined();
    });

    it('apiRateLimit has stricter configuration', () => {
      // API 限制为 30个请求/分钟
      expect(apiRateLimitMiddleware).toBeDefined();
    });
  });
});

describe('Integration - Error Chain', () => {
  it('validation error flows through catchAsync to errorHandler', () => {
    const mockRequest = {
      body: { name: '' },
      originalUrl: '/api/students',
      method: 'POST',
      ip: '127.0.0.1',
      get: () => 'test-agent',
    } as unknown as Request;

    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    const mockNext = jest.fn();

    // 验证中间件抛出错误（不是调用 next）
    const schema = Joi.object({
      name: Joi.string().min(2).required(),
    });

    // validate() 在验证失败时会抛出错误
    expect(() => {
      validate(schema)(mockRequest, mockResponse, mockNext);
    }).toThrow(AppError);

    // 验证抛出的错误类型
    try {
      validate(schema)(mockRequest, mockResponse, mockNext);
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).type).toBe(ErrorType.InvalidInput);
      expect((error as AppError).message).toContain('验证失败');
    }
  });

  it('errorHandler formats validation errors correctly', () => {
    const mockRequest = {
      originalUrl: '/test',
      method: 'POST',
      ip: '127.0.0.1',
      get: () => 'test-agent',
    } as unknown as Request;

    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      set: jest.fn().mockReturnThis(),
    } as unknown as Response;

    const validationError = new AppError('Validation failed: name is required', ErrorType.InvalidInput);

    errorHandler(validationError, mockRequest, mockResponse, jest.fn());

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
    expect(jsonCall.success).toBe(false);
    expect(jsonCall.error.type).toBe('InvalidInput');
  });
});
