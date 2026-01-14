import { db } from '../index';
import {
  cashTransactions,
  CashTransaction,
  NewCashTransaction,
  InstallmentSnapshot,
} from '../schema/cash';
import { eq, and, gte, lte, gt, lt, isNull, isNotNull, desc, asc, count, sum, sql } from 'drizzle-orm';
import { PaginationResult } from './studentRepository';

export interface CashSearchOptions {
  student_id?: number;
  min_amount?: number;
  max_amount?: number;
  has_installment?: boolean;
  date_from?: string;
  date_to?: string;
  is_income?: boolean;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

export interface FinancialStats {
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  transactionCount: number;
}

export class CashRepository {
  // 根据 UID 查找
  static async findByUid(uid: number): Promise<CashTransaction | null> {
    const [cash] = await db
      .select()
      .from(cashTransactions)
      .where(eq(cashTransactions.uid, uid))
      .limit(1);
    return cash || null;
  }

  // 查找所有
  static async findAll(): Promise<CashTransaction[]> {
    return await db
      .select()
      .from(cashTransactions)
      .orderBy(desc(cashTransactions.createdAt));
  }

  // 创建交易
  static async create(data: NewCashTransaction): Promise<CashTransaction> {
    const [cash] = await db.insert(cashTransactions).values(data).returning();
    return cash;
  }

  // 更新交易
  static async updateByUid(
    uid: number,
    data: Partial<NewCashTransaction>
  ): Promise<CashTransaction | null> {
    const [updated] = await db
      .update(cashTransactions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cashTransactions.uid, uid))
      .returning();
    return updated || null;
  }

  // 删除交易
  static async deleteByUid(uid: number): Promise<boolean> {
    const result = await db
      .delete(cashTransactions)
      .where(eq(cashTransactions.uid, uid));
    return (result.rowCount ?? 0) > 0;
  }

  // 搜索
  static async search(options: CashSearchOptions): Promise<CashTransaction[]> {
    const conditions = this.buildConditions(options);
    const orderBy = this.buildOrderBy(options.sort_by, options.sort_order);

    let query = db.select().from(cashTransactions);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const limit = options.limit || 100;
    const offset = ((options.page || 1) - 1) * limit;

    return await query.orderBy(orderBy).limit(limit).offset(offset);
  }

  // 计数
  static async count(filter?: Partial<CashSearchOptions>): Promise<number> {
    const conditions = this.buildConditions(filter || {});
    const [result] = await db
      .select({ count: count() })
      .from(cashTransactions)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    return result?.count || 0;
  }

  // 分页查询
  static async findWithPagination(options: CashSearchOptions): Promise<PaginationResult<CashTransaction>> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const offset = (page - 1) * limit;

    const conditions = this.buildConditions(options);
    const orderBy = this.buildOrderBy(options.sort_by, options.sort_order);

    // 查询数据
    let dataQuery = db.select().from(cashTransactions);
    if (conditions.length > 0) {
      dataQuery = dataQuery.where(and(...conditions)) as any;
    }
    const data = await dataQuery.orderBy(orderBy).limit(limit).offset(offset) as CashTransaction[];

