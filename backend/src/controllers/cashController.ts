import { Request, Response } from 'express';
import { catchAsync } from '@/middleware/errorHandler';
import { CashBuilder, convertAmountToCents, normalizeNote } from '@/services/cashBuilder';
import {
  InstallmentStatusValues,
  InstallmentPlanStatusValues,
  PaymentFrequencyValues,
  IApiResponse,
  IPaginatedResponse,
} from '@/types';
import type { InstallmentStatus, InstallmentPlanStatus, PaymentFrequency } from '@/types';
import type { ICashSearchOptions } from '@/types';
import logger from '@/utils/logger';
import { AppError } from '@/utils/errors';
import { CashRepository } from '../db/repositories/cashRepository';
import { StudentRepository } from '../db/repositories/studentRepository';
import {
  InstallmentRepository,
  InstallmentPlanRepository,
} from '../db/repositories/installmentRepository';
import type {
  CashTransaction,
  InstallmentPlan,
  Installment,
  InstallmentSnapshot,
} from '../db/schema';

interface StudentIncomeSummary {
  studentId: number;
  student_name: string;
  amount: number;
}

interface FinancialStatsResponse {
  period: string;
  date_from: string;
  date_to: string;
  total_income: number;
  total_expense: number;
  net_income: number;
  transaction_count: number;
  student_income: StudentIncomeSummary[];
  monthly_stats: unknown[];
}

const CASH_SORT_FIELDS = [
  'uid',
  'studentId',
  'amount',
  'created_at',
  'updated_at',
] as const;
type CashSortField = (typeof CASH_SORT_FIELDS)[number];
type CashSortOrder = 'ASC' | 'DESC';
const isCashSortField = (value: unknown): value is CashSortField =>
  typeof value === 'string' &&
  (CASH_SORT_FIELDS as readonly string[]).includes(value);
const normalizeCashSortOrder = (value: unknown): CashSortOrder | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const upper = value.toUpperCase();
  return upper === 'ASC' || upper === 'DESC' ? (upper as CashSortOrder) : undefined;
};

const INSTALLMENT_PLAN_SORT_FIELDS = [
  'created_at',
  'start_date',
  'total_amount',
  'status',
  'updated_at',
] as const;
type InstallmentPlanSortField = (typeof INSTALLMENT_PLAN_SORT_FIELDS)[number];
const isInstallmentPlanSortField = (
  value: unknown,
): value is InstallmentPlanSortField =>
  typeof value === 'string' &&
  (INSTALLMENT_PLAN_SORT_FIELDS as readonly string[]).includes(value);

// 财务控制器
export class CashController {
  // 获取所有交易记录
  public getAllTransactions = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const options = this.buildSearchOptions(req.query);
      const result = await CashRepository.findWithPagination(options);

      const responseData = result.data.map((transaction) =>
        this.presentTransaction(transaction),
      );

      const response: IApiResponse<any> = {
        success: true,
        data: responseData,
        pagination: {
          page: result.pagination.page,
          limit: result.pagination.limit,
          total: result.pagination.total,
          total_pages: result.pagination.total_pages,
        },
      };

