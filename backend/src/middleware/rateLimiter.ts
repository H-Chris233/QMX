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
};

// 创建速率限制器中间件
export const rateLimitMiddleware = createRateLimiter(
  config.rateLimit.maxRequests,
  config.rateLimit.windowMs / 1000, // 转换为秒
);

// API特定速率限制（更严格）
export const apiRateLimitMiddleware = createRateLimiter(30, 60); // 30个请求/分钟