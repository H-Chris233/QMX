import Joi from 'joi';
import express from 'express';
import installmentController from '@/controllers/installmentController';
import { validate, validateParams, validateQuery, commonValidations } from '@/middleware/validation';
import { apiRateLimitMiddleware } from '@/middleware/rateLimiter';
import { InstallmentStatus } from '@/types';

const router = express.Router();

// 应用速率限制
router.use(apiRateLimitMiddleware);

// 验证规则
const updateInstallmentStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(InstallmentStatus)).required().messages({
    'any.only': '无效的分期付款状态',
    'any.required': '分期付款状态不能为空',
  }),
});

const generateNextInstallmentSchema = Joi.object({
  dueDate: Joi.date().iso().required().messages({
    'date.format': '到期日期格式不正确',
    'any.required': '到期日期不能为空',
  }),
});

const upcomingInstallmentsSchema = Joi.object({
  days: Joi.number().integer().min(1).max(365).default(7).messages({
    'number.base': '天数必须是数字',
    'number.integer': '天数必须是整数',
    'number.min': '天数至少为1',
    'number.max': '天数不能超过365',
  }),
});

// 路由定义
/**
 * @route GET /api/v1/installments/statuses
 * @desc 获取分期付款状态列表
 * @access Public
 */
router.get('/statuses', installmentController.getInstallmentStatuses);

/**
 * @route GET /api/v1/installments/upcoming
 * @desc 获取即将到期的分期
 * @access Public
 */
router.get('/upcoming', 
  validateQuery(upcomingInstallmentsSchema),
  installmentController.getUpcomingInstallments
);

/**
 * @route PUT /api/v1/installments/:transactionUid/status
 * @desc 更新分期付款状态
 * @access Public
 */
router.put('/:transactionUid/status', 
  validateParams(Joi.object({ 
    transactionUid: commonValidations.id,
  })),
  validate(updateInstallmentStatusSchema),
  installmentController.updateInstallmentStatus
);

/**
 * @route POST /api/v1/installments/:planId/next
 * @desc 生成下一期分期
 * @access Public
 */
router.post('/:planId/next', 
  validateParams(Joi.object({ planId: commonValidations.id })),
  validate(generateNextInstallmentSchema),
  installmentController.generateNextInstallment
);

/**
 * @route DELETE /api/v1/installments/:planId/cancel
 * @desc 取消分期计划
 * @access Public
 */
router.delete('/:planId/cancel', 
  validateParams(Joi.object({ planId: commonValidations.id })),
  installmentController.cancelInstallmentPlan
);

/**
 * @route GET /api/v1/installments/:planId
 * @desc 获取分期计划详情
 * @access Public
 */
router.get('/:planId', 
  validateParams(Joi.object({ planId: commonValidations.id })),
  installmentController.getInstallmentsByPlan
);

export default router;