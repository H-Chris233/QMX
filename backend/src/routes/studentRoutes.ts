import Joi from 'joi';
import express from 'express';
import type { Router } from 'express';
import studentController from '@/controllers/studentController';
import { validate, validateParams, validateQuery, commonValidations } from '@/middleware/validation';
import { apiRateLimitMiddleware } from '@/middleware/rateLimiter';
import { ClassType, SubjectType } from '@/types';

const router: Router = express.Router();

// 应用速率限制
router.use(apiRateLimitMiddleware);

// 验证规则
const createStudentSchema = Joi.object({
  name: commonValidations.name,
  age: Joi.number().integer().min(0).max(120).optional().allow(null),
  class: Joi.string().valid(...Object.values(ClassType)).default(ClassType.OTHERS),
  phone: commonValidations.phone.default('未填写'),
  note: commonValidations.text.default(''),
  subject: Joi.string().valid(...Object.values(SubjectType)).default(SubjectType.OTHERS),
  lesson_left: Joi.number().integer().min(0).optional().allow(null),
  lessonLeft: Joi.number().integer().min(0).optional().allow(null),
  membership_start_date: Joi.date().iso().optional().allow(null),
  membershipStartDate: Joi.date().iso().optional().allow(null),
  membership_end_date: Joi.date().iso().optional().allow(null),
  membershipEndDate: Joi.date().iso().optional().allow(null),
  rings: Joi.array().items(Joi.number().min(0).max(10).precision(1)).optional(),
});

const updateStudentSchema = Joi.object({
  name: commonValidations.optionalName,
  age: Joi.number().integer().min(0).max(120).optional().allow(null),
  class: Joi.string().valid(...Object.values(ClassType)).optional(),
  phone: commonValidations.phone.optional(),
  note: commonValidations.text.optional(),
  subject: Joi.string().valid(...Object.values(SubjectType)).optional(),
  lesson_left: Joi.number().integer().min(0).optional().allow(null),
  lessonLeft: Joi.number().integer().min(0).optional().allow(null),
  membership_start_date: Joi.date().iso().optional().allow(null),
  membershipStartDate: Joi.date().iso().optional().allow(null),
  membership_end_date: Joi.date().iso().optional().allow(null),
  membershipEndDate: Joi.date().iso().optional().allow(null),
  rings: Joi.array().items(Joi.number().min(0).max(10).precision(1)).optional(),
});

const searchStudentsSchema = Joi.object({
  name_contains: Joi.string().trim().max(50).optional(),
  min_age: Joi.number().integer().min(0).max(120).optional().allow(null),
  max_age: Joi.number().integer().min(0).max(120).optional().allow(null),
  min_score: Joi.number().min(0).max(10).precision(1).optional().allow(null),
  max_score: Joi.number().min(0).max(10).precision(1).optional().allow(null),
  class_type: Joi.string().valid(...Object.values(ClassType)).optional().allow(null),
  subject: Joi.string().valid(...Object.values(SubjectType)).optional().allow(null),
  has_membership: Joi.boolean().optional().allow(null),
  membership_active_at: Joi.date().iso().optional().allow(null),
  page: commonValidations.page,
  limit: commonValidations.limit,
  sort_by: Joi.string().valid('uid', 'name', 'age', 'created_at', 'updated_at').default('created_at'),
  sort_order: commonValidations.sortOrder,
});

// 路由定义

/**
 * @openapi
 * /students:
 *   get:
 *     tags:
 *       - Students
 *     summary: 获取学员列表
 *     description: 获取所有学员，支持分页、搜索和筛选
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: name_contains
 *         in: query
 *         description: 姓名包含（模糊搜索）
 *         schema:
 *           type: string
 *       - name: class_type
 *         in: query
 *         description: 班级类型
 *         schema:
 *           type: string
 *           enum: [小学, 初中, 高中, 大学, 其他]
 *       - name: subject
 *         in: query
 *         description: 科目
 *         schema:
 *           type: string
 *           enum: [数学, 英语, 物理, 化学, 生物, 语文, 历史, 地理, 政治, 其他]
 *       - name: has_membership
 *         in: query
 *         description: 是否有会员
 *         schema:
 *           type: boolean
 *       - name: sort_by
 *         in: query
 *         description: 排序字段
 *         schema:
 *           type: string
 *           enum: [uid, name, age, created_at, updated_at]
 *           default: created_at
 *       - $ref: '#/components/parameters/OrderParam'
 *     responses:
 *       200:
 *         description: 学员列表
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
 *                     $ref: '#/components/schemas/Student'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route GET /api/v1/students
 * @desc 获取所有学员（支持分页和筛选）
 * @access Public
 */
