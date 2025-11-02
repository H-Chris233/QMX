import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { 
  Student, 
  Cash, 
  InstallmentPlan, 
  Installment,
  PaymentFrequency,
  InstallmentStatus,
  ICash,
  ICashCreationAttributes,
  IInstallmentCreationAttributes,
  IApiResponse,
  IPaginatedResponse
} from '@/models';
import { catchAsync } from '@/middleware/errorHandler';
import logger from '@/utils/logger';

// 财务控制器
export class CashController {
  // 获取所有交易记录
  public getAllTransactions = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const {
      page = 1,
      limit = 20,
      sort_by = 'createdAt',
      sort_order = 'DESC',
      student_id,
      min_amount,
      max_amount,
      is_income,
      has_installment,
    } = req.query as any;

    const offset = (Number(page) - 1) * Number(limit);

    // 构建查询条件
    const whereCondition: any = {};

    if (student_id) {
      whereCondition.student_id = Number(student_id);
    }

    if (min_amount || max_amount) {
      whereCondition.cash = {};
      if (min_amount) {
        whereCondition.cash[Op.gte] = Math.round(Number(min_amount) * 100);
      }
      if (max_amount) {
        whereCondition.cash[Op.lte] = Math.round(Number(max_amount) * 100);
      }
    }

    if (is_income !== undefined) {
      whereCondition.cash = whereCondition.cash || {};
      if (is_income === 'true') {
        whereCondition.cash[Op.gt] = 0;
      } else {
        whereCondition.cash[Op.lt] = 0;
      }
    }

