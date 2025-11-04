import { AppError } from '@/utils/errors';
import { CashClass } from '@/models/CashMongo';
import { Installment, type IInstallmentDoc } from '@/models/InstallmentMongo';
import {
  InstallmentPlan,
  InstallmentPlanModel,
  InstallmentPlanStatus,
} from '@/models/InstallmentPlanMongo';
import { Student, type IStudentDoc } from '@/models/mongo';
import { ClassType, InstallmentStatus, MembershipStatus } from '@/types';
import type { Aggregate, PipelineStage } from 'mongoose';

const FINANCIAL_PERIODS = ['Today', 'ThisWeek', 'ThisMonth', 'ThisYear'] as const;
export type FinancialPeriod = typeof FINANCIAL_PERIODS[number];

const MS_PER_DAY = 1000 * 60 * 60 * 24;

interface DateRange {
  start: Date;
  end: Date;
}

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

interface MembershipSummary {
  status: MembershipStatus;
  label: string;
  daysRemaining: number | null;
  daysUntilStart: number | null;
  isActive: boolean;
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
  membership: MembershipSummary;
  installments: {
    totalAmountCents: number;
    paidAmountCents: number;
    remainingAmountCents: number;
    pendingAmountCents: number;
    pendingCount: number;
  };
}

export interface StudentIncomeEntry {
  studentId: number;
  studentName: string;
  amountCents: number;
}

export interface FinancialStatsData {
  period: FinancialPeriod;
  dateRange: DateRange;
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

interface CashRevenueExpenseAggregateRow {
  revenue?: number;
  expense?: number;
}

interface CashIncomeSummaryAggregateRow {
  incomeCents?: number;
  expenseCents?: number;
  transactionCount?: number;
}

interface CashStudentIncomeAggregateRow {
  _id: number;
  amountCents?: number;
}

interface StudentIncomeSummaryAggregateRow {
  totalIncome?: number;
  incomeCount?: number;
}

interface StudentNameProjection {
  uid: number;
  name: string;
}

export class StatsService {
  static normalizeFinancialPeriod(period?: string | null): FinancialPeriod {
    if (period && FINANCIAL_PERIODS.includes(period as FinancialPeriod)) {
      return period as FinancialPeriod;
    }
    return 'ThisMonth';
  }

  static async buildDashboardStats(): Promise<DashboardStatsData> {
    const revenueExpensePipeline: PipelineStage[] = [
      {
        $group: {
          _id: null,
          revenue: {
            $sum: {
              $cond: [{ $gt: ['$cash', 0] }, '$cash', 0],
            },
          },
          expense: {
            $sum: {
              $cond: [{ $lt: ['$cash', 0] }, '$cash', 0],
            },
          },
        },
      },
    ];

    const [cashAggregate] = await this.executeCashAggregate<CashRevenueExpenseAggregateRow>(
      revenueExpensePipeline,
    );

    const totalRevenueCents = Number(cashAggregate?.revenue ?? 0);
    const totalExpenseCents = Math.abs(Number(cashAggregate?.expense ?? 0));

    const students = await Student.findAll();
    const now = new Date();
    const activeCourseSet = new Set<string>();

    let totalScore = 0;
    let scoreCount = 0;
    let maxScore = 0;
    let activeMembers = 0;

    for (const student of students) {
      if (Array.isArray(student.rings) && student.rings.length > 0) {
        for (const rawScore of student.rings) {
          const score = Number(rawScore);
          if (Number.isFinite(score)) {
            totalScore += score;
            scoreCount += 1;
            if (score > maxScore) {
              maxScore = score;
            }
          }
        }
      }

      if (student.class && student.class !== ClassType.OTHERS) {
        activeCourseSet.add(student.class);
      }

      if (student.hasMembership(now)) {
        activeMembers += 1;
      }
    }

    const averageScore = scoreCount > 0
      ? Number((totalScore / scoreCount).toFixed(1))
      : 0;

    const activeInstallmentPlans = await InstallmentPlanModel.countDocuments({
      status: InstallmentPlanStatus.ACTIVE,
    }).exec();

    const overdueInstallments = await Installment.findOverdue(now);

    return {
      totalStudents: students.length,
      totalRevenueCents,
      totalExpenseCents,
      netIncomeCents: totalRevenueCents - totalExpenseCents,
      averageScore,
      maxScore,
      activeCourses: activeCourseSet.size,
      activeMembers,
      activeInstallmentPlans,
      overdueInstallmentCount: overdueInstallments.length,
    };
  }

