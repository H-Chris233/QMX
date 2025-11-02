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

  // 搜索学员
  public searchStudents = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { keyword } = req.query;
    let students = [];
    
    if (keyword) {
      students = await Student.findAll({
        where: {
          name: {
            [require('sequelize').Op.iLike]: `%${keyword}%`
          }
        }
      });
    } else {
      students = await Student.findAll();
    }
    
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