import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/utils/errors';

const VALIDATION_OPTIONS = {
  abortEarly: false,
  stripUnknown: true,
  convert: true,
} as const;

const AMOUNT_MESSAGES = {
  'number.base': '金额必须是数字',
  'number.precision': '金额最多保留两位小数',
  'any.invalid': '金额不能为0',
  'any.required': '金额不能为空',
};

const OPTIONAL_AMOUNT_MESSAGES = {
  ...AMOUNT_MESSAGES,
  'any.invalid': '金额不能为0',
};

const createAmountSchema = (options?: { required?: boolean; allowNull?: boolean; disallowZero?: boolean }) => {
  const { required = true, allowNull = false, disallowZero = true } = options ?? {};
  let schema = Joi.number()
    .precision(2)
    .custom((value: number, helpers) => {
      // 检查是否最多2位小数
      const decimalPart = value.toString().split('.')[1];
      if (decimalPart && decimalPart.length > 2) {
        return helpers.error('amount.precision');
      }
      return value;
    }, '小数位验证')
    .messages({
      'number.base': '金额必须是数字',
      'number.precision': '金额最多保留两位小数',
      'amount.precision': '金额最多保留两位小数'
    });

  if (disallowZero) {
    schema = schema.invalid(0);
  }

  if (allowNull) {
    schema = schema.allow(null, '');
  }

  const messages = disallowZero ? (required ? AMOUNT_MESSAGES : OPTIONAL_AMOUNT_MESSAGES) : {
    'number.base': '金额必须是数字',
    'number.precision': '金额最多保留两位小数',
    'amount.precision': '金额最多保留两位小数',
    ...(required ? { 'any.required': '金额不能为空' } : {}),
  };

  schema = schema.messages(messages);
  return required ? schema.required() : schema.optional();
};

const parseIsoDate = (value: unknown, helpers: Joi.CustomHelpers<Date>) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return helpers.error('date.base');
    }
    return value;
  }
  const parsed = new Date(value as string);
  if (Number.isNaN(parsed.getTime())) {
    return helpers.error('date.format');
  }
  return parsed;
};

const installmentSnapshotSchema = Joi.object({
  plan_uid: Joi.number().integer().positive().required().messages({
    'number.base': '分期计划ID必须是数字',
    'number.integer': '分期计划ID必须为整数',
    'number.positive': '分期计划ID必须为正数',
    'any.required': '分期计划ID不能为空',
  }),
  installment_uid: Joi.number().integer().positive().allow(null).optional().messages({
    'number.base': '分期记录ID必须是数字',
    'number.integer': '分期记录ID必须为整数',
    'number.positive': '分期记录ID必须为正数',
  }),
  installment_number: Joi.number().integer().min(1).allow(null).optional().messages({
    'number.base': '分期期号必须是数字',
    'number.integer': '分期期号必须为整数',
    'number.min': '分期期号必须大于0',
  }),
  total_installments: Joi.number().integer().min(1).allow(null).optional().messages({
    'number.base': '分期总期数必须是数字',
    'number.integer': '分期总期数必须为整数',
    'number.min': '分期总期数必须大于0',
  }),
  due_date: Joi.custom(parseIsoDate).allow(null).optional().messages({
    'date.base': '分期应付日期必须是有效日期',
    'date.format': '分期应付日期格式不正确',
  }),
  status: Joi.string().optional().allow(null, ''),
  note: Joi.any().optional().allow(null).custom((value, helpers) => {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    // 转换为字符串
    const strValue = String(value);
    if (strValue.length > 1000) {
      return helpers.error('string.max');
    }
    return strValue;
  }).messages({
    'string.max': '分期备注长度不能超过1000字符',
  }),
})
  .optional()
  .messages({
    'object.base': '分期信息格式不正确，必须是对象',
  });

const formatValidationMessage = (error: Joi.ValidationError): string => {
  return error.details.map(detail => detail.message).join('; ');
};

const raiseValidationError = (error: Joi.ValidationError, prefix: string): never => {
  const message = formatValidationMessage(error);
  throw AppError.invalidInput(`${prefix}: ${message}`);
};

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, VALIDATION_OPTIONS);

    if (error) {
      raiseValidationError(error, '验证失败');
    }

    req.body = value;
    next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, VALIDATION_OPTIONS);

    if (error) {
      raiseValidationError(error, '查询参数验证失败');
    }

    req.query = value;
    next();
  };
};

export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, VALIDATION_OPTIONS);

    if (error) {
      raiseValidationError(error, '路径参数验证失败');
    }

    req.params = value;
    next();
  };
};

export const commonValidations = {
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'ID 必须是数字',
    'number.integer': 'ID 必须为整数',
    'number.positive': 'ID 必须为正数',
    'any.required': 'ID 不能为空',
  }),
  optionalId: Joi.number().integer().positive().optional().messages({
    'number.base': 'ID 必须是数字',
    'number.integer': 'ID 必须为整数',
    'number.positive': 'ID 必须为正数',
  }),
  name: Joi.string().trim().min(1).max(50).required(),
  optionalName: Joi.string().trim().min(1).max(50).optional(),
  phone: Joi.string().trim().pattern(/^1[3-9]\d{9}$/).optional().allow(''),
  email: Joi.string().email().optional(),
  date: Joi.date().iso().optional(),
  amount: createAmountSchema(),
  optionalAmount: createAmountSchema({ required: false, allowNull: true, disallowZero: false }),
  score: Joi.number().min(0).max(10).precision(1).required(),
  optionalScore: Joi.number().min(0).max(10).precision(1).optional(),
  text: Joi.string().trim().max(1000).optional().allow(''),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('uid', 'name', 'created_at', 'updated_at').default('created_at'),
  sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC'),
  installmentSnapshot: installmentSnapshotSchema,
};
