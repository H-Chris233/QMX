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
    .valid('Today', 'ThisWeek', 'ThisMonth', 'ThisYear', 'All')
    .default('ThisMonth')
    .messages({
      'any.only': '无效的统计周期，支持: Today, ThisWeek, ThisMonth, ThisYear, All',
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
 * @openapi
 * /stats/dashboard:
 *   get:
 *     tags:
 *       - Stats
 *     summary: 获取仪表板统计
 *     description: 获取仪表板概览统计数据，包括学员数量、收入等核心指标
 *     responses:
 *       200:
 *         description: 仪表板统计数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DashboardStats'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route GET /api/v1/stats/dashboard
 * @desc 获取仪表板统计数据
 * @access Public
 */
router.get('/dashboard', statsController.getDashboardStats);

/**
 * @openapi
 * /stats/financial:
 *   get:
 *     tags:
 *       - Stats
 *     summary: 获取财务统计（已废弃）
 *     description: |
 *       **已废弃** - 请使用 `/stats/global-financial-stats`
 *
 *       获取财务统计数据，支持周期选择
 *     deprecated: true
 *     parameters:
 *       - name: period
 *         in: query
 *         description: 统计周期
 *         schema:
 *           type: string
 *           enum: [Today, ThisWeek, ThisMonth, ThisYear, All]
 *           default: ThisMonth
 *     responses:
 *       200:
 *         description: 财务统计数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_income_cents:
 *                       type: integer
 *                       description: 总收入（分）
 *                     total_expense_cents:
 *                       type: integer
 *                       description: 总支出（分）
 *                     net_income_cents:
 *                       type: integer
 *                       description: 净收入（分）
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route GET /api/v1/stats/financial
 * @desc 获取财务统计（支持周期选择，已废弃，使用 /stats/global-financial-stats）
 * @access Public
 * @deprecated 请使用 /stats/global-financial-stats
 */
router.get('/financial',
  validateQuery(financialStatsSchema),
  statsController.getFinancialStats
);

/**
 * @openapi
 * /stats/global-student-stats:
 *   get:
 *     tags:
 *       - Stats
 *     summary: 获取全局学员统计
 *     description: 获取系统全局的学员统计数据
 *     responses:
 *       200:
 *         description: 学员统计数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_students:
 *                       type: integer
 *                       description: 总学员数
 *                     students_with_scores:
 *                       type: integer
 *                       description: 有成绩学员数
 *                     average_score:
 *                       type: number
 *                       description: 平均分
 *                     max_score:
 *                       type: number
 *                       description: 最高分
 *                     active_courses:
 *                       type: integer
 *                       description: 活跃课程数
 *                     active_members:
 *                       type: integer
 *                       description: 活跃会员数
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route GET /api/v1/stats/global-student-stats
 * @desc 获取全局学员统计
 * @access Public
 */
router.get('/global-student-stats', statsController.getGlobalStudentStats);

/**
 * @openapi
 * /stats/global-financial-stats:
 *   get:
 *     tags:
 *       - Stats
 *     summary: 获取全局财务统计
 *     description: 获取系统全局的财务统计数据
 *     responses:
 *       200:
 *         description: 财务统计数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_income:
 *                       type: number
 *                       description: 总收入（元）
 *                     total_expense:
 *                       type: number
 *                       description: 总支出（元）
 *                     net_income:
 *                       type: number
 *                       description: 净收入（元）
 *                     is_profitable:
 *                       type: boolean
 *                       description: 是否盈利
 *                     transaction_count:
 *                       type: integer
 *                       description: 交易数
 *                     installment_pending:
 *                       type: number
 *                       description: 分期待收（元）
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route GET /api/v1/stats/global-financial-stats
 * @desc 获取全局财务统计
 * @access Public
 */
router.get('/global-financial-stats', statsController.getGlobalFinancialStats);

/**
 * @openapi
 * /stats/membership-expiring:
 *   get:
 *     tags:
 *       - Stats
 *     summary: 获取即将到期的会员
 *     description: 获取指定天数内即将到期的会员列表
 *     parameters:
 *       - name: days
 *         in: query
 *         description: 查询未来多少天内到期的会员
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 30
 *     responses:
 *       200:
 *         description: 即将到期的会员列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       uid:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       class:
 *                         type: string
 *                       subject:
 *                         type: string
 *                       membership_end_date:
 *                         type: string
 *                         format: date
 *                       days_remaining:
 *                         type: integer
 *                       is_membership_active:
 *                         type: boolean
 *                       membership_status:
 *                         type: string
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route GET /api/v1/stats/membership-expiring
 * @desc 获取即将到期的会员
 * @access Public
 */
router.get('/membership-expiring',
  validateQuery(membershipExpiringSchema),
  statsController.getMembershipExpiringSoon
);

/**
 * @openapi
 * /stats/students/{id}:
 *   get:
 *     tags:
 *       - Stats
 *     summary: 获取学员统计
 *     description: 获取特定学员的统计信息
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 学员 UID
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: 学员统计数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     student_uid:
 *                       type: integer
 *                       description: 学员 UID
 *                     payments:
 *                       type: object
 *                       properties:
 *                         total_amount_cents:
 *                           type: integer
 *                           description: 总支付金额（分）
 *                         count:
 *                           type: integer
 *                           description: 支付记录数
 *                     scores:
 *                       type: object
 *                       properties:
 *                         average:
 *                           type: number
 *                         max:
 *                           type: number
 *                         min:
 *                           type: number
 *                         count:
 *                           type: integer
 *                     membership:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                         status_code:
 *                           type: string
 *                         is_active:
 *                           type: boolean
 *                         days_remaining:
 *                           type: integer
 *                         days_until_start:
 *                           type: integer
 *                     installments:
 *                       type: object
 *                       properties:
 *                         total_amount_cents:
 *                           type: integer
 *                         paid_amount_cents:
 *                           type: integer
 *                         pending_amount_cents:
 *                           type: integer
 *                         pending_count:
 *                           type: integer
 *                         remaining_amount_cents:
 *                           type: integer
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route GET /api/v1/stats/students/:id
 * @desc 获取特定学员的统计信息
 * @access Public
 */
router.get('/students/:id',
  validateParams(Joi.object({ id: commonValidations.id })),
  statsController.getStudentStats
);

/**
 * @route GET /api/v1/stats/student/:id
 * @desc 获取特定学员的统计信息（别名路由）
 * @access Public
 */
router.get('/student/:id',
  validateParams(Joi.object({ id: commonValidations.id })),
  statsController.getStudentStats
);

export default router;
