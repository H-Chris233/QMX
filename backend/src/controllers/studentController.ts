import { Request, Response } from 'express';
import { Student } from '@/models';
import { catchAsync } from '@/middleware/errorHandler';
import logger from '@/utils/logger';

// 简化学员控制器
export class StudentController {
  // 获取所有学员
  public getAllStudents = catchAsync(async (req: Request, res: Response) => {
    const students = await Student.findAll({
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: students,
    });
  });

  // 添加学员
  public addStudent = catchAsync(async (req: Request, res: Response) => {
    const studentData = req.body;
    const student = await Student.create(studentData);
    
    logger.info(`添加学员成功，UID: ${student.uid}, 姓名: ${student.name}`);
    res.status(201).json({
      success: true,
      data: student,
      message: '学员添加成功',
    });
  });

  // 更新学员
  public updateStudent = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const student = await Student.findByPk(id);
    
    if (!student) {
      res.status(404).json({
        success: false,
        error: '学员不存在',
      });
      return;
    }
    
    await student.update(req.body);
    
    logger.info(`更新学员成功，UID: ${student.uid}`);
    res.json({
      success: true,
      data: student,
      message: '学员更新成功',
    });
  });

  // 删除学员
  public deleteStudent = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const student = await Student.findByPk(id);
    
    if (!student) {
      res.status(404).json({
        success: false,
        error: '学员不存在',
      });
      return;
    }
    
    await student.destroy();
    
    logger.info(`删除学员成功，UID: ${student.uid}`);
    res.json({
      success: true,
      message: '学员删除成功',
    });
  });

  // 获取单个学员
  public getStudentById = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const student = await Student.findByPk(id);
    
    if (!student) {
      res.status(404).json({
        success: false,
        error: '学员不存在',
      });
      return;
    }
    
    res.json({
      success: true,
      data: student,
    });
  });

  // 搜索学员 - 修复前后端不匹配问题
  public searchStudents = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const {
      name_contains,
      min_age,
      max_age,
      min_score,
      max_score,
      class_type,
      subject,
      has_membership,
    } = req.query;

    // 构建查询条件
    const whereCondition: any = {};

    // 姓名包含搜索
    if (name_contains) {
      whereCondition.name = {
        [require('sequelize').Op.iLike]: `%${name_contains}%`
      };
    }

    // 年龄范围搜索
    if (min_age !== undefined && min_age !== null) {
      whereCondition.age = {
        ...whereCondition.age,
        [require('sequelize').Op.gte]: Number(min_age)
      };
    }
    if (max_age !== undefined && max_age !== null) {
      whereCondition.age = {
        ...whereCondition.age,
        [require('sequelize').Op.lte]: Number(max_age)
      };
    }

    // 成绩范围搜索 - 这里需要查询成绩字段
    if (min_score !== undefined && min_score !== null || max_score !== undefined && max_score !== null) {
      // 由于成绩是数组格式，需要使用子查询或特殊处理
      const students = await Student.findAll({
        attributes: ['uid', 'name', 'age', 'class', 'phone', 'rings', 'subject', 'membership_start_date', 'membership_end_date'],
      });

      let filteredStudents = students;

      // 筛选成绩范围
      if (min_score !== undefined && min_score !== null) {
        filteredStudents = filteredStudents.filter(student => {
          if (!student.rings || student.rings.length === 0) return false;
          return student.rings.some(score => score >= Number(min_score));
        });
      }
      if (max_score !== undefined && max_score !== null) {
        filteredStudents = filteredStudents.filter(student => {
          if (!student.rings || student.rings.length === 0) return true;
          return student.rings.some(score => score <= Number(max_score));
        });
      }

      // 应用其他筛选条件
      if (name_contains) {
        filteredStudents = filteredStudents.filter(student =>
          student.name.toLowerCase().includes(String(name_contains).toLowerCase())
        );
      }

      if (min_age !== undefined && min_age !== null) {
        filteredStudents = filteredStudents.filter(student =>
          student.age && student.age >= Number(min_age)
        );
      }

      if (max_age !== undefined && max_age !== null) {
        filteredStudents = filteredStudents.filter(student =>
          student.age && student.age <= Number(max_age)
        );
      }

      if (class_type) {
        filteredStudents = filteredStudents.filter(student =>
          student.class === class_type
        );
      }

      if (subject) {
        filteredStudents = filteredStudents.filter(student =>
          student.subject === subject
        );
      }

      if (has_membership !== undefined && has_membership !== null) {
        const now = new Date();
        if (has_membership === 'true') {
          filteredStudents = filteredStudents.filter(student =>
            student.membership_start_date && student.membership_end_date &&
            student.membership_start_date <= now && student.membership_end_date >= now
          );
        } else {
          filteredStudents = filteredStudents.filter(student =>
            !student.membership_start_date || !student.membership_end_date ||
            student.membership_start_date > now || student.membership_end_date < now
          );
        }
      }

      res.json({
        success: true,
        data: filteredStudents,
      });
      return;
    }

    // 班级类型搜索
    if (class_type) {
      whereCondition.class = class_type;
    }

    // 科目搜索
    if (subject) {
      whereCondition.subject = subject;
    }

    // 会员状态搜索
    if (has_membership !== undefined && has_membership !== null) {
      const now = new Date();
      if (has_membership === 'true') {
        whereCondition.membership_start_date = {
          [require('sequelize').Op.lte]: now
        };
        whereCondition.membership_end_date = {
          [require('sequelize').Op.gte]: now
        };
      } else {
        whereCondition[require('sequelize').Op.or] = [
          { membership_start_date: null },
          { membership_end_date: null },
          { membership_start_date: { [require('sequelize').Op.gt]: now } },
          { membership_end_date: { [require('sequelize').Op.lt]: now } }
        ];
      }
    }

    const students = await Student.findAll({
      where: Object.keys(whereCondition).length > 0 ? whereCondition : undefined,
      attributes: ['uid', 'name', 'age', 'class', 'phone', 'rings', 'subject', 'membership_start_date', 'membership_end_date'],
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: students,
    });
  });

  // 私有辅助方法
  
  // 批量操作学员
  public batchUpdateStudents = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { studentIds, updates } = req.body;
    
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      res.status(400).json({
        success: false,
        error: '学员ID列表不能为空',
      });
      return;
    }

    const result = await Student.update(updates, {
      where: {
        uid: {
          [require('sequelize').Op.in]: studentIds
        }
      }
    });

    logger.info(`批量更新学员成功，影响行数: ${result[0]}`);
    res.json({
      success: true,
      data: {
        updated_count: result[0],
      },
      message: `成功更新${result[0]}个学员`,
    });
  });

  // 批量删除学员
  public batchDeleteStudents = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { studentIds } = req.body;
    
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      res.status(400).json({
        success: false,
        error: '学员ID列表不能为空',
      });
      return;
    }

    const deleted_count = await Student.destroy({
      where: {
        uid: {
          [require('sequelize').Op.in]: studentIds
        }
      }
    });

    logger.info(`批量删除学员成功，删除数量: ${deleted_count}`);
    res.json({
      success: true,
      data: {
        deleted_count,
      },
      message: `成功删除${deleted_count}个学员`,
    });
  });

  // 更新学员成绩
  public updateStudentScores = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { rings } = req.body;
    
    if (!Array.isArray(rings)) {
      res.status(400).json({
        success: false,
        error: '成绩必须是数组格式',
      });
      return;
    }

    const student = await Student.findByPk(id);
    
    if (!student) {
      res.status(404).json({
        success: false,
        error: '学员不存在',
      });
      return;
    }
    
    await student.update({ rings });
    
    logger.info(`更新学员成绩成功，UID: ${student.uid}, 成绩: ${rings}`);
    res.json({
      success: true,
      data: student,
      message: '学员成绩更新成功',
    });
  });

  // 获取即将到期的会员
  public getExpiringMemberships = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { days = 30 } = req.query;
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + Number(days));
    
    const expiringStudents = await Student.findAll({
      where: {
        [require('sequelize').Op.and]: [
          {
            membership_end_date: {
              [require('sequelize').Op.gte]: new Date()
            }
          },
          {
            membership_end_date: {
              [require('sequelize').Op.lte]: futureDate
            }
          }
        ]
      },
      order: [['membership_end_date', 'ASC']],
    });

    res.json({
      success: true,
      data: expiringStudents,
      count: expiringStudents.length,
    });
  });

  // 学员统计信息
  public getStudentStats = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const total_students = await Student.count();
    
    const now = new Date();
    const active_students = await Student.count({
      where: {
        [require('sequelize').Op.and]: [
          {
            membership_start_date: {
              [require('sequelize').Op.lte]: now
            }
          },
          {
            membership_end_date: {
              [require('sequelize').Op.gte]: now
            }
          }
        ]
      }
    });

    const expired_memberships = await Student.count({
      where: {
        membership_end_date: {
          [require('sequelize').Op.lt]: now
        }
      }
    });

    // 按班级统计
    const classStats = await Student.findAll({
      attributes: [
        'class',
        [require('sequelize').fn('COUNT', require('sequelize').col('uid')), 'count']
      ],
      group: ['class'],
      raw: true
    });

    // 按科目统计
    const subjectStats = await Student.findAll({
      attributes: [
        'subject',
        [require('sequelize').fn('COUNT', require('sequelize').col('uid')), 'count']
      ],
      group: ['subject'],
      raw: true
    });

    res.json({
      success: true,
      data: {
        total_students,
        active_students,
        expired_memberships,
        class_statistics: classStats,
        subject_statistics: subjectStats,
      },
    });
  });
}

// 导出控制器实例
const studentController = new StudentController();
export default studentController;