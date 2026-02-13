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
 * @openapi
 * /transactions:
 *   get:
 *     tags:
 *       - Transactions
 *     summary: 获取交易列表
 *     description: 获取所有交易记录，支持分页和筛选
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: student_id
 *         in: query
 *         description: 学员 ID
 *         schema:
 *           type: integer
 *       - name: min_amount
 *         in: query
 *         description: 最小金额
 *         schema:
 *           type: number
 *       - name: max_amount
 *         in: query
 *         description: 最大金额
 *         schema:
 *           type: number
 *       - name: has_installment
 *         in: query
 *         description: 是否为分期交易
 *         schema:
 *           type: boolean
 *       - name: date_from
 *         in: query
 *         description: 开始日期
 *         schema:
 *           type: string
 *           format: date
 *       - name: date_to
 *         in: query
 *         description: 结束日期
 *         schema:
 *           type: string
 *           format: date
 *       - name: sort_by
 *         in: query
 *         description: 排序字段
 *         schema:
 *           type: string
 *           enum: [uid, student_id, cash, created_at, updated_at]
 *           default: created_at
 *       - $ref: '#/components/parameters/OrderParam'
 *     responses:
 *       200:
 *         description: 交易列表
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
 *                     $ref: '#/components/schemas/Transaction'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route GET /api/v1/transactions
 * @desc 获取所有交易记录（支持分页和筛选）
 * @access Public
 */
router.get('/', validateQuery(searchCashSchema), cashController.getAllTransactions);

/**
 * @openapi
 * /transactions/search:
 *   get:
 *     tags:
 *       - Transactions
 *     summary: 搜索交易记录
 *     description: 使用多种条件搜索交易记录
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: student_id
 *         in: query
 *         schema:
 *           type: integer
 *       - name: min_amount
 *         in: query
 *         schema:
 *           type: number
 *       - name: max_amount
 *         in: query
 *         schema:
 *           type: number
 *       - name: has_installment
 *         in: query
 *         schema:
 *           type: boolean
 *       - name: date_from
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: date_to
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: 搜索结果
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route GET /api/v1/transactions/search
 * @desc 搜索现金记录
 * @access Public
 */
router.get('/search', validateQuery(searchCashSchema), cashController.searchCash);

/**
 * @openapi
 * /transactions/{id}:
 *   get:
 *     tags:
 *       - Transactions
 *     summary: 获取交易详情
 *     description: 根据 ID 获取单个交易记录详情
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 交易 UID
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: 交易详情
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Transaction'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
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
 * @openapi
 * /transactions:
 *   post:
 *     tags:
 *       - Transactions
 *     summary: 添加交易记录
 *     description: 添加普通交易记录
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               student_id:
 *                 type: integer
 *                 description: 学员 ID（可选）
 *               amount:
 *                 type: number
 *                 description: 金额
 *                 example: 100.00
 *               note:
 *                 type: string
 *                 description: 备注
 *               is_installment:
 *                 type: boolean
 *                 default: false
 *                 description: 是否为分期交易
 *     responses:
 *       201:
 *         description: 创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Transaction'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
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
 * @openapi
 * /transactions/installment:
 *   post:
 *     tags:
 *       - Transactions
 *     summary: 添加分期交易
 *     description: 添加分期付款交易记录
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - total_amount
 *               - total_installments
 *               - frequency
 *               - start_date
 *               - due_date
 *             properties:
 *               student_id:
 *                 type: integer
 *                 description: 学员 ID
 *               total_amount:
 *                 type: number
 *                 description: 总金额
 *               note:
 *                 type: string
 *                 description: 备注
 *               total_installments:
 *                 type: integer
 *                 minimum: 1
 *                 description: 分期总期数
 *               frequency:
 *                 type: string
 *                 enum: [MONTHLY, WEEKLY, BIWEEKLY, CUSTOM]
 *                 description: 付款频率
 *               start_date:
 *                 type: string
 *                 format: date
 *                 description: 开始日期
 *               due_date:
 *                 type: string
 *                 format: date
 *                 description: 到期日期
 *               current_installment:
 *                 type: integer
 *                 default: 1
 *                 description: 当前期数
 *               plan_id:
 *                 type: integer
 *                 description: 分期计划 ID
 *               custom_days:
 *                 type: integer
 *                 description: 自定义频率天数（frequency 为 CUSTOM 时必填）
 *     responses:
 *       201:
 *         description: 创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Transaction'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
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
 * @openapi
 * /transactions/{id}:
 *   put:
 *     tags:
 *       - Transactions
 *     summary: 更新交易记录
 *     description: 更新指定交易记录
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 交易 UID
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 description: 金额
 *               description:
 *                 type: string
 *                 description: 描述
 *               note:
 *                 type: string
 *                 description: 备注
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Transaction'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
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
 * @openapi
 * /transactions/{id}:
 *   delete:
 *     tags:
 *       - Transactions
 *     summary: 删除交易记录
 *     description: 删除指定的交易记录
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 交易 UID
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: 交易记录删除成功
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
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