    const { count, rows: transactions } = await Cash.findAndCountAll({
      where: whereCondition,
      limit: Number(limit),
      offset,
      order: [[sort_by, sort_order.toUpperCase()]],
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['uid', 'name', 'phone'],
          required: false,
        },
      ],
    });

    const responseData = transactions.map(transaction => ({
      uid: transaction.uid,
      student_id: transaction.student_id,
      student_name: (transaction.student as any)?.name || null,
      amount: transaction.cash / 100,
      description: this.getTransactionDescription(transaction),
      note: transaction.note,
      is_income: transaction.cash > 0,
      is_expense: transaction.cash < 0,
      formatted_amount: transaction.cash >= 0 ? `+¥${(transaction.cash / 100).toFixed(2)}` : `-¥${Math.abs(transaction.cash / 100).toFixed(2)}`,
      created_at: transaction.createdAt,
    }));

    const paginationResponse: IPaginatedResponse<any> = {
      data: responseData,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        total_pages: Math.ceil(count / Number(limit)),
      },
    };

    const response: IApiResponse<typeof paginationResponse> = {
      success: true,
      data: paginationResponse,
    };

    logger.info(`获取交易记录成功，共 ${count} 条记录`);
    res.json(response);
  });

  // 添加普通交易记录
  public addCashTransaction = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const {
      student_id,
      amount,
      note = '',
      is_installment = false,
    } = req.body;

    if (student_id !== null && student_id !== undefined) {
      const student = await Student.findByPk(Number(student_id));
      if (!student) {
        res.status(400).json({
          success: false,
          error: '指定的学员不存在',
        });
        return;
      }
    }

    // 创建交易记录（金额转换为分存储）
    const transaction = await Cash.create({
      student_id: student_id ? Number(student_id) : null,
      cash: Math.round(Number(amount) * 100), // 转换为分
      note: note?.trim() || null,
    });

    const responseData = {
      uid: transaction.uid,
      student_id: transaction.student_id,
      amount: transaction.cash / 100,
      description: this.getTransactionDescription(transaction),
      note: transaction.note,
      is_income: transaction.cash > 0,
      is_expense: transaction.cash < 0,
      formatted_amount: transaction.cash >= 0 ? `+¥${(transaction.cash / 100).toFixed(2)}` : `-¥${Math.abs(transaction.cash / 100).toFixed(2)}`,
      created_at: transaction.createdAt,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: '交易记录添加成功',
    };

    logger.info(`添加交易记录成功，UID: ${transaction.uid}, 金额: ¥${amount}`);
    res.status(201).json(response);
  });

  // 添加分期付款交易
  public addInstallmentTransaction = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const {
      student_id,
      total_amount,
      note = '',
      total_installments,
      frequency,
      due_date,
      current_installment = 1,
      plan_id,
    } = req.body;

    // 验证学员是否存在
    if (student_id !== null && student_id !== undefined) {
      const student = await Student.findByPk(Number(student_id));
      if (!student) {
        res.status(400).json({
          success: false,
          error: '指定的学员不存在',
        });
        return;
      }
    }

    // 验证频率类型
    if (!Object.values(PaymentFrequency).includes(frequency)) {
      res.status(400).json({
        success: false,
        error: '无效的付款频率',
      });
      return;
    }

    try {
      // 创建分期付款计划（如果没有提供plan_id）
      let installmentPlan;
      if (plan_id) {
        installmentPlan = await InstallmentPlan.findByPk(Number(plan_id));
        if (!installmentPlan) {
          res.status(400).json({
            success: false,
            error: '指定的分期计划不存在',
          });
          return;
        }
      } else {
        installmentPlan = await InstallmentPlan.create({
          total_amount: Math.round(Number(total_amount) * 100), // 转换为分
          total_installments: Number(total_installments),
          frequency,
          custom_days: frequency === PaymentFrequency.CUSTOM ? req.body.custom_days : null,
        });
      }

      // 创建首期分期付款
      const installment = await Installment.create({
        plan_id: installmentPlan.plan_id,
        total_amount: Math.round(Number(total_amount) * 100),
        total_installments: Number(total_installments),
        current_installment: Number(current_installment),
        frequency,
        custom_days: frequency === PaymentFrequency.CUSTOM ? req.body.custom_days : null,
        due_date: new Date(due_date),
        status: InstallmentStatus.PENDING,
      });

      // 创建对应的交易记录
      const transaction = await Cash.create({
        student_id: student_id ? Number(student_id) : null,
        cash: Math.round(Number(total_amount) * 100),
        note: note?.trim() || null,
      });

      const responseData = {
        uid: transaction.uid,
        student_id: transaction.student_id,
        amount: transaction.cash / 100,
        description: this.getTransactionDescription(transaction),
        note: transaction.note,
        is_income: transaction.cash > 0,
        is_expense: transaction.cash < 0,
        formatted_amount: transaction.cash >= 0 ? `+¥${(transaction.cash / 100).toFixed(2)}` : `-¥${Math.abs(transaction.cash / 100).toFixed(2)}`,
        installment_plan: {
          plan_id: installmentPlan.plan_id,
          total_amount: installmentPlan.total_amount / 100,
          total_installments: installmentPlan.total_installments,
          frequency: installmentPlan.frequency,
        },
        installment: {
          uid: installment.uid,
          current_installment: installment.current_installment,
          due_date: installment.due_date,
          status: installment.status,
        },
        created_at: transaction.createdAt,
      };

      const response: IApiResponse<typeof responseData> = {
        success: true,
        data: responseData,
        message: '分期付款添加成功',
      };

      logger.info(`添加分期付款成功，计划ID: ${installmentPlan.plan_id}, 期数: ${installment.current_installment}/${installment.total_installments}`);
      res.status(201).json(response);

    } catch (error) {
      logger.error('创建分期付款失败:', error);
      res.status(500).json({
        success: false,
        error: '创建分期付款失败',
      });
    }
  });

  // 删除交易记录
  public deleteCashTransaction = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const transaction = await Cash.findByPk(Number(id));

    if (!transaction) {
      res.status(404).json({
        success: false,
        error: '交易记录不存在',
      });
      return;
    }

    await transaction.destroy();

    const response: IApiResponse = {
      success: true,
      message: '交易记录删除成功',
    };

    logger.info(`删除交易记录成功，UID: ${transaction.uid}`);
    res.json(response);
  });

  // 搜索现金记录
  public searchCash = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const {
      student_id,
      min_amount,
      max_amount,
      has_installment,
      date_from,
      date_to,
      page = 1,
      limit = 20,
      sort_by = 'createdAt',
      sort_order = 'DESC',
    } = req.query as any;

    const offset = (Number(page) - 1) * Number(limit);

    // 构建查询条件
    const whereCondition: any = {};

    if (student_id) {
      whereCondition.student_id = Number(student_id);
    }

    if (min_amount || max_amount) {
      whereCondition.cash = {};
      if (min_amount) {
        whereCondition.cash[Op.gte] = Math.round(Number(min_amount) * 100);
      }
      if (max_amount) {
        whereCondition.cash[Op.lte] = Math.round(Number(max_amount) * 100);
      }
    }

    if (date_from || date_to) {
      whereCondition.createdAt = {};
      if (date_from) {
        whereCondition.createdAt[Op.gte] = new Date(date_from);
      }
      if (date_to) {
        whereCondition.createdAt[Op.lte] = new Date(date_to);
      }
    }

    const { count, rows: transactions } = await Cash.findAndCountAll({
      where: whereCondition,
      limit: Number(limit),
      offset,
      order: [[sort_by, sort_order.toUpperCase()]],
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['uid', 'name', 'phone'],
          required: false,
        },
      ],
    });

    const responseData = transactions.map(transaction => ({
      uid: transaction.uid,
      student_id: transaction.student_id,
      student_name: (transaction.student as any)?.name || null,
      amount: transaction.cash / 100,
      description: this.getTransactionDescription(transaction),
      note: transaction.note,
      is_income: transaction.cash > 0,
      is_expense: transaction.cash < 0,
      formatted_amount: transaction.cash >= 0 ? `+¥${(transaction.cash / 100).toFixed(2)}` : `-¥${Math.abs(transaction.cash / 100).toFixed(2)}`,
      created_at: transaction.createdAt,
    }));

    const paginationResponse: IPaginatedResponse<any> = {
      data: responseData,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        total_pages: Math.ceil(count / Number(limit)),
      },
    };

    const response: IApiResponse<typeof paginationResponse> = {
      success: true,
      data: paginationResponse,
    };

    logger.info(`搜索现金记录完成，找到 ${count} 条记录`);
    res.json(response);
  });

  // 获取交易详情
  public getTransactionById = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const transaction = await Cash.findByPk(Number(id), {
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['uid', 'name', 'phone', 'class', 'subject'],
        },
      ],
    });

    if (!transaction) {
      res.status(404).json({
        success: false,
        error: '交易记录不存在',
      });
      return;
    }

    const responseData = {
      uid: transaction.uid,
      student_id: transaction.student_id,
      student: transaction.student,
      amount: transaction.cash / 100,
      description: this.getTransactionDescription(transaction),
      note: transaction.note,
      is_income: transaction.cash > 0,
      is_expense: transaction.cash < 0,
      formatted_amount: transaction.cash >= 0 ? `+¥${(transaction.cash / 100).toFixed(2)}` : `-¥${Math.abs(transaction.cash / 100).toFixed(2)}`,
      created_at: transaction.createdAt,
      updated_at: transaction.updatedAt,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
    };

    logger.info(`获取交易详情成功，UID: ${transaction.uid}`);
    res.json(response);
  });

  // 私有辅助方法：获取交易描述
  private getTransactionDescription(transaction: ICash): string {
    const amount = Math.abs(transaction.cash) / 100;
    const prefix = transaction.cash >= 0 ? '收入' : '支出';
    return `${prefix} ¥${amount.toFixed(2)}`;
  }

  // 获取财务统计信息
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

    const transactions = await Cash.findAll({
      where: {
        createdAt: {
          [Op.gte]: dateFrom
        }
      },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['uid', 'name'],
          required: false,
        },
      ],
    });

    const total_income = transactions
      .filter(t => t.cash > 0)
      .reduce((sum, t) => sum + t.cash, 0) / 100;

    const total_expense = transactions
      .filter(t => t.cash < 0)
      .reduce((sum, t) => sum + Math.abs(t.cash), 0) / 100;

    const net_income = total_income - total_expense;

    // 按学员统计收入
    const studentIncomeMap = new Map<number, number>();
    transactions
      .filter(t => t.cash > 0 && t.student_id)
      .forEach(t => {
        const studentId = t.student_id!;
        const current = studentIncomeMap.get(studentId) || 0;
        studentIncomeMap.set(studentId, current + t.cash / 100);
      });

    const student_income = Array.from(studentIncomeMap.entries())
      .map(([student_id, amount]) => ({
        student_id,
        amount,
        student_name: (transactions.find(t => t.student_id === student_id)?.student as any)?.name || '未知学员'
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10); // 前10名

    // 按月统计（如果是年或季度查询）
    let monthly_stats = [];
    if (period === 'year' || period === 'quarter') {
      const monthlyMap = new Map<string, { income: number; expense: number }>();
      
      transactions.forEach(t => {
        const monthKey = t.createdAt.toISOString().slice(0, 7); // YYYY-MM
        const current = monthlyMap.get(monthKey) || { income: 0, expense: 0 };
        
        if (t.cash > 0) {
          current.income += t.cash / 100;
        } else {
          current.expense += Math.abs(t.cash) / 100;
        }
        
        monthlyMap.set(monthKey, current);
      });
      
      monthly_stats = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({
          month,
          income: data.income,
          expense: data.expense,
          net: data.income - data.expense
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
    }

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
        monthly_stats,
      },
    };

    logger.info(`获取财务统计成功，周期: ${period}, 收入: ¥${total_income}, 支出: ¥${total_expense}`);
    res.json(response);
  });

  // 获取分期付款列表
  public getInstallments = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const {
      student_id,
      status,
      page = 1,
      limit = 20,
      sort_by = 'due_date',
      sort_order = 'ASC',
    } = req.query as any;

    const offset = (Number(page) - 1) * Number(limit);

    const whereCondition: any = {};
    
    if (student_id) {
      whereCondition.student_id = Number(student_id);
    }

    if (status) {
      whereCondition.status = status;
    }

    const { count, rows: installments } = await Installment.findAndCountAll({
      where: whereCondition,
      limit: Number(limit),
      offset,
      order: [[sort_by, sort_order.toUpperCase()]],
      include: [
        {
          model: InstallmentPlan,
          as: 'installment_plan',
          attributes: ['plan_id', 'total_amount', 'total_installments', 'frequency'],
          required: true,
        },
      ],
    });

    const responseData = installments.map(installment => ({
      uid: installment.uid,
      plan_id: installment.plan_id,
      total_amount: installment.total_amount / 100,
      total_installments: installment.total_installments,
      current_installment: installment.current_installment,
      frequency: installment.frequency,
      custom_days: installment.custom_days,
      due_date: installment.due_date,
      status: installment.status,
      status_text: installment.getStatusText(),
      frequency_text: installment.getFrequencyText(),
      installment_amount: installment.getInstallmentAmount(),
      progress: installment.getProgress(),
      is_overdue: installment.isOverdue(),
      days_overdue: installment.getDaysOverdue(),
      installment_plan: installment.installment_plan,
    }));

    const paginationResponse: IPaginatedResponse<any> = {
      data: responseData,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        total_pages: Math.ceil(count / Number(limit)),
      },
    };

    const response: IApiResponse<typeof paginationResponse> = {
      success: true,
      data: paginationResponse,
    };

    logger.info(`获取分期付款列表成功，共 ${count} 条记录`);
    res.json(response);
  });

  // 更新分期付款状态
  public updateInstallmentStatus = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status } = req.body;

    if (!Object.values(InstallmentStatus).includes(status)) {
      res.status(400).json({
        success: false,
        error: '无效的分期状态',
      });
      return;
    }

    const installment = await Installment.findByPk(Number(id));
    
    if (!installment) {
      res.status(404).json({
        success: false,
        error: '分期记录不存在',
      });
      return;
    }

    await installment.update({ status });

    // 如果是已支付，创建对应的交易记录
    if (status === InstallmentStatus.PAID) {
      await Cash.create({
        student_id: null, // 这里需要根据业务逻辑设置
        cash: installment.getInstallmentAmount() * 100, // 转换为分
        note: JSON.stringify({
          installment_id: installment.plan_id,
          installment_number: installment.current_installment,
          type: 'installment_payment'
        }),
      });
    }

    logger.info(`更新分期付款状态成功，ID: ${installment.uid}, 状态: ${status}`);
    
    res.json({
      success: true,
      data: installment,
      message: '分期付款状态更新成功',
    });
  });
}

// 导出控制器实例
const cashController = new CashController();
export default cashController;