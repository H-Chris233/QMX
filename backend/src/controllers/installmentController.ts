import { Request, Response } from "express";
import { Student } from "@/models/mongo";
import { CashClass } from "@/models/CashMongo";
import { Installment, IInstallmentDoc } from "@/models/InstallmentMongo";
import {
  InstallmentPlan,
  IInstallmentPlanDoc,
} from "@/models/InstallmentPlanMongo";
import { InstallmentPlanStatus } from "@/types";
import { catchAsync } from "@/middleware/errorHandler";
import {
  CashBuilder,
  convertAmountToCents,
  normalizeNote,
} from "@/services/cashBuilder";
import { InstallmentStatus, PaymentFrequency } from "@/types";
import logger from "@/utils/logger";
import { AppError } from "@/utils/errors";

const ALLOWED_SORT_FIELDS = new Set([
  "created_at",
  "start_date",
  "total_amount",
  "status",
  "updated_at",
]);

interface IPlanResponseOptions {
  includeInstallments?: boolean;
  installments?: IInstallmentDoc[];
}

// 分期付款控制器
export class InstallmentController {
  // 获取所有分期计划
  public getAllInstallmentPlans = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const {
        page = 1,
        limit = 20,
        sort_by = "created_at",
        sort_order = "DESC",
        student_id,
        status,
      } = req.query as Record<string, any>;

      const filter: Record<string, unknown> = {};

      if (student_id !== undefined && student_id !== null) {
        filter.student_id = Number(student_id);
      }

      if (status) {
        filter.status = status;
      }