  static async buildStudentStats(studentUid: number): Promise<StudentStatsData> {
    const student = await Student.findByUid(studentUid);
    if (!student) {
      throw AppError.notFound('学员不存在');
    }

    const studentIncomePipeline: PipelineStage[] = [
      {
        $match: {
          student_id: studentUid,
        },
      },
      {
        $group: {
          _id: null,
          totalIncome: {
            $sum: {
              $cond: [{ $gt: ['$cash', 0] }, '$cash', 0],
            },
          },
          incomeCount: {
            $sum: {
              $cond: [{ $gt: ['$cash', 0] }, 1, 0],
            },
          },
        },
      },
    ];

    const [cashAggregate] = await this.executeCashAggregate<StudentIncomeSummaryAggregateRow>(
      studentIncomePipeline,
    );

    const totalIncomeCents = Number(cashAggregate?.totalIncome ?? 0);
    const incomeCount = Number(cashAggregate?.incomeCount ?? 0);

    const plans = await InstallmentPlan.findAll({ student_id: studentUid });
    const planIds = plans.map(plan => plan.uid);

    const installments = planIds.length > 0
      ? await Installment.findAll({ plan_id: { $in: planIds } })
      : await Installment.findAll({ student_id: studentUid });

    const totalInstallmentCents = plans.reduce((sum, plan) => sum + Number(plan.total_amount ?? 0), 0);

    let paidInstallmentCents = 0;
    let pendingAmountCents = 0;
    let pendingCount = 0;

    for (const installment of installments) {
      if (installment.status === InstallmentStatus.PAID) {
        const paidAmount = Number(installment.paid_amount ?? 0);
        paidInstallmentCents += paidAmount > 0 ? paidAmount : Number(installment.installment_amount ?? 0);
      } else if (
        installment.status === InstallmentStatus.PENDING ||
        installment.status === InstallmentStatus.OVERDUE
      ) {
        pendingCount += 1;
        pendingAmountCents += StatsService.getInstallmentRemaining(installment);
      }
    }

    const membership = StatsService.summarizeMembership(student);

    const totalScore = Array.isArray(student.rings)
      ? student.rings.reduce((sum, score) => sum + Number(score), 0)
      : 0;
    const scoreCount = Array.isArray(student.rings) ? student.rings.length : 0;

    const averageScore = scoreCount > 0
      ? Number((totalScore / scoreCount).toFixed(1))
      : 0;

    const maxScore = scoreCount > 0 ? Math.max(...student.rings) : 0;
    const minScore = scoreCount > 0 ? Math.min(...student.rings) : 0;

    const remainingAmountCents = Math.max(totalInstallmentCents - paidInstallmentCents, 0);
    const totalAmountCents = totalInstallmentCents;
    const paidAmountCents = paidInstallmentCents;

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
        count: scoreCount,
      },
      membership,
      installments: {
        totalAmountCents,
        paidAmountCents,
        remainingAmountCents,
        pendingAmountCents,
        pendingCount,
      },
    };
  }

  static async buildFinancialStats(period: FinancialPeriod | string = 'ThisMonth'): Promise<FinancialStatsData> {
    const normalizedPeriod = StatsService.normalizeFinancialPeriod(period);
    const dateRange = StatsService.resolveDateRange(normalizedPeriod);

    const cashPipeline: PipelineStage[] = [
      {
        $match: {
          created_at: { $gte: dateRange.start, $lt: dateRange.end },
        },
      },
      {
        $group: {
          _id: null,
          incomeCents: {
            $sum: {
              $cond: [{ $gt: ['$cash', 0] }, '$cash', 0],
            },
          },
          expenseCents: {
            $sum: {
              $cond: [{ $lt: ['$cash', 0] }, '$cash', 0],
            },
          },
          transactionCount: {
            $sum: 1,
          },
        },
      },
    ];

    const [cashAggregate] = await this.executeCashAggregate<CashIncomeSummaryAggregateRow>(
      cashPipeline,
    );

    const incomeCents = Number(cashAggregate?.incomeCents ?? 0);
    const expenseCents = Math.abs(Number(cashAggregate?.expenseCents ?? 0));
    const netIncomeCents = incomeCents - expenseCents;

    const studentIncomeAggregatePipeline: PipelineStage[] = [
      {
        $match: {
          created_at: { $gte: dateRange.start, $lt: dateRange.end },
          cash: { $gt: 0 },
          student_id: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$student_id',
          amountCents: { $sum: '$cash' },
        },
      },
      { $sort: { amountCents: -1 } },
      { $limit: 10 },
    ];

    const studentIncomeAggregate = await this.executeCashAggregate<CashStudentIncomeAggregateRow>(
      studentIncomeAggregatePipeline,
    );

    const studentIds = studentIncomeAggregate.map(entry => entry._id);
    const studentNameMap = new Map<number, string>();

    if (studentIds.length > 0) {
      const studentNamePipeline: PipelineStage[] = [
        { $match: { uid: { $in: studentIds } } },
        { $project: { uid: 1, name: 1 } },
      ];
      const studentDocs = await this.executeStudentAggregate<StudentNameProjection>(studentNamePipeline);

      for (const doc of studentDocs) {
        studentNameMap.set(doc.uid, doc.name);
      }
    }

    const studentIncome: StudentIncomeEntry[] = studentIncomeAggregate.map(entry => ({
      studentId: entry._id,
      studentName: studentNameMap.get(entry._id) ?? `学员${entry._id}`,
      amountCents: Number(entry.amountCents ?? 0),
    }));

    const plans = await InstallmentPlan.findAll({
      created_at: { $gte: dateRange.start, $lt: dateRange.end },
    });

    const planIds = plans.map(plan => plan.uid);
    const installments = planIds.length > 0
      ? await Installment.findAll({ plan_id: { $in: planIds } })
      : [];

    const totalInstallmentCents = plans.reduce((sum, plan) => sum + Number(plan.total_amount ?? 0), 0);

    let paidInstallmentCents = 0;
    let pendingInstallmentCents = 0;

    for (const installment of installments) {
      if (installment.status === InstallmentStatus.PAID) {
        const paidAmount = Number(installment.paid_amount ?? 0);
        paidInstallmentCents += paidAmount > 0 ? paidAmount : Number(installment.installment_amount ?? 0);
      } else if (
        installment.status === InstallmentStatus.PENDING ||
        installment.status === InstallmentStatus.OVERDUE
      ) {
        pendingInstallmentCents += StatsService.getInstallmentRemaining(installment);
      }
    }

    const remainingInstallmentCents = Math.max(totalInstallmentCents - paidInstallmentCents, 0);

    return {
      period: normalizedPeriod,
      dateRange,
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
      transactionCount: Number(cashAggregate?.transactionCount ?? 0),
      studentIncome,
    };
  }

  private static async executeCashAggregate<T>(pipeline: PipelineStage[]): Promise<T[]> {
    const aggregate = CashClass.aggregate(pipeline) as Aggregate<unknown[]>;
    const result = await aggregate.exec();
    return result as T[];
  }

  private static async executeStudentAggregate<T>(pipeline: PipelineStage[]): Promise<T[]> {
    const aggregate = Student.aggregate(pipeline) as Aggregate<unknown[]>;
    const result = await aggregate.exec();
    return result as T[];
  }

  private static resolveDateRange(period: FinancialPeriod, reference = new Date()): DateRange {
    const now = new Date(reference);
    now.setHours(0, 0, 0, 0);

    let start: Date;
    let end: Date;

    switch (period) {
      case 'Today': {
        start = new Date(now);
        end = new Date(start);
        end.setDate(end.getDate() + 1);
        break;
      }
      case 'ThisWeek': {
        start = new Date(now);
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        end = new Date(start);
        end.setDate(end.getDate() + 7);
        break;
      }
      case 'ThisYear': {
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear() + 1, 0, 1);
        break;
      }
      case 'ThisMonth':
      default: {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      }
    }

    return {
      start,
      end,
    };
  }

  private static summarizeMembership(student: IStudentDoc, reference = new Date()): MembershipSummary {
    if (!student.membershipStartDate || !student.membershipEndDate) {
      return {
        status: MembershipStatus.NONE,
        label: '无会员',
        daysRemaining: null,
        daysUntilStart: null,
        isActive: false,
      };
    }

    const now = new Date(reference);
    const isActive = student.hasMembership(now);
    const daysRemaining = student.getMembershipDaysRemaining(now);

    if (isActive) {
      if (daysRemaining !== null && daysRemaining <= 7) {
        return {
          status: MembershipStatus.ACTIVE,
          label: `会员即将到期 (${daysRemaining}天)`,
          daysRemaining,
          daysUntilStart: 0,
          isActive: true,
        };
      }

      return {
        status: MembershipStatus.ACTIVE,
        label: '会员有效',
        daysRemaining,
        daysUntilStart: 0,
        isActive: true,
      };
    }

    if (student.membershipStartDate > now) {
      const daysUntilStart = StatsService.calculateDaysBetween(now, student.membershipStartDate);
      return {
        status: MembershipStatus.UPCOMING,
        label: `会员未开始 (${daysUntilStart}天后)`,
        daysRemaining,
        daysUntilStart,
        isActive: false,
      };
    }

    return {
      status: MembershipStatus.EXPIRED,
      label: '会员已过期',
      daysRemaining: 0,
      daysUntilStart: null,
      isActive: false,
    };
  }

  private static calculateDaysBetween(from: Date, to: Date): number {
    const diff = to.getTime() - from.getTime();
    if (diff <= 0) {
      return 0;
    }
    return Math.ceil(diff / MS_PER_DAY);
  }

  private static getInstallmentRemaining(installment: IInstallmentDoc): number {
    if (typeof installment.getRemainingAmount === 'function') {
      return Number(installment.getRemainingAmount() ?? 0);
    }
    const paidAmount = Number(installment.paid_amount ?? 0);
    const installmentAmount = Number(installment.installment_amount ?? 0);
    const remaining = installmentAmount - paidAmount;
    return remaining > 0 ? remaining : 0;
  }
}

export default StatsService;
