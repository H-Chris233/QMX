import { db } from '../index';
import {
  installmentPlans,
  installments,
  InstallmentPlan,
  Installment,
  NewInstallmentPlan,
  NewInstallment,
  PlanStatus,
  InstallmentStatus,
} from '../schema/installments';
import { eq, and, lt, lte, isNull, count, desc, asc, gte } from 'drizzle-orm';
import { PaginationResult } from './studentRepository';

export interface InstallmentSearchOptions {
  planId?: number;
  studentId?: number;
  status?: InstallmentStatus;
  minDueDate?: string;
  maxDueDate?: string;
  isOverdue?: boolean;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

export interface InstallmentPlanSearchOptions {
  studentId?: number;
  status?: PlanStatus;
  minTotalAmount?: number;
  maxTotalAmount?: number;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

export class InstallmentPlanRepository {
  // 根据 UID 查找
  static async findByUid(uid: number): Promise<InstallmentPlan | null> {
    const [plan] = await db
      .select()
      .from(installmentPlans)
      .where(eq(installmentPlans.uid, uid))
      .limit(1);
    return plan || null;
  }

  // 查找所有
  static async findAll(): Promise<InstallmentPlan[]> {
    return await db
      .select()
      .from(installmentPlans)
      .orderBy(desc(installmentPlans.createdAt));
  }

  // 创建计划
  static async create(data: NewInstallmentPlan): Promise<InstallmentPlan> {
    const [plan] = await db.insert(installmentPlans).values(data).returning();
    return plan;
  }

  // 更新计划
  static async updateByUid(
    uid: number,
    data: Partial<NewInstallmentPlan>
  ): Promise<InstallmentPlan | null> {
    const [updated] = await db
      .update(installmentPlans)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(installmentPlans.uid, uid))
      .returning();
    return updated || null;
  }

  // 删除计划
  static async deleteByUid(uid: number): Promise<boolean> {
    const result = await db
      .delete(installmentPlans)
      .where(eq(installmentPlans.uid, uid));
    return (result.rowCount ?? 0) > 0;
  }

  // 根据学员ID查找计划
  static async findByStudentId(studentId: number): Promise<InstallmentPlan[]> {
    return await db
      .select()
      .from(installmentPlans)
      .where(eq(installmentPlans.studentId, studentId))
      .orderBy(desc(installmentPlans.createdAt));
  }

  // 查找活跃计划
  static async findActivePlans(): Promise<InstallmentPlan[]> {
    return await db
      .select()
      .from(installmentPlans)
      .where(eq(installmentPlans.status, 'ACTIVE' as PlanStatus))
      .orderBy(desc(installmentPlans.createdAt));
  }

  // 统计活跃计划数
  static async countActivePlans(): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(installmentPlans)
      .where(eq(installmentPlans.status, 'ACTIVE' as PlanStatus));
    return result?.count || 0;
  }

  // 计数
  static async count(filter?: Partial<InstallmentPlanSearchOptions>): Promise<number> {
    const conditions = this.buildConditions(filter || {});
    const [result] = await db
      .select({ count: count() })
      .from(installmentPlans)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    return result?.count || 0;
  }

  // 分页查询
  static async findWithPagination(options: InstallmentPlanSearchOptions): Promise<PaginationResult<InstallmentPlan>> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const offset = (page - 1) * limit;

    const conditions = this.buildConditions(options);
    const orderBy = this.buildOrderBy(options.sort_by, options.sort_order);

    // 查询数据
    let dataQuery = db.select().from(installmentPlans);
    if (conditions.length > 0) {
      dataQuery = dataQuery.where(and(...conditions));
    }
    const data = await dataQuery.orderBy(orderBy).limit(limit).offset(offset) as InstallmentPlan[];

