import { Request, Response, NextFunction } from 'express';
import { AppError, mapErrorTypeToStatus, serializeError, toAppError } from '@/utils/errors';
import logger from '@/utils/logger';

const buildMongooseValidationError = (err: any): AppError => {
  const details = Object.values(err.errors ?? {}).map((item: any) => item?.message ?? '').filter(Boolean);
  const message = details.length > 0 ? `数据验证失败: ${details.join(', ')}` : '数据验证失败';
  return AppError.invalidInput(message, {
    statusCode: 400,
    details: details.length > 0 ? details : undefined,
    cause: err instanceof Error ? err : undefined,
  });
};

const normalizeError = (err: unknown): AppError => {
  if (!err) {
    return AppError.other('服务器内部错误');
  }

  const candidate = err as Record<string, unknown> & { name?: string; code?: number; type?: string };

  if (candidate.name === 'ValidationError' && candidate.errors) {
    return buildMongooseValidationError(candidate);
  }

  if (candidate.code === 11000) {
    const duplicateKeys = (candidate as any).keyValue ?? undefined;
    return AppError.state('数据已存在，请检查唯一性约束', {
      statusCode: 409,
      details: duplicateKeys,
      cause: err instanceof Error ? err : undefined,
    });
  }

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

  if (candidate.name === 'CastError') {
    return AppError.invalidInput('请求参数类型错误', {
      statusCode: 400,
      cause: err instanceof Error ? err : undefined,
    });
  }

  if (candidate.type === 'entity.parse.failed') {
    return AppError.invalidInput('请求体解析失败，请检查数据格式', {
      statusCode: 400,
      cause: err instanceof Error ? err : undefined,
    });
  }

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
