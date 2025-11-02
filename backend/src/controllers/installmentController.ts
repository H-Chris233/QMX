import { Request, Response } from 'express';
import { Student } from '@/models/mongo';
import { Cash } from '@/models/CashMongo';
import { InstallmentPlan, Installment } from '@/models/InstallmentMongo';
import { catchAsync } from '@/middleware/errorHandler';
import logger from '@/utils/logger';

// 分期付款控制器
export class InstallmentController {
  // 获取所有分期计划
  public getAllInstallmentPlans = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const {
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'DESC',
      student_id,
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

    const result = await InstallmentPlan.findWithPagination(
      whereCondition,
      Number(page),
      Number(limit),
      sort
    );

    const responseData = [];

    for (const plan of result.data) {
      const student = plan.student_id ? await Student.findByUid(plan.student_id) : null;
      const installments = await Installment.findByPlanId(plan.uid);
      const paidCount = installments.filter(i => i.status === 'Paid').length;
      const pendingCount = installments.filter(i => i.status === 'Pending').length;
      const overdueCount = installments.filter(i => i.isOverdue()).length;

      responseData.push({
        uid: plan.uid,
        student_id: plan.student_id,
        student: student ? {
          uid: student.uid,
          name: student.name,
          phone: student.phone,
        } : null,
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
        created_at: plan.created_at,
        updated_at: plan.updated_at,
      });
    }

    const response = {
      success: true,
      data: {
        data: responseData,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          total_pages: Math.ceil(result.total / result.limit),
        },
      },
    };

