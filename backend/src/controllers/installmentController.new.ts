import { Request, Response } from "express";
import { AppError } from "@/utils/errors";
import { catchAsync } from "@/middleware/errorHandler";
import {
  PaymentFrequency,
  convertAmountToCents,
  normalizePositiveInteger,
  normalizeNote,
} from "@/services/cashBuilder";
import { db } from "../db";
import {
  students,
  cashTransactions,
  installmentPlans,
  installments,
} from "../db/schema";
import {
  eq,
  and,
  isNull,
  count,
  desc,
  asc,
  gt,
  lt,
  sql,
} from "drizzle-orm";
import {
  StudentRepository,
} from "../db/repositories/studentRepository";
import {
  InstallmentPlanRepository,
  InstallmentRepository,
} from "../db/repositories/installmentRepository";
import { CashRepository } from "../db/repositories/cashRepository";
import {
  InstallmentStatus,
  InstallmentPlanStatus,
} from "@/types";
import logger from "@/utils/logger";

/**
 * 分期付款控制器 - 使用事务保护关键操作
 */
export class InstallmentController {
  /**
   * 创建分期付款计划 - 使用事务（最关键场景）
   *
   * 事务涉及的操作：
   * 1. 创建 InstallmentPlan
   * 2. 创建多条 Installment 记录
   * 3. 创建 Cash 交易记录
   * 4. 更新首期的 cash_uid
   * 5. 如果只有一期，立即完成计划
   */
  public createInstallmentPlan = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const {
        student_id,
        total_amount,
        total_installments,
        down_payment = 0,
        frequency = "MONTHLY",
        custom_days,
        start_date,
        note = "",
      } = req.body;

      // 输入验证
      if (student_id !== undefined && student_id !== null) {
        const student = await StudentRepository.findByUid(Number(student_id));
        if (!student) {
          throw AppError.notFound("指定的学员不存在");
        }
      }

      const normalizedFrequency = this.normalizeFrequency(frequency);
      if (!normalizedFrequency) {
        throw AppError.invalidInput("无效的付款频率");
      }

      const totalInstallmentsInt = Number(total_installments);
      if (!Number.isInteger(totalInstallmentsInt) || totalInstallmentsInt <= 0) {
        throw AppError.invalidInput("总期数必须为正整数");
      }

      const customDaysValue =
        normalizedFrequency === PaymentFrequency.CUSTOM
          ? normalizePositiveInteger(custom_days)
          : null;

      if (
        normalizedFrequency === PaymentFrequency.CUSTOM &&
        customDaysValue === null
      ) {
        throw AppError.invalidInput("自定义频率必须指定天数且大于0");
      }

      // 使用事务执行所有操作
      const result = await db.transaction(async (tx) => {
        // 1. 创建分期计划
        const totalAmountCents = convertAmountToCents(total_amount);
        const planData = {
          studentId: student_id ? Number(student_id) : null,
          totalAmount: totalAmountCents,
          downPayment: convertAmountToCents(down_payment),
          totalInstallments: totalInstallmentsInt,
          frequency: normalizedFrequency,
          customDays: customDaysValue ?? null,
          status: InstallmentPlanStatus.ACTIVE,
          startDate: start_date || new Date().toISOString().split('T')[0],
          note: normalizeNote(note),
        };

        const [createdPlan] = await tx
          .insert(installmentPlans)
          .values(planData)
          .returning();

        if (!createdPlan) {
          throw AppError.other("创建分期计划失败");
        }

        // 2. 计算每期金额并创建分期记录
        const remainingAmount =
          createdPlan.totalAmount - createdPlan.downPayment;
        const baseInstallmentAmount = Math.ceil(
          remainingAmount / totalInstallmentsInt
        );

        const installmentRecords = [];
        let dueDate = new Date(createdPlan.startDate.toString());

        for (let i = 1; i <= totalInstallmentsInt; i++) {
          // 计算到期日期
          dueDate = this.calculateNextDueDate(dueDate, normalizedFrequency, customDaysValue);

          // 计算本期金额（最后一期可能不同）
          const installmentAmount =
            i === totalInstallmentsInt
              ? remainingAmount -
                  baseInstallmentAmount * (totalInstallmentsInt - 1)
              : baseInstallmentAmount;

          installmentRecords.push({
            planId: createdPlan.uid,
            studentId: createdPlan.studentId ?? null,
            installmentNumber: i,
            installmentAmount,
            dueDate: dueDate.toISOString().split('T')[0],
            status:
              i === 1 ? InstallmentStatus.PAID : InstallmentStatus.PENDING,
            paidAmount: i === 1 ? installmentAmount : 0,
            paidDate: i === 1 ? new Date().toISOString().split('T')[0] : null,
          });
        }

        const createdInstallments = await tx
          .insert(installments)
          .values(installmentRecords)
          .returning();

        // 3. 创建首期交易记录
        const firstInstallment = createdInstallments[0];
        const totalFirstPayment =
          createdPlan.downPayment + firstInstallment.installmentAmount;

        // @ts-expect-error - 动态 SQL CASE 表达式
        const cashSnapshot = {
          plan_uid: createdPlan.uid,
          installment_uid: firstInstallment.uid,
          installment_number: 1,
          total_installments: totalInstallmentsInt,
          due_date: firstInstallment.dueDate,
          status: InstallmentStatus.PAID,
          note: normalizeNote(note),
        };

        const cashData = {
          studentId: createdPlan.studentId ?? null,
          amount: totalFirstPayment,
          note: this.buildInstallmentNote(normalizeNote(note), 1, totalInstallmentsInt),
          installmentSnapshot: cashSnapshot,
        };

        const [createdCash] = await tx
          .insert(cashTransactions)
          .values(cashData)
          .returning();

        if (!createdCash) {
          throw AppError.other("创建交易记录失败");
        }

        // 4. 更新首期分期的 cash_uid
        await tx
          .update(installments)
          .set({
            cashUid: createdCash.uid,
            paidDate: new Date().toISOString().split('T')[0],
          })
          .where(eq(installments.uid, firstInstallment.uid));

        // 5. 如果只有一期，立即完成计划
        if (totalInstallmentsInt === 1) {
          await tx
            .update(installmentPlans)
            .set({ status: InstallmentPlanStatus.COMPLETED })
            .where(eq(installmentPlans.uid, createdPlan.uid));
        }

        return {
          plan: createdPlan,
          installments: createdInstallments,
          cashRecord: createdCash,
        };
      });

