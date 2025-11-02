import { Request, Response } from 'express';
import { Cash, CashClass, ICashDoc } from '@/models/CashMongo';
import { Student } from '@/models/mongo';
import { catchAsync } from '@/middleware/errorHandler';
import logger from '@/utils/logger';

// 类型定义
interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface IPaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// 财务控制器
export class CashController {
  // 获取所有交易记录
  public getAllTransactions = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const {
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'DESC',
      student_id,
      min_amount,
      max_amount,
      is_income,
    } = req.query as any;

    // 构建查询条件
    const whereCondition: any = {};

    if (student_id) {
      whereCondition.student_id = Number(student_id);
    }

    if (min_amount || max_amount) {
      whereCondition.cash = {};
      if (min_amount) {
        whereCondition.cash.$gte = Math.round(Number(min_amount) * 100);
      }
      if (max_amount) {
        whereCondition.cash.$lte = Math.round(Number(max_amount) * 100);
      }
    }

    if (is_income !== undefined) {
      whereCondition.cash = whereCondition.cash || {};
      if (is_income === 'true') {
        whereCondition.cash.$gt = 0;
      } else {
        whereCondition.cash.$lt = 0;
      }
    }

    const sortField = sort_by === 'created_at' ? 'created_at' : sort_by;
    const sortOrder = sort_order === 'DESC' ? -1 : 1;
    const sort = { [sortField]: sortOrder };

    // 获取分页数据
    const result = await CashClass.findWithPagination(
      whereCondition,
      Number(page),
      Number(limit),
      sort
    );

    const responseData = result.data.map(transaction => {
      const student = transaction.student_id ? { uid: transaction.student_id } : null;
      return {
        uid: transaction.uid,
        student_id: transaction.student_id,
        student_name: null, // 暂时为null，后续可以关联查询
        amount: transaction.getAmount(),
        description: this.getTransactionDescription(transaction),
        note: transaction.note,
        is_income: transaction.isIncome(),
        is_expense: !transaction.isIncome(),
        formatted_amount: transaction.getFormattedAmount(),
        created_at: transaction.created_at,
      };
    });

    const paginationResponse: IPaginatedResponse<any> = {
      data: responseData,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };

    const response: IApiResponse<typeof paginationResponse> = {
      success: true,
      data: paginationResponse,
    };

