import express from 'express';
import type { NextFunction, Request, Response, Router } from 'express';
import studentRoutes from '@/routes/studentRoutes';
import scoreRoutes from '@/routes/scoreRoutes';
import cashRoutes from '@/routes/cashRoutes';
import installmentRoutes from '@/routes/installmentRoutes';
import statsRoutes from '@/routes/statsRoutes';
import membershipRoutes from '@/routes/membershipRoutes';
import adapterRoutes from '@/routes/adapterRoutes';
import authRoutes from '@/routes/authRoutes';
import testRoutes from '@/routes/testRoutes';
import healthRoutes from '@/routes/healthRoutes';

const router: Router = express.Router();

// API版本信息
router.get('/', (_req: Request, res: Response, _next: NextFunction): void => {
  res.json({
    name: 'QMX Backend API',
    version: '1.0.0',
    description: '启明星学生管理系统后端API',
    endpoints: {
      students: '/students',
      scores: '/scores',
      transactions: '/transactions',
      installments: '/installments',
      membership: '/membership',
      stats: '/stats',
      adapter: '/adapter', // 数据库适配器路由
      health: '/health',
    },
    documentation: '/api-docs',
  });
});

// 注册路由模块
router.use('/students', studentRoutes);
router.use('/', scoreRoutes); // 成绩路由使用 /students/:id/scores 格式
router.use('/transactions', cashRoutes);
router.use('/installments', installmentRoutes);
router.use('/membership', membershipRoutes);
router.use('/stats', statsRoutes); // 统计API（移除了冗余的 /dashboard 挂载）
router.use('/adapter', adapterRoutes); // 数据库适配器路由
router.use('/auth', authRoutes); // 简单密码认证路由
router.use('/health', healthRoutes); // 健康检查路由

// 测试路由 - 仅在测试环境启用
if (process.env.NODE_ENV === 'test' || process.env.TEST_DATA_CLEANUP === 'true') {
  router.use('/test', testRoutes);
}

export default router;
