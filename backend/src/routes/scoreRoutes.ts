import Joi from 'joi';
import express from 'express';
import type { Router } from 'express';
import scoreController from '@/controllers/scoreController';
import { validate, validateParams, commonValidations } from '@/middleware/validation';
import { apiRateLimitMiddleware } from '@/middleware/rateLimiter';
import { SubjectType } from '@/types';

const router: Router = express.Router();

// 应用速率限制
router.use(apiRateLimitMiddleware);

// 验证规则
const addScoreSchema = Joi.object({
  score: commonValidations.score,
  subject: Joi.string().valid(...Object.values(SubjectType)).optional(),
  recorded_at: Joi.date().iso().optional(),
});

const updateScoreSchema = Joi.object({
  newScore: commonValidations.score,
  subject: Joi.string().valid(...Object.values(SubjectType)).optional(),
  recorded_at: Joi.date().iso().optional(),
});

const batchAddScoresSchema = Joi.object({
  score_details: Joi.array()
    .items(Joi.object({
      score: commonValidations.score,
      subject: Joi.string().valid(...Object.values(SubjectType)).optional(),
      recorded_at: Joi.date().iso().optional(),
    }))
    .min(1)
    .max(50) // 限制最多添加50个成绩
    .required()
    .messages({
      'array.min': '至少需要添加1个成绩',
      'array.max': '最多只能添加50个成绩',
      'any.required': '成绩明细数组不能为空',
    }),
});

// 路由定义

/**
 * @openapi
 * /students/{id}/scores:
 *   post:
 *     tags:
 *       - Scores
 *     summary: 添加成绩
 *     description: 为指定学员添加单个成绩
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
 *               - score
 *             properties:
 *               score:
 *                 type: number
 *                 description: 成绩分数
 *                 example: 8.5
 *     responses:
 *       201:
 *         description: 添加成功
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
 *                     rings:
 *                       type: array
 *                       items:
 *                         type: number
 *                       description: 成绩数组
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route POST /api/v1/students/:id/scores
 * @desc 为学员添加单个成绩
 * @access Public
 */
router.post('/:id/scores', 
  validateParams(Joi.object({ id: commonValidations.id })),
  validate(addScoreSchema),
  scoreController.addScore,
);

/**
 * @openapi
 * /students/{id}/scores:
 *   get:
 *     tags:
 *       - Scores
 *     summary: 获取学员成绩
 *     description: 获取指定学员的所有成绩
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
 *         description: 成绩列表
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
 *                     student_uid:
 *                       type: integer
 *                     rings:
 *                       type: array
 *                       items:
 *                         type: number
 *                     count:
 *                       type: integer
 *                     average:
 *                       type: number
 *                     max:
 *                       type: number
 *                     min:
 *                       type: number
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route GET /api/v1/students/:id/scores
 * @desc 获取学员成绩列表
 * @access Public
 */
router.get('/:id/scores', 
  validateParams(Joi.object({ id: commonValidations.id })),
  scoreController.getStudentScores,
);

/**
 * @openapi
 * /students/{id}/scores/{scoreIndex}:
 *   put:
 *     tags:
 *       - Scores
 *     summary: 更新成绩
 *     description: 更新学员指定索引的成绩
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 学员 UID
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - name: scoreIndex
 *         in: path
 *         required: true
 *         description: 成绩索引（从 0 开始）
 *         schema:
 *           type: integer
 *           minimum: 0
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newScore
 *             properties:
 *               newScore:
 *                 type: number
 *                 description: 新成绩分数
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
 *                   type: object
 *                   properties:
 *                     rings:
 *                       type: array
 *                       items:
 *                         type: number
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
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
  scoreController.updateStudentScore,
);

/**
 * @openapi
 * /students/{id}/scores/{scoreIndex}:
 *   delete:
 *     tags:
 *       - Scores
 *     summary: 删除成绩
 *     description: 删除学员指定索引的成绩
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 学员 UID
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - name: scoreIndex
 *         in: path
 *         required: true
 *         description: 成绩索引（从 0 开始）
 *         schema:
 *           type: integer
 *           minimum: 0
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
  scoreController.deleteStudentScore,
);

/**
 * @openapi
 * /students/{id}/scores/batch:
 *   post:
 *     tags:
 *       - Scores
 *     summary: 批量添加成绩
 *     description: 为学员批量添加多个成绩（最多 50 个）
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
 *               - scores
 *             properties:
 *               scores:
 *                 type: array
 *                 items:
 *                   type: number
 *                   minimum: 0
 *                   maximum: 10
 *                 minItems: 1
 *                 maxItems: 50
 *                 description: 成绩数组
 *                 example: [8.5, 9.0, 7.5]
 *     responses:
 *       201:
 *         description: 批量添加成功
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
 *                     rings:
 *                       type: array
 *                       items:
 *                         type: number
 *                     added_count:
 *                       type: integer
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route POST /api/v1/students/:id/scores/batch
 * @desc 批量为学员添加成绩
 * @access Public
 */
router.post('/:id/scores/batch', 
  validateParams(Joi.object({ id: commonValidations.id })),
  validate(batchAddScoresSchema),
  scoreController.batchAddScores,
);

/**
 * @openapi
 * /students/{id}/scores:
 *   delete:
 *     tags:
 *       - Scores
 *     summary: 清空成绩
 *     description: 清空学员的所有成绩
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
 *         description: 清空成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: 已清空所有成绩
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route DELETE /api/v1/students/:id/scores
 * @desc 清空学员所有成绩
 * @access Public
 */
router.delete('/:id/scores', 
  validateParams(Joi.object({ id: commonValidations.id })),
  scoreController.clearAllScores,
);

export default router;
