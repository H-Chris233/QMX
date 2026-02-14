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

// 趋势分析验证规则
const trendsSchema = Joi.object({
  period: Joi.string()
    .valid('week', 'month', 'quarter', 'year')
    .default('month')
    .messages({
      'any.only': '无效的周期，支持: week, month, quarter, year',
    }),
  type: Joi.string()
    .valid('revenue', 'expense', 'students', 'installments')
    .default('revenue')
    .messages({
      'any.only': '无效的类型，支持: revenue, expense, students, installments',
    }),
});

/**
 * @openapi
 * /stats/trends:
 *   get:
 *     tags:
 *       - Stats
 *     summary: 获取趋势分析数据
 *     description: 获取指定周期和类型的趋势分析数据
 *     parameters:
 *       - name: period
 *         in: query
 *         description: 统计周期
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year]
 *           default: month
 *       - name: type
 *         in: query
 *         description: 统计类型
 *         schema:
 *           type: string
 *           enum: [revenue, expense, students, installments]
 *           default: revenue
 *     responses:
 *       200:
 *         description: 趋势分析数据
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
 *                     type:
 *                       type: string
 *                       description: 统计类型
 *                     period:
 *                       type: string
 *                       description: 统计周期
 *                     data_points:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           period:
 *                             type: string
 *                           value:
 *                             type: number
 *                           date:
 *                             type: string
 *                             format: date-time
 *                     total:
 *                       type: number
 *                     average:
 *                       type: number
 *                     max:
 *                       type: number
 *                     min:
 *                       type: number
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route GET /api/v1/stats/trends
 * @desc 获取趋势分析数据
 * @access Public
 */
router.get('/trends',
  validateQuery(trendsSchema),
  statsController.getTrendsData
);

/**
 * @openapi
 * /stats/course-distribution:
 *   get:
 *     tags:
 *       - Stats
 *     summary: 获取课程分布统计
 *     description: 获取学员按班级和科目的分布统计
 *     responses:
 *       200:
 *         description: 课程分布统计数据
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
 *                     class_distribution:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           count:
 *                             type: integer
 *                           percentage:
 *                             type: number
 *                     subject_distribution:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           count:
 *                             type: integer
 *                           percentage:
 *                             type: number
 *                     total_students:
 *                       type: integer
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route GET /api/v1/stats/course-distribution
 * @desc 获取课程分布统计
 * @access Public
 */
router.get('/course-distribution', statsController.getCourseDistribution);

/**
 * @openapi
 * /stats/score-distribution:
 *   get:
 *     tags:
 *       - Stats
 *     summary: 获取成绩分布统计
 *     description: 获取学员成绩的分布统计
 *     responses:
 *       200:
 *         description: 成绩分布统计数据
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
 *                     score_ranges:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           label:
 *                             type: string
 *                           min:
 *                             type: number
 *                           max:
 *                             type: number
 *                           count:
 *                             type: integer
 *                           percentage:
 *                             type: number
 *                     average_score:
 *                       type: number
 *                     total_scores:
 *                       type: integer
 *                     students_with_scores:
 *                       type: integer
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route GET /api/v1/stats/score-distribution
 * @desc 获取成绩分布统计
 * @access Public
 */
router.get('/score-distribution', statsController.getScoreDistribution);

/**
 * @openapi
 * /stats/overdue-installments:
 *   get:
 *     tags:
 *       - Stats
 *     summary: 获取逾期分期付款统计
 *     description: 获取所有逾期的分期付款详情和统计
 *     responses:
 *       200:
 *         description: 逾期分期付款统计数据
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
 *                     overdue_installments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           uid:
 *                             type: integer
 *                           plan_id:
 *                             type: integer
 *                           current_installment:
 *                             type: integer
 *                           installment_amount:
 *                             type: number
 *                           due_date:
 *                             type: string
 *                             format: date
 *                           days_overdue:
 *                             type: integer
 *                           overdue_amount:
 *                             type: number
 *                           plan:
 *                             type: object
 *                           student:
 *                             type: object
 *                     total_overdue_count:
 *                       type: integer
 *                     total_overdue_amount:
 *                       type: number
 *                     average_days_overdue:
 *                       type: integer
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route GET /api/v1/stats/overdue-installments
 * @desc 获取逾期分期付款统计
 * @access Public
 */
router.get('/overdue-installments', statsController.getOverdueInstallments);

export default router;
