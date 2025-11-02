import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { 
  Installment,
  InstallmentPlan,
  Student,
  InstallmentStatus,
  PaymentFrequency,
  IApiResponse
} from '@/models';
import { catchAsync } from '@/middleware/errorHandler';
import logger from '@/utils/logger';

// 分期付款控制器
export class InstallmentController {
  // 获取分期付款状态列表
  public getInstallmentStatuses = catchAsync(async (req: Request, res: Response) => {
    const statuses = Object.values(InstallmentStatus).map(status => ({
      value: status,
      label: this.getStatusText(status),
      color: this.getStatusColor(status),
    }));

    const response: IApiResponse<typeof statuses> = {
      success: true,
      data: statuses,
    };

    res.json(response);
  });

  // 更新分期付款状态
  public updateInstallmentStatus = catchAsync(async (req: Request, res: Response) => {
    const { transactionUid } = req.params;
    const { status } = req.body;

    // 验证状态值
    if (!Object.values(InstallmentStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        error: '无效的分期付款状态',
      });
    }

    // 查找分期付款记录
    const installment = await Installment.findByPk(Number(transactionUid));

    if (!installment) {
      return res.status(404).json({
        success: false,
        error: '分期付款记录不存在',
      });
    }

    const oldStatus = installment.status;
    installment.status = status;
    await installment.save();

    const responseData = {
      uid: installment.uid,
      plan_id: installment.plan_id,
      current_installment: installment.current_installment,
      old_status: oldStatus,
      new_status: status,
      status_text: this.getStatusText(status),
      updated_at: installment.updatedAt,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: '分期付款状态更新成功',
    };

    logger.info(`更新分期付款状态成功，UID: ${installment.uid}, ${oldStatus} -> ${status}`);
    res.json(response);
  });

  // 生成下一期分期
  public generateNextInstallment = catchAsync(async (req: Request, res: Response) => {
    const { planId } = req.params;
    const { dueDate } = req.body;

    // 查找分期计划
    const plan = await InstallmentPlan.findByPk(Number(planId));

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: '分期计划不存在',
      });
    }

    // 查找最后一期分期
    const lastInstallment = await Installment.findOne({
      where: { plan_id: Number(planId) },
      order: [['current_installment', 'DESC']],
    });

    if (!lastInstallment) {
      return res.status(400).json({
        success: false,
        error: '找不到已有的分期记录',
      });
    }

    // 检查是否已经是最后一期
    if (lastInstallment.current_installment >= plan.total_installments) {
      return res.status(400).json({
        success: false,
        error: '已经是最后一期，无法生成新分期',
      });
    }

    // 生成下一期
    const nextInstallmentNumber = lastInstallment.current_installment + 1;
    const nextInstallment = await Installment.create({
      plan_id: plan.plan_id,
      total_amount: plan.total_amount,
      total_installments: plan.total_installments,
      current_installment: nextInstallmentNumber,
      frequency: plan.frequency,
      custom_days: plan.custom_days,
      due_date: new Date(dueDate),
      status: InstallmentStatus.PENDING,
    });

    const responseData = {
      uid: nextInstallment.uid,
      plan_id: nextInstallment.plan_id,
      current_installment: nextInstallment.current_installment,
      total_installments: nextInstallment.total_installments,
      due_date: nextInstallment.due_date,
      status: nextInstallment.status,
      installment_amount: nextInstallment.getInstallmentAmount(),
      frequency_text: nextInstallment.getFrequencyText(),
      created_at: nextInstallment.createdAt,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: `成功生成第 ${nextInstallmentNumber} 期分期`,
    };

    logger.info(`生成下一期分期成功，计划ID: ${planId}, 期数: ${nextInstallmentNumber}/${plan.total_installments}`);
    res.status(201).json(response);
  });

  // 取消分期计划
  public cancelInstallmentPlan = catchAsync(async (req: Request, res: Response) => {
    const { planId } = req.params;

    // 查找分期计划
    const plan = await InstallmentPlan.findByPk(Number(planId));

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: '分期计划不存在',
      });
    }

    // 取消所有未支付的分期
    const [affectedCount] = await Installment.update(
      { status: InstallmentStatus.CANCELLED },
      {
        where: {
          plan_id: Number(planId),
          status: InstallmentStatus.PENDING,
        },
      }
    );

    const responseData = {
      plan_id: plan.plan_id,
      cancelled_installments: affectedCount,
      plan_total_installments: plan.total_installments,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: `成功取消 ${affectedCount} 期未支付的分期`,
    };

    logger.info(`取消分期计划成功，计划ID: ${planId}, 取消期数: ${affectedCount}`);
    res.json(response);
  });

  // 获取分期计划详情
  public getInstallmentsByPlan = catchAsync(async (req: Request, res: Response) => {
    const { planId } = req.params;

    // 查找分期计划
    const plan = await InstallmentPlan.findByPk(Number(planId));

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: '分期计划不存在',
      });
    }

    // 查找所有分期
    const installments = await Installment.findAll({
      where: { plan_id: Number(planId) },
      order: [['current_installment', 'ASC']],
    });

    // 计算统计信息
    const paidCount = installments.filter(i => i.status === InstallmentStatus.PAID).length;
    const pendingCount = installments.filter(i => i.status === InstallmentStatus.PENDING).length;
    const overdueCount = installments.filter(i => i.isOverdue()).length;
    const cancelledCount = installments.filter(i => i.status === InstallmentStatus.CANCELLED).length;

    const responseData = {
      plan: {
        plan_id: plan.plan_id,
        total_amount: plan.total_amount / 100, // 转换为元
        total_installments: plan.total_installments,
        frequency: plan.frequency,
        frequency_text: plan.getFrequencyText(),
        installment_amount: plan.getInstallmentAmount() / 100, // 转换为元
        created_at: plan.createdAt,
      },
      installments: installments.map(installment => ({
        uid: installment.uid,
        current_installment: installment.current_installment,
        due_date: installment.due_date,
        status: installment.status,
        status_text: installment.getStatusText(),
        installment_amount: installment.getInstallmentAmount() / 100, // 转换为元
        is_overdue: installment.isOverdue(),
        days_overdue: installment.getDaysOverdue(),
        progress: installment.getProgress(),
        created_at: installment.createdAt,
        updated_at: installment.updatedAt,
      })),
      statistics: {
        total_installments: installments.length,
        paid_count: paidCount,
        pending_count: pendingCount,
        overdue_count: overdueCount,
        cancelled_count: cancelledCount,
        completion_rate: Number(((paidCount / plan.total_installments) * 100).toFixed(1)),
        total_paid_amount: (paidCount * plan.getInstallmentAmount()) / 100, // 转换为元
        remaining_amount: ((plan.total_installments - paidCount) * plan.getInstallmentAmount()) / 100, // 转换为元
      },
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
    };

    logger.info(`获取分期计划详情成功，计划ID: ${planId}, 总期数: ${installments.length}`);
    res.json(response);
  });

  // 获取即将到期的分期
  public getUpcomingInstallments = catchAsync(async (req: Request, res: Response) => {
    const { days = 7 } = req.query;

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + Number(days));

    const installments = await Installment.findAll({
      where: {
        status: InstallmentStatus.PENDING,
        due_date: {
          [Op.between]: [new Date(), targetDate],
        },
      },
      include: [
        {
          model: InstallmentPlan,
          as: 'plan',
          attributes: ['frequency', 'custom_days'],
        },
      ],
      order: [['due_date', 'ASC']],
    });

    const responseData = installments.map(installment => ({
      uid: installment.uid,
      plan_id: installment.plan_id,
      current_installment: installment.current_installment,
      total_installments: installment.total_installments,
      due_date: installment.due_date,
      days_until_due: Math.ceil((installment.due_date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      installment_amount: installment.getInstallmentAmount() / 100, // 转换为元
      frequency_text: installment.getFrequencyText(),
      status: installment.status,
      status_text: installment.getStatusText(),
      created_at: installment.createdAt,
    }));

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
    };

    logger.info(`获取即将到期分期成功，天数: ${days}, 数量: ${responseData.length}`);
    res.json(response);
  });

  // 工具方法：获取状态文本
  private getStatusText(status: InstallmentStatus): string {
    switch (status) {
      case InstallmentStatus.PENDING:
        return '待支付';
      case InstallmentStatus.PAID:
        return '已支付';
      case InstallmentStatus.OVERDUE:
        return '已逾期';
      case InstallmentStatus.CANCELLED:
        return '已取消';
      default:
        return '未知';
    }
  }

  // 工具方法：获取状态颜色
  private getStatusColor(status: InstallmentStatus): string {
    switch (status) {
      case InstallmentStatus.PENDING:
        return 'orange';
      case InstallmentStatus.PAID:
        return 'green';
      case InstallmentStatus.OVERDUE:
        return 'red';
      case InstallmentStatus.CANCELLED:
        return 'gray';
      default:
        return 'gray';
    }
  }
}

export default new InstallmentController();