import express from 'express';
import adapterController from '@/controllers/adapterController';

const router = express.Router();

// 数据库适配器路由 - 统一的多数据库支持接口

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
router.get('/info', (req, res) => {
  res.json({
    success: true,
    data: {
      adapter_version: '1.0.0',
      supported_databases: ['mongodb', 'sqlite', 'postgresql'],
      features: {
        mongodb: 'Full support with Mongoose models',
        sqlite: 'Limited support (existing controllers)',
        postgresql: 'Limited support (existing controllers)'
      },
      endpoints: {
        students: {
          get: 'GET /adapter/students',
          post: 'POST /adapter/students'
        },
        transactions: {
          get: 'GET /adapter/transactions'
        },
        stats: {
          get: 'GET /adapter/financial-stats'
        },
        health: {
          get: 'GET /adapter/health'
        }
      }
    }
  });
});

export default router;