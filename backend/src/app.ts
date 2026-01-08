import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet, { type HelmetOptions } from 'helmet';
import compression from 'compression';
import { config, type Config } from '@/config';
import { errorHandler, notFound } from '@/middleware/errorHandler';
import { rateLimitMiddleware } from '@/middleware/rateLimiter';
import routes from '@/routes';
import logger from '@/utils/logger';

export interface AppConfig extends Partial<Config> {
  database?: {
    url?: string;
  };
}

export const createApp = (appConfig: AppConfig = {}): Application => {
  const app: Application = express();

  // 使用传入的配置或默认配置
  const finalConfig = { ...config, ...appConfig };

  // 安全头部设置
  const helmetOptions: HelmetOptions = {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  };

  app.use(helmet(helmetOptions));

  // CORS配置
  app.use(cors({
    origin: finalConfig.server?.corsOrigin || config.server.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // 请求压缩
  app.use(compression());

  // 请求体解析
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 请求日志记录
  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.info(`${req.method} ${req.url} - ${req.ip}`);
    next();
  });

  // 速率限制
  app.use(rateLimitMiddleware);

  // 健康检查端点
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: finalConfig.server?.nodeEnv || config.server.nodeEnv,
    });
  });

  // 数据库健康检查端点
  app.get('/api/v1/health/db', async (req: Request, res: Response) => {
    try {
      const { testConnection } = await import('@/db');
      const success = await testConnection();

      res.json({
        success: true,
        data: {
          database_type: 'postgresql',
          connection_status: success ? 'connected' : 'disconnected',
          timestamp: new Date()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown database error'
      });
    }
  });

  // API路由
  app.use('/api/v1', (req: Request, _res: Response, next: NextFunction) => {
    logger.info(`API v1 ${req.method} ${req.url}`);
    next();
  }, routes);

  // 404处理
  app.use(notFound);

  // 错误处理（必须在最后）
  app.use(errorHandler);

  return app;
};

// 创建默认应用实例（用于生产环境）
const app = createApp();
export default app;