import Joi from 'joi';
import express from 'express';
import type { Router } from 'express';
import membershipController from '@/controllers/membershipController';
import { validate, validateParams, commonValidations } from '@/middleware/validation';
import { apiRateLimitMiddleware } from '@/middleware/rateLimiter';

const router: Router = express.Router();

// 应用速率限制
router.use(apiRateLimitMiddleware);

// 验证规则
const setMembershipSchema = Joi.object({
  startDate: Joi.date().iso().optional().allow(null),
  endDate: Joi.date().iso().optional().allow(null),
});

const setMembershipByTypeSchema = Joi.object({
  membershipType: Joi.string().valid('month', 'year').required().messages({
    'any.only': '会员类型只能是 month 或 year',
    'any.required': '会员类型不能为空',
  }),
  startFromToday: Joi.boolean().default(true),
});

const renewMembershipSchema = Joi.object({
  membershipType: Joi.string().valid('month', 'year').required().messages({
    'any.only': '会员类型只能是 month 或 year',
    'any.required': '会员类型不能为空',
  }),
  extendFromCurrent: Joi.boolean().default(true),
});

const batchSetMembershipSchema = Joi.object({
  studentIds: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .max(100) // 限制最多处理100个学员
    .required()
    .messages({
      'array.min': '至少需要选择1个学员',
      'array.max': '最多只能选择100个学员',
      'any.required': '学员ID列表不能为空',
    }),
  // 方式一：按类型设置（月卡/年卡）
  membershipType: Joi.string().valid('month', 'year').optional().messages({
    'any.only': '会员类型只能是 month 或 year',
  }),
  startFromToday: Joi.boolean().default(true),
  // 方式二：自定义日期
  startDate: Joi.date().iso().optional().allow(null).messages({
    'date.format': '开始日期格式不正确',
  }),
  endDate: Joi.date().iso().optional().allow(null).messages({
    'date.format': '结束日期格式不正确',
  }),
}).or('membershipType', 'startDate').messages({
  'object.missing': '必须指定会员类型或自定义日期',
});

// 路由定义

/**
 * @openapi
 * /membership/stats:
 *   get:
 *     tags:
 *       - Membership
 *     summary: 获取会员统计
 *     description: 获取会员统计信息
 *     responses:
 *       200:
 *         description: 会员统计数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_members:
 *                       type: integer
 *                       description: 总会员数
 *                     active_members:
 *                       type: integer
 *                       description: 活跃会员数
 *                     expiring_soon:
 *                       type: integer
 *                       description: 即将到期会员数
 *                     expired:
 *                       type: integer
 *                       description: 已过期会员数
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route GET /api/v1/membership/stats
 * @desc 获取会员统计信息
 * @access Public
 */
router.get('/stats', membershipController.getMembershipStats);

/**
 * @openapi
 * /membership/batch:
 *   post:
 *     tags:
 *       - Membership
 *     summary: 批量设置会员
 *     description: 批量为多个学员设置会员（最多 100 个）
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentIds
 *             properties:
 *               studentIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 minItems: 1
 *                 maxItems: 100
 *                 description: 学员 ID 列表
 *               membershipType:
 *                 type: string
 *                 enum: [month, year]
 *                 description: 会员类型
 *               startFromToday:
 *                 type: boolean
 *                 default: true
 *                 description: 是否从今天开始
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: 自定义开始日期
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: 自定义结束日期
 *     responses:
 *       200:
 *         description: 批量设置成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     success_count:
 *                       type: integer
 *                     failed_count:
 *                       type: integer
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route POST /api/v1/membership/batch
 * @desc 批量设置会员
 * @access Public
 */
router.post('/batch', 
  validate(batchSetMembershipSchema),
  membershipController.batchSetMembership
);

/**
 * @openapi
 * /membership/students/{id}/membership:
 *   post:
 *     tags:
 *       - Membership
 *     summary: 设置学员会员
 *     description: 设置学员的会员信息
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 学员 UID
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: 会员开始日期
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: 会员结束日期
 *     responses:
 *       200:
 *         description: 设置成功
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route POST /api/v1/students/:id/membership
 * @desc 设置学员会员信息
 * @access Public
 */
router.post('/students/:id/membership', 
  validateParams(Joi.object({ id: commonValidations.id })),
  validate(setMembershipSchema),
  membershipController.setStudentMembership
);

/**
 * @openapi
 * /membership/students/{id}/membership:
 *   delete:
 *     tags:
 *       - Membership
 *     summary: 清除学员会员
 *     description: 清除学员的会员信息
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
 *         description: 清除成功
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route DELETE /api/v1/students/:id/membership
 * @desc 清除学员会员信息
 * @access Public
 */
router.delete('/students/:id/membership', 
  validateParams(Joi.object({ id: commonValidations.id })),
  membershipController.clearStudentMembership
);

/**
 * @openapi
 * /membership/students/{id}/membership/type:
 *   post:
 *     tags:
 *       - Membership
 *     summary: 按类型设置会员
 *     description: 按类型（月卡/年卡）设置学员会员
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 学员 UID
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - membershipType
 *             properties:
 *               membershipType:
 *                 type: string
 *                 enum: [month, year]
 *                 description: 会员类型
 *               startFromToday:
 *                 type: boolean
 *                 default: true
 *                 description: 是否从今天开始
 *     responses:
 *       200:
 *         description: 设置成功
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route POST /api/v1/students/:id/membership/type
 * @desc 按类型设置会员（月卡/年卡）
 * @access Public
 */
router.post('/students/:id/membership/type', 
  validateParams(Joi.object({ id: commonValidations.id })),
  validate(setMembershipByTypeSchema),
  membershipController.setMembershipByType
);

/**
 * @openapi
 * /membership/students/{id}/membership/renew:
 *   post:
 *     tags:
 *       - Membership
 *     summary: 续费会员
 *     description: 续费学员的会员
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 学员 UID
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - membershipType
 *             properties:
 *               membershipType:
 *                 type: string
 *                 enum: [month, year]
 *                 description: 续费类型
 *               extendFromCurrent:
 *                 type: boolean
 *                 default: true
 *                 description: 是否从当前到期日期延续
 *     responses:
 *       200:
 *         description: 续费成功
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route POST /api/v1/students/:id/membership/renew
 * @desc 续费会员
 * @access Public
 */
router.post('/students/:id/membership/renew', 
  validateParams(Joi.object({ id: commonValidations.id })),
  validate(renewMembershipSchema),
  membershipController.renewMembership
);

export default router;