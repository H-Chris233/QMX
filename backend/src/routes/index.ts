import express from 'express';
import studentRoutes from '@/routes/studentRoutes';
import scoreRoutes from '@/routes/scoreRoutes';
import cashRoutes from '@/routes/cashRoutes';
import installmentRoutes from '@/routes/installmentRoutes';
import statsRoutes from '@/routes/statsRoutes';
import membershipRoutes from '@/routes/membershipRoutes';

const router = express.Router();

// API版本信息
router.get('/', (req, res) => {
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
      dashboard: '/dashboard',
    },
    documentation: '/docs',
    health: '/health',
  });
});

// 注册路由模块
router.use('/students', studentRoutes);
router.use('/', scoreRoutes); // 成绩路由使用 /students/:id/scores 格式
router.use('/transactions', cashRoutes);
router.use('/installments', installmentRoutes);
router.use('/membership', membershipRoutes);
router.use('/dashboard', statsRoutes);

export default router;