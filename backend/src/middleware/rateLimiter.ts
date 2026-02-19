import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { config } from '@/config';
import { AppError } from '@/utils/errors';

// 检查是否为测试环境
const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.TEST_DATA_CLEANUP === 'true';

// 测试环境：跳过速率限制
// 生产/开发环境：正常速率限制
const createRateLimiter = (points: number, duration: number) => {
  if (isTestEnvironment) {
    // 测试环境返回空的中间件
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      next();
    };
  }

  const limiter = new RateLimiterMemory({
    points,
    duration,
  });

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await limiter.consume(req.ip || 'unknown');
      return next();
    } catch (rejRes: any) {
      const msBeforeNext = Number(rejRes?.msBeforeNext);
      const secs = Number.isFinite(msBeforeNext)
        ? Math.max(1, Math.ceil(msBeforeNext / 1000))
        : 1;
      res.set('Retry-After', String(secs));

      return next(AppError.rateLimited(`请求过于频繁，请在 ${secs} 秒后重试`, {
        statusCode: 429,
        details: { retryAfterSeconds: secs },
      }));
    }
  };
};

// 创建速率限制器中间件
export const rateLimitMiddleware = createRateLimiter(
  config.rateLimit.maxRequests,
  config.rateLimit.windowMs / 1000, // 转换为秒
);

// API特定速率限制（更严格）
const apiRateLimitPoints = Number(
  process.env.API_RATE_LIMIT_MAX_REQUESTS
    || (config.server.nodeEnv === 'development' ? 300 : 60),
);
const apiRateLimitDurationSeconds = Number(process.env.API_RATE_LIMIT_WINDOW_SECONDS || 60);

export const apiRateLimitMiddleware = createRateLimiter(
  Number.isFinite(apiRateLimitPoints) && apiRateLimitPoints > 0 ? apiRateLimitPoints : 60,
  Number.isFinite(apiRateLimitDurationSeconds) && apiRateLimitDurationSeconds > 0 ? apiRateLimitDurationSeconds : 60,
);