      // 事务完成后
      logger.info(
        `创建分期付款成功，计划ID: ${result.plan.uid}, 期数: ${total_installments}`
      );

      res.status(201).json({
        success: true,
        data: {
          plan: result.plan,
          installments: result.installments,
          cash_record: result.cashRecord,
        },
        message: "分期付款创建成功",
      });
    }
  );

  /**
   * 支付分期付款 - 使用事务
   *
   * 事务涉及：
   * 1. 删除旧的 cash 记录
   * 2. 创建新的 cash 记录
   * 3. 更新 installment 状态
   * 4. 刷新 plan 状态
   */
  public recordInstallmentPayment = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { installment_uid } = req.body;

      const result = await db.transaction(async (tx) => {
        // 1. 获取分期记录
        const [installment] = await tx
          .select()
          .from(installments)
          .where(eq(installments.uid, installment_uid))
          .limit(1);

        if (!installment) {
          throw AppError.notFound("分期记录不存在");
        }
        if (installment.status === InstallmentStatus.PAID) {
          throw AppError.badRequest("该分期已支付");
        }

        // 2. 获取分期计划
        const [plan] = await tx
          .select()
          .from(installmentPlans)
          .where(eq(installmentPlans.uid, installment.planId))
          .limit(1);

        if (!plan) {
          throw AppError.notFound("分期计划不存在");
        }

        // 3. 如果已有支付记录，删除它们
        if (installment.cashUid) {
          await tx
            .delete(cashTransactions)
            .where(eq(cashTransactions.uid, installment.cashUid));
        }

        // 4. 创建新的支付记录
        const cashSnapshot = {
          plan_uid: plan.uid,
          installment_uid: installment.uid,
          installment_number: installment.installmentNumber,
          total_installments: plan.totalInstallments,
          due_date: installment.dueDate,
          status: InstallmentStatus.PAID,
          note: null,
        };

        const cashData = {
          studentId: installment.studentId,
          amount: installment.installmentAmount,
          note: `分期计划第${installment.installmentNumber}期付款`,
          installmentSnapshot: cashSnapshot,
        };

        const [newCash] = await tx
          .insert(cashTransactions)
          .values(cashData)
          .returning();

        if (!newCash) {
          throw AppError.other("创建支付记录失败");
        }

        // 5. 更新分期状态
        await tx
          .update(installments)
          .set({
            status: InstallmentStatus.PAID,
            cashUid: newCash.uid,
            paidAmount: installment.installmentAmount,
            paidDate: new Date().toISOString().split('T')[0],
          })
          .where(eq(installments.uid, installment.uid));

        // 6. 刷新计划状态
        await this.refreshPlanStatus(tx, plan.uid);

        return { installment, plan, cashRecord: newCash };
      });

      logger.info(
        `支付分期成功，分期ID: ${result.installment.uid}，计划ID: ${result.plan.uid}`
      );

      res.json({
        success: true,
        data: {
          installment: result.installment,
          cash_record: result.cashRecord,
        },
        message: "分期付款支付成功",
      });
    }
  );

  /**
   * 删除分期计划 - 使用事务
   *
   * 事务涉及：
   * 1. 删除所有 installment 记录（级联删除）
   * 2. 删除计划本身
   * 3. 检查是否有已支付的限制
   */
  public deleteInstallmentPlan = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { uid } = req.params;

      await db.transaction(async (tx) => {
        // 1. 验证计划存在
        const [plan] = await tx
          .select()
          .from(installmentPlans)
          .where(eq(installmentPlans.uid, Number(uid)))
          .limit(1);

        if (!plan) {
          throw AppError.notFound("分期计划不存在");
        }

        if (plan.status === InstallmentPlanStatus.ACTIVE) {
          // 检查是否有已支付的分期
          const [paidCountResult] = await tx
            .select({ count: count() })
            .from(installments)
            .where(
              and(
                eq(installments.planId, plan.uid),
                eq(installments.status, 'PAID' as const)
              )
            );

          if (paidCountResult.count > 0) {
            throw AppError.badRequest(
              `已有${paidCountResult.count}期已支付，无法删除`
            );
          }
        }

        // 2. 删除所有分期记录（会级联删除，但这里显式删除以确保日志）
        await tx
          .delete(installments)
          .where(eq(installments.planId, plan.uid));

        // 3. 删除计划
        await tx
          .delete(installmentPlans)
          .where(eq(installmentPlans.uid, plan.uid));
      });

      logger.info(`删除分期计划成功，UID: ${uid}`);

      res.json({
        success: true,
        message: "分期计划已删除",
      });
    }
  );

  /**
   * 获取分期计划列表
   */
  public getInstallmentPlans = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const {
        student_id,
        page = 1,
        limit = 20,
        sort_by = "created_at",
        sort_order = "DESC",
        status,
      } = req.query as any;

    const whereCondition = {} as Record<string, any>;

    if (student_id) {
      whereCondition.studentId = Number(student_id);
    }

    if (status && Object.values(InstallmentPlanStatus).includes(status)) {
      whereCondition.status = status;
    }

    const plans = await InstallmentPlanRepository.findByStudentId(
      whereCondition.studentId ?? 0
    );

    // 填充分期统计信息
    const resultData = [];

    for (const plan of plans) {
      const installments = await InstallmentRepository.findByPlanId(plan.uid);

      const paidCount = installments.filter(
        (i) => i.status === 'PAID'
      ).length;
      const pendingCount = installments.filter(
        (i) => i.status === 'PENDING' || i.status === 'OVERDUE'
      ).length;

      const paidAmountCents = installments
        .filter((i) => i.status === 'PAID')
        .reduce((sum, i) => {
          return sum + (i.paidAmount > 0 ? i.paidAmount : 0);
        }, 0);

      resultData.push({
        uid: plan.uid,
        student_id: plan.studentId,
        total_amount: plan.totalAmount / 100, // 转
        total_installments: plan.totalInstallments,
        frequency: plan.frequency,
        custom_days: plan.customDays,
        start_date: plan.startDate,
        status: plan.status,
        status_text: this.getStatusText(plan.status),
        installment_amount: plan.totalAmount / plan.totalInstallments,
        progress: Math.round((paidCount / plan.totalInstallments) * 100),
        paid_count: paidCount,
        pending_count: pendingCount,
        installments: installments.map((inst) => ({
          uid: inst.uid,
          current_installment: inst.installmentNumber,
          installment_amount: inst.installmentAmount / 100, // 转为元
          due_date: inst.dueDate,
          status: inst.status,
          status_text: this.getStatusText(inst.status),
          paid_amount: (inst.paidAmount || 0) / 100, // 转为元
          paid_at: inst.paidDate,
          is_overdue:
            inst.status === 'PENDING' &&
            inst.dueDate &&
            new Date(inst.dueDate) < new Date(),
          days_overdue:
            inst.status === 'PENDING' &&
            inst.dueDate &&
            new Date(inst.dueDate) < new Date()
              ? Math.ceil(
                  (new Date().getTime() -
                    new Date(inst.dueDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              : 0,
        })),
      });
    }

    totalCount = plans.length;

    res.json({
      success: true,
      data: resultData,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / Number(limit)),
      },
    });
  });

  /**
   * 获取单个分期计划详情
   */
  public getInstallmentPlanById = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
    const { uid } = req.params;

    const plan = await InstallmentPlanRepository.findByUid(Number(uid));

    if (!plan) {
      throw AppError.notFound("分期计划不存在");
    }

    const installments = await InstallmentRepository.findByPlanId(plan.uid);

    const paidCount = installments.filter((i) => i.status === 'PAID').length;
    const pendingCount = installments.filter(
      (i) => i.status === 'PENDING' || i.status === 'OVERDUE'
    ).length;

    const paidAmountCents = installments
      .filter((i) => i.status === 'PAID')
      .reduce((sum, i) => {
        return sum + (i.paidAmount ?? 0);
      }, 0);

    const student = plan.studentId
      ? await StudentRepository.findByUid(plan.studentId)
      : null;

    res.json({
      success: true,
      data: {
        uid: plan.uid,
        student_id: plan.studentId,
        student: student
          ? { uid: student.uid, name: student.name }
          : null,
        total_amount: plan.totalAmount / 100,
        total_installments: plan.totalInstallments,
        frequency: plan.frequency,
        custom_days: plan.customDays,
        start_date: plan.startDate,
        status: plan.status,
        status_text: this.getStatusText(plan.status),
        installment_amount: plan.totalAmount / plan.totalInstallments,
        progress: Math.round((paidCount / plan.totalInstallments) * 100),
        paid_count: paidCount,
        pending_count: pendingCount,
        installments: installments.map((inst) => ({
          uid: inst.uid,
          current_installment: inst.installmentNumber,
          installment_amount: inst.installmentAmount / 100,
          due_date: inst.dueDate,
          status: inst.status,
          status_text: this.getStatusText(inst.status),
          paid_amount: (inst.paidAmount || 0) / 100,
          paid_at: inst.paidDate,
          is_overdue:
            inst.status === 'PENDING' &&
            inst.dueDate &&
            new Date(inst.dueDate) < new Date(),
          days_overdue:
            inst.status === 'PENDING' &&
            inst.dueDate &&
            new Date(inst.dueDate) < new Date()
              ? Math.ceil(
                  (new Date().getTime() -
                    new Date(inst.dueDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              : 0,
        })),
      },
    });
  }
  );

  /**
   * 刷新计划状态（事务内部使用）
   */
  private async refreshPlanStatus(
    tx: any,
    planId: number
  ): Promise<void> {
    const planInstallments = await tx
      .select()
      .from(installments)
      .where(eq(installments.planId, planId));

    if (planInstallments.length === 0) {
      // 没有分期记录，完成计划
      await tx
        .update(installmentPlans)
        .set({ status: InstallmentPlanStatus.COMPLETED })
        .where(eq(installmentPlans.uid, planId));
      return;
    }

    const allPaid = planInstallments.every((i) => i.status === 'PAID');
    const allCancelled = planInstallments.every((i) => i.status === 'CANCELLED');

    let newStatus = InstallmentPlanStatus.ACTIVE;
    if (allPaid) {
      newStatus = InstallmentPlanStatus.COMPLETED;
    } else if (allCancelled) {
      newStatus = InstallmentPlanStatus.CANCELLED;
    }

    await tx
      .update(installmentPlans)
      .set({ status: newStatus })
      .where(eq(installmentPlans.uid, planId));
  }

  /**
   * 辅助方法：计算到期日期
   */
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

  /**
   * 辅助方法：构建分期备注
   */
  private buildInstallmentNote(
    baseNote: string,
    current: number,
    total: number
  ): string {
    const label = baseNote ? baseNote : "分期付款";
    return `${label}: 第${current}/${total}期`;
  }

  /**
   * 辅助方法：归一化付款频率
   */
  private normalizeFrequency(
    value: unknown
  ): PaymentFrequency | null {
    if (typeof value !== "string") {
      return null;
    }
    const matched = Object.values(PaymentFrequency).find((item) => item === value);
    return matched ?? null;
  }

  /**
   * 辅助方法：获取状态文本
   */
  private getStatusText(status: string): string {
    switch (status) {
      case InstallmentStatus.PENDING:
        return "待支付";
      case InstallmentStatus.PAID:
        return "已支付";
      case InstallmentStatus.OVERDUE:
        return "已逾期";
      case InstallmentStatus.CANCELLED:
        return "已取消";
      case InstallmentPlanStatus.CANCELLED:
        return "已取消";
      case InstallmentPlanStatus.ACTIVE:
        return "进行中";
      case InstallmentPlanStatus.COMPLETED:
        return "已完成";
      case PlanStatus.ACTIVE:
        return "进行中";
      case PlanStatus.COMPLETED:
        return "已完成";
      default:
        return status;
    }
  }
}

const installmentController = new InstallmentController();
export default installmentController;