    // 查询总数
    let countQuery = db.select({ count: count() }).from(installmentPlans);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }
    const [countResult] = await countQuery;
    const total = countResult?.count || 0;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  // 查找指定学员和状态的计划
  static async findByStudentIdAndStatus(studentId: number, status?: PlanStatus): Promise<InstallmentPlan[]> {
    const conditions = [eq(installmentPlans.studentId, studentId)];
    if (status) {
      conditions.push(eq(installmentPlans.status, status));
    }

    return await db
      .select()
      .from(installmentPlans)
      .where(and(...conditions))
      .orderBy(desc(installmentPlans.createdAt));
  }

  // 构建查询条件
  private static buildConditions(options: InstallmentPlanSearchOptions) {
    const conditions = [];

    if (options.studentId !== undefined) {
      conditions.push(eq(installmentPlans.studentId, options.studentId));
    }

    if (options.status !== undefined) {
      conditions.push(eq(installmentPlans.status, options.status));
    }

    if (options.minTotalAmount !== undefined) {
      conditions.push(gte(installmentPlans.totalAmount, options.minTotalAmount));
    }

    if (options.maxTotalAmount !== undefined) {
      conditions.push(lte(installmentPlans.totalAmount, options.maxTotalAmount));
    }

    return conditions;
  }

  // 构建排序
  private static buildOrderBy(sortBy?: string, sortOrder?: 'ASC' | 'DESC') {
    const column =
      sortBy === 'total_amount'
        ? installmentPlans.totalAmount
        : sortBy === 'student_id'
        ? installmentPlans.studentId
        : sortBy === 'created_at' || sortBy === 'startDate'
        ? installmentPlans.createdAt
        : installmentPlans.uid;

    return sortOrder === 'ASC' ? asc(column) : desc(column);
  }

  // 计算分期金额
  static calculateInstallmentAmount(
    totalAmount: number,
    totalInstallments: number,
    installmentNumber?: number
  ): number {
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return 0;
    }
    const installments = Math.max(1, totalInstallments);
    const baseAmount = Math.floor(totalAmount / installments);
    const remainder = totalAmount % installments;

    // 如果没有指定期数，返回平均+0或1
    if (installmentNumber === undefined) {
      return baseAmount + (remainder > 0 ? 1 : 0);
    }

    // 如果指定期数，计算该期的金额
    const index = Math.trunc(installmentNumber);
    if (index <= 0 || index > installments) {
      return baseAmount;
    }

    // 余数分散到前几期
    return index <= remainder ? baseAmount + 1 : baseAmount;
  }

  // 判断计划是否活跃
  static isActive(plan: InstallmentPlan): boolean {
    return plan.status === 'ACTIVE';
  }

  // 转换为 API 响应格式 (兼容前端)
  static toResponse(plan: InstallmentPlan) {
    const isActive = this.isActive(plan);
    return {
      uid: plan.uid,
      student_id: plan.studentId,
      studentId: plan.studentId,
      total_amount: plan.totalAmount,
      totalAmount: plan.totalAmount,
      down_payment: plan.downPayment,
      downPayment: plan.downPayment,
      total_installments: plan.totalInstallments,
      totalInstallments: plan.totalInstallments,
      frequency: plan.frequency,
      custom_days: plan.customDays,
      customDays: plan.customDays,
      status: plan.status,
      is_active: isActive,
      isActive: isActive,
      note: plan.note,
      start_date: plan.startDate,
      startDate: plan.startDate,
      created_at: plan.createdAt?.toISOString() || '',
      createdAt: plan.createdAt,
      updated_at: plan.updatedAt?.toISOString() || '',
      updatedAt: plan.updatedAt,
    };
  }
}

export class InstallmentRepository {
  // 根据 UID 查找
  static async findByUid(uid: number): Promise<Installment | null> {
    const [installment] = await db
      .select()
      .from(installments)
      .where(eq(installments.uid, uid))
      .limit(1);
    return installment || null;
  }

  // 创建分期
  static async create(data: NewInstallment): Promise<Installment> {
    const [installment] = await db
      .insert(installments)
      .values(data)
      .returning();
    return installment;
  }

