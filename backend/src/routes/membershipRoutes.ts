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
 * @route GET /api/v1/membership/stats
 * @desc 获取会员统计信息
 * @access Public
 */
router.get('/stats', membershipController.getMembershipStats);

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
 * @route DELETE /api/v1/students/:id/membership
 * @desc 清除学员会员信息
 * @access Public
 */
router.delete('/students/:id/membership', 
  validateParams(Joi.object({ id: commonValidations.id })),
  membershipController.clearStudentMembership
);

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