      logger.info(`获取交易记录成功，共 ${result.pagination.total} 条记录`);
      res.json(response);
    },
  );

  // 添加普通交易记录
  public addCashTransaction = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { student_id, amount, note = '', installment } = req.body;

      const builder = CashBuilder.create().amount(amount).note(note);

      if (student_id !== undefined) {
        builder.studentId(student_id);
      }

      if (installment) {
        builder.installment(installment);
      }

      const transaction = await builder.build();

      const responseData = this.presentTransaction(transaction as any);

      const response: IApiResponse<typeof responseData> = {
        success: true,
        data: responseData,
        message: '交易记录添加成功',
      };

      logger.info(
        `添加交易记录成功，UID: ${
          transaction.uid
        }, 金额: ¥${this.formatAmount(transaction.amount)}`,
      );
      res.status(201).json(response);
    },
  );

  // 添加分期付款交易 - 完整版本
  public addInstallmentTransaction = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const {
        student_id,
        total_amount,
        note = '',
        total_installments,
        frequency,
        custom_days,
        start_date,
      } = req.body;

      if (student_id === null || student_id === undefined) {
        throw AppError.invalidInput('分期付款必须关联学员');
      }
      const studentId = Number(student_id);

      // 验证学员是否存在
      const student = await StudentRepository.findByUid(studentId);
      if (!student) {
        throw AppError.invalidInput('指定的学员不存在');
      }

      // 验证输入
      const normalizedFrequency = this.normalizeFrequency(frequency);
      if (!normalizedFrequency) {
        throw AppError.invalidInput('无效的付款频率');
      }

      const totalInstallmentsInt = Number(total_installments);
      if (!Number.isInteger(totalInstallmentsInt) || totalInstallmentsInt <= 0) {
        throw AppError.invalidInput('总期数必须为正整数');
      }

      const customDaysValue =
        normalizedFrequency === PaymentFrequencyValues.CUSTOM
          ? this.normalizePositiveInteger(custom_days)
          : null;

      if (
        normalizedFrequency === PaymentFrequencyValues.CUSTOM &&
        customDaysValue === null
      ) {
        throw AppError.invalidInput('自定义频率必须指定天数且大于0');
      }

      const startDateObj = new Date(start_date);
      if (Number.isNaN(startDateObj.getTime())) {
        throw AppError.invalidInput('开始日期格式不正确');
      }
      const startDateValue = startDateObj.toISOString().split('T')[0];

      try {
        const totalAmountCents = convertAmountToCents(total_amount);
        const sanitizedNote = normalizeNote(note);

        const installmentPlan = await InstallmentPlanRepository.create({
          studentId,
          totalAmount: totalAmountCents,
          totalInstallments: totalInstallmentsInt,
          frequency: normalizedFrequency,
          customDays: customDaysValue ?? undefined,
          startDate: startDateValue,
          note: sanitizedNote,
          status: InstallmentPlanStatusValues.ACTIVE,
        });

        const installmentsToCreate = [];
        let dueDateCursor = new Date(startDateObj);

        for (let i = 1; i <= totalInstallmentsInt; i++) {
          const dueDate = new Date(dueDateCursor);
          const amountForInstallment = InstallmentPlanRepository.calculateInstallmentAmount(
            totalAmountCents,
            totalInstallmentsInt,
            i,
          );

          const installmentData = {
            planId: installmentPlan.uid,
            installmentNumber: i,
            installmentAmount: amountForInstallment,
            dueDate: dueDate.toISOString().split('T')[0],
            status:
              i === 1 ? InstallmentStatusValues.PAID : InstallmentStatusValues.PENDING,
            paidAmount: i === 1 ? amountForInstallment : 0,
            paidDate: i === 1 ? new Date().toISOString().split('T')[0] : undefined,
            studentId: installmentPlan.studentId,
          };
          installmentsToCreate.push(installmentData);

          dueDateCursor = this.calculateNextDueDate(
            dueDateCursor,
            normalizedFrequency,
            customDaysValue,
          );
        }

        const createdInstallments = await InstallmentRepository.createMany(
          installmentsToCreate as any,
        );

        const firstInstallment = createdInstallments[0];
        const firstInstallmentAmount = firstInstallment
          ? firstInstallment.installmentAmount / 100
          : this.formatAmount(
            Math.round(totalAmountCents / totalInstallmentsInt),
          );

        const transaction = await CashBuilder.create()
          .studentId(studentId)
          .amount(firstInstallmentAmount)
          .note(
            this.buildInstallmentNote(sanitizedNote, 1, totalInstallmentsInt),
          )
          .installment({
            plan_uid: installmentPlan.uid,
            installment_uid: firstInstallment?.uid ?? null,
            installment_number: firstInstallment?.installmentNumber ?? 1,
            total_installments: totalInstallmentsInt,
            due_date: firstInstallment?.dueDate ?? startDateValue,
            status: InstallmentStatusValues.PAID,
            note: sanitizedNote ?? undefined,
          })
          .build();

        if (firstInstallment) {
          await InstallmentRepository.updateByUid(firstInstallment.uid, {
            cashUid: transaction.uid,
          });
        }

        if (totalInstallmentsInt === 1) {
          await InstallmentPlanRepository.updateByUid(installmentPlan.uid, {
            status: InstallmentPlanStatusValues.COMPLETED,
          });
          installmentPlan.status = InstallmentPlanStatusValues.COMPLETED;
        }

        const responseData = {
          transaction: this.presentTransaction(transaction as any),
          plan: {
            uid: installmentPlan.uid,
            student_id: installmentPlan.studentId,
            total_amount: this.formatAmount(installmentPlan.totalAmount),
            total_installments: installmentPlan.totalInstallments,
            frequency: installmentPlan.frequency,
            custom_days: installmentPlan.customDays,
            start_date: installmentPlan.startDate,
            status: installmentPlan.status,
            note: sanitizedNote,
          },
          installments: createdInstallments.map((inst) => ({
            uid: inst.uid,
            current_installment: inst.installmentNumber,
            installment_amount: this.formatAmount(inst.installmentAmount),
            due_date: inst.dueDate,
            status: inst.status,
            paid_amount: this.formatAmount(inst.paidAmount ?? 0),
            paid_date: inst.paidDate,
          })),
        };

        const response: IApiResponse<typeof responseData> = {
          success: true,
          data: responseData,
          message: '分期付款创建成功',
        };

        logger.info(
          `创建分期付款成功，交易ID: ${transaction.uid}, 计划ID: ${installmentPlan.uid}, 期数: ${total_installments}`,
        );
        res.status(201).json(response);
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error('创建分期付款失败:', error);
        throw AppError.other('创建分期付款失败', { cause: error });
      }
    },
  );

  // 删除交易记录
  public deleteCashTransaction = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      const transaction = await CashRepository.findByUid(Number(id));

      if (!transaction) {
        throw AppError.notFound('交易记录不存在');
      }

      const deleted = await CashRepository.deleteByUid(Number(id));

      if (!deleted) {
        throw AppError.other('删除交易记录失败');
      }

      const response: IApiResponse = {
        success: true,
        message: '交易记录删除成功',
      };

      logger.info(`删除交易记录成功，UID: ${transaction.uid}`);
      res.json(response);
    },
  );

  // 搜索现金记录
  public searchCash = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const options = this.buildSearchOptions(req.query);
      const result = await CashRepository.findWithPagination(options);

      const responseData = result.data.map((transaction) =>
        this.presentTransaction(transaction),
      );

      const response: IApiResponse<any> = {
        success: true,
        data: responseData,
        pagination: {
          page: result.pagination.page,
          limit: result.pagination.limit,
          total: result.pagination.total,
          total_pages: result.pagination.total_pages,
        },
      };

      logger.info(`搜索现金记录完成，找到 ${result.pagination.total} 条记录`);
      res.json(response);
    },
  );

  // 获取交易详情
  public getTransactionById = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      const transaction = await CashRepository.findByUid(Number(id));

      if (!transaction) {
        throw AppError.notFound('交易记录不存在');
      }

      let student = null;
      if (transaction.studentId) {
        student = await StudentRepository.findByUid(transaction.studentId);
      }

      const responseData = this.presentTransaction(transaction, {
        student: student
          ? {
            uid: student.uid,
            name: student.name,
            phone: student.phone,
            class: student.classType,
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
    },
  );

  // 更新交易记录
  public updateTransaction = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const { amount, description, note } = req.body;

      const transaction = await CashRepository.findByUid(Number(id));

      if (!transaction) {
        throw AppError.notFound('交易记录不存在');
      }

      const updateData: Record<string, any> = {};

      if (amount !== undefined) {
        updateData.amount = Math.round(Number(amount) * 100); // 转换为分
      }

      if (note !== undefined) {
        updateData.note = note;
      }

      // description 是计算字段，不直接存储，但可以更新 note
      if (description !== undefined) {
        updateData.note = description;
      }

      const updated = await CashRepository.updateByUid(Number(id), updateData);

      if (!updated) {
        throw AppError.other('更新交易记录失败');
      }

      const responseData = this.presentTransaction(updated);

      const response: IApiResponse<typeof responseData> = {
        success: true,
        data: responseData,
        message: '交易记录更新成功',
      };

      logger.info(`更新交易记录成功，UID: ${transaction.uid}`);
      res.json(response);
    },
  );

  private buildSearchOptions(query: Record<string, any>): any {
    const options: any = {};

    const student = query.studentId ?? query.student_id;
    if (student !== undefined && student !== null && student !== '') {
      options.student_id = Number(student);
    }

    const minAmount = query.minAmount ?? query.min_amount;
    if (minAmount !== undefined && minAmount !== null && minAmount !== '') {
      options.min_amount = Math.round(Number(minAmount) * 100); // 转换为分
    }

    const maxAmount = query.maxAmount ?? query.max_amount;
    if (maxAmount !== undefined && maxAmount !== null && maxAmount !== '') {
      options.max_amount = Math.round(Number(maxAmount) * 100); // 转换为分
    }

    const incomeFlag = query.isIncome ?? query.is_income;
    if (incomeFlag !== undefined && incomeFlag !== null && incomeFlag !== '') {
      if (incomeFlag === true || incomeFlag === 'true') {
        options.is_income = true;
      } else if (incomeFlag === false || incomeFlag === 'false') {
        options.is_income = false;
      }
    }

    const installmentFlag = query.hasInstallment ?? query.has_installment;
    if (
      installmentFlag !== undefined &&
      installmentFlag !== null &&
      installmentFlag !== ''
    ) {
      if (installmentFlag === true || installmentFlag === 'true') {
        options.has_installment = true;
      } else if (installmentFlag === false || installmentFlag === 'false') {
        options.has_installment = false;
      }
    }

    const dateFrom = query.dateFrom ?? query.date_from;
    if (dateFrom) {
      options.date_from = dateFrom;
    }

    const dateTo = query.dateTo ?? query.date_to;
    if (dateTo) {
      options.date_to = dateTo;
    }

    const pageValue = query.page;
    if (pageValue !== undefined && pageValue !== null && pageValue !== '') {
      options.page = Number(pageValue);
    }

    const limitValue = query.limit;
    if (limitValue !== undefined && limitValue !== null && limitValue !== '') {
      options.limit = Number(limitValue);
    }

    const sortByCandidate = query.sortBy ?? query.sort_by;
    if (isCashSortField(sortByCandidate)) {
      options.sort_by = sortByCandidate;
    }

    const sortOrderCandidate = query.sortOrder ?? query.sort_order;
    const normalizedSortOrder = normalizeCashSortOrder(sortOrderCandidate);
    if (normalizedSortOrder) {
      options.sort_order = normalizedSortOrder;
    }

    return options;
  }

  private presentTransaction(
    transaction: CashTransaction,
    overrides: Record<string, unknown> = {},
  ) {
    const amountYuan = transaction.amount / 100;
    const isIncome = transaction.amount > 0;

    const base = {
      uid: transaction.uid,
      student_id: transaction.studentId,
      studentId: transaction.studentId,
      student_name: null as string | null,
      student: null as Record<string, unknown> | null,
      cash: transaction.amount,
      cashInCents: transaction.amount,
      amount_in_cents: transaction.amount,
      amountInCents: transaction.amount,
      // amount 对外保持“绝对值”（配合 isIncome/isExpense 与 formatted_amount 表达方向）
      amount: Math.abs(amountYuan),
      description: this.getTransactionDescription(transaction),
      note: transaction.note,
      is_income: isIncome,
      isIncome,
      is_expense: !isIncome,
      isExpense: !isIncome,
      formatted_amount: isIncome
        ? `+¥${amountYuan.toFixed(2)}`
        : `-¥${Math.abs(amountYuan).toFixed(2)}`,
      formattedAmount: isIncome
        ? `+¥${amountYuan.toFixed(2)}`
        : `-¥${Math.abs(amountYuan).toFixed(2)}`,
      installment: transaction.installmentSnapshot ?? null,
      created_at: transaction.createdAt instanceof Date ? transaction.createdAt.toISOString() : (transaction.createdAt || ''),
      createdAt: transaction.createdAt instanceof Date ? transaction.createdAt.toISOString() : (transaction.createdAt || ''),
      updated_at: transaction.updatedAt instanceof Date ? transaction.updatedAt.toISOString() : (transaction.updatedAt || ''),
      updatedAt: transaction.updatedAt instanceof Date ? transaction.updatedAt.toISOString() : (transaction.updatedAt || ''),
    };

    return { ...base, ...overrides };
  }

  // 私有辅助方法：获取交易描述
  private getTransactionDescription(transaction: CashTransaction): string {
    const amountYuan = Math.abs(transaction.amount / 100);
    const prefix = transaction.amount > 0 ? '收入' : '支出';
    return `${prefix} ¥${amountYuan.toFixed(2)}`;
  }

  private normalizeFrequency(value: unknown): PaymentFrequency | null {
    if (typeof value !== 'string') {
      return null;
    }
    const validFrequencies: PaymentFrequency[] = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'CUSTOM'];
    const matched = validFrequencies.find((item) => item === value);
    return matched ?? null;
  }

  private normalizePositiveInteger(value: unknown): number | null {
    if (value === undefined || value === null || value === '') {
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
    customDays?: number | null,
  ): Date {
    const next = new Date(current);

    switch (frequency) {
      case PaymentFrequencyValues.WEEKLY:
        next.setDate(next.getDate() + 7);
        break;
      case PaymentFrequencyValues.MONTHLY:
        next.setMonth(next.getMonth() + 1);
        break;
      case PaymentFrequencyValues.QUARTERLY:
        next.setMonth(next.getMonth() + 3);
        break;
      case PaymentFrequencyValues.CUSTOM:
        next.setDate(next.getDate() + (customDays ?? 0));
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
    total: number,
  ): string {
    const label = baseNote ? baseNote : '分期付款';
    return `${label}: 第${current}/${total}期`;
  }

  private getStudentDisplayName(studentId: number): string {
    return `学员${studentId}`;
  }

  // 获取财务统计信息 - 优化版本
  public getFinancialStats = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const periodParam = req.query.period;
      const period = typeof periodParam === 'string' ? periodParam : 'month';

      let dateFrom: Date;
      const now = new Date();

      switch (period) {
        case 'week':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter': {
          const quarter = Math.floor(now.getMonth() / 3);
          dateFrom = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        }
        case 'year':
          dateFrom = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const dateFromStr = dateFrom.toISOString();
      const dateToStr = now.toISOString();

      // 使用 PostgreSQL 聚合查询
      const stats = await CashRepository.getFinancialStats(
        dateFromStr,
        dateToStr,
      );

      const net_income = stats.totalIncome - stats.totalExpense;

      // 按学员ID聚合收入
      const studentIncomeResults =
        await CashRepository.getStudentIncomeRanking(10, dateFromStr, dateToStr);

      // 获取学员姓名
      const student_income: StudentIncomeSummary[] = await Promise.all(
        studentIncomeResults.map(async (item) => {
          const student = item.studentId
            ? await StudentRepository.findByUid(item.studentId)
            : null;
          return {
            studentId: item.studentId,
            student_name: student?.name ?? this.getStudentDisplayName(item.studentId),
            amount: (item.totalAmount as unknown as number) / 100, // 转换为元
          };
        }),
      );

      const responseData: FinancialStatsResponse = {
        period,
        date_from: dateFrom.toISOString().split('T')[0],
        date_to: now.toISOString().split('T')[0],
        total_income: stats.totalIncome / 100,
        total_expense: stats.totalExpense / 100,
        net_income: net_income / 100,
        transaction_count: stats.transactionCount,
        student_income,
        monthly_stats: [],
      };

      const response: IApiResponse<FinancialStatsResponse> = {
        success: true,
        data: responseData,
      };

      logger.info(
        `获取财务统计成功，周期: ${period}, 收入: ¥${stats.totalIncome / 100}, 支出: ¥${stats.totalExpense / 100}`,
      );
      res.json(response);
    },
  );

  // 获取分期付款列表 - 完整版本
  public getInstallments = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
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
        whereCondition.studentId = Number(student_id);
      }

      if (status) {
        whereCondition.status = status;
      }

      const sortFieldCandidate =
        typeof sort_by === 'string' ? sort_by : undefined;
      const sortField: InstallmentPlanSortField =
        sortFieldCandidate && isInstallmentPlanSortField(sortFieldCandidate)
          ? sortFieldCandidate
          : 'created_at';
      const sortOrderValue: 'ASC' | 'DESC' =
        typeof sort_order === 'string' && sort_order.toUpperCase() === 'ASC'
          ? 'ASC'
          : 'DESC';

      const options = {
        ...whereCondition,
        page: Number(page),
        limit: Number(limit),
        sort_by: sortField,
        sort_order: sortOrderValue,
      };

      const result = await InstallmentPlanRepository.findWithPagination(options);

      const responseData = [];

      for (const plan of result.data) {
        const planInstallments = await InstallmentRepository.findByPlanId(plan.uid);

        const paidCount = planInstallments.filter(
          (i) => i.status === 'PAID',
        ).length;
        const pendingCount = planInstallments.filter(
          (i) => i.status === 'PENDING',
        ).length;
        const overdueCount = planInstallments.filter((i) =>
          InstallmentRepository.isOverdue(i),
        ).length;

        responseData.push({
          uid: plan.uid,
          student_id: plan.studentId,
          total_amount: this.formatAmount(plan.totalAmount),
          total_installments: plan.totalInstallments,
          frequency: plan.frequency,
          custom_days: plan.customDays,
          start_date: plan.startDate,
          status: plan.status,
          status_text: this.getStatusText(plan.status),
          frequency_text: this.getFrequencyText(
            plan.frequency,
            plan.customDays,
          ),
          installment_amount: this.formatAmount(
            InstallmentPlanRepository.calculateInstallmentAmount(
              plan.totalAmount,
              plan.totalInstallments,
            ),
          ),
          progress: Math.round((paidCount / plan.totalInstallments) * 100),
          paid_count: paidCount,
          pending_count: pendingCount,
          overdue_count: overdueCount,
          installments: planInstallments.map((inst) => ({
            uid: inst.uid,
            current_installment: inst.installmentNumber,
            installment_amount: this.formatAmount(inst.installmentAmount),
            due_date: inst.dueDate,
            status: inst.status,
            status_text: this.getStatusText(inst.status),
            paid_amount: this.formatAmount(inst.paidAmount ?? 0),
            paid_date: inst.paidDate,
            days_overdue: InstallmentRepository.getDaysOverdue(inst),
            is_overdue: InstallmentRepository.isOverdue(inst),
          })),
        });
      }

      const response: IApiResponse<any> = {
        success: true,
        data: responseData,
        pagination: {
          page: result.pagination.page,
          limit: result.pagination.limit,
          total: result.pagination.total,
          total_pages: result.pagination.total_pages,
        },
      };

      logger.info(`获取分期付款列表成功，共 ${result.pagination.total} 条记录`);
      res.json(response);
    },
  );

  // 更新分期付款状态
  public updateInstallmentStatus = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        throw AppError.invalidInput('无效的分期状态');
      }

      const installment = await InstallmentRepository.findByUid(Number(id));

      if (!installment) {
        throw AppError.notFound('分期记录不存在');
      }

      // 如果是支付，创建交易记录
      if (status === 'PAID' && installment.status !== 'PAID') {
        const plan = await InstallmentPlanRepository.findByUid(installment.planId);
        if (plan) {
          await CashBuilder.create()
            .studentId(plan.studentId ?? undefined)
            .installment({
              plan_uid: plan.uid,
              installment_uid: installment.uid,
              installment_number: installment.installmentNumber,
              total_installments: plan.totalInstallments,
              due_date: installment.dueDate,
              status: status as InstallmentStatus,
              note: null,
            } as InstallmentSnapshot)
            .amount(installment.installmentAmount / 100)
            .note(`分期付款: 第${installment.installmentNumber}/${plan.totalInstallments}期`)
            .build();
        }
      }

      const updatedInstallment = await InstallmentRepository.updateByUid(
        Number(id),
        {
          status: status as InstallmentStatus,
          paidDate: status === 'PAID' ? new Date().toISOString().split('T')[0] : installment.paidDate,
          paidAmount:
            status === 'PAID'
              ? installment.installmentAmount
              : installment.paidAmount,
        },
      );

      if (!updatedInstallment) {
        throw AppError.other('更新分期付款状态失败');
      }

      // 刷新计划状态
      await InstallmentRepository.refreshPlanStatus(installment.planId);

      logger.info(
        `更新分期付款状态成功，ID: ${installment.uid}, 状态: ${status}`,
      );
      res.json({
        success: true,
        data: InstallmentRepository.toResponse(updatedInstallment),
        message: '分期付款状态更新成功',
      });
    },
  );

  // 私有辅助方法：获取状态文本
  private getStatusText(status: string): string {
    switch (status) {
      case InstallmentStatusValues.PENDING:
        return '待支付';
      case InstallmentStatusValues.PAID:
        return '已支付';
      case InstallmentStatusValues.OVERDUE:
        return '已逾期';
      case InstallmentStatusValues.CANCELLED:
      case InstallmentPlanStatusValues.CANCELLED:
        return '已取消';
      case InstallmentPlanStatusValues.ACTIVE:
        return '进行中';
      case InstallmentPlanStatusValues.COMPLETED:
        return '已完成';
      default:
        return status;
    }
  }

  // 私有辅助方法：获取频率文本
  private getFrequencyText(
    frequency: PaymentFrequency | string,
    customDays?: number | null,
  ): string {
    const safeCustomDays =
      typeof customDays === 'number' &&
      Number.isFinite(customDays) &&
      customDays > 0
        ? customDays
        : null;

    switch (frequency) {
      case PaymentFrequencyValues.WEEKLY:
        return '周付';
      case PaymentFrequencyValues.MONTHLY:
        return '月付';
      case PaymentFrequencyValues.QUARTERLY:
        return '季付';
      case PaymentFrequencyValues.CUSTOM:
        return safeCustomDays ? `${safeCustomDays}天一次` : '自定义';
      default:
        return typeof frequency === 'string' ? frequency : String(frequency);
    }
  }
}

// 导出控制器实例
const cashController = new CashController();
export default cashController;
