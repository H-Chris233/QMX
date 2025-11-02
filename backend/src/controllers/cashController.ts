import { Request, Response } from 'express';
import { Cash, CashClass, ICashDoc } from '@/models/CashMongo';
import { Student } from '@/models/mongo';
import { InstallmentPlan, Installment } from '@/models/InstallmentMongo';
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

  // 添加分期付款交易 - 完整版本
  public addInstallmentTransaction = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const {
      student_id,
      total_amount,
      note = '',
      total_installments,
      frequency,
      custom_days,
      start_date,
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

    if (frequency === 'Custom' && (!custom_days || custom_days < 1)) {
      res.status(400).json({
        success: false,
        error: '自定义频率必须指定天数且大于0',
      });
      return;
    }

    try {
      // 创建分期计划
      const installmentPlan = await InstallmentPlan.create({
        student_id: student_id ? Number(student_id) : null,
        total_amount: Math.round(Number(total_amount) * 100), // 转换为分
        total_installments: Number(total_installments),
        frequency,
        custom_days: frequency === 'Custom' ? Number(custom_days) : undefined,
        start_date: new Date(start_date),
        note,
        status: 'Active',
      });

      // 计算每期金额
      const installmentAmount = installmentPlan.getInstallmentAmount();

      // 生成所有分期
      const installments = [];
      let currentDate = new Date(start_date);

      for (let i = 1; i <= Number(total_installments); i++) {
        const dueDate = new Date(currentDate);

        // 根据频率计算下次付款日期
        switch (frequency) {
          case 'Weekly':
            currentDate.setDate(currentDate.getDate() + 7);
            break;
          case 'Monthly':
            currentDate.setMonth(currentDate.getMonth() + 1);
            break;
          case 'Quarterly':
            currentDate.setMonth(currentDate.getMonth() + 3);
            break;
          case 'Custom':
            currentDate.setDate(currentDate.getDate() + Number(custom_days));
            break;
        }

        const installment = await Installment.create({
          plan_id: installmentPlan.uid,
          current_installment: i,
          total_installments: Number(total_installments),
          installment_amount: installmentAmount,
          due_date: dueDate,
          status: i === 1 ? 'Paid' : 'Pending', // 第一期立即支付
          paid_amount: i === 1 ? installmentAmount : undefined,
          paid_at: i === 1 ? new Date() : undefined,
        });

        installments.push(installment);
      }

      // 创建交易记录（首期付款）
      const transaction = await CashClass.create({
        student_id: student_id ? Number(student_id) : null,
        cash: Math.round(Number(total_amount) * 100 / Number(total_installments)), // 首期金额
        note: `分期付款: ${note} - 第1/${total_installments}期`,
      });

      const responseData = {
        transaction: {
          uid: transaction.uid,
          student_id: transaction.student_id,
          amount: transaction.getAmount(),
          description: this.getTransactionDescription(transaction),
          note: transaction.note,
          is_income: transaction.isIncome(),
          formatted_amount: transaction.getFormattedAmount(),
          created_at: transaction.created_at,
        },
        plan: {
          uid: installmentPlan.uid,
          student_id: installmentPlan.student_id,
          total_amount: installmentPlan.total_amount / 100,
          total_installments: installmentPlan.total_installments,
          frequency: installmentPlan.frequency,
          custom_days: installmentPlan.custom_days,
          start_date: installmentPlan.start_date,
          status: installmentPlan.status,
        },
        installments: installments.map(inst => ({
          uid: inst.uid,
          current_installment: inst.current_installment,
          total_installments: inst.total_installments,
          installment_amount: inst.installment_amount / 100,
          due_date: inst.due_date,
          status: inst.status,
          paid_amount: (inst.paid_amount || 0) / 100,
          paid_at: inst.paid_at,
        })),
      };

      const response: IApiResponse<typeof responseData> = {
        success: true,
        data: responseData,
        message: '分期付款创建成功',
      };

      logger.info(`创建分期付款成功，交易ID: ${transaction.uid}, 计划ID: ${installmentPlan.uid}, 期数: ${total_installments}`);
      res.status(201).json(response);

    } catch (error) {
      logger.error('创建分期付款失败:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '创建分期付款失败',
      });
    }
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

  // 获取分期付款列表 - 完整版本
  public getInstallments = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const {
      student_id,
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'DESC',
      status,
    } = req.query as any;

    const whereCondition: any = {};

    if (student_id) {
      whereCondition.student_id = Number(student_id);
    }

    if (status) {
      whereCondition.status = status;
    }

    const sortField = sort_by === 'created_at' ? 'created_at' : sort_by;
    const sortOrder = sort_order === 'DESC' ? -1 : 1;
    const sort = { [sortField]: sortOrder };

    // 获取分期计划数据
    const result = await InstallmentPlan.findWithPagination(
      whereCondition,
      Number(page),
      Number(limit),
      sort
    );

    const responseData = [];

    for (const plan of result.data) {
      // 获取该计划的所有分期
      const installments = await Installment.findByPlanId(plan.uid);

      const paidCount = installments.filter(i => i.status === 'Paid').length;
      const pendingCount = installments.filter(i => i.status === 'Pending').length;
      const overdueCount = installments.filter(i => i.isOverdue()).length;

      responseData.push({
        uid: plan.uid,
        student_id: plan.student_id,
        total_amount: plan.total_amount / 100,
        total_installments: plan.total_installments,
        frequency: plan.frequency,
        custom_days: plan.custom_days,
        start_date: plan.start_date,
        status: plan.status,
        status_text: this.getStatusText(plan.status),
        frequency_text: this.getFrequencyText(plan.frequency, plan.custom_days),
        installment_amount: plan.getInstallmentAmount() / 100,
        progress: Math.round((paidCount / plan.total_installments) * 100),
        paid_count: paidCount,
        pending_count: pendingCount,
        overdue_count: overdueCount,
        installments: installments.map(inst => ({
          uid: inst.uid,
          current_installment: inst.current_installment,
          installment_amount: inst.installment_amount / 100,
          due_date: inst.due_date,
          status: inst.status,
          status_text: this.getStatusText(inst.status),
          paid_amount: (inst.paid_amount || 0) / 100,
          paid_at: inst.paid_at,
          days_overdue: inst.getDaysOverdue(),
          is_overdue: inst.isOverdue(),
        })),
      });
    }

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

  // 更新分期付款状态
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

    const installment = await Installment.findByUid(Number(id));

    if (!installment) {
      res.status(404).json({
        success: false,
        error: '分期记录不存在',
      });
      return;
    }

    // 如果是支付，创建交易记录
    if (status === 'Paid' && installment.status !== 'Paid') {
      const plan = await InstallmentPlan.findByUid(installment.plan_id);
      if (plan) {
        await CashClass.create({
          student_id: plan.student_id,
          cash: installment.installment_amount,
          note: `分期付款: 第${installment.current_installment}/${installment.total_installments}期`,
        });
      }
    }

    const updatedInstallment = await Installment.updateByUid(Number(id), {
      status,
      paid_at: status === 'Paid' ? new Date() : installment.paid_at,
      paid_amount: status === 'Paid' ? installment.installment_amount : installment.paid_amount,
    });

    if (updatedInstallment) {
      logger.info(`更新分期付款状态成功，ID: ${installment.uid}, 状态: ${status}`);
      res.json({
        success: true,
        data: updatedInstallment,
        message: '分期付款状态更新成功',
      });
    } else {
      res.status(500).json({
        success: false,
        error: '更新分期付款状态失败',
      });
    }
  });

  // 私有辅助方法：获取状态文本
  private getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'Pending': '待支付',
      'Paid': '已支付',
      'Overdue': '已逾期',
      'Cancelled': '已取消',
      'Active': '进行中',
      'Completed': '已完成',
    };
    return statusMap[status] || status;
  }

  // 私有辅助方法：获取频率文本
  private getFrequencyText(frequency: string, customDays?: number): string {
    const frequencyMap: { [key: string]: string } = {
      'Weekly': '周付',
      'Monthly': '月付',
      'Quarterly': '季付',
      'Custom': customDays ? `${customDays}天一次` : '自定义',
    };
    return frequencyMap[frequency] || frequency;
  }
}

// 导出控制器实例
const cashController = new CashController();
export default cashController;"