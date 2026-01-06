import { Request, Response } from "express";
import { CashClass, ICashDoc } from "@/models/CashMongo";
import { Student } from "@/models/mongo";
import { Installment } from "@/models/InstallmentMongo";
import { InstallmentPlan } from "@/models/InstallmentPlanMongo";
import { InstallmentPlanStatus } from "@/types";
import { catchAsync } from "@/middleware/errorHandler";
import {
  CashBuilder,
  convertAmountToCents,
  normalizeNote,
} from "@/services/cashBuilder";
import {
  InstallmentStatus,
  PaymentFrequency,
  IApiResponse,
  IPaginatedResponse,
} from "@/types";
import type { ICashSearchOptions } from "@/types";
import type { PipelineStage } from "mongoose";
import logger from "@/utils/logger";
import { AppError } from "@/utils/errors";

interface CashStatsAggregate {
  _id: null;
  total_income: number;
  total_expense: number;
  transaction_count: number;
  total_transactions: unknown[];
}

interface StudentIncomeAggregate {
  _id: number;
  amount: number;
}

interface StudentIncomeSummary {
  student_id: number;
  amount: number;
  student_name: string;
}

interface FinancialStatsResponse {
  period: string;
  date_from: Date;
  date_to: Date;
  total_income: number;
  total_expense: number;
  net_income: number;
  transaction_count: number;
  student_income: StudentIncomeSummary[];
  monthly_stats: unknown[];
}

const CASH_SORT_FIELDS = [
  "uid",
  "student_id",
  "cash",
  "created_at",
  "updated_at",
] as const;
type CashSortField = (typeof CASH_SORT_FIELDS)[number];
type CashSortOrder = NonNullable<ICashSearchOptions["sortOrder"]>;
const isCashSortField = (value: unknown): value is CashSortField =>
  typeof value === "string" &&
  (CASH_SORT_FIELDS as readonly string[]).includes(value);
const normalizeCashSortOrder = (value: unknown): CashSortOrder | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const upper = value.toUpperCase();
  return upper === "ASC" || upper === "DESC"
    ? (upper as CashSortOrder)
    : undefined;
};

const INSTALLMENT_PLAN_SORT_FIELDS = [
  "created_at",
  "start_date",
  "total_amount",
  "status",
  "updated_at",
] as const;
type InstallmentPlanSortField = (typeof INSTALLMENT_PLAN_SORT_FIELDS)[number];
const isInstallmentPlanSortField = (
  value: unknown
): value is InstallmentPlanSortField =>
  typeof value === "string" &&
  (INSTALLMENT_PLAN_SORT_FIELDS as readonly string[]).includes(value);

// 财务控制器
export class CashController {
  // 获取所有交易记录
  public getAllTransactions = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const result = await CashClass.search(this.buildSearchOptions(req.query));

      const responseData = result.data.map((transaction) =>
        this.presentTransaction(transaction)
      );

