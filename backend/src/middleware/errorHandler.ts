import { Request, Response, NextFunction } from 'express';
import logger from '@/utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class AppError extends Error implements ApiError {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 错误处理中间件
export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err };
  error.message = err.message;

  // 记录错误日志
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Mongoose验证错误
  if (err.name === 'ValidationError') {
    const message = '数据验证失败';
    const details = Object.values((err as any).errors)
      .map((e: any) => e.message)
      .join(', ');
    error = new AppError(`${message}: ${details}`, 400);
  }

  // Mongoose重复键错误
  if (err.code === 11000) {
    const message = '数据已存在，请检查唯一性约束';
    error = new AppError(message, 409);
  }

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    const message = '无效的访问令牌';
    error = new AppError(message, 401);
  }

  // JWT过期错误
  if (err.name === 'TokenExpiredError') {
    const message = '访问令牌已过期';
    error = new AppError(message, 401);
  }

  // CastError - 当查询参数类型错误时
  if (err.name === 'CastError') {
    const message = '请求参数类型错误';
    error = new AppError(message, 400);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

// 异步错误捕获包装器
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404处理中间件
export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(`未找到路由 - ${req.originalUrl}`, 404);
  next(error);
};