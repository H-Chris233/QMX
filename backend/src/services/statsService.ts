import { db } from '../db';
import {
  students,
  cashTransactions,
  installmentPlans,
  installments,
} from '../db/schema';
import {
  sum,
  count,
  avg,
  and,
  gte,
  lte,
  eq,
  gt,
  lt,
  sql,
  desc,
  asc,
  isNotNull,
  inArray,
} from 'drizzle-orm';

export interface DashboardStatsData {
  totalStudents: number;
  totalRevenueCents: number;
  totalExpenseCents: number;
  netIncomeCents: number;
  averageScore: number;
  maxScore: number;
  activeCourses: number;
  activeMembers: number;
  activeInstallmentPlans: number;
  overdueInstallmentCount: number;
}

export interface FinancialPeriod {
  type: 'Today' | 'ThisWeek' | 'ThisMonth' | 'ThisYear';
}

export interface FinancialStatsData {
  period: string;
  totals: {
    incomeCents: number;
    expenseCents: number;
    netIncomeCents: number;
    isProfitable: boolean;
  };
  installments: {
    totalCents: number;
    paidCents: number;
    pendingCents: number;
    remainingCents: number;
  };
  transactionCount: number;
  studentIncome: StudentIncomeEntry[];
}

export interface StudentIncomeEntry {
  studentId: number;
  studentName: string;
  amountCents: number;
}

export interface StudentStatsData {
  studentUid: number;
  payments: {
    totalAmountCents: number;
    count: number;
  };
  scores: {
    average: number;
    max: number;
    min: number;
    count: number;
  };
  membership: {
    status: 'NONE' | 'ACTIVE' | 'EXPIRED' | 'UPCOMING';
    label: string;
    daysRemaining: number | null;
    daysUntilStart: number | null;
    isActive: boolean;
  };
  installments: {
    totalAmountCents: number;
    paidAmountCents: number;
    remainingAmountCents: number;
    pendingAmountCents: number;
    pendingCount: number;
  };
}

export class StatsService {
  /**
   * 构建仪表盘统计数据
   */
  static async buildDashboardStats(): Promise<DashboardStatsData> {
    // 并行查询多个指标
    const [studentsCountResult, cashAggregateResult, activeInstallmentsResult] =
      await Promise.all([
        // 学员数量和统计
        db.select({
          count: count(),
        }).from(students),

        // 收入支出统计
        db
          .select({
            totalRevenue: sql<number>`SUM(CASE WHEN ${cashTransactions.amount} > 0 THEN ${cashTransactions.amount} ELSE 0 END)`,
            totalExpense: sql<number>`SUM(CASE WHEN ${cashTransactions.amount} < 0 THEN ${cashTransactions.amount} ELSE 0 END)`,
          })
          .from(cashTransactions),

        // 活跃分期计划数
        db
          .select({ count: count() })
          .from(installmentPlans)
          .where(eq(installmentPlans.status, 'ACTIVE' as const)),
      ]);

    // 查询逾期分期
    const overdueInstallments = await db
      .select()
      .from(installments)
      .where(
        and(
          eq(installments.status, 'PENDING' as const),
          sql`${installments.dueDate} < CURRENT_DATE`
        )
      )
      .orderBy(asc(installments.dueDate));

    // 获取所有学员计算统计数据
    const allStudents = await db
      .select({
        uid: students.uid,
        rings: students.rings,
        classType: students.classType,
        membershipStartDate: students.membershipStartDate,
        membershipEndDate: students.membershipEndDate,
      })
      .from(students);

    // 计算成绩统计
    let totalScore = 0;
    let scoreCount = 0;
    let maxScore = 0;
    const activeCourses = new Set<string>();
    let activeMembers = 0;

    for (const student of allStudents) {
      const rings = student.rings || [];
      if (rings.length > 0) {
        for (const score of rings) {
          if (Number.isFinite(score)) {
            totalScore += score;
            scoreCount += 1;
            if (score > maxScore) {
              maxScore = score;
            }
          }
        }
      }

      if (student.classType && student.classType !== 'OTHERS') {
        activeCourses.add(student.classType);
      }

      // 检查会员有效性
      if (
        student.membershipStartDate &&
        student.membershipEndDate &&
        new Date(student.membershipEndDate) >= new Date() &&
        new Date(student.membershipStartDate) <= new Date()
      ) {
        activeMembers += 1;
      }
    }

    const averageScore = scoreCount > 0 ? Number((totalScore / scoreCount).toFixed(1)) : 0;
    const totalRevenueCents = Number(cashAggregateResult[0]?.totalRevenue || 0);
    const totalExpenseCents = Math.abs(Number(cashAggregateResult[0]?.totalExpense || 0));

    return {
      totalStudents: studentsCountResult[0]?.count || 0,
      totalRevenueCents,
      totalExpenseCents,
      netIncomeCents: totalRevenueCents - totalExpenseCents,
      averageScore,
      maxScore,
      activeCourses: activeCourses.size,
      activeMembers,
      activeInstallmentPlans: activeInstallmentsResult[0]?.count || 0,
      overdueInstallmentCount: overdueInstallments.length,
    };
  }

