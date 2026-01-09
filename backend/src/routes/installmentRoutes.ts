import Joi from "joi";
import express from "express";
import type { Router } from "express";
import installmentController from "@/controllers/installmentController";
import {
  validate,
  validateParams,
  validateQuery,
  commonValidations,
} from "@/middleware/validation";
import { apiRateLimitMiddleware } from "@/middleware/rateLimiter";
import {
  InstallmentStatusValues,
  PaymentFrequencyValues,
  InstallmentPlanStatusValues,
} from "@/types";

const router: Router = express.Router();

// 应用速率限制
router.use(apiRateLimitMiddleware);

// 验证规则
const createInstallmentPlanSchema = Joi.object({
  student_id: Joi.number().integer().min(1).optional().allow(null),
  total_amount: Joi.number().positive().required().messages({
    "number.positive": "总金额必须大于0",
    "any.required": "总金额不能为空",
  }),
  note: Joi.string().max(1000).default("").messages({
    "string.max": "备注长度不能超过1000字符",
  }),
  total_installments: Joi.number().integer().min(1).required().messages({
    "number.min": "总期数至少为1",
    "any.required": "总期数不能为空",
  }),
  frequency: Joi.string()
    .valid(...Object.values(PaymentFrequencyValues))
    .required()
    .messages({
      "any.only": "无效的付款频率",
      "any.required": "付款频率不能为空",
    }),
  custom_days: Joi.number()
    .integer()
    .min(1)
    .when("frequency", {
      is: PaymentFrequencyValues.CUSTOM,
      then: Joi.required().messages({
        "any.required": "自定义频率必须指定天数",
      }),
      otherwise: Joi.optional(),
    }),
  start_date: Joi.date().iso().required().messages({
    "date.format": "开始日期格式不正确",
    "any.required": "开始日期不能为空",
  }),
});

const updateInstallmentStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(InstallmentStatusValues))
    .required()
    .messages({
      "any.only": "无效的分期付款状态",
      "any.required": "分期付款状态不能为空",
    }),
  amount: Joi.number().positive().optional().messages({
    "number.positive": "支付金额必须大于0",
  }),
});

const updateStatusSimpleSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(InstallmentStatusValues))
    .required()
    .messages({
      "any.only": "无效的分期付款状态",
      "any.required": "分期付款状态不能为空",
    }),
});

const upcomingInstallmentsSchema = Joi.object({
  days: Joi.number()
    .integer()
    .min(1)
    .max(90)
    .default(7)
    .messages({
      "number.base": "天数必须是数字",
      "number.integer": "天数必须是整数",
      "number.min": "天数至少为1",
      "number.max": "天数不能超过90",
    }),
});

const queryInstallmentSchema = Joi.object({
  page: commonValidations.page,
  limit: commonValidations.limit,
  sort_by: Joi.string()
    .valid("created_at", "start_date", "total_amount", "status")
    .default("created_at"),
  sort_order: commonValidations.sortOrder,
  student_id: commonValidations.id.optional(),
  status: Joi.string()
    .valid(...Object.values(InstallmentPlanStatusValues))
    .optional(),
});

const updateInstallmentPlanSchema = Joi.object({
  note: Joi.string().max(1000).optional().allow("").messages({
    "string.max": "备注长度不能超过1000字符",
  }),
  status: Joi.string()
    .valid(...Object.values(InstallmentPlanStatusValues))
    .optional()
    .messages({
      "any.only": "无效的分期计划状态",
    }),
});

const recordPaymentSchema = Joi.object({
  installment_index: Joi.number().integer().min(1).optional(),
  paid_amount: Joi.number().positive().optional().messages({
    "number.positive": "支付金额必须大于0",
  }),
  paid_date: Joi.date().iso().optional(),
});

// 路由定义
/**
 * @route GET /api/v1/installments
 * @desc 获取所有分期计划
 * @access Public
 */
router.get(
  "/",
  validateQuery(queryInstallmentSchema),
  installmentController.getAllInstallmentPlans
);

/**
 * @route GET /api/v1/installments/overdue
 * @desc 获取逾期分期列表
 * @access Public
 */
router.get("/overdue", installmentController.getOverdueInstallments);

/**
 * @route GET /api/v1/installments/upcoming
 * @desc 获取即将到期的分期
 * @access Public
 */
router.get(
  "/upcoming",
  validateQuery(upcomingInstallmentsSchema),
  installmentController.getUpcomingInstallments
);

/**
 * @route PATCH /api/v1/installments/:id/status
 * @desc 更新分期状态（简洁版）
 * @access Public
 */
router.patch(
  "/:id/status",
  validateParams(Joi.object({ id: commonValidations.id })),
  validate(updateStatusSimpleSchema),
  installmentController.updateInstallmentStatus
);

/**
 * @route GET /api/v1/installments/:id
 * @desc 获取单个分期计划详情
 * @access Public
 */
router.get(
  "/:id",
  validateParams(Joi.object({ id: commonValidations.id })),
  installmentController.getInstallmentPlanById
);

/**
 * @route POST /api/v1/installments
 * @desc 创建分期计划
 * @access Public
 */
router.post(
  "/",
  validate(createInstallmentPlanSchema),
  installmentController.createInstallmentPlan
);

/**
 * @route PUT /api/v1/installments/:id/payment
 * @desc 更新分期付款状态
 * @access Public
 */
router.put(
  "/:id/payment",
  validateParams(Joi.object({ id: commonValidations.id })),
  validate(updateInstallmentStatusSchema),
  installmentController.updateInstallmentPayment
);

/**
 * @route PUT /api/v1/installments/:id
 * @desc 更新分期计划
 * @access Public
 */
router.put(
  "/:id",
  validateParams(Joi.object({ id: commonValidations.id })),
  validate(updateInstallmentPlanSchema),
  installmentController.updateInstallmentPlan
);

/**
 * @route POST /api/v1/installments/:id/payments
 * @desc 记录分期支付
 * @access Public
 */
router.post(
  "/:id/payments",
  validateParams(Joi.object({ id: commonValidations.id })),
  validate(recordPaymentSchema),
  installmentController.recordPayment
);

/**
 * @route POST /api/v1/installments/:id/next
 * @desc 支付分期计划的下一期
 * @access Public
 */
router.post(
  "/:id/next",
  validateParams(Joi.object({ id: commonValidations.id })),
  installmentController.payNextInstallment
);

/**
 * @route DELETE /api/v1/installments/:id
 * @desc 删除分期计划
 * @access Public
 */
router.delete(
  "/:id",
  validateParams(Joi.object({ id: commonValidations.id })),
  installmentController.deleteInstallmentPlan
);

export default router;
