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
 * @route GET /api/v1/students
 * @desc 获取所有学员（支持分页和筛选）
 * @access Public
 */
router.get('/', validateQuery(searchStudentsSchema), studentController.getAllStudents);

/**
 * @route GET /api/v1/students/search
 * @desc 高级搜索学员
 * @access Public
 */
router.get('/search', validateQuery(searchStudentsSchema), studentController.searchStudents);

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
 * @route POST /api/v1/students
 * @desc 创建新学员
 * @access Public
 */
router.post('/', 
  validate(createStudentSchema),
  studentController.addStudent
);

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
 * @route DELETE /api/v1/students/:id
 * @desc 删除学员
 * @access Public
 */
router.delete('/:id', 
  validateParams(Joi.object({ id: commonValidations.id })),
  studentController.deleteStudent
);

export default router;