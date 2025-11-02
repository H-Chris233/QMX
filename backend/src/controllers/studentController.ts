import { Request, Response } from 'express';
import { Student, IStudentDoc } from '@/models/mongo';
import { catchAsync } from '@/middleware/errorHandler';
import logger from '@/utils/logger';

// 简化学员控制器
export class StudentController {
  // 获取所有学员
  public getAllStudents = catchAsync(async (req: Request, res: Response) => {
    const students = await Student.findAll();

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
    const student = await Student.findByUid(Number(id));

    if (!student) {
      res.status(404).json({
        success: false,
        error: '学员不存在',
      });
      return;
    }

    const updatedStudent = await Student.updateByUid(Number(id), req.body);

    logger.info(`更新学员成功，UID: ${student.uid}`);
    res.json({
      success: true,
      data: updatedStudent,
      message: '学员更新成功',
    });
  });

  // 删除学员
  public deleteStudent = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const student = await Student.findByUid(Number(id));

    if (!student) {
      res.status(404).json({
        success: false,
        error: '学员不存在',
      });
      return;
    }

    const deleted = await Student.deleteByUid(Number(id));

    if (deleted) {
      logger.info(`删除学员成功，UID: ${student.uid}`);
      res.json({
        success: true,
        message: '学员删除成功',
      });
    } else {
      res.status(500).json({
        success: false,
        error: '删除学员失败',
      });
    }
  });

  // 获取单个学员
  public getStudentById = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const student = await Student.findByUid(Number(id));

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
        $regex: name_contains,
        $options: 'i'
      };
    }

    // 年龄范围搜索
    if (min_age !== undefined && min_age !== null) {
      whereCondition.age = {
        ...whereCondition.age,
        $gte: Number(min_age)
      };
    }
    if (max_age !== undefined && max_age !== null) {
      whereCondition.age = {
        ...whereCondition.age,
        $lte: Number(max_age)
      };
    }

    // 成绩范围搜索 - 这里需要查询成绩字段
    if (min_score !== undefined && min_score !== null || max_score !== undefined && max_score !== null) {
      // 由于成绩是数组格式，需要使用MongoDB的聚合查询或特殊处理
      const students = await Student.findAll();

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
            student.membershipStartDate && student.membershipEndDate &&
            student.membershipStartDate <= now && student.membershipEndDate >= now
          );
        } else {
          filteredStudents = filteredStudents.filter(student =>
            !student.membershipStartDate || !student.membershipEndDate ||
            student.membershipStartDate > now || student.membershipEndDate < now
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
        whereCondition.membershipStartDate = { $lte: now };
        whereCondition.membershipEndDate = { $gte: now };
      } else {
        whereCondition.$or = [
          { membershipStartDate: null },
          { membershipEndDate: null },
          { membershipStartDate: { $gt: now } },
          { membershipEndDate: { $lt: now } }
        ];
      }
    }

    const students = await Student.search(whereCondition);

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

    let updatedCount = 0;
    for (const studentId of studentIds) {
      const result = await Student.updateByUid(Number(studentId), updates);
      if (result) {
        updatedCount++;
      }
    }

    logger.info(`批量更新学员成功，影响数量: ${updatedCount}`);
    res.json({
      success: true,
      data: {
        updated_count: updatedCount,
      },
      message: `成功更新${updatedCount}个学员`,
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

    let deletedCount = 0;
    for (const studentId of studentIds) {
      const deleted = await Student.deleteByUid(Number(studentId));
      if (deleted) {
        deletedCount++;
      }
    }

    logger.info(`批量删除学员成功，删除数量: ${deletedCount}`);
    res.json({
      success: true,
      data: {
        deleted_count: deletedCount,
      },
      message: `成功删除${deletedCount}个学员`,
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

    const student = await Student.findByUid(Number(id));

    if (!student) {
      res.status(404).json({
        success: false,
        error: '学员不存在',
      });
      return;
    }

    const updatedStudent = await Student.updateByUid(Number(id), { rings });

    logger.info(`更新学员成绩成功，UID: ${student.uid}, 成绩: ${rings}`);
    res.json({
      success: true,
      data: updatedStudent,
      message: '学员成绩更新成功',
    });
  });

  // 获取即将到期的会员
  public getExpiringMemberships = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { days = 30 } = req.query;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + Number(days));

    const expiringStudents = await Student.search({
      membershipEndDate: {
        $gte: new Date(),
        $lte: futureDate
      }
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
    const active_students = await Student.search({
      membershipStartDate: { $lte: now },
      membershipEndDate: { $gte: now }
    });

    const expired_memberships_count = total_students - active_students.length;

    // 按班级统计 - 简化版本
    const allStudents = await Student.findAll();
    const classStats = new Map<string, number>();
    const subjectStats = new Map<string, number>();

    allStudents.forEach(student => {
      const className = student.class || 'Others';
      const subjectName = student.subject || 'Others';

      classStats.set(className, (classStats.get(className) || 0) + 1);
      subjectStats.set(subjectName, (subjectStats.get(subjectName) || 0) + 1);
    });

    const class_statistics = Array.from(classStats.entries()).map(([name, count]) => ({
      class: name,
      count
    }));

    const subject_statistics = Array.from(subjectStats.entries()).map(([name, count]) => ({
      subject: name,
      count
    }));

    res.json({
      success: true,
      data: {
        total_students,
        active_students: active_students.length,
        expired_memberships: expired_memberships_count,
        class_statistics,
        subject_statistics,
      },
    });
  });
}

// 导出控制器实例
const studentController = new StudentController();
export default studentController;