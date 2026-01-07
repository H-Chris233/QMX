import { Request, Response } from 'express';
import { StudentRepository } from '../db/repositories/studentRepository';
import { CashRepository } from '../db/repositories/cashRepository';
import { catchAsync } from '@/middleware/errorHandler';
import logger from '@/utils/logger';
import { presentStudent } from '../services/studentPresenter';

// PostgreSQL 数据适配器控制器
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

    const result = await StudentRepository.findWithPagination({
      page: Number(page),
      limit: Number(limit),
      nameContains: search,
      classType: className as any,
      subject: subject as any,
    });

    const response = {
      success: true,
      data: result.data.map(student => ({
        uid: student.uid,
        name: student.name,
        phone: student.phone,
        class: student.classType,
        subject: student.subject,
        lesson_left: student.lessonLeft,
        rings: student.rings || [],
        membership_start_date: student.membershipStartDate,
        membership_end_date: student.membershipEndDate,
        note: student.note,
        membership_status: presentStudent(student).membershipStatus,
        average_score: presentStudent(student).averageScore,
        has_membership: presentStudent(student).isMembershipActive,
        days_remaining: presentStudent(student).membershipDaysRemaining,
        created_at: student.createdAt,
        updated_at: student.updatedAt
      })),
      pagination: {
        page: result.pagination.page,
        limit: result.pagination.limit,
        total: result.pagination.total,
        total_pages: result.pagination.total_pages
      }
    };

    logger.info(`PostgreSQL查询学生列表成功，共${result.pagination.total}条记录`);
    res.json(response);
  });

  // 添加学生接口
  public addStudent = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { name, phone, class: className, subject, lesson_left = 0, rings = [], note } = req.body;

    const newStudent = {
      name: name.trim(),
      phone: phone?.trim() || null,
      classType: (className?.trim()) || 'TEN_TRY',
      subject: (subject?.trim()) || 'SHOOTING',
      lessonLeft: Number(lesson_left),
      rings: rings.filter((score: number) => score >= 0 && score <= 10),
      note: note?.trim() || null,
    };

    const student = await StudentRepository.create(newStudent);

    const response = {
      success: true,
      data: {
        uid: student.uid,
        name: student.name,
        phone: student.phone,
        class: student.classType,
        subject: student.subject,
        lesson_left: student.lessonLeft,
        rings: student.rings || [],
        membership_start_date: student.membershipStartDate,
        membership_end_date: student.membershipEndDate,
        note: student.note,
        created_at: student.createdAt
      },
      message: '学生添加成功'
    };

    logger.info(`PostgreSQL添加学生成功，UID: ${student.uid}, 姓名: ${name}`);
    res.status(201).json(response);
  });

  // 交易记录列表接口
  public getTransactions = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { page = 1, limit = 20, student_id, min_amount, max_amount, is_income } = req.query;

    const result = await CashRepository.findWithPagination({
      page: Number(page),
      limit: Number(limit),
      student_id: student_id ? Number(student_id) : undefined,
      min_amount: min_amount ? Math.round(Number(min_amount) * 100) : undefined,
      max_amount: max_amount ? Math.round(Number(max_amount) * 100) : undefined,
      is_income: is_income ? String(is_income).toLowerCase() === 'true' : undefined,
    });

    const response = {
      success: true,
      data: result.data.map((transaction) => ({
        uid: transaction.uid,
        student_id: transaction.studentId,
        amount: Math.abs(transaction.amount) / 100,
        note: transaction.note,
        is_income: transaction.amount > 0,
        is_expense: transaction.amount < 0,
        formatted_amount: transaction.amount > 0
          ? `+¥${(transaction.amount / 100).toFixed(2)}`
          : `-¥${(Math.abs(transaction.amount) / 100).toFixed(2)}`,
        description: transaction.amount > 0 ? '收入' : '支出',
        installment: transaction.installmentSnapshot ?? undefined,
        created_at: transaction.createdAt?.toISOString(),
        updated_at: transaction.updatedAt?.toISOString()
      })),
      pagination: {
        page: result.pagination.page,
        limit: result.pagination.limit,
        total: result.pagination.total,
        total_pages: result.pagination.total_pages
      }
    };

    logger.info(`PostgreSQL查询交易记录成功，共${result.pagination.total}条记录`);
    res.json(response);
  });

  // 财务统计接口
  public getFinancialStats = catchAsync(async (req: Request, res: Response): Promise<void>): Promise<void> => {
    const { period = 'month' } = req.query;

    let dateFrom: Date;
    const now = new Date();

    switch (period) {
      case 'week':
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        dateFrom = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        dateFrom = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const stats = await CashRepository.getFinancialStats(
      dateFrom.toISOString(),
      now.toISOString()
    );

    const response = {
      success: true,
      data: {
        period,
        total_income: stats.totalIncome / 100,
        total_expense: stats.totalExpense / 100,
        net_income: stats.netIncome / 100,
        net_profit: stats.netIncome / 100,
        is_profitable: stats.netIncome > 0,
        transaction_count: stats.transactionCount,
        date_from: dateFrom,
        date_to: now
      }
    };

    res.json(response);
  });

  // 数据库健康检查接口
  public getHealthStatus = catchAsync(async (req: Request, res: Response): Promise<void>): Promise<void> => {
    try {
      // 简单查询测试数据库连接
      await StudentRepository.findAll();

      const response = {
        success: true,
        data: {
          database_type: 'postgresql',
          connection_status: 'connected',
          details: {
            server: 'PostgreSQL 15+',
            orm: 'Drizzle ORM'
          },
          timestamp: new Date()
        }
      };

      res.json(response);
    } catch (error) {
      const response = {
        success: false,
        data: {
          database_type: 'postgresql',
          connection_status: 'disconnected',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        }
      };

      res.status(503).json(response);
    }
  });
}

// 导出控制器实例
const adapterController = new AdapterController();
export default adapterController;
