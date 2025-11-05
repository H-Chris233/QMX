import Joi from 'joi';
import express from 'express';
import type { Router } from 'express';
import scoreController from '@/controllers/scoreController';
import { validate, validateParams, commonValidations } from '@/middleware/validation';
import { apiRateLimitMiddleware } from '@/middleware/rateLimiter';

const router: Router = express.Router();

// 应用速率限制
router.use(apiRateLimitMiddleware);

// 验证规则
const addScoreSchema = Joi.object({
  score: commonValidations.score,
});

const updateScoreSchema = Joi.object({
  newScore: commonValidations.score,
});

const batchAddScoresSchema = Joi.object({
  scores: Joi.array()
    .items(commonValidations.score)
    .min(1)
    .max(50) // 限制最多添加50个成绩
    .required()
    .messages({
      'array.min': '至少需要添加1个成绩',
      'array.max': '最多只能添加50个成绩',
      'any.required': '成绩数组不能为空',
    }),
});

// 路由定义
/**
 * @route POST /api/v1/students/:id/scores
 * @desc 为学员添加单个成绩
 * @access Public
 */
router.post('/:id/scores', 
  validateParams(Joi.object({ id: commonValidations.id })),
  validate(addScoreSchema),
  scoreController.addScore
);

/**
 * @route GET /api/v1/students/:id/scores
 * @desc 获取学员成绩列表
 * @access Public
 */
router.get('/:id/scores', 
  validateParams(Joi.object({ id: commonValidations.id })),
  scoreController.getStudentScores
);

/**
 * @route PUT /api/v1/students/:id/scores/:scoreIndex
 * @desc 更新学员指定索引的成绩
 * @access Public
 */
router.put('/:id/scores/:scoreIndex', 
  validateParams(Joi.object({ 
    id: commonValidations.id,
    scoreIndex: Joi.number().integer().min(0).required().messages({
      'number.base': '成绩索引必须是数字',
      'number.integer': '成绩索引必须是整数',
      'number.min': '成绩索引不能小于0',
      'any.required': '成绩索引不能为空',
    }),
  })),
  validate(updateScoreSchema),
  scoreController.updateStudentScore
);

/**
 * @route DELETE /api/v1/students/:id/scores/:scoreIndex
 * @desc 删除学员指定索引的成绩
 * @access Public
 */
router.delete('/:id/scores/:scoreIndex', 
  validateParams(Joi.object({ 
    id: commonValidations.id,
    scoreIndex: Joi.number().integer().min(0).required().messages({
      'number.base': '成绩索引必须是数字',
      'number.integer': '成绩索引必须是整数',
      'number.min': '成绩索引不能小于0',
      'any.required': '成绩索引不能为空',
    }),
  })),
  scoreController.deleteStudentScore
);

/**
 * @route POST /api/v1/students/:id/scores/batch
 * @desc 批量为学员添加成绩
 * @access Public
 */
router.post('/:id/scores/batch', 
  validateParams(Joi.object({ id: commonValidations.id })),
  validate(batchAddScoresSchema),
  scoreController.batchAddScores
);

/**
 * @route DELETE /api/v1/students/:id/scores
 * @desc 清空学员所有成绩
 * @access Public
 */
router.delete('/:id/scores', 
  validateParams(Joi.object({ id: commonValidations.id })),
  scoreController.clearAllScores
);

export default router;