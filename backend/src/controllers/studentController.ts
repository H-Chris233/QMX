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
  // ...（如果需要的话）

  // 学员统计信息
  public getStudentStats = catchAsync(async (req: Request, res: Response): Promise<void> => {
    // TODO: 实现学员统计逻辑
    res.json({
      success: true,
      data: {
        total_students: 0,
        active_students: 0,
        expired_memberships: 0,
      },
    });
  });
}

// 导出控制器实例
const studentController = new StudentController();
export default studentController;