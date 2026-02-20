import Joi from 'joi';
import express from 'express';
import type { Router } from 'express';
import installmentController from '@/controllers/installmentController';
import {
  validate,
  validateParams,
  validateQuery,
  commonValidations,
} from '@/middleware/validation';
import { apiRateLimitMiddleware } from '@/middleware/rateLimiter';
import {
  InstallmentStatusValues,
  PaymentFrequencyValues,
  InstallmentPlanStatusValues,
} from '@/types';

const router: Router = express.Router();

// 应用速率限制
router.use(apiRateLimitMiddleware);

// 验证规则
const createInstallmentPlanSchema = Joi.object({
  student_id: Joi.number().integer().min(1).required().messages({
    'number.min': '学员编号必须大于0',
    'any.required': '分期付款必须关联学员',
  }),
  total_amount: Joi.number().positive().required().messages({
    'number.positive': '总金额必须大于0',
    'any.required': '总金额不能为空',
  }),
  note: Joi.string().max(1000).default('').messages({
    'string.max': '备注长度不能超过1000字符',
  }),
  total_installments: Joi.number().integer().min(1).required().messages({
    'number.min': '总期数至少为1',
    'any.required': '总期数不能为空',
  }),
  frequency: Joi.string()
    .valid(...Object.values(PaymentFrequencyValues))
    .required()
    .messages({
      'any.only': '无效的付款频率',
      'any.required': '付款频率不能为空',
    }),
  custom_days: Joi.when('frequency', {
    is: PaymentFrequencyValues.CUSTOM,
    then: Joi.number().integer().min(1).required().messages({
      'number.base': '自定义天数必须是数字',
      'number.integer': '自定义天数必须是整数',
      'number.min': '自定义天数至少为1',
      'any.required': '自定义频率必须指定天数',
    }),
    otherwise: Joi.number().integer().min(1).optional().allow(null).messages({
      'number.base': '自定义天数必须是数字',
      'number.integer': '自定义天数必须是整数',
      'number.min': '自定义天数至少为1',
    }),
  }),
  start_date: Joi.date().iso().required().messages({
    'date.format': '开始日期格式不正确',
    'any.required': '开始日期不能为空',
  }),
});

const updateInstallmentStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(InstallmentStatusValues))
    .required()
    .messages({
      'any.only': '无效的分期付款状态',
      'any.required': '分期付款状态不能为空',
    }),
  amount: Joi.number().positive().optional().messages({
    'number.positive': '支付金额必须大于0',
  }),
});

const updateStatusSimpleSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(InstallmentStatusValues))
    .required()
    .messages({
      'any.only': '无效的分期付款状态',
      'any.required': '分期付款状态不能为空',
    }),
});

const upcomingInstallmentsSchema = Joi.object({
  days: Joi.number()
    .integer()
    .min(1)
    .max(90)
    .default(7)
    .messages({
      'number.base': '天数必须是数字',
      'number.integer': '天数必须是整数',
      'number.min': '天数至少为1',
      'number.max': '天数不能超过90',
    }),
});

const queryInstallmentSchema = Joi.object({
  page: commonValidations.page,
  limit: commonValidations.limit,
  sort_by: Joi.string()
    .valid('created_at', 'start_date', 'total_amount', 'status')
    .default('created_at'),
  sort_order: commonValidations.sortOrder,
  student_id: commonValidations.id.optional(),
  status: Joi.string()
    .valid(...Object.values(InstallmentPlanStatusValues))
    .optional(),
});

const updateInstallmentPlanSchema = Joi.object({
  note: Joi.string().max(1000).optional().allow('').messages({
    'string.max': '备注长度不能超过1000字符',
  }),
  status: Joi.string()
    .valid(...Object.values(InstallmentPlanStatusValues))
    .optional()
    .messages({
      'any.only': '无效的分期计划状态',
    }),
});

const recordPaymentSchema = Joi.object({
  installment_index: Joi.number().integer().min(1).optional(),
  paid_amount: Joi.number().positive().optional().messages({
    'number.positive': '支付金额必须大于0',
  }),
  paid_date: Joi.date().iso().optional(),
});

// 路由定义

/**
 * @openapi
 * /installments:
 *   get:
 *     tags:
 *       - Installments
 *     summary: 获取分期计划列表
 *     description: 获取所有分期计划，支持分页和筛选
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: student_id
 *         in: query
 *         description: 学员 ID
 *         schema:
 *           type: integer
 *       - name: status
 *         in: query
 *         description: 分期计划状态
 *         schema:
 *           type: string
 *           enum: [ACTIVE, COMPLETED, CANCELLED]
 *       - name: sort_by
 *         in: query
 *         schema:
 *           type: string
 *           enum: [created_at, start_date, total_amount, status]
 *           default: created_at
 *       - $ref: '#/components/parameters/OrderParam'
 *     responses:
 *       200:
 *         description: 分期计划列表
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
 *                     $ref: '#/components/schemas/InstallmentPlan'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route GET /api/v1/installments
 * @desc 获取所有分期计划
 * @access Public
 */
router.get(
  '/',
  validateQuery(queryInstallmentSchema),
  installmentController.getAllInstallmentPlans,
);

/**
 * @openapi
 * /installments/overdue:
 *   get:
 *     tags:
 *       - Installments
 *     summary: 获取逾期分期
 *     description: 获取所有已逾期的分期付款
 *     responses:
 *       200:
 *         description: 逾期分期列表
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
 *                     type: object
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route GET /api/v1/installments/overdue
 * @desc 获取逾期分期列表
 * @access Public
 */
router.get('/overdue', installmentController.getOverdueInstallments);

