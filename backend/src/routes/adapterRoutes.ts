import express from 'express';
import type { NextFunction, Request, Response, Router } from 'express';
import adapterController from '@/controllers/adapterController';

const router: Router = express.Router();

// 数据库适配器路由 - PostgreSQL (使用 Drizzle ORM)

// 学生相关接口
router.get('/students', adapterController.getStudents);
router.post('/students', adapterController.addStudent);

// 交易记录接口
router.get('/transactions', adapterController.getTransactions);
// router.post('/transactions', adapterController.addTransaction); // 可在需要时添加

// 财务统计接口
router.get('/financial-stats', adapterController.getFinancialStats);

// 数据库健康检查接口
router.get('/health', adapterController.getHealthStatus);

// 适配器信息接口
router.get('/info', (_req: Request, res: Response, _next: NextFunction): void => {
  res.json({
    success: true,
    data: {
      adapter_version: '2.0.0',
      database_type: 'postgresql',
      supported_databases: ['postgresql'],
      orm: 'drizzle-orm',
      features: {
        postgresql: 'Full support with Drizzle ORM + pg connection pool',
      },
      endpoints: {
        students: {
          get: 'GET /adapter/students',
          post: 'POST /adapter/students',
        },
        transactions: {
          get: 'GET /adapter/transactions',
        },
        stats: {
          get: 'GET /adapter/financial-stats',
        },
        health: {
          get: 'GET /adapter/health',
        },
      },
    },
  });
});

export default router;