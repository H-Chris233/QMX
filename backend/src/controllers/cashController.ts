import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { 
  Cash, 
  Student, 
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
  public getAllTransactions = catchAsync(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'DESC',
      student_id,
      min_amount,
      max_amount,
      has_installment,
      date_from,
      date_to,
    } = req.query as any;

    const offset = (Number(page) - 1) * Number(limit);
    
    // 构建查询条件
    const whereCondition: any = {};

    // 学员筛选
    if (student_id) {
      whereCondition.student_id = Number(student_id);
    }

    // 金额范围筛选
    if (min_amount !== undefined && min_amount !== null) {
      whereCondition.cash = { [Op.gte]: Number(min_amount) * 100 }; // 转换为分
    }
    if (max_amount !== undefined && max_amount !== null) {
      whereCondition.cash = { ...whereCondition.cash, [Op.lte]: Number(max_amount) * 100 };
    }

    // 日期范围筛选
    if (date_from && date_to) {
      whereCondition.created_at = {
        [Op.between]: [new Date(date_from), new Date(date_to)],
      };
    } else if (date_from) {
      whereCondition.created_at = { [Op.gte]: new Date(date_from) };
    } else if (date_to) {
      whereCondition.created_at = { [Op.lte]: new Date(date_to) };
    }

    // 执行查询
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
          required: false, // LEFT JOIN
        },
      ],
    });

    // 分期付款筛选（暂时跳过，因为还没有建立关联）
    let filteredTransactions = transactions;
    if (has_installment !== undefined && has_installment !== null) {
      // TODO: 添加分期付款关联后的筛选逻辑
      if (has_installment === 'true') {
        // 筛选有分期付款的交易
      } else {
        // 筛选没有分期付款的交易
      }
    }

    // 构建响应数据
    const responseData = filteredTransactions.map(transaction => ({
      uid: transaction.uid,
      student_id: transaction.student_id,
      student_name: transaction.student?.name || null,
      amount: transaction.cash / 100, // 转换为元
      description: this.getTransactionDescription(transaction),
      note: transaction.note,
      is_installment: false, // TODO: 根据分期付款关联设置
      installment_plan_id: null,
      installment_current: null,
      installment_total: null,
      installment_due_date: null,
      installment_status: null,
      created_at: transaction.createdAt,
      updated_at: transaction.updatedAt,
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
  public addCashTransaction = catchAsync(async (req: Request, res: Response) => {
    const {
      student_id,
      amount,
      note = '',
      is_installment = false,
    } = req.body;

    // 验证学员是否存在（如果提供了学员ID）
    if (student_id !== null && student_id !== undefined) {
      const student = await Student.findByPk(Number(student_id));
      if (!student) {
        return res.status(400).json({
          success: false,
          error: '指定的学员不存在',
        });
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
      amount: transaction.cash / 100, // 转换为元返回
      description: this.getTransactionDescription(transaction),
      note: transaction.note,
      is_installment: false,
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
  public addInstallmentTransaction = catchAsync(async (req: Request, res: Response) => {
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
        return res.status(400).json({
          success: false,
          error: '指定的学员不存在',
        });
      }
    }

    // 验证频率类型
    if (!Object.values(PaymentFrequency).includes(frequency)) {
      return res.status(400).json({
        success: false,
        error: '无效的付款频率',
      });
    }

    try {
      // 创建分期付款计划（如果没有提供plan_id）
      let installmentPlan;
      if (plan_id) {
        installmentPlan = await InstallmentPlan.findByPk(Number(plan_id));
        if (!installmentPlan) {
          return res.status(400).json({
            success: false,
            error: '指定的分期计划不存在',
          });
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
        is_installment: true,
        installment_plan_id: installmentPlan.plan_id,
        installment_current: installment.current_installment,
        installment_total: installment.total_installments,
        installment_due_date: installment.due_date,
        installment_status: installment.status,
        created_at: transaction.createdAt,
      };

      const response: IApiResponse<typeof responseData> = {
        success: true,
        data: responseData,
        message: '分期付款交易添加成功',
      };

      logger.info(`添加分期付款成功，计划ID: ${installmentPlan.plan_id}, 期数: ${installment.current_installment}/${installment.total_installments}`);
      res.status(201).json(response);

    } catch (error) {
      logger.error('创建分期付款失败:', error);
      return res.status(500).json({
        success: false,
        error: '创建分期付款失败',
      });
    }
  });

  // 删除交易记录
  public deleteCashTransaction = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;

    const transaction = await Cash.findByPk(Number(id));

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: '交易记录不存在',
      });
    }

    await transaction.destroy();

    const response: IApiResponse = {
      success: true,
      message: '交易记录删除成功',
    };

    logger.info(`删除交易记录成功，UID: ${transaction.uid}, 金额: ¥${transaction.cash / 100}`);
    res.json(response);
  });

  // 搜索现金记录
  public searchCash = catchAsync(async (req: Request, res: Response) => {
    const {
      student_id,
      min_amount,
      max_amount,
      has_installment,
      date_from,
      date_to,
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'DESC',
    } = req.query as any;

    const offset = (Number(page) - 1) * Number(limit);
    
    // 构建查询条件
    const whereCondition: any = {};

    if (student_id) {
      whereCondition.student_id = Number(student_id);
    }

    if (min_amount !== undefined && min_amount !== null) {
      whereCondition.cash = { [Op.gte]: Number(min_amount) * 100 };
    }
    if (max_amount !== undefined && max_amount !== null) {
      whereCondition.cash = { ...whereCondition.cash, [Op.lte]: Number(max_amount) * 100 };
    }

    if (date_from && date_to) {
      whereCondition.created_at = {
        [Op.between]: [new Date(date_from), new Date(date_to)],
      };
    } else if (date_from) {
      whereCondition.created_at = { [Op.gte]: new Date(date_from) };
    } else if (date_to) {
      whereCondition.created_at = { [Op.lte]: new Date(date_to) };
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
      student_name: transaction.student?.name || null,
      amount: transaction.cash / 100,
      description: this.getTransactionDescription(transaction),
      note: transaction.note,
      is_installment: false,
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
  public getTransactionById = catchAsync(async (req: Request, res: Response) => {
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
      return res.status(404).json({
        success: false,
        error: '交易记录不存在',
      });
    }

    const responseData = {
      uid: transaction.uid,
      student_id: transaction.student_id,
      student: transaction.student,
      amount: transaction.cash / 100,
      description: this.getTransactionDescription(transaction),
      note: transaction.note,
      is_income: transaction.isIncome(),
      is_expense: transaction.isExpense(),
      formatted_amount: transaction.getFormattedAmount(),
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

  // 工具方法：生成交易描述
  private getTransactionDescription(transaction: ICash): string {
    if (transaction.cash > 0) {
      return '收入';
    } else if (transaction.cash < 0) {
      return '支出';
    } else {
      return '其他';
    }
  }
}

export default new CashController();