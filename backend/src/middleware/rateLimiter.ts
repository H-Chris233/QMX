import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { config } from '@/config';
import { AppError } from '@/utils/errors';

// 创建速率限制器
const rateLimiter = new RateLimiterMemory({
  points: config.rateLimit.maxRequests,
  duration: config.rateLimit.windowMs / 1000, // 转换为秒
});

// 速率限制中间件
export const rateLimitMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await rateLimiter.consume(req.ip || 'unknown');
    next();
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));

    throw AppError.rateLimited(`请求过于频繁，请在 ${secs} 秒后重试`, {
      statusCode: 429,
      details: { retryAfterSeconds: secs },
    });
  }
};

// API特定速率限制（更严格）
const apiRateLimiter = new RateLimiterMemory({
  points: 30, // 每个窗口30个请求
  duration: 60, // 1分钟
});

export const apiRateLimitMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await apiRateLimiter.consume(req.ip || 'unknown');
    next();
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));

    throw AppError.rateLimited(`API请求过于频繁，请在 ${secs} 秒后重试`, {
      statusCode: 429,
      details: { retryAfterSeconds: secs },
    });
  }
};