router.get('/', validateQuery(searchStudentsSchema), studentController.getAllStudents);

/**
 * @openapi
 * /students/search:
 *   get:
 *     tags:
 *       - Students
 *     summary: 高级搜索学员
 *     description: 使用多种条件高级搜索学员
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: name_contains
 *         in: query
 *         description: 姓名包含
 *         schema:
 *           type: string
 *       - name: min_age
 *         in: query
 *         description: 最小年龄
 *         schema:
 *           type: integer
 *       - name: max_age
 *         in: query
 *         description: 最大年龄
 *         schema:
 *           type: integer
 *       - name: min_score
 *         in: query
 *         description: 最低评分
 *         schema:
 *           type: number
 *       - name: max_score
 *         in: query
 *         description: 最高评分
 *         schema:
 *           type: number
 *       - name: class_type
 *         in: query
 *         description: 班级类型
 *         schema:
 *           type: string
 *       - name: subject
 *         in: query
 *         description: 科目
 *         schema:
 *           type: string
 *       - name: has_membership
 *         in: query
 *         description: 是否有会员
 *         schema:
 *           type: boolean
 *       - name: membership_active_at
 *         in: query
 *         description: 会员有效日期
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
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Student'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route GET /api/v1/students/search
 * @desc 高级搜索学员
 * @access Public
 */
router.get('/search', validateQuery(searchStudentsSchema), studentController.searchStudents);

/**
 * @openapi
 * /students/{id}:
 *   get:
 *     tags:
 *       - Students
 *     summary: 获取学员详情
 *     description: 根据 ID 获取单个学员的详细信息
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
 *         description: 学员详情
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Student'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route GET /api/v1/students/:id
 * @desc 根据ID获取学员详情
 * @access Public
 */
router.get('/:id', 
  validateParams(Joi.object({ id: commonValidations.id })),
  studentController.getStudentById
);

/**
 * @openapi
 * /students:
 *   post:
 *     tags:
 *       - Students
 *     summary: 创建学员
 *     description: 创建新的学员记录
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: 学员姓名
 *                 example: 张三
 *               age:
 *                 type: integer
 *                 description: 年龄
 *                 example: 15
 *               class:
 *                 type: string
 *                 description: 班级类型
 *                 enum: [小学, 初中, 高中, 大学, 其他]
 *               phone:
 *                 type: string
 *                 description: 联系电话
 *                 example: "13800138000"
 *               note:
 *                 type: string
 *                 description: 备注
 *               subject:
 *                 type: string
 *                 description: 科目
 *                 enum: [数学, 英语, 物理, 化学, 生物, 语文, 历史, 地理, 政治, 其他]
 *               lesson_left:
 *                 type: integer
 *                 description: 剩余课时
 *               membership_start_date:
 *                 type: string
 *                 format: date
 *                 description: 会员开始日期
 *               membership_end_date:
 *                 type: string
 *                 format: date
 *                 description: 会员结束日期
 *               rings:
 *                 type: array
 *                 items:
 *                   type: number
 *                 description: 评分数组
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Student'
 *                 message:
 *                   type: string
 *                   example: 学员创建成功
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route POST /api/v1/students
 * @desc 创建新学员
 * @access Public
 */
router.post('/',
  validate(createStudentSchema),
  studentController.addStudent
);

/**
 * @openapi
 * /students/{id}:
 *   put:
 *     tags:
 *       - Students
 *     summary: 更新学员
 *     description: 更新学员信息
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
 *             properties:
 *               name:
 *                 type: string
 *               age:
 *                 type: integer
 *               class:
 *                 type: string
 *               phone:
 *                 type: string
 *               note:
 *                 type: string
 *               subject:
 *                 type: string
 *               lesson_left:
 *                 type: integer
 *               membership_start_date:
 *                 type: string
 *                 format: date
 *               membership_end_date:
 *                 type: string
 *                 format: date
 *               rings:
 *                 type: array
 *                 items:
 *                   type: number
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Student'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route PUT /api/v1/students/:id
 * @desc 更新学员信息
 * @access Public
 */
router.put('/:id',
  validateParams(Joi.object({ id: commonValidations.id })),
  validate(updateStudentSchema),
  studentController.updateStudent
);

/**
 * @openapi
 * /students/{id}:
 *   delete:
 *     tags:
 *       - Students
 *     summary: 删除学员
 *     description: 根据 ID 删除学员记录
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
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 学员删除成功
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @route DELETE /api/v1/students/:id
 * @desc 删除学员
 * @access Public
 */
router.delete('/:id',
  validateParams(Joi.object({ id: commonValidations.id })),
  studentController.deleteStudent
);

export default router;
