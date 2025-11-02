import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from '@/config';
import { errorHandler, notFound } from '@/middleware/errorHandler';
import { rateLimitMiddleware } from '@/middleware/rateLimiter';
import logger from '@/utils/logger';

const app = express();

// 安全头部设置
app.use(helmet({
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
}));

// CORS配置
app.use(cors({
  origin: config.server.corsOrigin,
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
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - ${req.ip}`);
  next();
});

// 速率限制
app.use(rateLimitMiddleware);

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.server.nodeEnv,
  });
});

// 数据库健康检查端点
app.get('/api/v1/health/db', async (req, res) => {
  try {
    const { isUsingMongoDB } = await import('@/config/database');
    
    if (isUsingMongoDB()) {
      const { checkMongoHealth } = await import('@/models/mongo');
      const health = await checkMongoHealth();
      
      res.json({
        success: true,
        data: {
          database_type: 'mongodb',
          connection_status: health.status,
          details: health.details,
          timestamp: new Date()
        }
      });
    } else {
      // SQL数据库健康检查
      const { sequelize } = await import('@/config/database');
      await sequelize.authenticate();
      
      res.json({
        success: true,
        data: {
          database_type: 'sql',
          connection_status: 'healthy',
          details: { dialect: sequelize.getDialect() },
          timestamp: new Date()
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown database error'
    });
  }
});

// API路由
import routes from '@/routes';

app.use('/api/v1', (req, res, next) => {
  logger.info(`API v1 ${req.method} ${req.url}`);
  next();
}, routes);

// 404处理
app.use(notFound);

// 错误处理（必须在最后）
app.use(errorHandler);

export default app;