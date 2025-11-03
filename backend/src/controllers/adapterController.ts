import { Request, Response } from 'express';
import { Student, Cash, Installment } from '@/models';
import { catchAsync } from '@/middleware/errorHandler';
import logger from '@/utils/logger';

// 简化的MongoDB专用控制器
export class AdapterController {
  // 学生列表接口
  public getStudents = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { page = 1, limit = 20, search, class: className, subject } = req.query as {
      page?: string;
      limit?: string;
      search?: string;
      class?: string;
      subject?: string;
    };
    
    const allStudents = await Student.findAll();
    let filteredStudents = allStudents;
    
    if (search) {
      filteredStudents = filteredStudents.filter(student => 
        student.name.toLowerCase().includes(search.toLowerCase()) ||
        student.phone.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (className) {
      filteredStudents = filteredStudents.filter(student => 
        student.class === className
      );
    }
    if (subject) {
      filteredStudents = filteredStudents.filter(student => 
        student.subject === subject
      );
    }
    
    // 分页处理
    const skip = (Number(page) - 1) * Number(limit);
    const total = filteredStudents.length;
    const students = filteredStudents.slice(skip, skip + Number(limit));
    
    const response = {
      success: true,
      data: students.map(student => ({
        uid: student.uid,
        name: student.name,
        phone: student.phone,
        class: student.class,
        subject: student.subject,
        lesson_left: student.lessonLeft,
        rings: student.rings || [],
        membership_start_date: student.membershipStartDate ? student.membershipStartDate.toISOString().split('T')[0] : null,
        membership_end_date: student.membershipEndDate ? student.membershipEndDate.toISOString().split('T')[0] : null,
        note: student.note,
        membership_status: student.hasMembership(),
        average_score: student.getAverageScore(),
        has_membership: student.hasMembership(),
        days_remaining: student.getMembershipDaysRemaining(),
        created_at: student.createdAt,
        updated_at: student.updatedAt
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        total_pages: Math.ceil(total / Number(limit))
      }
    };
    
    logger.info(`MongoDB查询学生列表成功，共${total}条记录`);
    res.json(response);
  });

  // 添加学生接口
  public addStudent = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { name, phone, class: className, subject, lesson_left = 0, rings = [], note } = req.body;
    
    const student = await Student.create({
      name: name.trim(),
      phone: phone?.trim() || null,
      class: className.trim(),
      subject: subject.trim(),
      lessonLeft: Number(lesson_left),
      rings: rings.filter((score: number) => score >= 0 && score <= 10),
      note: note?.trim() || null
    });
    
    const response = {
      success: true,
      data: {
        uid: student.uid,
        name: student.name,
        phone: student.phone,
        class: student.class,
        subject: student.subject,
        lesson_left: student.lessonLeft,
        rings: student.rings || [],
        membership_start_date: student.membershipStartDate ? student.membershipStartDate.toISOString().split('T')[0] : null,
        membership_end_date: student.membershipEndDate ? student.membershipEndDate.toISOString().split('T')[0] : null,
        note: student.note,
        created_at: student.createdAt
      },
      message: '学生添加成功'
    };
    
    logger.info(`MongoDB添加学生成功，UID: ${student.uid}, 姓名: ${name}`);
    res.status(201).json(response);
  });

  // 交易记录列表接口
  public getTransactions = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { page = 1, limit = 20, student_id, min_amount, max_amount, is_income } = req.query;
    
    // 构建查询条件
    let transactions = await Cash.findAll();
    if (student_id) {
      transactions = transactions.filter((t: any) => t.student_id === Number(student_id));
    }
    if (min_amount || max_amount) {
      transactions = transactions.filter((t: any) => {
        const amount = Math.abs(t.cash) / 100;
        return (!min_amount || amount >= Number(min_amount)) && 
               (!max_amount || amount <= Number(max_amount));
      });
    }
    if (is_income !== undefined) {
      const incomeFlag = is_income === 'true';
      transactions = transactions.filter((t: any) => (t.cash > 0) === incomeFlag);
    }
    
    // 分页处理
    const skip = (Number(page) - 1) * Number(limit);
    const total = transactions.length;
    const pagedTransactions = transactions.slice(skip, skip + Number(limit));
    
    const response = {
      success: true,
      data: pagedTransactions.map((transaction: any) => ({
        uid: transaction.uid,
        student_id: transaction.student_id,
        amount: Math.abs(transaction.cash) / 100,
        note: transaction.note,
        is_income: transaction.cash > 0,
        is_expense: transaction.cash < 0,
        formatted_amount: transaction.getFormattedAmount(),
        description: transaction.getTransactionDescription ? transaction.getTransactionDescription() : (transaction.cash > 0 ? '收入' : '支出'),
        installment_plan: undefined, // 暂不支持分期计划
        created_at: transaction.created_at,
        updated_at: transaction.updated_at
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        total_pages: Math.ceil(total / Number(limit))
      }
    };
    
    logger.info(`MongoDB查询交易记录成功，共${total}条记录`);
    res.json(response);
  });

  // 财务统计接口
  public getFinancialStats = catchAsync(async (req: Request, res: Response): Promise<void> => {
    // 这里保持原来的空实现，因为CashModel上没有getFinancialStats方法
    const { period = 'month' } = req.query;
    
    const response = {
      success: true,
      data: {
        period,
        total_income: 0,
        total_expense: 0,
        net_income: 0,
        net_profit: 0,
        is_profitable: false,
        transaction_count: 0,
        date_from: new Date(),
        date_to: new Date()
      }
    };
    
    res.json(response);
  });

  // 数据库健康检查接口
  public getHealthStatus = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { checkMongoHealth } = await import('@/models');
    const health = await checkMongoHealth();
    
    const response = {
      success: true,
      data: {
        database_type: 'mongodb',
        connection_status: health.status,
        details: health.details,
        timestamp: new Date()
      }
    };
    
    res.json(response);
  });
}

// 导出控制器实例
const adapterController = new AdapterController();
export default adapterController;