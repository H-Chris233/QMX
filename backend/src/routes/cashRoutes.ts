import Joi from 'joi';
import express from 'express';
import type { Router } from 'express';
import cashController from '@/controllers/cashController';
import { validate, validateParams, validateQuery, commonValidations } from '@/middleware/validation';
import { apiRateLimitMiddleware } from '@/middleware/rateLimiter';
import { PaymentFrequencyValues } from '@/types';

const router: Router = express.Router();

// 应用速率限制
router.use(apiRateLimitMiddleware);

// 验证规则
// 注意：不要使用 Joi.number().precision()，它会四舍五入导致“多于两位小数”的输入无法被拒绝。
// 统一复用 commonValidations.amount / commonValidations.optionalAmount 的自定义精度校验。
const amountSchema = commonValidations.amount;
const optionalAmountSchema = commonValidations.optionalAmount;

const addCashTransactionSchema = Joi.object({
  student_id: commonValidations.optionalId.allow(null),
  amount: amountSchema,
  note: commonValidations.text.default(''),
  is_installment: Joi.boolean().default(false),
});

const addInstallmentTransactionSchema = Joi.object({
  student_id: commonValidations.optionalId.allow(null),
  total_amount: commonValidations.amount,
  note: commonValidations.text.default(''),
  total_installments: Joi.number().integer().min(1).required().messages({
    'number.base': '总期数必须是数字',
    'number.integer': '总期数必须是整数',
    'number.min': '总期数至少为1',
    'any.required': '总期数不能为空',
  }),
  frequency: Joi.string().valid(...Object.values(PaymentFrequencyValues)).required().messages({
    'any.only': '无效的付款频率',
    'any.required': '付款频率不能为空',
  }),
  start_date: Joi.date().iso().required().messages({
    'date.format': '开始日期格式不正确',
    'any.required': '开始日期不能为空',
  }),
  due_date: Joi.date().iso().required().messages({
    'date.format': '到期日期格式不正确',
    'any.required': '到期日期不能为空',
  }),
  current_installment: Joi.number().integer().min(1).default(1),
  plan_id: commonValidations.optionalId,
  custom_days: Joi.number().integer().min(1).max(365).when('frequency', {
    is: PaymentFrequencyValues.CUSTOM,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
});

const searchCashSchema = Joi.object({
  student_id: commonValidations.optionalId.allow(null),
  min_amount: optionalAmountSchema,
  max_amount: optionalAmountSchema,
  has_installment: Joi.boolean().optional().allow(null),
  date_from: Joi.date().iso().optional().allow(null),
  date_to: Joi.date().iso().optional().allow(null),
  page: commonValidations.page,
  limit: commonValidations.limit,
  sort_by: Joi.string().valid('uid', 'student_id', 'cash', 'created_at', 'updated_at').default('created_at'),
  sort_order: commonValidations.sortOrder,
});

const updateTransactionSchema = Joi.object({
  amount: optionalAmountSchema,
  description: Joi.string().optional().allow(null),
  note: commonValidations.text.default(''),
});

// 路由定义
/**
 * @route GET /api/v1/transactions
 * @desc 获取所有交易记录（支持分页和筛选）
 * @access Public
 */
router.get('/', validateQuery(searchCashSchema), cashController.getAllTransactions);

/**
 * @route GET /api/v1/transactions/search
 * @desc 搜索现金记录
 * @access Public
 */
router.get('/search', validateQuery(searchCashSchema), cashController.searchCash);

/**
 * @route GET /api/v1/transactions/:id
 * @desc 获取交易详情
 * @access Public
 */
router.get('/:id', 
  validateParams(Joi.object({ id: commonValidations.id })),
  cashController.getTransactionById
);

/**
 * @route POST /api/v1/transactions
 * @desc 添加普通交易记录
 * @access Public
 */
router.post('/', 
  validate(addCashTransactionSchema),
  cashController.addCashTransaction
);

/**
 * @route POST /api/v1/transactions/installment
 * @desc 添加分期付款交易
 * @access Public
 */
router.post('/installment',
  validate(addInstallmentTransactionSchema),
  cashController.addInstallmentTransaction
);

/**
 * @route PUT /api/v1/transactions/:id
 * @desc 更新交易记录
 * @access Public
 */
router.put('/:id',
  validateParams(Joi.object({ id: commonValidations.id })),
  validate(updateTransactionSchema),
  cashController.updateTransaction
);

/**
 * @route DELETE /api/v1/transactions/:id
 * @desc 删除交易记录
 * @access Public
 */
router.delete('/:id', 
  validateParams(Joi.object({ id: commonValidations.id })),
  cashController.deleteCashTransaction
);

export default router;