      const sortField =
        typeof sort_by === "string" && ALLOWED_SORT_FIELDS.has(sort_by)
          ? sort_by
          : "created_at";
      const sortOrder: 1 | -1 =
        typeof sort_order === "string" && sort_order.toUpperCase() === "ASC"
          ? 1
          : -1;
      const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };

      const result = await InstallmentPlan.findWithPagination(
        filter,
        Number(page),
        Number(limit),
        sort
      );

      const planResponses = await Promise.all(
        result.data.map((plan) => this.buildPlanResponse(plan))
      );

      const response = {
        success: true,
        data: planResponses,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit),
        },
      };

      logger.info(`获取分期计划列表成功，共 ${result.total} 条记录`);
      res.json(response);
    }
  );

  // 获取单个分期计划详情
  public getInstallmentPlanById = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const plan = await InstallmentPlan.findByUid(Number(id));

      if (!plan) {
        throw AppError.notFound("分期计划不存在");
      }

      const responseData = await this.buildPlanResponse(plan, {
        includeInstallments: true,
      });

      logger.info(`获取分期计划详情成功，UID: ${plan.uid}`);
      res.json({
        success: true,
        data: responseData,
      });
    }
  );

  // 创建分期计划
  public createInstallmentPlan = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const {
        student_id,
        total_amount,
        note = "",
        total_installments,
        frequency,
        custom_days,
        start_date,
      } = req.body;

      if (student_id !== null && student_id !== undefined) {
        const student = await Student.findByUid(Number(student_id));
        if (!student) {
          throw AppError.invalidInput("指定的学员不存在");
        }
      }

      const normalizedFrequency = this.normalizeFrequency(frequency);
      if (!normalizedFrequency) {
        throw AppError.invalidInput("无效的付款频率");
      }

      const totalInstallmentsInt = Number(total_installments);
      if (
        !Number.isInteger(totalInstallmentsInt) ||
        totalInstallmentsInt <= 0
      ) {
        throw AppError.invalidInput("总期数必须为正整数");
      }

      let customDaysValue: number | null = null;
      if (normalizedFrequency === PaymentFrequency.CUSTOM) {
        customDaysValue = this.normalizePositiveInteger(custom_days);
        if (customDaysValue === null) {
          throw AppError.invalidInput("自定义频率必须指定天数且大于0");
        }
      }

      const startDate = new Date(start_date);
      if (Number.isNaN(startDate.getTime())) {
        throw AppError.invalidInput("开始日期格式不正确");
      }

      try {
        const totalAmountCents = convertAmountToCents(total_amount);
        const sanitizedNote = normalizeNote(note);

        const plan = await InstallmentPlan.create({
          student_id: student_id !== undefined ? Number(student_id) : null,
          total_amount: totalAmountCents,
          total_installments: totalInstallmentsInt,
          frequency: normalizedFrequency,
          custom_days: customDaysValue ?? undefined,
          start_date: startDate,
          note: sanitizedNote,
          status: InstallmentPlanStatus.ACTIVE,
        });

        const installments: IInstallmentDoc[] = [];
        let updatedFirstInstallment: IInstallmentDoc | null = null;
        let dueDateCursor = new Date(startDate);

        for (let i = 1; i <= totalInstallmentsInt; i++) {
          const amountForInstallment = plan.getInstallmentAmount(i);
          const installment = await Installment.create({
            plan_id: plan.uid,
            installment_amount: amountForInstallment,
            current_installment: i,
            total_installments: totalInstallmentsInt,
            due_date: new Date(dueDateCursor),
            status: InstallmentStatus.PENDING,
            student_id: plan.student_id ?? null,
          });

          installments.push(installment);
          dueDateCursor = this.calculateNextDueDate(
            dueDateCursor,
            normalizedFrequency,
            customDaysValue
          );
        }

        const firstInstallment = installments[0];

        if (firstInstallment) {
          const paymentRecord = await CashBuilder.create()
            .amount(this.formatAmount(firstInstallment.installment_amount))
            .studentId(plan.student_id ?? null)
            .note(
              this.buildInstallmentNote(
                sanitizedNote,
                firstInstallment.current_installment,
                totalInstallmentsInt
              )
            )
            .installment({
              plan_uid: plan.uid,
              installment_uid: firstInstallment.uid,
              installment_number: firstInstallment.current_installment,
              total_installments: totalInstallmentsInt,
              due_date: firstInstallment.due_date,
              status: InstallmentStatus.PAID,
              note: sanitizedNote ?? undefined,
            })
            .build();

          const paidInstallment = await Installment.updateByUid(
            firstInstallment.uid,
            {
              status: InstallmentStatus.PAID,
              paid_amount: firstInstallment.installment_amount,
              paid_at: new Date(),
              cash_uid: paymentRecord.uid,
            }
          );

          if (paidInstallment) {
            updatedFirstInstallment = paidInstallment;
            installments[0] = paidInstallment;
          }
        }

        let finalPlan: IInstallmentPlanDoc | null = plan;

        if (totalInstallmentsInt === 1) {
          const completedPlan = await InstallmentPlan.updateByUid(plan.uid, {
            status: InstallmentPlanStatus.COMPLETED,
          });
          if (completedPlan) {
            finalPlan = completedPlan;
          } else {
            plan.status = InstallmentPlanStatus.COMPLETED;
            finalPlan = plan;
          }
        }

        const responseData = await this.buildPlanResponse(finalPlan ?? plan, {
          includeInstallments: true,
          installments,
        });
        const responsePayload = {
          ...responseData,
          first_installment: updatedFirstInstallment
            ? this.presentInstallment(updatedFirstInstallment)
            : null,
        };

        logger.info(
          `创建分期计划成功，UID: ${plan.uid}, 期数: ${totalInstallmentsInt}`
        );
        res.status(201).json({
          success: true,
          data: responsePayload,
          message: "分期计划创建成功",
        });
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error("创建分期计划失败:", error);
        throw AppError.other("创建分期计划失败", { cause: error });
      }
    }
  );

  // 更新分期状态
  public updateInstallmentPayment = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const { status, amount } = req.body as {
        status: InstallmentStatus;
        amount?: number;
      };

      const normalizedStatus = this.normalizeInstallmentStatus(status);
      if (!normalizedStatus) {
        throw AppError.invalidInput("无效的分期状态");
      }

      const installment = await Installment.findByUid(Number(id));

      if (!installment) {
        throw AppError.notFound("分期记录不存在");
      }

      const plan = await InstallmentPlan.findByUid(installment.plan_id);

      let updatePayload: Record<string, unknown> = { status: normalizedStatus };

      try {
        if (normalizedStatus === InstallmentStatus.PAID) {
          const paidAmountInCents =
            amount !== undefined
              ? convertAmountToCents(amount)
              : installment.installment_amount;
          const paymentTime = new Date();

          if (installment.cash_uid) {
            await CashClass.deleteByUid(installment.cash_uid);
          }

          const cashRecord = await CashBuilder.create()
            .amount(this.formatAmount(paidAmountInCents))
            .studentId(plan?.student_id ?? null)
            .note(
              this.buildInstallmentNote(
                plan?.note ?? null,
                installment.current_installment,
                installment.total_installments
              )
            )
            .installment({
              plan_uid: installment.plan_id,
              installment_uid: installment.uid,
              installment_number: installment.current_installment,
              total_installments: installment.total_installments,
              due_date: installment.due_date,
              status: InstallmentStatus.PAID,
              note: plan?.note ?? undefined,
            })
            .build();

          updatePayload = {
            status: InstallmentStatus.PAID,
            paid_amount: paidAmountInCents,
            paid_at: paymentTime,
            cash_uid: cashRecord.uid,
          };
        } else if (normalizedStatus === InstallmentStatus.PENDING) {
          updatePayload = {
            status: InstallmentStatus.PENDING,
            paid_amount: 0,
            paid_at: null,
          };
        } else if (normalizedStatus === InstallmentStatus.CANCELLED) {
          updatePayload = {
            status: InstallmentStatus.CANCELLED,
            paid_at: null,
          };
        } else if (normalizedStatus === InstallmentStatus.OVERDUE) {
          updatePayload = {
            status: InstallmentStatus.OVERDUE,
          };
        }

        const updatedInstallment = await Installment.updateByUid(
          installment.uid,
          updatePayload
        );

        if (!updatedInstallment) {
          throw AppError.other("更新分期付款状态失败");
        }

        if (plan) {
          await this.refreshPlanStatus(plan.uid);
        }

        const refreshedPlan = plan
          ? await InstallmentPlan.findByUid(plan.uid)
          : null;
        const responseData = {
          installment: this.presentInstallment(updatedInstallment),
          plan: refreshedPlan
            ? await this.buildPlanResponse(refreshedPlan)
            : null,
        };

        logger.info(
          `更新分期付款状态成功，ID: ${installment.uid}, 状态: ${normalizedStatus}`
        );
        res.json({
          success: true,
          data: responseData,
          message: "分期付款状态更新成功",
        });
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error("更新分期付款状态失败:", error);
        throw AppError.other("更新分期付款状态失败", { cause: error });
      }
    }
  );

  // 获取逾期分期列表
  public getOverdueInstallments = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const overdueInstallments = await Installment.findOverdue();

      const enriched = await Promise.all(
        overdueInstallments.map(async (installment) => {
          const plan = await InstallmentPlan.findByUid(installment.plan_id);
          const student = plan?.student_id
            ? await Student.findByUid(plan.student_id)
            : null;

          const remainingAmountCents = installment.getRemainingAmount();
          const daysOverdue = installment.getDaysOverdue();

          return {
            ...this.presentInstallment(installment),
            overdue_amount: this.formatAmount(remainingAmountCents),
            overdue_amount_in_cents: remainingAmountCents,
            overdueAmountInCents: remainingAmountCents,
            plan: plan
              ? {
                  uid: plan.uid,
                  status: plan.status,
                  status_text: this.getStatusText(plan.status),
                  frequency: plan.frequency,
                  frequency_text: this.getFrequencyText(
                    plan.frequency,
                    plan.custom_days ?? undefined
                  ),
                  total_installments: plan.total_installments,
                }
              : null,
            student: student
              ? {
                  uid: student.uid,
                  name: student.name,
                  phone: student.phone,
                }
              : null,
            days_overdue: daysOverdue,
            daysOverdue,
          };
        })
      );

      const totalOverdueAmount = enriched.reduce(
        (sum, item) => sum + (item.overdueAmountInCents ?? 0),
        0
      );
      const totalDays = enriched.reduce(
        (sum, item) => sum + (item.daysOverdue ?? 0),
        0
      );
      const count = enriched.length;

      const response = {
        success: true,
        data: {
          overdue_installments: enriched,
          total_overdue_count: count,
          total_overdue_amount: this.formatAmount(totalOverdueAmount),
          totalOverdueAmountInCents: totalOverdueAmount,
          average_days_overdue: count > 0 ? Math.round(totalDays / count) : 0,
        },
      };

      logger.info(
        `获取逾期分期付款统计成功，逾期数量: ${count}, 逾期金额: ¥${this.formatAmount(
          totalOverdueAmount
        ).toFixed(2)}`
      );
      res.json(response);
    }
  );

  // 更新分期计划
  public updateInstallmentPlan = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const { note, status } = req.body as {
        note?: string;
        status?: InstallmentPlanStatus;
      };

      const plan = await InstallmentPlan.findByUid(Number(id));

      if (!plan) {
        throw AppError.notFound("分期计划不存在");
      }

      const updateData: Record<string, unknown> = {};

      if (note !== undefined) {
        updateData.note = normalizeNote(note);
      }

      if (status && Object.values(InstallmentPlanStatus).includes(status)) {
        updateData.status = status;
      }

      const updatedPlan = await InstallmentPlan.updateByUid(
        plan.uid,
        updateData
      );

      if (!updatedPlan) {
        throw AppError.other("更新分期计划失败");
      }

      const responseData = await this.buildPlanResponse(updatedPlan);

      logger.info(`更新分期计划成功，UID: ${plan.uid}`);

      res.json({
        success: true,
        data: responseData,
        message: "分期计划更新成功",
      });
    }
  );

  // 记录分期支付（POST /:id/payments）
  public recordPayment = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const { installment_index, paid_amount, paid_date } = req.body as {
        installment_index?: number;
        paid_amount?: number;
        paid_date?: string;
      };

      const plan = await InstallmentPlan.findByUid(Number(id));

      if (!plan) {
        throw AppError.notFound("分期计划不存在");
      }

      const installments = await Installment.findByPlanId(plan.uid);

      // 如果没有指定期数，使用第一个未支付的期数
      let targetInstallment: IInstallmentDoc | null = null;
      if (installment_index !== undefined) {
        targetInstallment =
          installments.find(
            (inst) => inst.current_installment === installment_index
          ) || null;
      } else {
        targetInstallment =
          installments.find(
            (inst) => inst.status === InstallmentStatus.PENDING
          ) || null;
      }

      if (!targetInstallment) {
        throw AppError.notFound("未找到可支付的分期记录");
      }

      const paidAmountInCents =
        paid_amount !== undefined
          ? convertAmountToCents(paid_amount)
          : targetInstallment.installment_amount;

      const paidDate = paid_date ? new Date(paid_date) : new Date();

      // 检查是否已支付
      if (targetInstallment.status === InstallmentStatus.PAID) {
        throw AppError.invalidInput("该期已支付");
      }

      // 更新分期状态
      const updatePayload: Record<string, unknown> = {
        status: InstallmentStatus.PAID,
        paid_amount: paidAmountInCents,
        paid_at: paidDate,
      };

      // 如果已有现金交易，删除旧的
      if (targetInstallment.cash_uid) {
        await CashClass.deleteByUid(targetInstallment.cash_uid);
      }

      // 创建新的现金交易记录
      const cashRecord = await CashBuilder.create()
        .amount(this.formatAmount(paidAmountInCents))
        .studentId(plan.student_id ?? null)
        .note(
          this.buildInstallmentNote(
            plan.note,
            targetInstallment.current_installment,
            targetInstallment.total_installments
          )
        )
        .installment({
          plan_uid: plan.uid,
          installment_uid: targetInstallment.uid,
          installment_number: targetInstallment.current_installment,
          total_installments: targetInstallment.total_installments,
          due_date: targetInstallment.due_date,
          status: InstallmentStatus.PAID,
          note: plan.note ?? undefined,
        })
        .build();

      updatePayload.cash_uid = cashRecord.uid;

      const updatedInstallment = await Installment.updateByUid(
        targetInstallment.uid,
        updatePayload
      );

      if (!updatedInstallment) {
        throw AppError.other("记录支付失败");
      }

      // 刷新计划状态
      await this.refreshPlanStatus(plan.uid);
      const refreshedPlan = await InstallmentPlan.findByUid(plan.uid);
      const refreshedInstallments = await Installment.findByPlanId(plan.uid);

      const responseData = {
        installment: this.presentInstallment(updatedInstallment),
        plan: refreshedPlan
          ? await this.buildPlanResponse(refreshedPlan, {
              installments: refreshedInstallments,
            })
          : null,
      };

      logger.info(
        `记录分期支付成功，Plan UID: ${plan.uid}, Installment: ${targetInstallment.current_installment}`
      );

      res.json({
        success: true,
        data: responseData,
        message: "支付记录成功",
      });
    }
  );

  // 删除分期计划
  public deleteInstallmentPlan = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      const plan = await InstallmentPlan.findByUid(Number(id));

      if (!plan) {
        throw AppError.notFound("分期计划不存在");
      }

      const installments = await Installment.findByPlanId(plan.uid);
      for (const installment of installments) {
        await Installment.deleteByUid(installment.uid);
      }

      const deleted = await InstallmentPlan.deleteByUid(plan.uid);

      if (!deleted) {
        throw AppError.other("删除分期计划失败");
      }

      logger.info(`删除分期计划成功，UID: ${plan.uid}`);

      res.json({
        success: true,
        message: "分期计划删除成功",
      });
    }
  );

  private async buildPlanResponse(
    plan: IInstallmentPlanDoc,
    options: IPlanResponseOptions = {}
  ): Promise<Record<string, unknown>> {
    const installments =
      options.installments ?? (await Installment.findByPlanId(plan.uid));
    const student = plan.student_id
      ? await Student.findByUid(plan.student_id)
      : null;

    const stats = this.calculatePlanStats(installments);
    const progress =
      plan.total_installments > 0
        ? Math.round((stats.paidCount / plan.total_installments) * 100)
        : 0;

    const baseResponse: Record<string, unknown> = {
      uid: plan.uid,
      student_id: plan.student_id,
      student: student
        ? {
            uid: student.uid,
            name: student.name,
            phone: student.phone,
          }
        : null,
      total_amount: this.formatAmount(plan.total_amount),
      totalAmountInCents: plan.total_amount,
      total_installments: plan.total_installments,
      frequency: plan.frequency,
      custom_days: plan.custom_days ?? null,
      start_date: plan.start_date,
      status: plan.status,
      note: plan.note,
      status_text: this.getStatusText(plan.status),
      frequency_text: this.getFrequencyText(
        plan.frequency,
        plan.custom_days ?? undefined
      ),
      installment_amount: this.formatAmount(plan.getInstallmentAmount(1)),
      progress,
      paid_count: stats.paidCount,
      pending_count: stats.pendingCount,
      overdue_count: stats.overdueCount,
      paid_amount: this.formatAmount(stats.paidAmount),
      pending_amount: this.formatAmount(stats.pendingAmount),
      overdue_amount: this.formatAmount(stats.overdueAmount),
      remaining_amount: this.formatAmount(stats.remainingAmount),
      created_at: plan.created_at,
      updated_at: plan.updated_at,
    };

    if (options.includeInstallments) {
      baseResponse.installments = installments.map((inst) =>
        this.presentInstallment(inst)
      );
    }

    return baseResponse;
  }

  private calculatePlanStats(installments: IInstallmentDoc[]) {
    return installments.reduce(
      (acc, installment) => {
        const remaining = installment.getRemainingAmount();
        const status = installment.status;

        if (status === InstallmentStatus.PAID) {
          acc.paidCount += 1;
          acc.paidAmount +=
            installment.paid_amount ?? installment.installment_amount;
        } else if (status !== InstallmentStatus.CANCELLED) {
          acc.pendingCount += 1;
          acc.pendingAmount += remaining;
          if (status === InstallmentStatus.OVERDUE || installment.isOverdue()) {
            acc.overdueCount += 1;
            acc.overdueAmount += remaining;
          }
        }

        acc.remainingAmount += remaining;
        return acc;
      },
      {
        paidCount: 0,
        pendingCount: 0,
        overdueCount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        overdueAmount: 0,
        remainingAmount: 0,
      }
    );
  }

  private presentInstallment(installment: IInstallmentDoc) {
    const isOverdue = installment.isOverdue();
    const daysOverdue = installment.getDaysOverdue();
    const remaining = installment.getRemainingAmount();

    return {
      uid: installment.uid,
      plan_id: installment.plan_id,
      planId: installment.plan_id,
      current_installment: installment.current_installment,
      currentInstallment: installment.current_installment,
      total_installments: installment.total_installments,
      totalInstallments: installment.total_installments,
      installment_amount: this.formatAmount(installment.installment_amount),
      installmentAmountInCents: installment.installment_amount,
      due_date: installment.due_date,
      dueDate: installment.due_date,
      status: installment.status,
      status_text: this.getStatusText(installment.status),
      paid_amount: this.formatAmount(installment.paid_amount ?? 0),
      paidAmountInCents: installment.paid_amount ?? 0,
      paid_at: installment.paid_at,
      paidAt: installment.paid_at,
      is_overdue: isOverdue,
      isOverdue,
      days_overdue: daysOverdue,
      daysOverdue,
      remaining_amount: this.formatAmount(remaining),
      remainingAmountInCents: remaining,
      student_id: installment.student_id,
      studentId: installment.student_id,
      cash_uid: installment.cash_uid,
      cashUid: installment.cash_uid,
      created_at: installment.created_at,
      updated_at: installment.updated_at,
    };
  }

  private async refreshPlanStatus(planUid: number): Promise<void> {
    const installments = await Installment.findByPlanId(planUid);
    if (installments.length === 0) {
      return;
    }

    const allPaid = installments.every(
      (inst) => inst.status === InstallmentStatus.PAID
    );
    const activeExists = installments.some(
      (inst) =>
        inst.status === InstallmentStatus.PENDING ||
        inst.status === InstallmentStatus.OVERDUE
    );

    let nextStatus: InstallmentPlanStatus;
    if (allPaid) {
      nextStatus = InstallmentPlanStatus.COMPLETED;
    } else if (activeExists) {
      nextStatus = InstallmentPlanStatus.ACTIVE;
    } else {
      nextStatus = InstallmentPlanStatus.CANCELLED;
    }

    await InstallmentPlan.updateByUid(planUid, { status: nextStatus });
  }

  private getStatusText(status: string): string {
    switch (status) {
      case InstallmentStatus.PENDING:
        return "待支付";
      case InstallmentStatus.PAID:
        return "已支付";
      case InstallmentStatus.OVERDUE:
        return "已逾期";
      case InstallmentStatus.CANCELLED:
      case InstallmentPlanStatus.CANCELLED:
        return "已取消";
      case InstallmentPlanStatus.ACTIVE:
        return "进行中";
      case InstallmentPlanStatus.COMPLETED:
        return "已完成";
      default:
        return status;
    }
  }

  private getFrequencyText(
    frequency: PaymentFrequency,
    customDays?: number | null
  ): string {
    const safeCustomDays =
      typeof customDays === "number" &&
      Number.isFinite(customDays) &&
      customDays > 0
        ? customDays
        : null;

    switch (frequency) {
      case PaymentFrequency.WEEKLY:
        return "周付";
      case PaymentFrequency.MONTHLY:
        return "月付";
      case PaymentFrequency.QUARTERLY:
        return "季付";
      case PaymentFrequency.CUSTOM:
        return safeCustomDays ? `${safeCustomDays}天一次` : "自定义";
      default:
        return frequency;
    }
  }

  private calculateNextDueDate(
    current: Date,
    frequency: PaymentFrequency,
    customDays?: number | null
  ): Date {
    const next = new Date(current);

    switch (frequency) {
      case PaymentFrequency.WEEKLY:
        next.setDate(next.getDate() + 7);
        break;
      case PaymentFrequency.MONTHLY:
        next.setMonth(next.getMonth() + 1);
        break;
      case PaymentFrequency.QUARTERLY:
        next.setMonth(next.getMonth() + 3);
        break;
      case PaymentFrequency.CUSTOM:
        next.setDate(next.getDate() + (customDays ?? 0));
        break;
      default:
        break;
    }

    return next;
  }

  private formatAmount(cents: number): number {
    return Number((cents / 100).toFixed(2));
  }

  private buildInstallmentNote(
    baseNote: string | null,
    current: number,
    total: number
  ): string {
    const label = baseNote ? baseNote : "分期付款";
    return `${label}: 第${current}/${total}期`;
  }

  private normalizeFrequency(value: unknown): PaymentFrequency | null {
    if (typeof value !== "string") {
      return null;
    }
    const matched = Object.values(PaymentFrequency).find(
      (item) => item === value
    );
    return matched ?? null;
  }

  private normalizeInstallmentStatus(value: unknown): InstallmentStatus | null {
    if (typeof value !== "string") {
      return null;
    }
    const matched = Object.values(InstallmentStatus).find(
      (item) => item === value
    );
    return matched ?? null;
  }

  private normalizePositiveInteger(value: unknown): number | null {
    if (value === undefined || value === null || value === "") {
      return null;
    }
    const numeric = Number(value);
    if (!Number.isInteger(numeric) || numeric <= 0) {
      return null;
    }
    return numeric;
  }
}

export default new InstallmentController();
