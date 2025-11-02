import { Request, Response } from 'express';
import { isUsingMongoDB } from '@/config/database';
import { Student as SqlStudent, Cash as SqlCash, Installment as SqlInstallment } from '@/models';
import { Student as MongoStudent, Cash as MongoCash, Installment as MongoInstallment } from '@/models';
import { catchAsync } from '@/middleware/errorHandler';
import logger from '@/utils/logger';

// 适配器控制器 - 根据数据库类型选择合适的模型
export class AdapterController {
  // 根据数据库类型获取学生模型
  private getStudentModel() {
    return isUsingMongoDB() ? MongoStudent : SqlStudent;
  }

  // 根据数据库类型获取现金模型
  private getCashModel() {
    return isUsingMongoDB() ? MongoCash : SqlCash;
  }

  // 根据数据库类型获取分期模型
  private getInstallmentModel() {
    return isUsingMongoDB() ? MongoInstallment : SqlInstallment;
  }

  // 通用学生列表接口
  public getStudents = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const StudentModel = this.getStudentModel();
    
    if (isUsingMongoDB()) {
      // MongoDB 查询
      const { page = 1, limit = 20, search, class: className, subject } = req.query;
      const skip = (Number(page) - 1) * Number(limit);
      
      // 构建查询条件
      const query: any = {};
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }
      if (className) {
        query.class = className;
      }
      if (subject) {
        query.subject = subject;
      }
      
      const students = await StudentModel
        .find(query)
        .skip(skip)
        .limit(Number(limit))
        .sort({ created_at: -1 });
      
      const total = await StudentModel.countDocuments(query);
      
      const response = {
        success: true,
        data: students.map(student => ({
          uid: student.uid,
          name: student.name,
          phone: student.phone,
          class: student.class,
          subject: student.subject,
          lesson_left: student.lesson_left,
          rings: student.rings || [],
          membership_start_date: student.membership_start_date,
          membership_end_date: student.membership_end_date,
          note: student.note,
          membership_status: student.membership_status,
          average_score: student.getAverageScore(),
          has_membership: student.hasMembership(),
          days_remaining: student.getMembershipDaysRemaining(),
          created_at: student.created_at,
          updated_at: student.updated_at
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
    } else {
      // Sequelize 查询逻辑保持不变
      res.status(500).json({
        success: false,
        error: 'Seqlite/PostgreSQL 查询未在适配器中实现'
      });
    }
  });

  // 通用添加学生接口
  public addStudent = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const StudentModel = this.getStudentModel();
    
    if (isUsingMongoDB()) {
      const { name, phone, class: className, subject, lesson_left = 0, rings = [], note } = req.body;
      
      // 生成唯一UID
      const lastStudent = await StudentModel.findOne().sort({ uid: -1 });
      const uid = lastStudent ? lastStudent.uid + 1 : 1;
      
      const student = new StudentModel({
        uid,
        name: name.trim(),
        phone: phone?.trim() || null,
        class: className.trim(),
        subject: subject.trim(),
        lesson_left: Number(lesson_left),
        rings: rings.filter((score: number) => score >= 0 && score <= 10),
        note: note?.trim() || null
      });
      
      await student.save();
      
      const response = {
        success: true,
        data: {
          uid: student.uid,
          name: student.name,
          phone: student.phone,
          class: student.class,
          subject: student.subject,
          lesson_left: student.lesson_left,
          rings: student.rings || [],
          membership_start_date: student.membership_start_date,
          membership_end_date: student.membership_end_date,
          note: student.note,
          created_at: student.created_at
        },
        message: '学生添加成功'
      };
      
      logger.info(`MongoDB添加学生成功，UID: ${uid}, 姓名: ${name}`);
      res.status(201).json(response);
    } else {
      res.status(500).json({
        success: false,
        error: 'Seqlite/PostgreSQL 添加未在适配器中实现'
      });
    }
  });

  // 通用交易记录列表接口
  public getTransactions = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const CashModel = this.getCashModel();
    
    if (isUsingMongoDB()) {
      const { page = 1, limit = 20, student_id, min_amount, max_amount, is_income } = req.query;
      const skip = (Number(page) - 1) * Number(limit);
      
      // 构建查询条件
      const query: any = {};
      if (student_id) {
        query.student_id = Number(student_id);
      }
      if (min_amount || max_amount) {
        query.cash = {};
        if (min_amount) {
          query.cash.$gte = Math.round(Number(min_amount) * 100);
        }
        if (max_amount) {
          query.cash.$lte = Math.round(Number(max_amount) * 100);
        }
      }
      if (is_income !== undefined) {
        query.cash = query.cash || {};
        if (is_income === 'true') {
          query.cash.$gt = 0;
        } else {
          query.cash.$lt = 0;
        }
      }
      
      const transactions = await CashModel
        .find(query)
        .skip(skip)
        .limit(Number(limit))
        .sort({ created_at: -1 });
      
      const total = await CashModel.countDocuments(query);
      
      const response = {
        success: true,
        data: transactions.map(transaction => ({
          uid: transaction.uid,
          student_id: transaction.student_id,
          amount: transaction.cash / 100,
          note: transaction.note,
          is_income: transaction.cash > 0,
          is_expense: transaction.cash < 0,
          formatted_amount: transaction.getFormattedAmount(),
          description: transaction.getTransactionDescription(),
          installment_plan: transaction.installment_plan,
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
    } else {
      res.status(500).json({
        success: false,
        error: 'Seqlite/PostgreSQL 查询未在适配器中实现'
      });
    }
  });

  // 通用财务统计接口
  public getFinancialStats = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const CashModel = this.getCashModel();
    
    if (isUsingMongoDB()) {
      const { period = 'month' } = req.query;
      
      const stats = await CashModel.getFinancialStats(period as string);
      
      if (stats && stats.length > 0) {
        const stat = stats[0];
        const response = {
          success: true,
          data: {
            period,
            total_income: stat.totalIncome / 100,
            total_expense: stat.totalExpense / 100,
            net_income: (stat.totalIncome - stat.totalExpense) / 100,
            net_profit: (stat.totalIncome - stat.totalExpense) / 100,
            is_profitable: stat.totalIncome > stat.totalExpense,
            transaction_count: stat.transactionCount,
            date_from: new Date(Date.now() - (period === 'week' ? 7 : period === 'month' ? 30 : period === 'quarter' ? 90 : 365) * 24 * 60 * 60 * 1000),
            date_to: new Date()
          }
        };
        
        logger.info(`MongoDB财务统计完成，周期: ${period}`);
        res.json(response);
      } else {
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
      }
    } else {
      res.status(500).json({
        success: false,
        error: 'Seqlite/PostgreSQL 统计未在适配器中实现'
      });
    }
  });

  // 数据库健康检查接口
  public getHealthStatus = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const dbType = isUsingMongoDB() ? 'mongodb' : 'sql';
    
    if (isUsingMongoDB()) {
      const { checkMongoHealth } = await import('@/models');
      const health = await checkMongoHealth();
      
      const response = {
        success: true,
        data: {
          database_type: dbType,
          connection_status: health.status,
          details: health.details,
          timestamp: new Date()
        }
      };
      
      res.json(response);
    } else {
      const response = {
        success: true,
        data: {
          database_type: dbType,
          connection_status: 'healthy',
          details: { message: 'SQL database connection not implemented in adapter' },
          timestamp: new Date()
        }
      };
      
      res.json(response);
    }
  });
}

// 导出控制器实例
const adapterController = new AdapterController();
export default adapterController;