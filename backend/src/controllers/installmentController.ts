import { Request, Response } from "express";
import { AppError } from "@/utils/errors";
import { catchAsync } from "@/middleware/errorHandler";
import {
  PaymentFrequency,
  convertAmountToCents,
  normalizeNote,
} from "@/services/cashBuilder";
import { InstallmentStatus, InstallmentPlanStatus } from "@/types";
import logger from "@/utils/logger";
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
  isNotNull,
  count,
  sql,
  lt,
  desc,
  asc,
} from "drizzle-orm";
import {
  StudentRepository,
} from "../db/repositories/studentRepository";
import {
  InstallmentPlanRepository,
  InstallmentRepository,
} from "../db/repositories/installmentRepository";
import { CashRepository } from "../db/repositories/cashRepository";

// 原有的排序字段映射
const ALLOWED_SORT_FIELDS = new Set([
  "created_at",
  "start_date",
  "total_amount",
  "status",
  "updated_at",
]) as const;

type SortField = (typeof ALLOWED_SORT_FIELDS)[number];

interface IPlanResponseOptions {
  includeInstallments?: boolean;
  installments?: any[];
}

// 分期付款控制器
export class InstallmentController {
  /**
   * 获取所有分期计划
   */
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
      filter.studentId = Number(student_id);
    }

    if (status && Object.values(InstallmentPlanStatus).includes(status)) {
      filter.status = status;
    }

    let sortOrder: 1 | -1 = -1;
    if (typeof sort_order === "string" && sort_order.toUpperCase() === "ASC") {
      sortOrder = 1;
    }

    let sortField: SortField = sort_by as SortField | "created_at";
    if (
      typeof sort_by === "string" &&
      ALLOWED_SORT_FIELDS.has(sort_by)
    ) {
      sortField = sort_by as SortField;
    }

    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };

    // 获取所有计划（不分页，需要完整统计）
    const plans = await InstallmentPlanRepository.findAll();

    // 计算所有计划的统计信息
    const enrichedPlans = await Promise.all(
      plans.map(async (plan) => {
        const installments =
          await InstallmentRepository.findByPlanId(plan.uid);
        const student = plan.studentId
          ? await StudentRepository.findByUid(plan.studentId)
          : null;

        // 计算统计数据
        const stats = this.calculatePlanStats(installments);
        const progress =
          plan.totalInstallments > 0
            ? Math.round((stats.paidCount / plan.totalInstallments) * 100)
            : 0;

        return {
          ...plan,
          installments,
          student,
          stats,
          progress,
        };
      })
    );

    // 如果没有学生ID参数，应用分页
    let displayPlans = enrichedPlans;
    let totalCount = enrichedPlans.length;
    let totalPages = 1;

    if (!student_id && (!status || status === "undefined")) {
      const startIndex = (Number(page) - 1) * Number(limit);
      displayPlans = enrichedPlans.slice(startIndex, startIndex + Number(limit));
      totalCount = enrichedPlans.length;
      totalPages = Math.ceil(totalCount / Number(limit));
    }

    // 构建响应
    const responseData = await Promise.all(
      displayPlans.map((item) =>
        this.buildPlanResponse(item, {
          includeInstallments: true,
          installments: item.installments,
        })
      )
    );

    res.json({
      success: true,
      data: responseData,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        total_pages: totalPages,
      },
    });
  });

  /**
   * 获取逾期分期列表
   */
  public getOverdueInstallments = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
    const overdueInstallments = await InstallmentRepository.findOverdue();

    const enriched = await Promise.all(
      overdueInstallments.map(async (installment) => {
        const plan = await InstallmentPlanRepository.findByUid(
          installment.planId
        );
        const student = plan?.studentId
          ? await StudentRepository.findByUid(plan.studentId)
          : null;

        const remainingAmountCents = installment.installmentAmount -
          (installment.paidAmount ?? 0);
        const daysOverdue = this.getDaysOverdue(installment.dueDate);

        return {
          uid: installment.uid,
          plan_id: installment.planId,
          current_installment: installment.installmentNumber,
          installment_amount: this.formatAmount(
            installment.installmentAmount
          ),
          due_date: installment.dueDate,
          status: installment.status,
          status_text: this.getStatusText(installment.status),
          paid_date: installment.paidDate,
          paid_amount: this.formatAmount(
            installment.paidAmount ?? 0
          ),
          is_overdue: daysOverdue > 0,
          days_overdue: daysOverdue,
          overdue_amount: this.formatAmount(remainingAmountCents),
          remaining_amount: this.formatAmount(remainingAmountCents),
          student: student
            ? { uid: student.uid, name: student.name, phone: student.phone }
            : null,
        };
      })
    );

    // 计算汇总统计
    const totalOverdueAmount = enriched.reduce(
      (sum, item) => sum + (item.overdueAmountInCents ?? 0),
      0
    );
    const totalDays = enriched.reduce(
      (sum, item) => sum + (item.daysOverdue ?? 0),
      0
    );
    const count = enriched.length;

    const averageDaysOverdue =
      count > 0 ? Math.round(totalDays / count) : 0;

    res.json({
      success: true,
      data: {
        overdue_installments: enriched,
        total_overdue_count: count,
        total_overdue_amount: this.formatAmount(totalOverdueAmount),
        average_days_overdue: averageDaysOverdue,
      },
    });
  });

  /**
   * 获取单个分期计划详情
   */
  public getInstallmentPlanById = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const plan = await InstallmentPlanRepository.findByUid(Number(id));

    if (!plan) {
      throw AppError.notFound("分期计划不存在");
    }

    const installments =
      await InstallmentRepository.findByPlanId(plan.uid);
    const student = plan.studentId
      ? await StudentRepository.findByUid(plan.studentId)
      : null;

    await this.refreshPlanStatus(plan.uid);
    const refreshedPlan = await InstallmentPlanRepository.findByUid(plan.uid);
    const refreshedInstallments =
      await InstallmentRepository.findByPlanId(plan.uid);

    const responseData = await this.buildPlanResponse(
      refreshedPlan ?? plan,
      {
        includeInstallments: true,
        installments: refreshedInstallments,
      }
    );

    res.json({
      success: true,
      data: responseData,
    });
  });

  /**
   * 创建分期计划 - 使用事务
   *
   * 事务涉及：
   * 1. 创建 InstallmentPlan
   * 2. 创建多条 Installment 记录
   * 3. 创建首期 Cash 交易
   * 4. 更新首期 Installment 状态和 cash_uid
   * 5. 如果只有一期，立即完成计划
   */
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

    // 使用事务执行所有操作
    const result = await db.transaction(async (tx) => {
      // 1. 创建分期计划
      const totalAmountCents = convertAmountToCents(total_amount);
      const planData = {
        studentId: student_id ? Number(student_id) : null,
        totalAmount: totalAmountCents,
        downPayment: 0,
        totalInstallments: totalInstallmentsInt,
        frequency: normalizedFrequency,
        customDays: customDaysValue ?? null,
        status: InstallmentPlanStatus.ACTIVE,
        startDate: startDate.toISOString().split('T')[0],
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
        dueDate = this.calculateNextDueDate(
          dueDate,
          normalizedFrequency,
          customDaysValue
        );

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
            i === 1
              ? InstallmentStatus.PAID
              : InstallmentStatus.PENDING,
          paidAmount: i === 1 ? installmentAmount : 0,
          paidDate:
            i === 1 ? new Date().toISOString().split('T')[0] : null,
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

      const cashSnapshot = {
        plan_uid: createdPlan.uid,
        installment_uid: firstInstallment.uid,
        installment_number: 1,
        total_installments: totalInstallmentsInt,
        due_date: firstInstallment.dueDate,
        status: InstallmentStatus.PAID,
        note: createdPlan.note,
      };

      const cashData = {
        studentId: createdPlan.studentId ?? null,
        amount: totalFirstPayment,
        note: this.buildInstallmentNote(
          normalizeNote(createdPlan.note) ?? "",
          1,
          totalInstallmentsInt
        ),
        installmentSnapshot: cashSnapshot,
      };

      const [createdCash] = await tx
        .insert(cashTransactions)
        .values(cashData)
        .returning();

      if (!createdCash) {
        throw AppError.other("创建首期交易记录失败");
      }

      // 4. 更新首期分期的 cashUid
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
          .set({
            status: InstallmentPlanStatus.COMPLETED,
          })
          .where(eq(installmentPlans.uid, createdPlan.uid));
      }

      // 6. 获取更新的第一期数据
      const [updatedFirst] = await tx
        .select()
        .from(installments)
        .where(eq(installments.uid, firstInstallment.uid))
        .limit(1);

      logger.info(
        `创建分期付款成功，计划ID: ${createdPlan.uid}, 期数: ${totalInstallmentsInt}`
      );

      return {
        plan: createdPlan,
        installments: createdInstallments,
        cashRecord: createdCash,
        updatedInstallment: updatedFirst,
      };
    });

    // 事务成功后刷新计划状态
    await this.refreshPlanStatus(result.plan.uid);

    // 重新获取计划数据以获取最新状态
    const plan = await InstallmentPlanRepository.findByUid(result.plan.uid);
    const installments =
      await InstallmentRepository.findByPlanId(result.plan.uid);

    const responseData = await this.buildPlanResponse(plan, {
      includeInstallments: true,
      installments,
    });

    res.status(201).json({
      success: true,
      data: responseData,
      message: "分期计划创建成功",
    });
  });

  /**
   * PUT /:id/payment - 快捷设置为已支付（简化版）
   * 完整的支付逻辑在 recordPayment 中
   */
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

    const installment = await InstallmentRepository.findByUid(Number(id));

    if (!installment) {
      throw AppError.notFound("分期记录不存在");
    }

    const plan = await InstallmentPlanRepository.findByUid(
      installment.planId
    );

    if (!plan) {
      throw AppError.notFound("分期计划不存在");
    }

    let updateData: Record<string, unknown> = {
      status: normalizedStatus,
      updatedAt: new Date(),
    };

    // 使用事务执行所有更新
    const result = await db.transaction(async (tx) => {
      // 处理已支付状态
      if (normalizedStatus === InstallmentStatus.PAID) {
        const paidAmountInCents =
          amount !== undefined
            ? convertAmountToCents(amount)
            : installment.installmentAmount;

        const paymentTime = new Date();

        // 如果已有支付，删除旧的 cash 记录
        if (installment.cashUid) {
          await tx
            .delete(cashTransactions)
            .where(eq(cashTransactions.uid, installment.cashUid));
        }

        // 创建新的支付记录
        const cashSnapshot = {
          plan_uid: plan.uid,
          installment_uid: installment.uid,
          installment_number: installment.installmentNumber,
          total_installments: plan.totalInstallments,
          due_date: installment.dueDate,
          status: InstallmentStatus.PAID,
          note: plan.note ?? null,
        };

        const cashData = {
          studentId: plan.studentId ?? null,
          amount: paidAmountInCents,
          note: this.buildInstallmentNote(
            plan.note ?? "",
            installment.installmentNumber,
            plan.totalInstallments
          ),
          installmentSnapshot: cashSnapshot,
        };

        const [newCash] = await tx
          .insert(cashTransactions)
          .values(cashData)
          .returning();

        if (!newCash) {
          throw AppError.other("创建支付记录失败");
        }

        // 更新分期状态
        await tx
          .update(installments)
          .set({
            status: InstallmentStatus.PAID,
            paidAmount: paidAmountInCents,
            cashUid: newCash.uid,
            paidDate: paymentTime.toISOString().split('T')[0],
          })
          .where(eq(installments.uid, installment.uid));

          // 刷新计划状态
          await this.refreshPlanStatus(tx, plan.uid);

          return { installment: installment.uid, cash: newCash };
      } else if (normalizedStatus === InstallmentStatus.PENDING) {
        // 改为待支付，清除支付信息
        if (installment.cashUid) {
          await tx
            .delete(cashTransactions)
            .where(eq(cashTransactions.uid, installment.cashUid));
        }

        await tx
          .update(installments)
          .set({
            status: InstallmentStatus.PENDING,
            paidAmount: null,
            paidDate: null,
            cashUid: null,
          })
          .where(eq(installments.uid, installment.uid));

          // 刷新计划状态
          await this.refreshPlanStatus(tx, plan.uid);

          return { installment: installment.uid, cash: null };
      } else if (normalizedStatus === InstallmentStatus.CANCELLED) {
        await tx
          .update(installments)
          .set({
            status: InstallmentStatus.CANCELLED,
            paidDate: null,
          })
          .where(eq(installments.uid, installment.uid));

          // 刷新计划状态
          await this.refreshPlanStatus(tx, plan.uid);

          return { installment: installment.uid, cash: null };
      } else if (normalizedStatus === InstallmentStatus.OVERDUE) {
        await tx
          .update(installments)
          .set({ status: InstallmentStatus.OVERDUE })
          .where(eq(installments.uid, installment.uid));

          // 刷新计划状态
          await this.refreshPlanStatus(tx, plan.uid);

          return { installment: installment.uid, cash: null };
      }

      return { installment: installment.uid, cash: null };
    });

    const updatedInstallment = await InstallmentRepository.findByUid(installment.uid);

    logger.info(
      `更新分期付款状态成功，UID: ${installment.uid}, 状态: ${normalizedStatus}`
    );

    res.json({
      success: true,
      data: {
        installment: updatedInstallment ? InstallmentRepository.toResponse(updatedInstallment) : null,
        plan: plan
          ? await this.buildPlanResponse(plan)
          : null,
      },
      message: "分期付款状态更新成功",
    });
  });

  /**
   * POST /:id/payments - 记录具体期支付
   * 根据期数或未支付状态支付
   */
  public recordPayment = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { installment_index, paid_amount, paid_date } = req.body as {
      installment_index?: number;
      paid_amount?: number;
      paid_date?: string;
    };

    const plan = await InstallmentPlanRepository.findByUid(Number(id));

    if (!plan) {
      throw AppError.notFound("分期计划不存在");
    }

    const installments =
      await InstallmentRepository.findByPlanId(plan.uid);

    // 如果没有指定期数，使用第一个未支付的期数
    let targetInstallment: any | null = null;

    if (installment_index !== undefined) {
      // 按期数查找
      targetInstallment = installments.find(
        (inst) => inst.installmentNumber === installment_index
      );
    } else {
      // 查找第一个未支付的期数
      targetInstallment = installments.find(
        (inst) => inst.status === InstallmentStatus.PENDING
      );
    }

    if (!targetInstallment) {
      throw AppError.notFound(
        installment_index !== undefined
          ? "指定期数不存在"
          : "未找到可支付的分期"
      );
    }

    const paidAmountInCents =
      paid_amount !== undefined
        ? convertAmountToCents(paid_amount)
        : targetInstallment.installmentAmount;

    const paidDate = paid_date ? new Date(paid_date) : new Date();
    const today = new Date();

    // 验证已支付检查
    if (targetInstallment.status === InstallmentStatus.PAID) {
      throw AppError.invalidInput("该期已支付");
    }

    const target = targetInstallment;

    // 使用事务执行支付逻辑
    const result = await db.transaction(async (tx) => {
      // 1. 如果已有cash记录，删除它
      if (target.cashUid) {
        await tx
          .delete(cashTransactions)
          .where(eq(cashTransactions.uid, target.cashUid));
      }

      // 2. 创建新的支付记录
      const cashSnapshot = {
        plan_uid: target.planId,
        installment_uid: target.uid,
        installment_number: target.installmentNumber,
        total_installments: plan.totalInstallments,
        due_date: target.dueDate,
        status: InstallmentStatus.PAID,
        note: plan.note ?? null,
      };

      const [newCash] = await tx
        .insert(cashTransactions)
        .values({
          studentId: plan.studentId ?? null,
          amount: paidAmountInCents,
          note: this.buildInstallmentNote(
            plan.note ?? "",
            target.installmentNumber,
            target.totalInstallments
          ),
          installmentSnapshot: cashSnapshot,
        })
        .returning();

      if (!newCash) {
        throw AppError.other("创建支付记录失败");
      }

      // 3. 更新分期状态
      await tx
        .update(installments)
        .set({
          status: InstallmentStatus.PAID,
          cashUid: newCash.uid,
          paidAmount: paidAmountInCents,
          paidDate:
            paid_date ||
            new Date().toISOString().split('T')[0],
        })
        .where(eq(installments.uid, target.uid));

      // 4. 刷新计划状态
      await this.refreshPlanStatus(tx, plan.uid);

      return { target, cash: newCash };
    });

    // 更新本地对象
    target.cashUid = result.cash.uid;
    target.paidAmount = result.cash.amount;
    target.paidDate = result.cash.createdAt
      ? new Date(result.cash.createdAt)
      : null;
    target.status = InstallmentStatus.PAID;

    // 获取更新后的数据
    const updatedInstallment = await InstallmentRepository.findByUid(target.uid);

    const updatedPlan = await InstallmentPlanRepository.findByUid(target.planId);
    const student = updatedPlan?.studentId
      ? await StudentRepository.findByUid(updatedPlan.studentId)
      : null;

    const response = {
      success: true,
      data: {
        installment: updatedInstallment ? InstallmentRepository.toResponse(updatedInstallment) : null,
        plan: updatedPlan ? await this.buildPlanResponse(updatedPlan) : null,
      },
      message: "支付记录成功",
    };

    logger.info(
      `记录分期支付成功，Plan UID: ${result.target.planId}, Installment: ${result.target.installmentNumber}`
    );

    res.json(response);
  });

  /**
   * PUT /:id - 更新分期计划状态
   */
  public updateInstallmentPlan = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { note, status } = req.body as {
      note?: string;
      status?: InstallmentPlanStatus;
    };

    const plan = await InstallmentPlanRepository.findByUid(Number(id));

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

    const updatedPlan = await InstallmentPlanRepository.updateByUid(
      plan.uid,
      updateData
    );

    if (!updatedPlan) {
      throw AppError.other("更新分期计划失败");
    }

    logger.info(`更新分期计划成功，UID: ${plan.uid}`);

    const responseData = await this.buildPlanResponse(updatedPlan);

    res.json({
      success: true,
      data: responseData,
      message: "分期计划更新成功",
    });
  });

  /**
   * DELETE /:id - 删除分期计划
   */
  public deleteInstallmentPlan = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    // 使用事务删除
    await db.transaction(async (tx) => {
      // 1. 验证计划存在
      const [plan] = await tx
        .select()
        .from(installmentPlans)
        .where(eq(installmentPlans.uid, Number(id)))
        .limit(1);

      if (!plan) {
        throw AppError.notFound("分期计划不存在");
      }

      // 2. 如果是活跃计划，检查是否有限制
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

      // 3. 删除所有分期记录（会级联删除）
      await tx.delete(installments).where(eq(installments.planId, plan.uid));

      // 4. 删除计划
      await tx.delete(installmentPlans).where(eq(installmentPlans.uid, plan.uid));
    });

    logger.info(`删除分期计划成功，UID: ${id}`);

    res.json({
      success: true,
      message: "分期计划已删除",
    });
  });

  /**
   * 刷新计划状态（内部方法，可在事务或普通查询中使用）
   */
  private async refreshPlanStatus(
    planUid: number,
    transaction?: any
  ): Promise<void> {
    const dbToUse = transaction || db;
    const installments =
      await InstallmentRepository.findByPlanId(planUid);

    if (installments.length === 0) {
      // 没有分期记录，完成计划
      await dbToUse
        .update(installmentPlans)
        .set({ status: InstallmentPlanStatus.COMPLETED })
        .where(eq(installmentPlans.uid, planUid));
      return;
    }

    const allPaid = installments.every((i) => i.status === 'PAID');
    const anyPending = installments.some(
      (i) => i.status === 'PENDING' || i.status === 'OVERDUE'
    );

    const nextStatus =
      allPaid
        ? InstallmentPlanStatus.COMPLETED
        : anyPending
        ? InstallmentPlanStatus.ACTIVE
        : InstallmentPlanStatus.CANCELLED;

    await dbToUse
      .update(installmentPlans)
      .set({ status: nextStatus })
      .where(eq(installmentPlans.uid, planUid));
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 计算分期统计数据
   */
  private calculatePlanStats(installments: Array<any>, totalInstallments?: number) {
    return installments.reduce(
      (acc, installment) => {
        const status = installment.status;

        if (status === 'PAID') {
          acc.paidCount += 1;
          acc.paidAmount += Math.floor(installment.installmentAmount);
        } else if (status !== 'CANCELLED') {
          acc.pendingCount += 1;
          acc.remainingAmount += InstallmentRepository.getRemainingAmount(installment);
          if (status === 'OVERDUE' || InstallmentRepository.isOverdue(installment)) {
            acc.overdueCount += 1;
            acc.overdueAmount += InstallmentRepository.getRemainingAmount(installment);
          }
        }
        if (status !== 'CANCELLED') {
          acc.remainingAmount += InstallmentRepository.getRemainingAmount(installment);
        }

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

  /**
   * 获取每期金额（分摊算法）
   */
  private getInstallmentAmounts(
    totalAmount: number,
    installmentsPerTerm: number
  ): number[] {
    const installmentAmounts: number[] = [];

    const baseAmount = Math.floor(totalAmount / installmentsPerTerm);
    const remainder = totalAmount % installmentsPerTerm;

    for (let i = 0; i < installmentsPerTerm; i++) {
      installmentAmounts.push(
        i < remainder ? baseAmount + 1 : baseAmount
      );
    }

    return installmentAmounts;
  }

  /**
   * 格式化金额（分 → 元）
   */
  private formatAmount(cents: number): number {
    return Number((cents / 100).toFixed(2));
  }

  /**
   * 获取指定分期ID的逾期天数
   */
  private getDaysOverdue(dueDate: string): number {
    const today = new Date();
    const due = new Date(dueDate);

    const refMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate());

    const diff = Math.floor(
      (refMidnight.getTime() - dueMidnight.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff > 0 ? diff : 0;
  }

  /**
   * 构建分期计划响应数据
   */
  private async buildPlanResponse(
    plan: {
      uid: number;
      studentId: number | null;
      totalAmount: number;
      downPayment: number;
      totalInstallments: number;
      frequency: PaymentFrequency;
      customDays: number | null;
      startDate: Date | string;
      status: InstallmentPlanStatus;
      note: string | null;
      createdAt: Date | string;
      updatedAt: Date | string;
      },
    options: IPlanResponseOptions = {}
  ): Promise<Record<string, unknown>> {
    const installments =
      options.installments ||
      await InstallmentRepository.findByPlanId(plan.uid);

    const student = plan.studentId
      ? await StudentRepository.findByUid(plan.studentId)
      : null;

    const stats = this.calculatePlanStats(installments, plan.totalInstallments);
    const progress =
      plan.totalInstallments > 0
        ? Math.round((stats.paidCount / plan.totalInstallments) * 100)
        : 0;

    // 构建分期响应数据
    const installmentsResponse = installments.map((inst: any) => {
      const isOverdue = InstallmentRepository.isOverdue(inst);
      const daysOverdue = InstallmentRepository.getDaysOverdue(inst);
      const remainingAmount = InstallmentRepository.getRemainingAmount(inst);

      return {
        uid: inst.uid,
        plan_id: inst.planId,
        planId: inst.planId,
        current_installment: inst.installmentNumber,
        currentInstallment: inst.installmentNumber,
        installment_number: inst.installmentNumber,
        installment_amount: this.formatAmount(inst.installmentAmount),
        installment_amount_in_cents: inst.installmentAmount,
        due_date: inst.dueDate,
        status: inst.status,
        status_text: this.getStatusText(inst.status),
        paid_amount: this.formatAmount(inst.paidAmount ?? 0),
        paid_amount_in_cents: inst.paidAmount ?? 0,
        paid_at: inst.paidDate,
        is_overdue: isOverdue,
        isOverdue,
        days_overdue: daysOverdue,
        remaining_amount: this.formatAmount(remainingAmount),
        remaining_amount_in_cents: remainingAmount,
        student_id: inst.studentId,
        studentId: inst.studentId,
        cash_uid: inst.cashUid,
        cashUid: inst.cashUid,
        created_at: inst.createdAt,
        updated_at: inst.updatedAt,
      };
    });

    return {
      uid: plan.uid,
      student_id: plan.studentId,
      student: student
        ? { uid: student.uid, name: student.name, phone: student.phone }
        : null,
      total_amount: this.formatAmount(plan.totalAmount),
      totalAmountInCents: plan.totalAmount,
      installment_amount: this.formatAmount(plan.totalAmount / plan.totalInstallments),
      total_installments: plan.totalInstallments,
      frequency: plan.frequency,
      custom_days: plan.customDays,
      start_date: typeof plan.startDate === "string" ? plan.startDate : new Date(plan.startDate).toISOString().split('T')[0],
      status: plan.status,
      status_text: this.getStatusText(plan.status),
      frequency_text: this.getFrequencyText(plan.frequency, plan.customDays),
      progress,
      paid_count: stats.paidCount,
      pending_count: stats.pendingCount,
      overdue_count: stats.overdueCount,
      overdue_amount: this.formatAmount(stats.overdueAmount),
      paid_amount: this.formatAmount(stats.paidAmount),
      pending_amount: this.formatAmount(stats.pendingAmount),
      remaining_amount: this.formatAmount(stats.remainingAmount),
      note: plan.note,
      installments: options.includeInstallments ? installmentsResponse : undefined,
      installments_count: installments.length,
      created_at: typeof plan.createdAt === "string" ? plan.createdAt : new Date(plan.createdAt).toISOString().split('T')[0],
      updated_at: typeof plan.updatedAt === "string" ? plan.updatedAt : new Date(plan.updatedAt).toISOString().split('T')[0],
    };
  }

  /**
   * 辅助方法：归一化付款频率
   */
  private normalizeFrequency(value: unknown): PaymentFrequency | null {
    if (typeof value !== "string") {
      return null;
    }
    const matched = Object.values(PaymentFrequency).find(
      (item) => item === value
    );
    return matched ?? null;
  }

  /**
   * 辅助方法：归一化分期状态
   */
  private normalizeInstallmentStatus(
    value: unknown
  ): InstallmentStatus | null {
    if (typeof value !== "string") {
      return null;
    }
    const matched = Object.values(InstallmentStatus).find(
      (item) => item === value
    );
    return matched ?? null;
  }

  /**
   * 辅助方法：归一化正整数
   */
  private normalizePositiveInteger(
    value: unknown
  ): number | null {
    if (value === undefined || value === null || value === "") {
      return null;
    }
    const numeric = Number(value);
    if (!Number.isInteger(numeric) || numeric <= 0) {
      return null;
    }
    return numeric;
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
   * 辅助方法：获取频率文本
   */
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

  /**
   * 辅助方法：计算下次到期日期
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
      default:
        return status;
    }
  }
}

export default new InstallmentController();