      const response: IApiResponse<any> = {
        success: true,
        data: responseData,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit),
        },
      };

      logger.info(`获取交易记录成功，共 ${result.total} 条记录`);
      res.json(response);
    }
  );

  // 添加普通交易记录
  public addCashTransaction = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { student_id, amount, note = "", installment } = req.body;

      const builder = CashBuilder.create().amount(amount).note(note);

      if (student_id !== undefined) {
        builder.studentId(student_id);
      }

      if (installment) {
        builder.installment(installment);
      }

      const transaction = await builder.build();

      const responseData = this.presentTransaction(transaction);

      const response: IApiResponse<typeof responseData> = {
        success: true,
        data: responseData,
        message: "交易记录添加成功",
      };

      logger.info(
        `添加交易记录成功，UID: ${
          transaction.uid
        }, 金额: ${transaction.getFormattedAmount()}`
      );
      res.status(201).json(response);
    }
  );

  // 添加分期付款交易 - 完整版本
  public addInstallmentTransaction = catchAsync(
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

      // 验证学员是否存在
      if (student_id !== null && student_id !== undefined) {
        const student = await Student.findByUid(Number(student_id));
        if (!student) {
          throw AppError.invalidInput("指定的学员不存在");
        }
      }

      // 验证输入
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

      const customDaysValue =
        normalizedFrequency === PaymentFrequency.CUSTOM
          ? this.normalizePositiveInteger(custom_days)
          : null;

      if (
        normalizedFrequency === PaymentFrequency.CUSTOM &&
        customDaysValue === null
      ) {
        throw AppError.invalidInput("自定义频率必须指定天数且大于0");
      }

      const startDateValue = new Date(start_date);
      if (Number.isNaN(startDateValue.getTime())) {
        throw AppError.invalidInput("开始日期格式不正确");
      }

      try {
        const totalAmountCents = convertAmountToCents(total_amount);
        const sanitizedNote = normalizeNote(note);

        const installmentPlan = await InstallmentPlan.create({
          student_id: student_id !== undefined ? Number(student_id) : null,
          total_amount: totalAmountCents,
          total_installments: totalInstallmentsInt,
          frequency: normalizedFrequency,
          custom_days: customDaysValue ?? undefined,
          start_date: startDateValue,
          note: sanitizedNote,
          status: InstallmentPlanStatus.ACTIVE,
        });

        const installments = [];
        let dueDateCursor = new Date(startDateValue);

        for (let i = 1; i <= totalInstallmentsInt; i++) {
          const dueDate = new Date(dueDateCursor);
          const amountForInstallment = installmentPlan.getInstallmentAmount(i);

          const installment = await Installment.create({
            plan_id: installmentPlan.uid,
            current_installment: i,
            total_installments: totalInstallmentsInt,
            installment_amount: amountForInstallment,
            due_date: dueDate,
            status:
              i === 1 ? InstallmentStatus.PAID : InstallmentStatus.PENDING,
            paid_amount: i === 1 ? amountForInstallment : undefined,
            paid_at: i === 1 ? new Date() : undefined,
            student_id: installmentPlan.student_id ?? null,
          });

          installments.push(installment);
          dueDateCursor = this.calculateNextDueDate(
            dueDateCursor,
            normalizedFrequency,
            customDaysValue
          );
        }

        const firstInstallment = installments[0];
        const firstInstallmentAmount = firstInstallment
          ? this.formatAmount(firstInstallment.installment_amount)
          : this.formatAmount(
              Math.round(totalAmountCents / totalInstallmentsInt)
            );

        const transaction = await CashBuilder.create()
          .amount(firstInstallmentAmount)
          .studentId(student_id ?? null)
          .note(
            this.buildInstallmentNote(sanitizedNote, 1, totalInstallmentsInt)
          )
          .installment({
            plan_uid: installmentPlan.uid,
            installment_uid: firstInstallment?.uid ?? null,
            installment_number: firstInstallment?.current_installment ?? 1,
            total_installments: totalInstallmentsInt,
            due_date: firstInstallment?.due_date ?? startDateValue,
            status: InstallmentStatus.PAID,
            note: sanitizedNote ?? undefined,
          })
          .build();

        if (firstInstallment) {
          await Installment.updateByUid(firstInstallment.uid, {
            cash_uid: transaction.uid,
          });
        }

        if (totalInstallmentsInt === 1) {
          await InstallmentPlan.updateByUid(installmentPlan.uid, {
            status: InstallmentPlanStatus.COMPLETED,
          });
          installmentPlan.status = InstallmentPlanStatus.COMPLETED;
        }

        const responseData = {
          transaction: this.presentTransaction(transaction),
          plan: {
            uid: installmentPlan.uid,
            student_id: installmentPlan.student_id,
            total_amount: this.formatAmount(installmentPlan.total_amount),
            total_installments: installmentPlan.total_installments,
            frequency: installmentPlan.frequency,
            custom_days: installmentPlan.custom_days,
            start_date: installmentPlan.start_date,
            status: installmentPlan.status,
            note: sanitizedNote,
          },
          installments: installments.map((inst) => ({
            uid: inst.uid,
            current_installment: inst.current_installment,
            total_installments: inst.total_installments,
            installment_amount: this.formatAmount(inst.installment_amount),
            due_date: inst.due_date,
            status: inst.status,
            paid_amount: this.formatAmount(inst.paid_amount ?? 0),
            paid_at: inst.paid_at,
          })),
        };

        const response: IApiResponse<typeof responseData> = {
          success: true,
          data: responseData,
          message: "分期付款创建成功",
        };

        logger.info(
          `创建分期付款成功，交易ID: ${transaction.uid}, 计划ID: ${installmentPlan.uid}, 期数: ${total_installments}`
        );
        res.status(201).json(response);
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error("创建分期付款失败:", error);
        throw AppError.other("创建分期付款失败", { cause: error });
      }
    }
  );

  // 删除交易记录
  public deleteCashTransaction = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      const transaction = await CashClass.findByUid(Number(id));

      if (!transaction) {
        throw AppError.notFound("交易记录不存在");
      }

      const deleted = await CashClass.deleteByUid(Number(id));

      if (!deleted) {
        throw AppError.other("删除交易记录失败");
      }

      const response: IApiResponse = {
        success: true,
        message: "交易记录删除成功",
      };

      logger.info(`删除交易记录成功，UID: ${transaction.uid}`);
      res.json(response);
    }
  );

  // 搜索现金记录
  public searchCash = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const result = await CashClass.search(this.buildSearchOptions(req.query));

      const responseData = result.data.map((transaction) =>
        this.presentTransaction(transaction)
      );

      const response: IApiResponse<any> = {
        success: true,
        data: responseData,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit),
        },
      };

      logger.info(`搜索现金记录完成，找到 ${result.total} 条记录`);
      res.json(response);
    }
  );

  // 获取交易详情
  public getTransactionById = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      const transaction = await CashClass.findByUid(Number(id));

      if (!transaction) {
        throw AppError.notFound("交易记录不存在");
      }

      let student = null;
      if (transaction.student_id) {
        student = await Student.findByUid(transaction.student_id);
      }

      const responseData = this.presentTransaction(transaction, {
        student: student
          ? {
              uid: student.uid,
              name: student.name,
              phone: student.phone,
              class: student.class,
              subject: student.subject,
            }
          : null,
        student_name: student ? student.name : null,
      });

      const response: IApiResponse<typeof responseData> = {
        success: true,
        data: responseData,
      };

      logger.info(`获取交易详情成功，UID: ${transaction.uid}`);
      res.json(response);
    }
  );

  private buildSearchOptions(query: Record<string, any>): ICashSearchOptions {
    const options: ICashSearchOptions = {};

    const student = query.studentId ?? query.student_id;
    if (student !== undefined && student !== null && student !== "") {
      options.studentId = Number(student);
    }

    const minAmount = query.minAmount ?? query.min_amount;
    if (minAmount !== undefined && minAmount !== null && minAmount !== "") {
      options.minAmount = Number(minAmount);
    }

    const maxAmount = query.maxAmount ?? query.max_amount;
    if (maxAmount !== undefined && maxAmount !== null && maxAmount !== "") {
      options.maxAmount = Number(maxAmount);
    }

    const incomeFlag = query.isIncome ?? query.is_income;
    if (incomeFlag !== undefined && incomeFlag !== null && incomeFlag !== "") {
      if (incomeFlag === true || incomeFlag === "true") {
        options.isIncome = true;
      } else if (incomeFlag === false || incomeFlag === "false") {
        options.isIncome = false;
      }
    }

    const installmentFlag = query.hasInstallment ?? query.has_installment;
    if (
      installmentFlag !== undefined &&
      installmentFlag !== null &&
      installmentFlag !== ""
    ) {
      if (installmentFlag === true || installmentFlag === "true") {
        options.hasInstallment = true;
      } else if (installmentFlag === false || installmentFlag === "false") {
        options.hasInstallment = false;
      }
    }

    const dateFrom = query.dateFrom ?? query.date_from;
    if (dateFrom) {
      options.dateFrom = dateFrom;
    }

    const dateTo = query.dateTo ?? query.date_to;
    if (dateTo) {
      options.dateTo = dateTo;
    }

    const pageValue = query.page;
    if (pageValue !== undefined && pageValue !== null && pageValue !== "") {
      options.page = Number(pageValue);
    }

    const limitValue = query.limit;
    if (limitValue !== undefined && limitValue !== null && limitValue !== "") {
      options.limit = Number(limitValue);
    }

    const sortByCandidate = query.sortBy ?? query.sort_by;
    if (isCashSortField(sortByCandidate)) {
      options.sortBy = sortByCandidate;
    }

    const sortOrderCandidate = query.sortOrder ?? query.sort_order;
    const normalizedSortOrder = normalizeCashSortOrder(sortOrderCandidate);
    if (normalizedSortOrder) {
      options.sortOrder = normalizedSortOrder;
    }

    return options;
  }

  private presentTransaction(
    transaction: ICashDoc,
    overrides: Record<string, unknown> = {}
  ) {
    const amount = transaction.getAmount();
    const formattedAmount = transaction.getFormattedAmount();
    const isIncome = transaction.isIncome();

    const base = {
      uid: transaction.uid,
      student_id: transaction.student_id,
      studentId: transaction.student_id,
      student_name: null as string | null,
      student: null as Record<string, unknown> | null,
      cash: transaction.cash,
      amount_in_cents: transaction.cash,
      amountInCents: transaction.cash,
      amount,
      description: this.getTransactionDescription(transaction),
      note: transaction.note,
      is_income: isIncome,
      isIncome,
      is_expense: !isIncome,
      isExpense: !isIncome,
      formatted_amount: formattedAmount,
      formattedAmount,
      installment: transaction.installment ?? null,
      created_at: transaction.created_at,
      createdAt: transaction.created_at,
      updated_at: transaction.updated_at,
      updatedAt: transaction.updated_at,
    };

    return { ...base, ...overrides };
  }

  // 私有辅助方法：获取交易描述
  private getTransactionDescription(transaction: ICashDoc): string {
    const amount = transaction.getAmount();
    const prefix = transaction.isIncome() ? "收入" : "支出";
    return `${prefix} ¥${amount.toFixed(2)}`;
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

  private getStudentDisplayName(studentId: number): string {
    return `学员${studentId}`;
  }

  // 获取财务统计信息 - 优化版本
  public getFinancialStats = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const periodParam = req.query.period;
      const period = typeof periodParam === "string" ? periodParam : "month";

      let dateFrom: Date;
      const now = new Date();

      switch (period) {
        case "week":
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "quarter":
          const quarter = Math.floor(now.getMonth() / 3);
          dateFrom = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        case "year":
          dateFrom = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      // 使用聚合管道优化查询，只获取需要的字段并计算统计信息
      const pipeline: PipelineStage[] = [
        { $match: { created_at: { $gte: dateFrom } } },
        {
          $group: {
            _id: null,
            total_income: {
              $sum: {
                $cond: [
                  { $gt: ["$cash", 0] },
                  { $divide: [{ $abs: "$cash" }, 100] },
                  0,
                ],
              },
            },
            total_expense: {
              $sum: {
                $cond: [
                  { $lt: ["$cash", 0] },
                  { $divide: [{ $abs: "$cash" }, 100] },
                  0,
                ],
              },
            },
            transaction_count: { $sum: 1 },
            total_transactions: { $push: "$ROOT" },
          },
        },
      ];

      const statsResults = await CashClass.aggregate<CashStatsAggregate>(
        pipeline
      ).exec();
      const stats: CashStatsAggregate = statsResults[0] ?? {
        _id: null,
        total_income: 0,
        total_expense: 0,
        transaction_count: 0,
        total_transactions: [],
      };

      const net_income = stats.total_income - stats.total_expense;

      // 按学生ID聚合收入，限制在聚合阶段完成，而不是在应用层
      const studentIncomePipeline: PipelineStage[] = [
        {
          $match: {
            created_at: { $gte: dateFrom },
            cash: { $gt: 0 },
            student_id: { $ne: null },
          },
        },
        {
          $group: {
            _id: "$student_id",
            amount: {
              $sum: { $divide: [{ $abs: "$cash" }, 100] },
            },
          },
        },
        { $sort: { amount: -1 } },
        { $limit: 10 },
      ];

      const studentIncomeResults =
        await CashClass.aggregate<StudentIncomeAggregate>(
          studentIncomePipeline
        ).exec();

      const student_income: StudentIncomeSummary[] = studentIncomeResults.map(
        (aggregate): StudentIncomeSummary => ({
          student_id: aggregate._id,
          amount: aggregate.amount,
          student_name: this.getStudentDisplayName(aggregate._id),
        })
      );

      const responseData: FinancialStatsResponse = {
        period,
        date_from: dateFrom,
        date_to: now,
        total_income: stats.total_income,
        total_expense: stats.total_expense,
        net_income,
        transaction_count: stats.transaction_count,
        student_income,
        monthly_stats: [],
      };

      const response: IApiResponse<FinancialStatsResponse> = {
        success: true,
        data: responseData,
      };

      logger.info(
        `获取财务统计成功，周期: ${period}, 收入: ¥${stats.total_income}, 支出: ¥${stats.total_expense}`
      );
      res.json(response);
    }
  );

  // 获取分期付款列表 - 完整版本
  public getInstallments = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const {
        student_id,
        page = 1,
        limit = 20,
        sort_by = "created_at",
        sort_order = "DESC",
        status,
      } = req.query as any;

      const whereCondition: any = {};

      if (student_id) {
        whereCondition.student_id = Number(student_id);
      }

      if (status) {
        whereCondition.status = status;
      }

      const sortFieldCandidate =
        typeof sort_by === "string" ? sort_by : undefined;
      const sortField: InstallmentPlanSortField =
        sortFieldCandidate && isInstallmentPlanSortField(sortFieldCandidate)
          ? sortFieldCandidate
          : "created_at";
      const sortOrder: 1 | -1 =
        typeof sort_order === "string" && sort_order.toUpperCase() === "ASC"
          ? 1
          : -1;
      const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };

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

        const paidCount = installments.filter(
          (i) => i.status === "Paid"
        ).length;
        const pendingCount = installments.filter(
          (i) => i.status === "Pending"
        ).length;
        const overdueCount = installments.filter((i) => i.isOverdue()).length;

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
          frequency_text: this.getFrequencyText(
            plan.frequency,
            plan.custom_days
          ),
          installment_amount: plan.getInstallmentAmount() / 100,
          progress: Math.round((paidCount / plan.total_installments) * 100),
          paid_count: paidCount,
          pending_count: pendingCount,
          overdue_count: overdueCount,
          installments: installments.map((inst) => ({
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

      const response: IApiResponse<any> = {
        success: true,
        data: responseData,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit),
        },
      };

      logger.info(`获取分期付款列表成功，共 ${result.total} 条记录`);
      res.json(response);
    }
  );

  // 更新分期付款状态
  public updateInstallmentStatus = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ["Pending", "Paid", "Overdue", "Cancelled"];
      if (!validStatuses.includes(status)) {
        throw AppError.invalidInput("无效的分期状态");
      }

      const installment = await Installment.findByUid(Number(id));

      if (!installment) {
        throw AppError.notFound("分期记录不存在");
      }

      // 如果是支付，创建交易记录
      if (status === "Paid" && installment.status !== "Paid") {
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
        paid_at: status === "Paid" ? new Date() : installment.paid_at,
        paid_amount:
          status === "Paid"
            ? installment.installment_amount
            : installment.paid_amount,
      });

      if (!updatedInstallment) {
        throw AppError.other("更新分期付款状态失败");
      }

      logger.info(
        `更新分期付款状态成功，ID: ${installment.uid}, 状态: ${status}`
      );
      res.json({
        success: true,
        data: updatedInstallment,
        message: "分期付款状态更新成功",
      });
    }
  );

  // 私有辅助方法：获取状态文本
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

  // 私有辅助方法：获取频率文本
  private getFrequencyText(
    frequency: PaymentFrequency | string,
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
        return typeof frequency === "string" ? frequency : String(frequency);
    }
  }
}

// 导出控制器实例
const cashController = new CashController();
export default cashController;