  // 批量创建分期
  static async createMany(data: NewInstallment[]): Promise<Installment[]> {
    const result = await db.insert(installments).values(data).returning();
    return result;
  }

  // 更新分期
  static async updateByUid(
    uid: number,
    data: Partial<NewInstallment>
  ): Promise<Installment | null> {
    const [updated] = await db
      .update(installments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(installments.uid, uid))
      .returning();
    return updated || null;
  }

  // 删除分期
  static async deleteByUid(uid: number): Promise<boolean> {
    const result = await db
      .delete(installments)
      .where(eq(installments.uid, uid));
    return (result.rowCount ?? 0) > 0;
  }

  // 根据计划ID查找分期
  static async findByPlanId(planId: number): Promise<Installment[]> {
    return await db
      .select()
      .from(installments)
      .where(eq(installments.planId, planId))
      .orderBy(asc(installments.installmentNumber));
  }

  // 根据学员ID查找分期
  static async findByStudentId(studentId: number): Promise<Installment[]> {
    return await db
      .select()
      .from(installments)
      .where(eq(installments.studentId, studentId))
      .orderBy(desc(installments.dueDate));
  }

  // 查找逾期分期
  static async findOverdue(): Promise<Installment[]> {
    const today = new Date().toISOString().split('T')[0];
    return await db
      .select()
      .from(installments)
      .where(
        and(
          eq(installments.status, 'PENDING'),
          lt(installments.dueDate, today)
        )
      )
      .orderBy(asc(installments.dueDate));
  }

  // 根据状态查找分期
  static async findByStatus(status: InstallmentStatus): Promise<Installment[]> {
    return await db
      .select()
      .from(installments)
      .where(eq(installments.status, status))
      .orderBy(asc(installments.dueDate));
  }

  // 查找指定学员的待付分期
  static async findPendingByStudentId(studentId: number): Promise<Installment[]> {
    return await db
      .select()
      .from(installments)
      .where(
        and(
          eq(installments.studentId, studentId),
          eq(installments.status, 'PENDING' as InstallmentStatus)
        )
      )
      .orderBy(asc(installments.dueDate));
  }

  // 计数
  static async count(filter?: Partial<InstallmentSearchOptions>): Promise<number> {
    const conditions = this.buildConditions(filter || {});
    const [result] = await db
      .select({ count: count() })
      .from(installments)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    return result?.count || 0;
  }

  // 分页查询
  static async findWithPagination(options: InstallmentSearchOptions): Promise<PaginationResult<Installment>> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const offset = (page - 1) * limit;

    const conditions = this.buildConditions(options);
    const orderBy = this.buildOrderBy(options.sort_by, options.sort_order);

    // 查询数据
    let dataQuery = db.select().from(installments);
    if (conditions.length > 0) {
      dataQuery = dataQuery.where(and(...conditions));
    }
    const data = await dataQuery.orderBy(orderBy).limit(limit).offset(offset) as Installment[];

