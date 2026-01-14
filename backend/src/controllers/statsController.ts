import { Request, Response } from "express";
import { catchAsync } from "@/middleware/errorHandler";
import logger from "@/utils/logger";
import { StudentRepository } from "../db/repositories/studentRepository";
import { CashRepository } from "../db/repositories/cashRepository";
import {
  InstallmentRepository,
  InstallmentPlanRepository,
} from "../db/repositories/installmentRepository";
import StatsService from "@/services/statsService";
import { PaymentFrequency } from "@/types";
import { withCache, CacheKeys, CacheTTL } from "@/utils/cacheHelper";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const formatCurrency = (cents: number): number => {
  if (!Number.isFinite(cents)) {
    return 0;
  }
  return Number((cents / 100).toFixed(2));
};

// 统计控制器 - 统一使用 PostgreSQL 数据源
export class StatsController {
  // 获取仪表板统计数据（带缓存）
  public getDashboardStats = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      // 使用缓存包装器，5分钟有效期
      const stats = await withCache(
        CacheKeys.DASHBOARD_STATS,
        () => StatsService.buildDashboardStats(),
        CacheTTL.DASHBOARD_STATS
      );

      // 返回 camelCase 格式（与测试期望一致）
      const responseData = {
        totalStudents: stats.totalStudents,
        totalRevenueCents: stats.totalRevenueCents,
        totalExpenseCents: stats.totalExpenseCents,
        netIncomeCents: stats.netIncomeCents,
        averageScore: stats.averageScore,
        maxScore: stats.maxScore,
        activeCourses: stats.activeCourses,
        activeMembers: stats.activeMembers,
        activeInstallmentPlans: stats.activeInstallmentPlans,
        overdueInstallmentCount: stats.overdueInstallmentCount,
      };

      const response = {
        success: true,
        data: responseData,
      };

