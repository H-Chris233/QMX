import Joi from 'joi';
import express from 'express';
import type { Router } from 'express';
import statsController from '@/controllers/statsController';
import { validateParams, validateQuery, commonValidations } from '@/middleware/validation';
import { apiRateLimitMiddleware } from '@/middleware/rateLimiter';

const router: Router = express.Router();

// 应用速率限制
router.use(apiRateLimitMiddleware);

// 验证规则
const financialStatsSchema = Joi.object({
  period: Joi.string()
    .valid('Today', 'ThisWeek', 'ThisMonth', 'ThisYear')
    .default('ThisMonth')
    .messages({
      'any.only': '无效的统计周期，支持: Today, ThisWeek, ThisMonth, ThisYear',
    }),
});

const membershipExpiringSchema = Joi.object({
  days: Joi.number()
    .integer()
    .min(1)
    .max(365)
    .default(30)
    .messages({
      'number.base': '天数必须是数字',
      'number.integer': '天数必须是整数',
      'number.min': '天数至少为1',
      'number.max': '天数不能超过365',
    }),
});

// 路由定义
/**
 * @route GET /api/v1/dashboard/stats
 * @desc 获取仪表板统计数据
 * @access Public
 */
router.get('/stats', statsController.getDashboardStats);

/**
 * @route GET /api/v1/dashboard/financial-stats
 * @desc 获取财务统计（支持周期选择）
 * @access Public
 */
router.get('/financial-stats',
  validateQuery(financialStatsSchema),
  statsController.getFinancialStats
);

/**
 * @route GET /api/v1/stats/financial
 * @desc 获取财务统计（支持周期选择）- 别名路由
 * @access Public
 */
router.get('/financial',
  validateQuery(financialStatsSchema),
  statsController.getFinancialStats
);

/**
 * @route GET /api/v1/dashboard/global-student-stats
 * @desc 获取全局学员统计
 * @access Public
 */
router.get('/global-student-stats', statsController.getGlobalStudentStats);

/**
 * @route GET /api/v1/dashboard/global-financial-stats
 * @desc 获取全局财务统计
 * @access Public
 */
router.get('/global-financial-stats', statsController.getGlobalFinancialStats);

/**
 * @route GET /api/v1/dashboard/membership-expiring
 * @desc 获取即将到期的会员
 * @access Public
 */
router.get('/membership-expiring', 
  validateQuery(membershipExpiringSchema),
  statsController.getMembershipExpiringSoon
);

/**
 * @route GET /api/v1/dashboard/students/:id/stats
 * @desc 获取特定学员的统计信息
 * @access Public
 */
router.get('/students/:id/stats', 
  validateParams(Joi.object({ id: commonValidations.id })),
  statsController.getStudentStats
);

export default router;