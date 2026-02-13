import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet, { type HelmetOptions } from 'helmet';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import { config, type Config } from '@/config';
import { swaggerSpec } from '@/config/swagger';
import { errorHandler, notFound } from '@/middleware/errorHandler';
import { rateLimitMiddleware } from '@/middleware/rateLimiter';
import routes from '@/routes';
import logger from '@/utils/logger';

export interface AppConfig extends Partial<Config> {
  database?: {
    url?: string;
  };
}

const escapeYamlString = (value: string): string => {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
};

const toYamlString = (value: unknown, indent = 0): string => {
  const spacing = '  '.repeat(indent);

  if (value === null) {
    return 'null';
  }
  if (typeof value === 'string') {
    return escapeYamlString(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    return value.map((item) => {
      if (item === null || typeof item !== 'object') {
        return `${spacing}- ${toYamlString(item, indent + 1)}`;
      }
      return `${spacing}-\n${toYamlString(item, indent + 1)}`;
    }).join('\n');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return '{}';
    }
    return entries.map(([key, val]) => {
      const normalizedKey = /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(key) ? key : escapeYamlString(key);
      if (val === null || typeof val !== 'object' || Array.isArray(val) && val.length === 0) {
        return `${spacing}${normalizedKey}: ${toYamlString(val, indent + 1)}`;
      }
      return `${spacing}${normalizedKey}:\n${toYamlString(val, indent + 1)}`;
    }).join('\n');
  }

  return 'null';
};

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
  app.use(express.json({ limit: finalConfig.request?.bodyLimit || config.request.bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: finalConfig.request?.bodyLimit || config.request.bodyLimit }));

  // 请求日志记录
  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.info(`${req.method} ${req.url} - ${req.ip}`);
    next();
  });

  // 速率限制
  app.use(rateLimitMiddleware);

  // Swagger API 文档（非生产环境或显式启用时开放）
  const enableSwagger = finalConfig.server?.nodeEnv !== 'production' || process.env.ENABLE_SWAGGER === 'true';
  if (enableSwagger) {
    // Swagger UI - 交互式 API 文档
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'QMX API 文档',
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { font-size: 2em }
      `,
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'list',
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
      },
    }));

    // OpenAPI JSON 规范端点
    app.get('/api-docs.json', (req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });

    // OpenAPI YAML 规范端点（简单文本格式）
    app.get('/api-docs.yaml', (req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/yaml; charset=utf-8');
      res.send(toYamlString(swaggerSpec));
    });

    logger.info('📚 Swagger API 文档已启用: /api-docs');
  }

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