    // 查询总数
    let countQuery = db.select({ count: count() }).from(installments);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }
    const [countResult] = await countQuery;
    const total = countResult?.count || 0;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  // 构建查询条件
  private static buildConditions(options: InstallmentSearchOptions) {
    const conditions = [];

    if (options.planId !== undefined) {
      conditions.push(eq(installments.planId, options.planId));
    }

    if (options.studentId !== undefined) {
      conditions.push(eq(installments.studentId, options.studentId));
    }

    if (options.status !== undefined) {
      conditions.push(eq(installments.status, options.status));
    }

    if (options.minDueDate) {
      conditions.push(gte(installments.dueDate, options.minDueDate));
    }

    if (options.maxDueDate) {
      conditions.push(lte(installments.dueDate, options.maxDueDate));
    }

    if (options.isOverdue === true) {
      const today = new Date().toISOString().split('T')[0];
      conditions.push(
        and(
          eq(installments.status, 'PENDING' as InstallmentStatus),
          lt(installments.dueDate, today)
        )
      );
    }

    return conditions;
  }

  // 构建排序
  private static buildOrderBy(sortBy?: string, sortOrder?: 'ASC' | 'DESC') {
    const column =
      sortBy === 'due_date'
        ? installments.dueDate
        : sortBy === 'amount' || sortBy === 'installment_amount'
        ? installments.installmentAmount
        : sortBy === 'plan_id'
        ? installments.planId
        : sortBy === 'student_id'
        ? installments.studentId
        : sortBy === 'created_at'
        ? installments.createdAt
        : installments.uid;

    return sortOrder === 'ASC' ? asc(column) : desc(column);
  }

  // 刷新计划状态
  static async refreshPlanStatus(planId: number): Promise<void> {
    const planInstallments = await this.findByPlanId(planId);

    if (planInstallments.length === 0) {
      // 没有分期记录，完成计划
      await InstallmentPlanRepository.updateByUid(planId, { status: 'COMPLETED' });
      return;
    }

    const allPaid = planInstallments.every(
      (i) => i.status === 'PAID' || i.paidAmount >= i.installmentAmount
    );
    const allCancelled = planInstallments.every((i) => i.status === 'CANCELLED');

    let newStatus: PlanStatus = 'ACTIVE';
    if (allPaid) {
      newStatus = 'COMPLETED';
    } else if (allCancelled) {
      newStatus = 'CANCELLED';
    }

    await InstallmentPlanRepository.updateByUid(planId, { status: newStatus });
  }

  // 判断分期是否逾期
  static isOverdue(installment: Installment, referenceDate: Date = new Date()): boolean {
    if (installment.status === 'CANCELLED' || installment.status === 'PAID') {
      return false;
    }
    if (installment.status === 'OVERDUE') {
      return true;
    }
    const ref = new Date(referenceDate);
    const due = new Date(installment.dueDate);
    return due.getTime() < ref.getTime();
  }

  // 计算逾期天数
  static getDaysOverdue(installment: Installment, referenceDate: Date = new Date()): number {
    if (!this.isOverdue(installment, referenceDate)) {
      return 0;
    }
    const ref = new Date(referenceDate);
    const due = new Date(installment.dueDate);

    const refMidnight = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate());

    const diff = Math.floor((refMidnight.getTime() - dueMidnight.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }

  // 剩余金额
  static getRemainingAmount(installment: Installment): number {
    const paid = installment.paidAmount ?? 0;
    const remaining = installment.installmentAmount - paid;
    return remaining > 0 ? remaining : 0;
  }

  // 转换为 API 响应格式 (兼容前端)
  static toResponse(installment: Installment) {
    const isOverdue = this.isOverdue(installment);
    const daysOverdue = this.getDaysOverdue(installment);
    const remaining = this.getRemainingAmount(installment);

    return {
      uid: installment.uid,
      plan_id: installment.planId,
      planId: installment.planId,
      student_id: installment.studentId,
      studentId: installment.studentId,
      current_installment: installment.installmentNumber,
      currentInstallment: installment.installmentNumber,
      installment_number: installment.installmentNumber,
      installmentNumber: installment.installmentNumber,
      installment_amount: installment.installmentAmount,
      installmentAmount: installment.installmentAmount,
      paid_amount: installment.paidAmount,
      paidAmount: installment.paidAmount,
      due_date: installment.dueDate,
      dueDate: installment.dueDate,
      paid_date: installment.paidDate,
      paidDate: installment.paidDate,
      status: installment.status,
      is_overdue: isOverdue,
      isOverdue,
      days_overdue: daysOverdue,
      daysOverdue,
      remaining_amount: remaining,
      remainingAmount: remaining,
      cash_uid: installment.cashUid,
      cashUid: installment.cashUid,
      note: installment.note,
      created_at: installment.createdAt?.toISOString() || '',
      createdAt: installment.createdAt,
      updated_at: installment.updatedAt?.toISOString() || '',
      updatedAt: installment.updatedAt,
    };
  }
}