    logger.info(`获取交易记录成功，共 ${result.total} 条记录`);
    res.json(response);
  });

  // 添加普通交易记录
  public addCashTransaction = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const {
      student_id,
      amount,
      note = '',
    } = req.body;

    if (student_id !== null && student_id !== undefined) {
      const student = await Student.findByUid(Number(student_id));
      if (!student) {
        res.status(400).json({
          success: false,
          error: '指定的学员不存在',
        });
        return;
      }
    }

    // 创建交易记录（金额转换为分存储）
    const transaction = await CashClass.create({
      student_id: student_id ? Number(student_id) : null,
      cash: Math.round(Number(amount) * 100), // 转换为分
      note: note?.trim() || null,
    });

    const responseData = {
      uid: transaction.uid,
      student_id: transaction.student_id,
      amount: transaction.getAmount(),
      description: this.getTransactionDescription(transaction),
      note: transaction.note,
      is_income: transaction.isIncome(),
      is_expense: !transaction.isIncome(),
      formatted_amount: transaction.getFormattedAmount(),
      created_at: transaction.created_at,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: '交易记录添加成功',
    };

    logger.info(`添加交易记录成功，UID: ${transaction.uid}, 金额: ¥${amount}`);
    res.status(201).json(response);
  });

  // 添加分期付款交易 - 简化版本
  public addInstallmentTransaction = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const {
      student_id,
      total_amount,
      note = '',
      total_installments,
      frequency,
      due_date,
      current_installment = 1,
    } = req.body;

    // 验证学员是否存在
    if (student_id !== null && student_id !== undefined) {
      const student = await Student.findByUid(Number(student_id));
      if (!student) {
        res.status(400).json({
          success: false,
          error: '指定的学员不存在',
        });
        return;
      }
    }

    // 验证输入
    const validFrequencies = ['Weekly', 'Monthly', 'Quarterly', 'Custom'];
    if (!validFrequencies.includes(frequency)) {
      res.status(400).json({
        success: false,
        error: '无效的付款频率',
      });
      return;
    }

    // 创建交易记录（暂时简化，不创建分期计划表）
    const transaction = await CashClass.create({
      student_id: student_id ? Number(student_id) : null,
      cash: Math.round(Number(total_amount) * 100),
      note: `分期付款: ${note} - 第${current_installment}/${total_installments}期`,
    });

    const responseData = {
      uid: transaction.uid,
      student_id: transaction.student_id,
      amount: transaction.getAmount(),
      description: this.getTransactionDescription(transaction),
      note: transaction.note,
      is_income: transaction.isIncome(),
      is_expense: !transaction.isIncome(),
      formatted_amount: transaction.getFormattedAmount(),
      installment_info: {
        total_installments: Number(total_installments),
        current_installment: Number(current_installment),
        frequency,
        due_date: new Date(due_date),
      },
      created_at: transaction.created_at,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: '分期付款添加成功',
    };

    logger.info(`添加分期付款成功，交易ID: ${transaction.uid}, 期数: ${current_installment}/${total_installments}`);
    res.status(201).json(response);
  });

  // 删除交易记录
  public deleteCashTransaction = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const transaction = await CashClass.findByUid(Number(id));

    if (!transaction) {
      res.status(404).json({
        success: false,
        error: '交易记录不存在',
      });
      return;
    }

    const deleted = await CashClass.deleteByUid(Number(id));

    if (deleted) {
      const response: IApiResponse = {
        success: true,
        message: '交易记录删除成功',
      };

      logger.info(`删除交易记录成功，UID: ${transaction.uid}`);
      res.json(response);
    } else {
      res.status(500).json({
        success: false,
        error: '删除交易记录失败',
      });
    }
  });

  // 搜索现金记录
  public searchCash = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const {
      student_id,
      min_amount,
      max_amount,
      date_from,
      date_to,
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'DESC',
    } = req.query as any;

    // 构建查询条件
    const whereCondition: any = {};

    if (student_id) {
      whereCondition.student_id = Number(student_id);
    }

    if (min_amount || max_amount) {
      whereCondition.cash = {};
      if (min_amount) {
        whereCondition.cash.$gte = Math.round(Number(min_amount) * 100);
      }
      if (max_amount) {
        whereCondition.cash.$lte = Math.round(Number(max_amount) * 100);
      }
    }

    if (date_from || date_to) {
      whereCondition.created_at = {};
      if (date_from) {
        whereCondition.created_at.$gte = new Date(date_from);
      }
      if (date_to) {
        whereCondition.created_at.$lte = new Date(date_to);
      }
    }

    const sortField = sort_by === 'created_at' ? 'created_at' : sort_by;
    const sortOrder = sort_order === 'DESC' ? -1 : 1;
    const sort = { [sortField]: sortOrder };

    // 获取分页数据
    const result = await CashClass.findWithPagination(
      whereCondition,
      Number(page),
      Number(limit),
      sort
    );

    const responseData = result.data.map(transaction => ({
      uid: transaction.uid,
      student_id: transaction.student_id,
      student_name: null, // 暂时为null
      amount: transaction.getAmount(),
      description: this.getTransactionDescription(transaction),
      note: transaction.note,
      is_income: transaction.isIncome(),
      is_expense: !transaction.isIncome(),
      formatted_amount: transaction.getFormattedAmount(),
      created_at: transaction.created_at,
    }));

    const paginationResponse: IPaginatedResponse<any> = {
      data: responseData,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };

    const response: IApiResponse<typeof paginationResponse> = {
      success: true,
      data: paginationResponse,
    };

    logger.info(`搜索现金记录完成，找到 ${result.total} 条记录`);
    res.json(response);
  });

  // 获取交易详情
  public getTransactionById = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const transaction = await CashClass.findByUid(Number(id));

    if (!transaction) {
      res.status(404).json({
        success: false,
        error: '交易记录不存在',
      });
      return;
    }

    // 尝试获取学员信息
    let student = null;
    if (transaction.student_id) {
      student = await Student.findByUid(transaction.student_id);
    }

    const responseData = {
      uid: transaction.uid,
      student_id: transaction.student_id,
      student: student ? {
        uid: student.uid,
        name: student.name,
        phone: student.phone,
        class: student.class,
        subject: student.subject,
      } : null,
      amount: transaction.getAmount(),
      description: this.getTransactionDescription(transaction),
      note: transaction.note,
      is_income: transaction.isIncome(),
      is_expense: !transaction.isIncome(),
      formatted_amount: transaction.getFormattedAmount(),
      created_at: transaction.created_at,
      updated_at: transaction.updated_at,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
    };

    logger.info(`获取交易详情成功，UID: ${transaction.uid}`);
    res.json(response);
  });

  // 私有辅助方法：获取交易描述
  private getTransactionDescription(transaction: ICashDoc): string {
    const amount = transaction.getAmount();
    const prefix = transaction.isIncome() ? '收入' : '支出';
    return `${prefix} ¥${amount.toFixed(2)}`;
  }

  // 获取财务统计信息 - 简化版本
  public getFinancialStats = catchAsync(async (req: Request, res: Response): Promise<void> => {
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

    const transactions = await CashClass.search({
      created_at: { $gte: dateFrom }
    });

    const total_income = transactions
      .filter(t => t.isIncome())
      .reduce((sum, t) => sum + t.getAmount(), 0);

    const total_expense = transactions
      .filter(t => !t.isIncome())
      .reduce((sum, t) => sum + t.getAmount(), 0);

    const net_income = total_income - total_expense;

    // 按学员统计收入
    const studentIncomeMap = new Map<number, number>();
    transactions
      .filter(t => t.isIncome() && t.student_id)
      .forEach(t => {
        const studentId = t.student_id!;
        const current = studentIncomeMap.get(studentId) || 0;
        studentIncomeMap.set(studentId, current + t.getAmount());
      });

    // 简化版本，不查询学员姓名
    const student_income = Array.from(studentIncomeMap.entries())
      .map(([student_id, amount]) => ({
        student_id,
        amount,
        student_name: '学员' + student_id // 简化显示
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10); // 前10名

    const response = {
      success: true,
      data: {
        period,
        date_from: dateFrom,
        date_to: now,
        total_income,
        total_expense,
        net_income,
        transaction_count: transactions.length,
        student_income,
        monthly_stats: [], // 暂时为空数组
      },
    };

    logger.info(`获取财务统计成功，周期: ${period}, 收入: ¥${total_income}, 支出: ¥${total_expense}`);
    res.json(response);
  });

  // 获取分期付款列表 - 简化版本
  public getInstallments = catchAsync(async (req: Request, res: Response): Promise<void> => {
    // 简化实现：返回有分期备注的交易记录
    const {
      student_id,
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'DESC',
    } = req.query as any;

    const whereCondition: any = {
      note: { $regex: '分期付款', $options: 'i' }
    };

    if (student_id) {
      whereCondition.student_id = Number(student_id);
    }

    const sortField = sort_by === 'created_at' ? 'created_at' : sort_by;
    const sortOrder = sort_order === 'DESC' ? -1 : 1;
    const sort = { [sortField]: sortOrder };

    // 获取分页数据
    const result = await CashClass.findWithPagination(
      whereCondition,
      Number(page),
      Number(limit),
      sort
    );

    const responseData = result.data.map(transaction => ({
      uid: transaction.uid,
      plan_id: null, // 暂时为null
      total_amount: transaction.getAmount(),
      total_installments: 1, // 暂时为1
      current_installment: 1,
      frequency: 'Monthly',
      custom_days: null,
      due_date: transaction.created_at,
      status: 'Paid',
      status_text: '已支付',
      frequency_text: '月付',
      installment_amount: transaction.getAmount(),
      progress: 100,
      is_overdue: false,
      days_overdue: 0,
      installment_plan: null,
    }));

    const paginationResponse: IPaginatedResponse<any> = {
      data: responseData,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };

    const response: IApiResponse<typeof paginationResponse> = {
      success: true,
      data: paginationResponse,
    };

    logger.info(`获取分期付款列表成功，共 ${result.total} 条记录`);
    res.json(response);
  });

  // 更新分期付款状态 - 简化版本
  public updateInstallmentStatus = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'Paid', 'Overdue', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: '无效的分期状态',
      });
      return;
    }

    const transaction = await CashClass.findByUid(Number(id));

    if (!transaction) {
      res.status(404).json({
        success: false,
        error: '分期记录不存在',
      });
      return;
    }

    // 更新交易备注来反映状态变化
    const updatedNote = `${transaction.note} - 状态更新为: ${status}`;
    const updatedTransaction = await CashClass.updateByUid(Number(id), { note: updatedNote });

    if (updatedTransaction) {
      logger.info(`更新分期付款状态成功，ID: ${transaction.uid}, 状态: ${status}`);
      res.json({
        success: true,
        data: updatedTransaction,
        message: '分期付款状态更新成功',
      });
    } else {
      res.status(500).json({
        success: false,
        error: '更新分期付款状态失败',
      });
    }
  });
}

// 导出控制器实例
const cashController = new CashController();
export default cashController;