      logger.info("获取仪表板统计数据成功");
      res.json(response);
    }
  );

  // 获取特定学员的统计信息
  public getStudentStats = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const studentUid = Number(req.params.id);

      const stats = await StatsService.buildStudentStats(studentUid);

      // 返回 camelCase 格式（与测试期望一致）
      const responseData = {
        studentUid: stats.studentUid,
        payments: {
          totalAmountCents: stats.payments.totalAmountCents,
          count: stats.payments.count,
        },
        scores: {
          average: stats.scores.average,
          max: stats.scores.max,
          min: stats.scores.min,
          count: stats.scores.count,
        },
        membership: {
          status: stats.membership.label,
          statusCode: stats.membership.status,
          isActive: stats.membership.isActive,
          daysRemaining: stats.membership.daysRemaining,
          daysUntilStart: stats.membership.daysUntilStart,
        },
        installments: {
          totalAmountCents: stats.installments.totalAmountCents,
          paidAmountCents: stats.installments.paidAmountCents,
          pendingAmountCents: stats.installments.pendingAmountCents,
          pendingCount: stats.installments.pendingCount,
          remainingAmountCents: stats.installments.remainingAmountCents,
        },
      };

      const response = {
        success: true,
        data: responseData,
      };

      logger.info(`获取学员统计信息成功，UID: ${stats.studentUid}`);
      res.json(response);
    }
  );

  // 获取财务统计（带缓存）
  public getFinancialStats = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const rawPeriod =
        typeof req.query.period === "string" ? req.query.period : undefined;

      // 使用缓存包装器，10分钟有效期，按周期分别缓存
      const stats = await withCache(
        CacheKeys.FINANCIAL_STATS,
        () => StatsService.buildFinancialStats(rawPeriod),
        CacheTTL.FINANCIAL_STATS,
        { period: rawPeriod }
      );

      // 返回 camelCase 格式（与测试期望一致）
      const responseData = {
        period: stats.period,
        dateRange: stats.dateRange,
        totals: {
          incomeCents: stats.totals.incomeCents,
          expenseCents: stats.totals.expenseCents,
          netIncomeCents: stats.totals.netIncomeCents,
          isProfitable: stats.totals.isProfitable,
        },
        installments: {
          totalCents: stats.installments.totalCents,
          paidCents: stats.installments.paidCents,
          pendingCents: stats.installments.pendingCents,
          remainingCents: stats.installments.remainingCents,
        },
        transactionCount: stats.transactionCount,
        studentIncome: stats.studentIncome.map((entry) => ({
          studentId: entry.studentId,
          studentName: entry.studentName,
          amountCents: entry.amountCents,
        })),
      };

      const response = {
        success: true,
        data: responseData,
      };

      logger.info(`获取财务统计成功，周期: ${stats.period}`);
      res.json(response);
    }
  );

  // 获取全局学员统计
  public getGlobalStudentStats = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const allStudents = await StudentRepository.findAll();

      // 计算成绩统计
      let totalScore = 0;
      let scoreCount = 0;
      let maxScore = 0;
      const studentsWithScores = allStudents.filter(
        (student) => student.rings && student.rings.length > 0
      );

      studentsWithScores.forEach((student) => {
        (student.rings || []).forEach((score: number) => {
          totalScore += score;
          scoreCount++;
          maxScore = Math.max(maxScore, score);
        });
      });

      const averageScore =
        scoreCount > 0 ? Number((totalScore / scoreCount).toFixed(1)) : 0;

      // 计算活跃课程数
      const activeCourses = allStudents.filter(
        (student) => student.lessonLeft && student.lessonLeft > 0
      ).length;

      // 计算活跃会员数
      const now = new Date();
      const activeMembers = allStudents.filter(
        (student) =>
          student.membershipStartDate &&
          student.membershipEndDate &&
          new Date(student.membershipStartDate) <= now &&
          new Date(student.membershipEndDate) >= now
      ).length;

      const responseData = {
        total_students: allStudents.length,
        students_with_scores: studentsWithScores.length,
        average_score: averageScore,
        max_score: maxScore,
        active_courses: activeCourses,
        active_members: activeMembers,
      };

      const response = {
        success: true,
        data: responseData,
      };

      res.json(response);
    }
  );

  // 获取全局财务统计
  public getGlobalFinancialStats = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const transactions = await CashRepository.findAll();

      const totalRevenue = transactions
        .filter((t) => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpense = Math.abs(
        transactions
          .filter((t) => t.amount < 0)
          .reduce((sum, t) => sum + t.amount, 0)
      );

      const netIncome = totalRevenue - totalExpense;

      // 分期付款统计
      const installmentPlans = await InstallmentPlanRepository.findAll();
      const overdueInstallments = await InstallmentRepository.findOverdue();

      let totalInstallmentAmount = 0;
      let paidInstallmentAmount = 0;

      for (const plan of installmentPlans) {
        totalInstallmentAmount += plan.totalAmount;
        const installments = await InstallmentRepository.findByPlanId(plan.uid);
        for (const installment of installments) {
          if (installment.status === "PAID") {
            paidInstallmentAmount +=
              installment.paidAmount || installment.installmentAmount;
          }
        }
      }

      const responseData = {
        total_income: formatCurrency(totalRevenue),
        total_expense: formatCurrency(totalExpense),
        net_income: formatCurrency(netIncome),
        net_profit: formatCurrency(netIncome),
        is_profitable: netIncome > 0,
        transaction_count: transactions.length,
        installment_total: formatCurrency(totalInstallmentAmount),
        installment_paid: formatCurrency(paidInstallmentAmount),
        installment_pending: formatCurrency(
          totalInstallmentAmount - paidInstallmentAmount
        ),
        overdue_count: overdueInstallments.length,
      };

      const response = {
        success: true,
        data: responseData,
      };

      res.json(response);
    }
  );

  // 获取即将到期的会员（带缓存）
  public getMembershipExpiringSoon = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { days = 30 } = req.query;

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + Number(days));

      // 使用缓存包装器，15分钟有效期
      const expiringStudents = await withCache(
        CacheKeys.MEMBERSHIP_ALERTS,
        () => StudentRepository.findExpiringMemberships(Number(days)),
        CacheTTL.MEMBERSHIP_ALERTS,
        { days }
      );

      const responseData = expiringStudents.map((student) => {
        const daysRemaining = student.membershipEndDate
          ? Math.ceil(
              (new Date(student.membershipEndDate).getTime() - new Date().getTime()) /
                MS_PER_DAY
            )
          : null;

        return {
          uid: student.uid,
          name: student.name,
          phone: student.phone,
          class: student.classType,
          subject: student.subject,
          membership_end_date: student.membershipEndDate,
          days_remaining: daysRemaining,
          is_membership_active: daysRemaining !== null && daysRemaining > 0,
          membership_status:
            daysRemaining !== null && daysRemaining <= 7 ? "即将到期" : "正常",
        };
      });

      const response = {
        success: true,
        data: responseData,
      };

      logger.info(
        `获取即将到期会员成功，天数: ${days}, 数量: ${responseData.length}`
      );
      res.json(response);
    }
  );

  // 获取趋势分析数据
  public getTrendsData = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      type TrendPeriod = "week" | "month" | "quarter" | "year";
      type TrendMetric = "revenue" | "expense" | "students" | "installments";

      interface TrendTimePoint {
        label: string;
        rangeStart: Date;
        rangeEnd: Date;
        referenceDate: Date;
      }

      interface TrendDataPoint {
        period: string;
        value: number;
        date: Date;
      }

      const normalizePeriod = (raw: unknown): TrendPeriod => {
        const value = typeof raw === "string" ? raw.toLowerCase() : "month";
        if (value === "week" || value === "quarter" || value === "year") {
          return value;
        }
        return "month";
      };

      const normalizeMetric = (raw: unknown): TrendMetric => {
        const value = typeof raw === "string" ? raw.toLowerCase() : "revenue";
        if (
          value === "expense" ||
          value === "students" ||
          value === "installments"
        ) {
          return value;
        }
        return "revenue";
      };

      const startOfDay = (date: Date): Date => {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        return start;
      };

      const endOfDay = (date: Date): Date => {
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        return end;
      };

      const createTimePoints = (
        period: TrendPeriod,
        referenceDate: Date
      ): TrendTimePoint[] => {
        const points: TrendTimePoint[] = [];
        const baseDate = startOfDay(referenceDate);

        switch (period) {
          case "week": {
            const iterations = 12;
            for (let offset = iterations - 1; offset >= 0; offset--) {
              const weekEnd = endOfDay(new Date(baseDate));
              weekEnd.setDate(weekEnd.getDate() - offset * 7);

              const weekStartSeed = new Date(weekEnd);
              weekStartSeed.setDate(weekStartSeed.getDate() - 6);
              const weekStart = startOfDay(weekStartSeed);

              points.push({
                label: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
                rangeStart: weekStart,
                rangeEnd: weekEnd,
                referenceDate: new Date(weekStart),
              });
            }
            break;
          }
          case "month": {
            const iterations = 12;
            for (let offset = iterations - 1; offset >= 0; offset--) {
              const monthStart = startOfDay(new Date(baseDate));
              monthStart.setMonth(monthStart.getMonth() - offset, 1);

              const monthEndSeed = new Date(
                monthStart.getFullYear(),
                monthStart.getMonth() + 1,
                0
              );

              points.push({
                label: `${monthStart.getFullYear()}/${(
                  monthStart.getMonth() + 1
                )
                  .toString()
                  .padStart(2, "0")}`,
                rangeStart: monthStart,
                rangeEnd: endOfDay(monthEndSeed),
                referenceDate: new Date(monthStart),
              });
            }
            break;
          }
          case "quarter": {
            const iterations = 8;
            const currentQuarter = Math.floor(baseDate.getMonth() / 3);
            for (let offset = iterations - 1; offset >= 0; offset--) {
              const quarterIndex = currentQuarter - offset;
              const yearOffset = Math.floor(quarterIndex / 4);
              const normalizedQuarter = ((quarterIndex % 4) + 4) % 4;
              const year = baseDate.getFullYear() + yearOffset;
              const quarterStart = startOfDay(
                new Date(year, normalizedQuarter * 3, 1)
              );
              const quarterEndSeed = new Date(
                year,
                normalizedQuarter * 3 + 3,
                0
              );

              points.push({
                label: `${year}Q${normalizedQuarter + 1}`,
                rangeStart: quarterStart,
                rangeEnd: endOfDay(quarterEndSeed),
                referenceDate: new Date(quarterStart),
              });
            }
            break;
          }
          case "year": {
            const iterations = 5;
            for (let offset = iterations - 1; offset >= 0; offset--) {
              const year = baseDate.getFullYear() - offset;
              const yearStart = startOfDay(new Date(year, 0, 1));
              const yearEndSeed = new Date(year, 11, 31);

              points.push({
                label: `${year}`,
                rangeStart: yearStart,
                rangeEnd: endOfDay(yearEndSeed),
                referenceDate: new Date(yearStart),
              });
            }
            break;
          }
        }

        return points;
      };

      const trendPeriod = normalizePeriod(req.query.period);
      const trendMetric = normalizeMetric(req.query.type);
      const now = new Date();
      const timePoints = createTimePoints(trendPeriod, now);
      const dataPoints: TrendDataPoint[] = [];

      for (const point of timePoints) {
        let rawValue = 0;

        switch (trendMetric) {
          case "revenue": {
            const stats = await CashRepository.getFinancialStats(
              point.rangeStart.toISOString(),
              point.rangeEnd.toISOString()
            );
            rawValue = stats.totalIncome;
            break;
          }
          case "expense": {
            const stats = await CashRepository.getFinancialStats(
              point.rangeStart.toISOString(),
              point.rangeEnd.toISOString()
            );
            rawValue = stats.totalExpense;
            break;
          }
          case "students": {
            const allStudents = await StudentRepository.findAll();
            const count = allStudents.filter(student => {
              const createdAt = student.createdAt ? new Date(student.createdAt) : new Date();
              return createdAt >= point.rangeStart && createdAt <= point.rangeEnd;
            }).length;
            rawValue = count;
            break;
          }
          case "installments": {
            const allPlans = await InstallmentPlanRepository.findAll();
            const count = allPlans.filter(plan => {
              const createdAt = plan.createdAt ? new Date(plan.createdAt) : new Date();
              return createdAt >= point.rangeStart && createdAt <= point.rangeEnd;
            }).length;
            rawValue = count;
            break;
          }
        }

        const isCurrencyMetric =
          trendMetric === "revenue" || trendMetric === "expense";
        const normalizedValue = isCurrencyMetric
          ? Number(rawValue.toFixed(2))
          : rawValue;

        dataPoints.push({
          period: point.label,
          value: normalizedValue,
          date: point.referenceDate,
        });
      }

      const aggregate = (
        values: number[],
        formatter: (value: number) => number
      ): number => {
        if (values.length === 0) {
          return 0;
        }
        const sum = values.reduce((total, value) => total + value, 0);
        return formatter(sum);
      };

      const metricsFormatter = (value: number): number =>
        Number(value.toFixed(2));

      const total = aggregate(
        dataPoints.map((point) => point.value),
        metricsFormatter
      );
      const average =
        dataPoints.length > 0
          ? metricsFormatter(
              dataPoints.reduce((sum, point) => sum + point.value, 0) /
                dataPoints.length
            )
          : 0;
      const max =
        dataPoints.length > 0
          ? metricsFormatter(
              Math.max(...dataPoints.map((point) => point.value))
            )
          : 0;
      const min =
        dataPoints.length > 0
          ? metricsFormatter(
              Math.min(...dataPoints.map((point) => point.value))
            )
          : 0;

      const response = {
        success: true,
        data: {
          type: trendMetric,
          period: trendPeriod,
          data_points: dataPoints,
          total,
          average,
          max,
          min,
        },
      };

      logger.info(
        `获取趋势分析数据成功，类型: ${trendMetric}, 周期: ${trendPeriod}`
      );
      res.json(response);
    }
  );

  // 获取课程分布统计
  public getCourseDistribution = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const allStudents = await StudentRepository.findAll();

      // 按班级统计
      const classDistribution = new Map<string, number>();
      // 按科目统计
      const subjectDistribution = new Map<string, number>();

      allStudents.forEach((student) => {
        const className = student.classType || "Others";
        const subjectName = student.subject || "Others";

        classDistribution.set(
          className,
          (classDistribution.get(className) || 0) + 1
        );
        subjectDistribution.set(
          subjectName,
          (subjectDistribution.get(subjectName) || 0) + 1
        );
      });

      const response = {
        success: true,
        data: {
          class_distribution: Array.from(classDistribution.entries()).map(
            ([name, count]) => ({
              name,
              count,
              percentage: Number(
                ((count / allStudents.length) * 100).toFixed(1)
              ),
            })
          ),
          subject_distribution: Array.from(subjectDistribution.entries()).map(
            ([name, count]) => ({
              name,
              count,
              percentage: Number(
                ((count / allStudents.length) * 100).toFixed(1)
              ),
            })
          ),
          total_students: allStudents.length,
        },
      };

      logger.info("获取课程分布统计成功");
      res.json(response);
    }
  );

  // 获取成绩分布统计
  public getScoreDistribution = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const allStudents = await StudentRepository.findAll();

      const scoreRanges = [
        { label: "0-4分", min: 0, max: 4, count: 0 },
        { label: "4-6分", min: 4, max: 6, count: 0 },
        { label: "6-8分", min: 6, max: 8, count: 0 },
        { label: "8-9分", min: 8, max: 9, count: 0 },
        { label: "9-10分", min: 9, max: 10, count: 0 },
      ];

      let totalScores = 0;
      let scoreCount = 0;

      allStudents.forEach((student) => {
        if (student.rings && student.rings.length > 0) {
          student.rings.forEach((score: number) => {
            totalScores += score;
            scoreCount++;

            // 分类统计
            for (const range of scoreRanges) {
              if (
                score >= range.min &&
                (score < range.max || (range.max === 10 && score === range.max))
              ) {
                range.count++;
                break;
              }
            }
          });
        }
      });

      const averageScore = scoreCount > 0 ? totalScores / scoreCount : 0;

      const response = {
        success: true,
        data: {
          score_ranges: scoreRanges.map((range) => ({
            ...range,
            percentage:
              scoreCount > 0
                ? Number(((range.count / scoreCount) * 100).toFixed(1))
                : 0,
          })),
          average_score: Number(averageScore.toFixed(2)),
          total_scores: scoreCount,
          students_with_scores: allStudents.filter(
            (s) => s.rings && s.rings.length > 0
          ).length,
        },
      };

      logger.info("获取成绩分布统计成功");
      res.json(response);
    }
  );

  // 获取逾期分期付款统计
  public getOverdueInstallments = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const overdueInstallments = await InstallmentRepository.findOverdue();

      const responseData = await Promise.all(
        overdueInstallments.map(async (installment) => {
          const plan = await InstallmentPlanRepository.findByUid(installment.planId);
          const student = plan?.studentId
            ? await StudentRepository.findByUid(plan.studentId)
            : null;

          const daysOverdue = InstallmentRepository.getDaysOverdue(installment);
          const overdueAmount =
            (installment.installmentAmount / 100) *
            (1 + daysOverdue * 0.01);

          return {
            uid: installment.uid,
            plan_id: installment.planId,
            current_installment: installment.installmentNumber,
            installment_amount: installment.installmentAmount / 100,
            due_date: installment.dueDate,
            days_overdue: daysOverdue,
            overdue_amount: overdueAmount,
            plan: plan
              ? {
                  frequency: plan.frequency,
                  frequency_text: this.getFrequencyText(
                    plan.frequency,
                    plan.customDays
                  ),
                  total_amount: plan.totalAmount / 100,
                }
              : null,
            student: student
              ? {
                  uid: student.uid,
                  name: student.name,
                  phone: student.phone,
                }
              : null,
          };
        })
      );

      const totalOverdueAmount = responseData.reduce(
        (sum, item) => sum + item.overdue_amount,
        0
      );

      const response = {
        success: true,
        data: {
          overdue_installments: responseData,
          total_overdue_count: responseData.length,
          total_overdue_amount: Number(totalOverdueAmount.toFixed(2)),
          average_days_overdue:
            responseData.length > 0
              ? Math.round(
                  responseData.reduce(
                    (sum, item) => sum + item.days_overdue,
                    0
                  ) / responseData.length
                )
              : 0,
        },
      };

      logger.info(
        `获取逾期分期付款统计成功，逾期数量: ${
          responseData.length
        }, 逾期金额: ¥${totalOverdueAmount.toFixed(2)}`
      );
      res.json(response);
    }
  );

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
      case 'WEEKLY':
        return "周付";
      case 'MONTHLY':
        return "月付";
      case 'QUARTERLY':
        return "季付";
      case 'CUSTOM':
        return safeCustomDays ? `${safeCustomDays}天一次` : "自定义";
      default:
        return typeof frequency === "string" ? frequency : String(frequency);
    }
  }
}

export default new StatsController();
