import { Request, Response, NextFunction } from 'express';
import { AppError, mapErrorTypeToStatus, serializeError, toAppError } from '@/utils/errors';
import logger from '@/utils/logger';

const normalizeError = (err: unknown): AppError => {
  if (!err) {
    return AppError.other('服务器内部错误');
  }

  const candidate = err as Record<string, unknown> & { name?: string; code?: string | number; type?: string };

  // PostgreSQL 错误处理
  // 唯一约束违反 (unique_violation)
  if (candidate.code === '23505') {
    return AppError.state('数据已存在，违反唯一性约束', {
      statusCode: 409,
      details: (candidate as any).detail,
      cause: err instanceof Error ? err : undefined,
    });
  }

  // 外键约束违反 (foreign_key_violation)
  if (candidate.code === '23503') {
    return AppError.invalidInput('关联数据不存在，违反外键约束', {
      statusCode: 400,
      details: (candidate as any).detail,
      cause: err instanceof Error ? err : undefined,
    });
  }

  // 非空约束违反 (not_null_violation)
  if (candidate.code === '23502') {
    return AppError.invalidInput('必填字段不能为空', {
      statusCode: 400,
      details: (candidate as any).detail,
      cause: err instanceof Error ? err : undefined,
    });
  }

  // 检查约束违反 (check_violation)
  if (candidate.code === '23514') {
    return AppError.invalidInput('数据不符合约束条件', {
      statusCode: 400,
      details: (candidate as any).detail,
      cause: err instanceof Error ? err : undefined,
    });
  }

  // JWT 错误处理
  if (candidate.name === 'JsonWebTokenError') {
    return AppError.unauthorized('无效的访问令牌', {
      statusCode: 401,
      cause: err instanceof Error ? err : undefined,
    });
  }

  if (candidate.name === 'TokenExpiredError') {
    return AppError.unauthorized('访问令牌已过期', {
      statusCode: 401,
      cause: err instanceof Error ? err : undefined,
    });
  }

  // Express body-parser 错误
  if (candidate.type === 'entity.parse.failed') {
    return AppError.invalidInput('请求体解析失败，请检查数据格式', {
      statusCode: 400,
      cause: err instanceof Error ? err : undefined,
    });
  }

  // 已经是 AppError，直接返回
  if (candidate instanceof AppError) {
    return candidate;
  }

  return toAppError(err);
};

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const appError = normalizeError(err);
  const statusCode = appError.statusCode ?? mapErrorTypeToStatus(appError.type);

  logger.error({
    message: appError.message,
    type: appError.type,
    statusCode,
    url: req.originalUrl ?? req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    details: appError.details,
    stack: err instanceof Error ? err.stack : undefined,
  });

  const responseBody: Record<string, unknown> = {
    success: false,
    error: serializeError(appError),
  };

  if (process.env.NODE_ENV === 'development' && err instanceof Error) {
    responseBody.debug = {
      stack: err.stack,
      cause: (err as any).cause,
    };
  }

  res.status(statusCode).json(responseBody);
};

export const catchAsync = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const notFound = (req: Request, _res: Response, next: NextFunction): void => {
  next(AppError.notFound(`未找到路由 - ${req.originalUrl}`));
};