    // 查询总数
    let countQuery = db.select({ count: count() }).from(cashTransactions);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions)) as any;
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

  // 财务统计
  static async getFinancialStats(dateFrom?: string, dateTo?: string): Promise<FinancialStats> {
    const conditions: ReturnType<typeof gte | typeof lte>[] = [];

    if (dateFrom) {
      conditions.push(gte(cashTransactions.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(cashTransactions.createdAt, new Date(dateTo)));
    }

    const [result] = await db
      .select({
        // 使用 COALESCE 处理 NULL 值，用 amount 正负区分收入和支出
        totalIncome: sql<number>`COALESCE(SUM(CASE WHEN ${cashTransactions.amount} > 0 THEN ${cashTransactions.amount} ELSE 0 END), 0)::numeric`,
        totalExpense: sql<number>`COALESCE(SUM(CASE WHEN ${cashTransactions.amount} < 0 THEN ABS(${cashTransactions.amount}) ELSE 0 END), 0)::numeric`,
        transactionCount: sql<number>`COUNT(*)::int`
      })
      .from(cashTransactions)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const totalIncome = Number(result?.totalIncome || 0);
    const totalExpense = Number(result?.totalExpense || 0);

    return {
      totalIncome,
      totalExpense,
      netIncome: totalIncome - totalExpense,
      transactionCount: result?.transactionCount || 0,
    };
  }

  // 按学员统计收入排名
  static async getStudentIncomeRanking(
    limit: number = 10,
    dateFrom?: string,
    dateTo?: string
  ) {
    const conditions = [gt(cashTransactions.amount, 0)];

    if (dateFrom) {
      conditions.push(gte(cashTransactions.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(cashTransactions.createdAt, new Date(dateTo)));
    }

    const result = await db
      .select({
        studentId: cashTransactions.studentId,
        totalAmount: sum(cashTransactions.amount),
        transactionCount: count(),
      })
      .from(cashTransactions)
      .where(and(...conditions))
      .groupBy(cashTransactions.studentId)
      .orderBy(desc(sum(cashTransactions.amount)))
      .limit(limit);

    return result;
  }

  // 按学员ID查找交易
  static async findByStudentId(studentId: number): Promise<CashTransaction[]> {
    return await db
      .select()
      .from(cashTransactions)
      .where(eq(cashTransactions.studentId, studentId))
      .orderBy(desc(cashTransactions.createdAt));
  }

  // 构建查询条件
  private static buildConditions(options: CashSearchOptions) {
    const conditions: ReturnType<
      typeof eq | typeof gte | typeof lte | typeof gt | typeof lt | typeof isNull | typeof isNotNull
    >[] = [];

    if (options.student_id !== undefined) {
      conditions.push(eq(cashTransactions.studentId, options.student_id));
    }

    if (options.min_amount !== undefined) {
      conditions.push(gte(cashTransactions.amount, options.min_amount));
    }

    if (options.max_amount !== undefined) {
      conditions.push(lte(cashTransactions.amount, options.max_amount));
    }

    if (options.has_installment === true) {
      conditions.push(isNotNull(cashTransactions.installmentSnapshot));
    } else if (options.has_installment === false) {
      conditions.push(isNull(cashTransactions.installmentSnapshot));
    }

    if (options.date_from) {
      conditions.push(gte(cashTransactions.createdAt, new Date(options.date_from)));
    }

    if (options.date_to) {
      conditions.push(lte(cashTransactions.createdAt, new Date(options.date_to)));
    }

    if (options.is_income === true) {
      conditions.push(gt(cashTransactions.amount, 0));
    } else if (options.is_income === false) {
      conditions.push(lt(cashTransactions.amount, 0));
    }

    return conditions;
  }

  // 构建排序
  private static buildOrderBy(sortBy?: string, sortOrder?: 'ASC' | 'DESC') {
    const column =
      sortBy === 'amount' || sortBy === 'cash'
        ? cashTransactions.amount
        : sortBy === 'student_id'
        ? cashTransactions.studentId
        : sortBy === 'created_at' || sortBy === 'date'
        ? cashTransactions.createdAt
        : cashTransactions.uid;

    return sortOrder === 'ASC' ? asc(column) : desc(column);
  }

  // 转换为 API 响应格式 (兼容前端使用 'cash' 字段)
  static toResponse(cash: CashTransaction) {
    return {
      uid: cash.uid,
      student_id: cash.studentId,
      cash: cash.amount, // 前端使用 'cash'
      amount: cash.amount,
      note: cash.note,
      installment: cash.installmentSnapshot,
      installmentSnapshot: cash.installmentSnapshot,
      created_at: cash.createdAt?.toISOString() || '',
      createdAt: cash.createdAt,
      updated_at: cash.updatedAt?.toISOString() || '',
      updatedAt: cash.updatedAt,
    };
  }
}