  /**
   * 构建学员统计数据
   */
  static async buildStudentStats(studentUid: number): Promise<StudentStatsData> {
    // 学员信息
    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.uid, studentUid))
      .limit(1);

    if (!student) {
      throw new Error('学员不存在');
    }

    // 学员收入统计
    const [studentIncomeResult] = await db
      .select({
        totalIncome: sql<number>`SUM(CASE WHEN ${cashTransactions.amount} > 0 THEN ${cashTransactions.amount} ELSE 0 END)`,
        incomeCount: sql<number>`COUNT(CASE WHEN ${cashTransactions.amount} > 0 THEN 1 END)`,
      })
      .from(cashTransactions)
      .where(eq(cashTransactions.studentId, studentUid));

    const totalIncomeCents = Number(studentIncomeResult?.totalIncome || 0);
    const incomeCount = Number(studentIncomeResult?.incomeCount || 0);

    // 分期统计
    const [planTotalResult] = await db
      .select({
        totalAmount: sum(installmentPlans.totalAmount),
      })
      .from(installmentPlans)
      .where(eq(installmentPlans.studentId, studentUid));

    const plans = await db
      .select({ uid: installmentPlans.uid })
      .from(installmentPlans)
      .where(eq(installmentPlans.studentId, studentUid));

    const planIds = plans.map((p) => p.uid);
    const studentInstallments = planIds.length
      ? await db
          .select()
          .from(installments)
          .where(
            inArray(installments.planId, planIds)
          )
      : [];

    const totalInstallmentCents = Number(planTotalResult?.totalAmount || 0);

    // 计算分期统计
    let paidInstallmentCents = 0;
    let pendingAmountCents = 0;
    let pendingCount = 0;

    for (const installment of studentInstallments) {
      if (installment.status === 'PAID') {
        const paidAmount = installment.paidAmount ?? 0;
        paidInstallmentCents +=
          paidAmount > 0 ? paidAmount : installment.installmentAmount;
      } else if (installment.status === 'PENDING' || installment.status === 'OVERDUE') {
        pendingCount += 1;
        const remaining = installment.installmentAmount - (installment.paidAmount ?? 0);
        pendingAmountCents += remaining > 0 ? remaining : 0;
      }
    }

    // 会员状态
    const membership = this.summarizeMembership(student);

    // 成绩统计
    const rings = student.rings || [];
    const averageScore =
      rings.length > 0 ? Number((rings.reduce((a, b) => a + b, 0) / rings.length).toFixed(1)) : 0;
    const maxScore = rings.length > 0 ? Math.max(...rings) : 0;
    const minScore = rings.length > 0 ? Math.min(...rings) : 0;

    const remainingAmountCents = Math.max(totalInstallmentCents - paidInstallmentCents, 0);

    return {
      studentUid,
      payments: {
        totalAmountCents: totalIncomeCents,
        count: incomeCount,
      },
      scores: {
        average: averageScore,
        max: maxScore,
        min: minScore,
        count: rings.length,
      },
      membership,
      installments: {
        totalAmountCents: totalInstallmentCents,
        paidAmountCents: paidInstallmentCents,
        remainingAmountCents,
        pendingAmountCents,
        pendingCount,
      },
    };
  }

  /**
   * 构建财务统计数据
   */
  static async buildFinancialStats(period: string = 'ThisMonth'): Promise<FinancialStatsData> {
    const normalizedPeriod = this.normalizeFinancialPeriod(period);
    const dateRange = this.resolveDateRange(normalizedPeriod);

    // 收入支出统计
    const [incomeExpenseResult] = await db
      .select({
        incomeCents: sql<number>`SUM(CASE WHEN ${cashTransactions.amount} > 0 THEN ${cashTransactions.amount} ELSE 0 END)`,
        expenseCents: sql<number>`SUM(CASE WHEN ${cashTransactions.amount} < 0 THEN ABS(${cashTransactions.amount}) ELSE 0 END)`,
        transactionCount: count(),
      })
      .from(cashTransactions)
      .where(
        and(
          gte(cashTransactions.createdAt, dateRange.start),
          lt(cashTransactions.createdAt, dateRange.end)
        )
      );

    const incomeCents = Number(incomeExpenseResult?.incomeCents || 0);
    const expenseCents = Number(incomeExpenseResult?.expenseCents || 0);
    const netIncomeCents = incomeCents - expenseCents;

    // 学员收入排名
    const studentIncomeAggregate = await db
      .select({
        studentId: cashTransactions.studentId,
        amountCents: sum(cashTransactions.amount),
      })
      .from(cashTransactions)
      .where(
        and(
          gte(cashTransactions.createdAt, dateRange.start),
          lt(cashTransactions.createdAt, dateRange.end),
          gt(cashTransactions.amount, 0),
          isNotNull(cashTransactions.studentId)
        )
      )
      .groupBy(cashTransactions.studentId)
      .orderBy(desc(sum(cashTransactions.amount)))
      .limit(10);

    const studentIds = studentIncomeAggregate.map((e) => e.studentId).filter(Boolean) as number[];

    // 获取学员姓名
    const studentMap = new Map<number, string>();
    if (studentIds.length > 0) {
      const studentDocs = await db
        .select({ uid: students.uid, name: students.name })
        .from(students)
        .where(inArray(students.uid, studentIds));

      for (const doc of studentDocs) {
        studentMap.set(doc.uid, doc.name);
      }
    }

    const studentIncome: StudentIncomeEntry[] = studentIncomeAggregate
      .filter((e) => e.studentId !== null)
      .map((entry) => ({
        studentId: entry.studentId!,
        studentName: studentMap.get(entry.studentId!) ?? `学员${entry.studentId}`,
        amountCents: Number(entry.amountCents ?? 0),
      }));

    // 分期统计
    const plans = await db
      .select()
      .from(installmentPlans)
      .where(
        and(
          gte(installmentPlans.createdAt, dateRange.start),
          lt(installmentPlans.createdAt, dateRange.end)
        )
      );

    const planIds2 = plans.map((p) => p.uid);
    const installments2 = planIds2.length
      ? await db
          .select()
          .from(installments)
          .where(
            inArray(installments.planId, planIds2)
          )
      : [];

    const totalInstallmentCents = plans.reduce(
      (sum, plan) => sum + Number(plan.totalAmount),
      0
    );

    let paidInstallmentCents = 0;
    let pendingInstallmentCents = 0;

    for (const installment of installments2) {
      if (installment.status === 'PAID') {
        const paidAmount = installment.paidAmount ?? 0;
        paidInstallmentCents +=
          paidAmount > 0 ? paidAmount : installment.installmentAmount;
      } else if (installment.status === 'PENDING' || installment.status === 'OVERDUE') {
        const remaining = installment.installmentAmount - (installment.paidAmount ?? 0);
        pendingInstallmentCents += remaining > 0 ? remaining : 0;
      }
    }

    const remainingInstallmentCents = Math.max(
      totalInstallmentCents - paidInstallmentCents,
      0
    );

    return {
      period: normalizedPeriod,
      totals: {
        incomeCents,
        expenseCents,
        netIncomeCents,
        isProfitable: netIncomeCents > 0,
      },
      installments: {
        totalCents: totalInstallmentCents,
        paidCents: paidInstallmentCents,
        pendingCents: pendingInstallmentCents,
        remainingCents: remainingInstallmentCents,
      },
      transactionCount: Number(incomeExpenseResult?.transactionCount || 0),
      studentIncome,
    };
  }

  /**
   * 归一化财务周期
   */
  private static normalizeFinancialPeriod(period?: string | null): string {
    const validPeriods = ['Today', 'ThisWeek', 'ThisMonth', 'ThisYear'] as const;
    if (period && (validPeriods as readonly string[]).includes(period)) {
      return period;
    }
    return 'ThisMonth';
  }

  /**
   * 解析日期范围
   */
  private static resolveDateRange(period: string) {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (period) {
      case 'Today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(start);
        end.setDate(end.getDate() + 1);
        break;

      case 'ThisWeek':
        start = new Date(now);
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        end = new Date(start);
        end.setDate(end.getDate() + 7);
        break;

      case 'ThisYear':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear() + 1, 0, 1);
        break;

      case 'ThisMonth':
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
    }

    return { start, end };
  }

  /**
   * 总结会员状态
   */
  private static summarizeMembership(student: {
    membershipStartDate: Date | string | null;
    membershipEndDate: Date | string | null;
  }) {
    const start = student.membershipStartDate
      ? new Date(student.membershipStartDate)
      : null;
    const end = student.membershipEndDate ? new Date(student.membershipEndDate) : null;
    const now = new Date();

    if (!start || !end) {
      return {
        status: 'NONE' as const,
        label: '无会员',
        daysRemaining: null,
        daysUntilStart: null,
        isActive: false,
      };
    }

    const isActive = now >= start && now <= end;
    const daysRemaining = end >= now ? Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const daysUntilStart = start > now ? Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    if (isActive) {
      if (daysRemaining <= 7) {
        return {
          status: 'ACTIVE' as const,
          label: `会员即将到期 (${daysRemaining}天)`,
          daysRemaining,
          daysUntilStart: 0,
          isActive: true,
        };
      }
      return {
        status: 'ACTIVE' as const,
        label: '会员有效',
        daysRemaining,
        daysUntilStart: 0,
        isActive: true,
      };
    }

    if (start > now) {
      return {
        status: 'UPCOMING' as const,
        label: `会员未开始 (${daysUntilStart}天后)`,
        daysRemaining: daysRemaining,
        daysUntilStart,
        isActive: false,
      };
    }

    return {
      status: 'EXPIRED' as const,
      label: '会员已过期',
      daysRemaining: 0,
      daysUntilStart: null,
      isActive: false,
    };
  }
}

export default StatsService;
