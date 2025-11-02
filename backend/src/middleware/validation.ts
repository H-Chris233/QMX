import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/middleware/errorHandler';

// 通用验证中间件
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const message = error.details
        .map(detail => detail.message)
        .join('; ');
      throw new AppError(`验证失败: ${message}`, 400);
    }

    next();
  };
};

// 查询参数验证中间件
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const message = error.details
        .map(detail => detail.message)
        .join('; ');
      throw new AppError(`查询参数验证失败: ${message}`, 400);
    }

    next();
  };
};

// 路径参数验证中间件
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const message = error.details
        .map(detail => detail.message)
        .join('; ');
      throw new AppError(`路径参数验证失败: ${message}`, 400);
    }

    next();
  };
};

// 常用验证规则
export const commonValidations = {
  id: Joi.number().integer().positive().required(),
  optionalId: Joi.number().integer().positive().optional(),
  name: Joi.string().trim().min(1).max(50).required(),
  optionalName: Joi.string().trim().min(1).max(50).optional(),
  phone: Joi.string().trim().pattern(/^1[3-9]\d{9}$/).optional().allow(''),
  email: Joi.string().email().optional(),
  date: Joi.date().iso().optional(),
  amount: Joi.number().positive().precision(2).required(),
  optionalAmount: Joi.number().min(0).precision(2).optional(),
  score: Joi.number().min(0).max(10).precision(1).required(),
  optionalScore: Joi.number().min(0).max(10).precision(1).optional(),
  text: Joi.string().trim().max(1000).optional().allow(''),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('uid', 'name', 'created_at', 'updated_at').default('created_at'),
  sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC'),
};