/**
 * @openapi
 * /installments/upcoming:
 *   get:
 *     tags:
 *       - Installments
 *     summary: 获取即将到期的分期
 *     description: 获取指定天数内即将到期的分期付款
 *     parameters:
 *       - name: days
 *         in: query
 *         description: 查询未来多少天内到期
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 90
 *           default: 7
 *     responses:
 *       200:
 *         description: 即将到期的分期列表
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
 *                     type: object
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route GET /api/v1/installments/upcoming
 * @desc 获取即将到期的分期
 * @access Public
 */
router.get(
  '/upcoming',
  validateQuery(upcomingInstallmentsSchema),
  installmentController.getUpcomingInstallments,
);

/**
 * @openapi
 * /installments/{id}/status:
 *   patch:
 *     tags:
 *       - Installments
 *     summary: 更新分期状态
 *     description: 更新分期付款状态
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, PAID, OVERDUE]
 *     responses:
 *       200:
 *         description: 更新成功
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route PATCH /api/v1/installments/:id/status
 * @desc 更新分期状态（简洁版）
 * @access Public
 */
router.patch(
  '/:id/status',
  validateParams(Joi.object({ id: commonValidations.id })),
  validate(updateStatusSimpleSchema),
  installmentController.updateInstallmentStatus,
);

/**
 * @openapi
 * /installments/{id}:
 *   get:
 *     tags:
 *       - Installments
 *     summary: 获取分期计划详情
 *     description: 根据 ID 获取单个分期计划的详细信息
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: 分期计划详情
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/InstallmentPlan'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route GET /api/v1/installments/:id
 * @desc 获取单个分期计划详情
 * @access Public
 */
router.get(
  '/:id',
  validateParams(Joi.object({ id: commonValidations.id })),
  installmentController.getInstallmentPlanById,
);

/**
 * @openapi
 * /installments:
 *   post:
 *     tags:
 *       - Installments
 *     summary: 创建分期计划
 *     description: 创建新的分期付款计划
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
 *               custom_days:
 *                 type: integer
 *                 description: 自定义频率天数
 *               start_date:
 *                 type: string
 *                 format: date
 *                 description: 开始日期
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
 *                   $ref: '#/components/schemas/InstallmentPlan'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route POST /api/v1/installments
 * @desc 创建分期计划
 * @access Public
 */
router.post(
  '/',
  validate(createInstallmentPlanSchema),
  installmentController.createInstallmentPlan,
);

/**
 * @openapi
 * /installments/{id}/payment:
 *   put:
 *     tags:
 *       - Installments
 *     summary: 更新分期付款状态
 *     description: 更新分期付款的支付状态
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, PAID, OVERDUE]
 *               amount:
 *                 type: number
 *                 description: 支付金额
 *     responses:
 *       200:
 *         description: 更新成功
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route PUT /api/v1/installments/:id/payment
 * @desc 更新分期付款状态
 * @access Public
 */
router.put(
  '/:id/payment',
  validateParams(Joi.object({ id: commonValidations.id })),
  validate(updateInstallmentStatusSchema),
  installmentController.updateInstallmentPayment,
);

/**
 * @openapi
 * /installments/{id}:
 *   put:
 *     tags:
 *       - Installments
 *     summary: 更新分期计划
 *     description: 更新分期计划信息
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
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
 *               note:
 *                 type: string
 *                 description: 备注
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: 更新成功
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route PUT /api/v1/installments/:id
 * @desc 更新分期计划
 * @access Public
 */
router.put(
  '/:id',
  validateParams(Joi.object({ id: commonValidations.id })),
  validate(updateInstallmentPlanSchema),
  installmentController.updateInstallmentPlan,
);

/**
 * @openapi
 * /installments/{id}/payments:
 *   post:
 *     tags:
 *       - Installments
 *     summary: 记录分期支付
 *     description: 记录分期计划的一次支付
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               installment_index:
 *                 type: integer
 *                 minimum: 1
 *                 description: 分期期数
 *               paid_amount:
 *                 type: number
 *                 description: 支付金额
 *               paid_date:
 *                 type: string
 *                 format: date
 *                 description: 支付日期
 *     responses:
 *       200:
 *         description: 记录成功
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route POST /api/v1/installments/:id/payments
 * @desc 记录分期支付
 * @access Public
 */
router.post(
  '/:id/payments',
  validateParams(Joi.object({ id: commonValidations.id })),
  validate(recordPaymentSchema),
  installmentController.recordPayment,
);

/**
 * @openapi
 * /installments/{id}/next:
 *   post:
 *     tags:
 *       - Installments
 *     summary: 支付下一期
 *     description: 支付分期计划的下一期
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: 支付成功
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route POST /api/v1/installments/:id/next
 * @desc 支付分期计划的下一期
 * @access Public
 */
router.post(
  '/:id/next',
  validateParams(Joi.object({ id: commonValidations.id })),
  installmentController.payNextInstallment,
);

/**
 * @openapi
 * /installments/{id}/cancel:
 *   post:
 *     tags:
 *       - Installments
 *     summary: 取消分期计划
 *     description: 取消指定的分期计划
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: 取消成功
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route POST /api/v1/installments/:id/cancel
 * @desc 取消分期计划
 * @access Public
 */
router.post(
  '/:id/cancel',
  validateParams(Joi.object({ id: commonValidations.id })),
  installmentController.cancelInstallmentPlan,
);

/**
 * @openapi
 * /installments/{id}:
 *   delete:
 *     tags:
 *       - Installments
 *     summary: 删除分期计划
 *     description: 删除指定的分期计划
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
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
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route DELETE /api/v1/installments/:id
 * @desc 删除分期计划
 * @access Public
 */
router.delete(
  '/:id',
  validateParams(Joi.object({ id: commonValidations.id })),
  installmentController.deleteInstallmentPlan,
);

export default router;
