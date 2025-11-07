import { Router } from 'express';
import { getMongoDBUri } from '@/config';

const router = Router();

/**
 * 健康检查路由
 * 提供服务健康状态检查
 */

// GET /health - 基础健康检查
router.get('/', async (req, res) => {
  try {
    // 检查数据库连接
    let dbStatus = 'disconnected';
    let dbResponseTime = 0;
    
    try {
      const startTime = Date.now();
      // 这里应该导入实际的数据库连接实例
      // 由于当前架构，我们做简单的连接检查
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
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

// GET /health/ready - 就绪检查
router.get('/ready', async (req, res) => {
  try {
    // 检查关键依赖是否就绪
    const checks = {
      database: false,
      environment: false,
    };

    // 检查数据库
    try {
      const mongoose = require('mongoose');
      checks.database = mongoose.connection.readyState === 1;
    } catch (error) {
      checks.database = false;
    }

    // 检查环境变量
    checks.environment = !!(process.env.MONGODB_URI && process.env.JWT_SECRET);

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