    logger.info(`获取分期计划列表成功，共 ${result.total} 条记录`);
    res.json(response);
  });

  // 获取单个分期计划详情
  public getInstallmentPlanById = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const plan = await InstallmentPlan.findByUid(Number(id));

    if (!plan) {
      res.status(404).json({
        success: false,
        error: '分期计划不存在',
      });
      return;
    }

    const student = plan.student_id ? await Student.findByUid(plan.student_id) : null;
    const installments = await Installment.findByPlanId(plan.uid);

    const paidCount = installments.filter(i => i.status === 'Paid').length;
    const pendingCount = installments.filter(i => i.status === 'Pending').length;
    const overdueCount = installments.filter(i => i.isOverdue()).length;

    const responseData = {
      uid: plan.uid,
      student_id: plan.student_id,
      student: student ? {
        uid: student.uid,
        name: student.name,
        phone: student.phone,
        class: student.class,
        subject: student.subject,
      } : null,
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
        remaining_amount: inst.getRemainingAmount() / 100,
      })),
      created_at: plan.created_at,
      updated_at: plan.updated_at,
    };

    const response = {
      success: true,
      data: responseData,
    };

    logger.info(`获取分期计划详情成功，UID: ${plan.uid}`);
    res.json(response);
  });

  // 创建分期计划
  public createInstallmentPlan = catchAsync(async (req: Request, res: Response): Promise<void> => {
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
    if (student_id) {
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
        total_amount: Math.round(Number(total_amount) * 100),
        total_installments: Number(total_installments),
        frequency,
        custom_days: frequency === 'Custom' ? Number(custom_days) : undefined,
        start_date: new Date(start_date),
        note,
        status: 'Active',
      });

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
          installment_amount: installmentPlan.getInstallmentAmount(),
          due_date: dueDate,
          status: 'Pending',
        });

        installments.push(installment);
      }

      const responseData = {
        plan: {
          uid: installmentPlan.uid,
          student_id: installmentPlan.student_id,
          total_amount: installmentPlan.total_amount / 100,
          total_installments: installmentPlan.total_installments,
          frequency: installmentPlan.frequency,
          custom_days: installmentPlan.custom_days,
          start_date: installmentPlan.start_date,
          status: installmentPlan.status,
          status_text: this.getStatusText(installmentPlan.status),
          frequency_text: this.getFrequencyText(installmentPlan.frequency, installmentPlan.custom_days),
          installment_amount: installmentPlan.getInstallmentAmount() / 100,
        },
        installments: installments.map(inst => ({
          uid: inst.uid,
          current_installment: inst.current_installment,
          installment_amount: inst.installment_amount / 100,
          due_date: inst.due_date,
          status: inst.status,
          status_text: this.getStatusText(inst.status),
          days_overdue: inst.getDaysOverdue(),
          is_overdue: inst.isOverdue(),
        })),
      };

      const response = {
        success: true,
        data: responseData,
        message: '分期计划创建成功',
      };

      logger.info(`创建分期计划成功，UID: ${installmentPlan.uid}, 期数: ${total_installments}`);
      res.status(201).json(response);

    } catch (error) {
      logger.error('创建分期计划失败:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '创建分期计划失败',
      });
    }
  });

  // 更新分期状态
  public updateInstallmentPayment = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status, amount } = req.body;

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
        await Cash.create({
          student_id: plan.student_id,
          cash: installment.installment_amount,
          note: `分期付款: 第${installment.current_installment}/${installment.total_installments}期`,
        });
      }
    }

    const updatedInstallment = await Installment.updateByUid(Number(id), {
      status,
      paid_at: status === 'Paid' ? new Date() : installment.paid_at,
      paid_amount: status === 'Paid' ? (amount ? amount * 100 : installment.installment_amount) : installment.paid_amount,
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

  // 获取逾期分期列表
  public getOverdueInstallments = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const overdueInstallments = await Installment.findOverdue();

    const responseData = [];

    for (const installment of overdueInstallments) {
      const plan = await InstallmentPlan.findByUid(installment.plan_id);
      const student = plan?.student_id ? await Student.findByUid(plan.student_id) : null;

      responseData.push({
        uid: installment.uid,
        plan_id: installment.plan_id,
        current_installment: installment.current_installment,
        total_installments: installment.total_installments,
        installment_amount: installment.installment_amount / 100,
        due_date: installment.due_date,
        days_overdue: installment.getDaysOverdue(),
        overdue_amount: (installment.installment_amount / 100) * (1 + installment.getDaysOverdue() * 0.01),
        plan: plan ? {
          frequency: plan.frequency,
          frequency_text: this.getFrequencyText(plan.frequency, plan.custom_days),
        } : null,
        student: student ? {
          uid: student.uid,
          name: student.name,
          phone: student.phone,
        } : null,
      });
    }

    const totalOverdueAmount = responseData.reduce((sum, item) => sum + item.overdue_amount, 0);

    const response = {
      success: true,
      data: {
        overdue_installments: responseData,
        total_overdue_count: responseData.length,
        total_overdue_amount: Number(totalOverdueAmount.toFixed(2)),
        average_days_overdue: responseData.length > 0 ?
          Math.round(responseData.reduce((sum, item) => sum + item.days_overdue, 0) / responseData.length) : 0,
      },
    };

    logger.info(`获取逾期分期付款统计成功，逾期数量: ${responseData.length}, 逾期金额: ¥${totalOverdueAmount.toFixed(2)}`);
    res.json(response);
  });

  // 删除分期计划
  public deleteInstallmentPlan = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const plan = await InstallmentPlan.findByUid(Number(id));

    if (!plan) {
      res.status(404).json({
        success: false,
        error: '分期计划不存在',
      });
      return;
    }

    // 删除所有相关的分期
    const installments = await Installment.findByPlanId(plan.uid);
    for (const installment of installments) {
      await Installment.deleteByUid(installment.uid);
    }

    // 删除计划
    const deleted = await InstallmentPlan.deleteByUid(Number(id));

    if (deleted) {
      const response = {
        success: true,
        message: '分期计划删除成功',
      };

      logger.info(`删除分期计划成功，UID: ${plan.uid}`);
      res.json(response);
    } else {
      res.status(500).json({
        success: false,
        error: '删除分期计划失败',
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

export default new InstallmentController();