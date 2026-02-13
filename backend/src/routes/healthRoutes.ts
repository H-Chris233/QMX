import { Router } from 'express';
import { testConnection } from '@/db';

const router = Router();

/**
 * 健康检查路由
 * 提供服务健康状态检查
 */

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: 综合健康检查
 *     description: 检查服务和数据库连接状态，返回详细的健康信息
 *     responses:
 *       200:
 *         description: 服务健康
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 *       503:
 *         description: 服务降级或不健康
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [degraded, unhealthy]
 *                   example: degraded
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 error:
 *                   type: string
 */
// GET /health - 基础健康检查
router.get('/', async (req, res) => {
  try {
    // 检查数据库连接
    let dbStatus = 'disconnected';
    let dbResponseTime = 0;

    try {
      const startTime = Date.now();
      const success = await testConnection();
      if (success) {
        dbStatus = 'connected';
        dbResponseTime = Date.now() - startTime;
      }
    } catch (error) {
      dbStatus = 'error';
    }

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      database: 'postgresql',
      services: {
        database: {
          status: dbStatus,
          responseTime: dbResponseTime,
        },
        api: {
          status: 'healthy',
          responseTime: 0,
        },
      },
    };

    // 如果数据库连接有问题，标记为不健康
    if (dbStatus !== 'connected') {
      healthStatus.status = 'degraded';
    }

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

/**
 * @openapi
 * /health/ready:
 *   get:
 *     tags:
 *       - Health
 *     summary: 就绪检查
 *     description: 检查服务是否已准备好接收请求（Kubernetes readiness probe）
 *     responses:
 *       200:
 *         description: 服务就绪
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ready:
 *                   type: boolean
 *                   example: true
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 checks:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: boolean
 *                       example: true
 *                     environment:
 *                       type: boolean
 *                       example: true
 *       503:
 *         description: 服务未就绪
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ready:
 *                   type: boolean
 *                   example: false
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 checks:
 *                   type: object
 */
// GET /health/ready - 就绪检查
router.get('/ready', async (req, res) => {
  try {
    // 检查关键依赖是否就绪
    const checks = {
      database: false,
      environment: false,
    };

    // 检查数据库（PostgreSQL）
    try {
      checks.database = await testConnection();
    } catch (error) {
      checks.database = false;
    }

    // 检查环境变量
    checks.environment = !!(process.env.DATABASE_URL && process.env.JWT_SECRET);

    const allReady = Object.values(checks).every(check => check === true);

    const response = {
      ready: allReady,
      timestamp: new Date().toISOString(),
      checks,
    };

    res.status(allReady ? 200 : 503).json(response);
  } catch (error) {
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

/**
 * @openapi
 * /health/live:
 *   get:
 *     tags:
 *       - Health
 *     summary: 存活检查
 *     description: 简单的存活检查，只要进程在运行就返回 200（Kubernetes liveness probe）
 *     responses:
 *       200:
 *         description: 服务存活
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alive:
 *                   type: boolean
 *                   example: true
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: 服务运行时间（秒）
 *                   example: 3600
 *                 pid:
 *                   type: integer
 *                   description: 进程 ID
 *                   example: 12345
 */
// GET /health/live - 存活检查
router.get('/live', (req, res) => {
  // 简单的存活检查 - 只要进程在运行就返回200
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    pid: process.pid,
  });
});

export default router;