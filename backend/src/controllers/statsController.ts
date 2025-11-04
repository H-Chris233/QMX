import { Request, Response } from 'express';
import { Student } from '@/models/mongo';
import { CashClass } from '@/models/CashMongo';
import { Installment } from '@/models/InstallmentMongo';
import { InstallmentPlan } from '@/models/InstallmentPlanMongo';
import StatsService from '@/services/statsService';
import { catchAsync } from '@/middleware/errorHandler';
import logger from '@/utils/logger';

const formatCurrency = (cents: number): number => {
  if (!Number.isFinite(cents)) {
    return 0;
  }
  return Number((cents / 100).toFixed(2));
};

// 统计控制器 - 统一使用MongoDB数据源
export class StatsController {
  // 获取仪表板统计数据
  public getDashboardStats = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const stats = await StatsService.buildDashboardStats();

    const responseData = {
      total_students: stats.totalStudents,
      total_revenue: formatCurrency(stats.totalRevenueCents),
      total_expense: formatCurrency(stats.totalExpenseCents),
      net_income: formatCurrency(stats.netIncomeCents),
      average_score: stats.averageScore,
      max_score: stats.maxScore,
      active_courses: stats.activeCourses,
      active_members: stats.activeMembers,
      active_installments: stats.activeInstallmentPlans,
      overdue_installments: stats.overdueInstallmentCount,
    };

    const response = {
      success: true,
      data: responseData,
    };

    logger.info('获取仪表板统计数据成功');
    res.json(response);
  });

  // 获取特定学员的统计信息
  public getStudentStats = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const studentUid = Number(req.params.id);

    const stats = await StatsService.buildStudentStats(studentUid);

    const responseData = {
      total_payments: formatCurrency(stats.payments.totalAmountCents),
      payment_count: stats.payments.count,
      average_score: stats.scores.average,
      max_score: stats.scores.max,
      min_score: stats.scores.min,
      score_count: stats.scores.count,
      membership_status: stats.membership.label,
      membership_status_code: stats.membership.status,
      membership_is_active: stats.membership.isActive,
      membership_days_remaining: stats.membership.daysRemaining,
      membership_days_until_start: stats.membership.daysUntilStart,
      installment_stats: {
        total_amount: formatCurrency(stats.installments.totalAmountCents),
        paid_amount: formatCurrency(stats.installments.paidAmountCents),
        pending_amount: formatCurrency(stats.installments.pendingAmountCents),
        pending_count: stats.installments.pendingCount,
        remaining_amount: formatCurrency(stats.installments.remainingAmountCents),
      },
    };

    const response = {
      success: true,
      data: responseData,
    };

    logger.info(`获取学员统计信息成功，UID: ${stats.studentUid}`);
    res.json(response);
  });

  // 获取财务统计
  public getFinancialStats = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const rawPeriod = typeof req.query.period === 'string' ? req.query.period : undefined;

    const stats = await StatsService.buildFinancialStats(rawPeriod);

    const responseData = {
      period: stats.period,
      date_from: stats.dateRange.start,
      date_to: stats.dateRange.end,
      total_income: formatCurrency(stats.totals.incomeCents),
      total_expense: formatCurrency(stats.totals.expenseCents),
      net_income: formatCurrency(stats.totals.netIncomeCents),
      net_profit: formatCurrency(stats.totals.netIncomeCents),
      is_profitable: stats.totals.isProfitable,
      installment_total: formatCurrency(stats.installments.totalCents),
      installment_paid: formatCurrency(stats.installments.paidCents),
      installment_pending: formatCurrency(stats.installments.pendingCents),
      installment_remaining: formatCurrency(stats.installments.remainingCents),
      transaction_count: stats.transactionCount,
      student_income: stats.studentIncome.map(entry => ({
        student_id: entry.studentId,
        student_name: entry.studentName,
        amount: formatCurrency(entry.amountCents),
      })),
    };

    const response = {
      success: true,
      data: responseData,
    };

    logger.info(`获取财务统计成功，周期: ${stats.period}`);
    res.json(response);
  });

  // 获取全局学员统计
  public getGlobalStudentStats = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const allStudents = await Student.findAll();

    // 计算成绩统计
    let totalScore = 0;
    let scoreCount = 0;
    let maxScore = 0;
    const studentsWithScores = allStudents.filter(student => student.rings && student.rings.length > 0);

    studentsWithScores.forEach(student => {
      student.rings.forEach((score: number) => {
        totalScore += score;
        scoreCount++;
        maxScore = Math.max(maxScore, score);
      });
    });

    const averageScore = scoreCount > 0 ? Number((totalScore / scoreCount).toFixed(1)) : 0;

    // 计算活跃课程数
    const activeCourses = allStudents.filter(student =>
      student.lessonLeft && student.lessonLeft > 0
    ).length;

    // 计算活跃会员数
    const now = new Date();
    const activeMembers = allStudents.filter(student =>
      student.membershipStartDate && student.membershipEndDate &&
      student.membershipStartDate <= now && student.membershipEndDate >= now
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
  });

  // 获取全局财务统计
  public getGlobalFinancialStats = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const transactions = await CashClass.findAll();

    const totalRevenue = transactions
      .filter(t => t.isIncome())
      .reduce((sum, t) => sum + t.getAmount(), 0);

    const totalExpense = Math.abs(
      transactions
        .filter(t => !t.isIncome())
        .reduce((sum, t) => sum + t.getAmount(), 0)
    );

    const netIncome = totalRevenue - totalExpense;

    // 分期付款统计
    const installmentPlans = await InstallmentPlan.findAll();
    const overdueInstallments = await Installment.findOverdue();

    let totalInstallmentAmount = 0;
    let paidInstallmentAmount = 0;

    for (const plan of installmentPlans) {
      totalInstallmentAmount += plan.total_amount / 100;
      const installments = await Installment.findByPlanId(plan.uid);
      for (const installment of installments) {
        if (installment.status === 'Paid') {
          paidInstallmentAmount += (installment.paid_amount || installment.installment_amount) / 100;
        }
      }
    }

    const responseData = {
      total_income: Number(totalRevenue.toFixed(2)),
      total_expense: Number(totalExpense.toFixed(2)),
      net_income: Number(netIncome.toFixed(2)),
      net_profit: Number(netIncome.toFixed(2)),
      is_profitable: netIncome > 0,
      transaction_count: transactions.length,
      installment_total: Number(totalInstallmentAmount.toFixed(2)),
      installment_paid: Number(paidInstallmentAmount.toFixed(2)),
      installment_pending: Number((totalInstallmentAmount - paidInstallmentAmount).toFixed(2)),
      overdue_count: overdueInstallments.length,
    };

    const response = {
      success: true,
      data: responseData,
    };

    res.json(response);
  });

  // 获取即将到期的会员
  public getMembershipExpiringSoon = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { days = 30 } = req.query;

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + Number(days));

    const allStudents = await Student.findAll();
    const expiringStudents = allStudents.filter(student => {
      if (!student.membershipEndDate) return false;
      const endDate = new Date(student.membershipEndDate);
      return endDate >= new Date() && endDate <= targetDate;
    }).sort((a, b) => {
      const dateA = new Date(a.membershipEndDate!);
      const dateB = new Date(b.membershipEndDate!);
      return dateA.getTime() - dateB.getTime();
    });

    const responseData = expiringStudents.map(student => {
      const daysRemaining = student.getMembershipDaysRemaining();
      return {
        uid: student.uid,
        name: student.name,
        phone: student.phone,
        class: student.class,
        subject: student.subject,
        membership_end_date: student.membershipEndDate,
        days_remaining: daysRemaining,
        is_membership_active: student.hasMembership(),
        membership_status: daysRemaining && daysRemaining <= 7 ? '即将到期' : '正常',
      };
    });

    const response = {
      success: true,
      data: responseData,
    };

    logger.info(`获取即将到期会员成功，天数: ${days}, 数量: ${responseData.length}`);
    res.json(response);
  });

  // 获取趋势分析数据
  public getTrendsData = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { period = 'month', type = 'revenue' } = req.query;
    const now = new Date();
    let dataPoints: any[] = [];

    // 根据周期生成时间点
    const generateTimePoints = () => {
      const points = [];
      let iterations = 12;

      switch (period) {
        case 'week':
          iterations = 12;
          for (let i = iterations - 1; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
            points.push({
              date,
              label: `${date.getMonth() + 1}/${date.getDate()}`,
              start: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
              end: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
            });
          }
          break;
        case 'month':
          iterations = 12;
          for (let i = iterations - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            points.push({
              date,
              label: `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}`,
              start: date,
              end: new Date(date.getFullYear(), date.getMonth() + 1, 0)
            });
          }
          break;
        case 'quarter':
          iterations = 8;
          for (let i = iterations - 1; i >= 0; i--) {
            const quarter = Math.floor(now.getMonth() / 3) - i;
            const year = now.getFullYear() + Math.floor(quarter / 4);
            const quarterInYear = ((quarter % 4) + 4) % 4;
            const date = new Date(year, quarterInYear * 3, 1);
            points.push({
              date,
              label: `${year}Q${quarterInYear + 1}`,
              start: date,
              end: new Date(year, quarterInYear * 3 + 3, 0)
            });
          }
          break;
        case 'year':
          iterations = 5;
          for (let i = iterations - 1; i >= 0; i--) {
            const year = now.getFullYear() - i;
            const date = new Date(year, 0, 1);
            points.push({
              date,
              label: year.toString(),
              start: date,
              end: new Date(year, 11, 31)
            });
          }
          break;
      }
      return points;
    };

    const timePoints = generateTimePoints();

    // 为每个时间点获取数据
    for (const point of timePoints) {
      let value = 0;

      switch (type) {
        case 'revenue':
          const revenueTransactions = await CashClass.search({
            created_at: { $gte: point.start, $lte: point.end },
            cash: { $gt: 0 }
          });
          value = revenueTransactions.reduce((sum, t) => sum + t.getAmount(), 0);
          break;

        case 'expense':
          const expenseTransactions = await CashClass.search({
            created_at: { $gte: point.start, $lte: point.end },
            cash: { $lt: 0 }
          });
          value = Math.abs(expenseTransactions.reduce((sum, t) => sum + t.getAmount(), 0));
          break;

        case 'students':
          const allStudentsCount = await Student.count(); // 获取所有学员数量
          value = allStudentsCount;
          break;

        case 'installments':
          const installmentData = await InstallmentPlan.search({
            created_at: { $gte: point.start, $lte: point.end }
          });
          value = installmentData.length;
          break;
      }

      dataPoints.push({
        period: point.label,
        value: Number(value.toFixed(2)),
        date: point.date
      });
    }

    const response = {
      success: true,
      data: {
        type,
        period,
        data_points: dataPoints,
        total: dataPoints.reduce((sum, point) => sum + point.value, 0),
        average: dataPoints.length > 0 ? dataPoints.reduce((sum, point) => sum + point.value, 0) / dataPoints.length : 0,
        max: dataPoints.length > 0 ? Math.max(...dataPoints.map(p => p.value)) : 0,
        min: dataPoints.length > 0 ? Math.min(...dataPoints.map(p => p.value)) : 0,
      },
    };

    logger.info(`获取趋势分析数据成功，类型: ${type}, 周期: ${period}`);
    res.json(response);
  });

  // 获取课程分布统计
  public getCourseDistribution = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const allStudents = await Student.findAll();

    // 按班级统计
    const classDistribution = new Map<string, number>();
    // 按科目统计
    const subjectDistribution = new Map<string, number>();

    allStudents.forEach(student => {
      const className = student.class || 'Others';
      const subjectName = student.subject || 'Others';

      classDistribution.set(className, (classDistribution.get(className) || 0) + 1);
      subjectDistribution.set(subjectName, (subjectDistribution.get(subjectName) || 0) + 1);
    });

    const response = {
      success: true,
      data: {
        class_distribution: Array.from(classDistribution.entries()).map(([name, count]) => ({
          name,
          count,
          percentage: Number(((count / allStudents.length) * 100).toFixed(1))
        })),
        subject_distribution: Array.from(subjectDistribution.entries()).map(([name, count]) => ({
          name,
          count,
          percentage: Number(((count / allStudents.length) * 100).toFixed(1))
        })),
        total_students: allStudents.length,
      },
    };

    logger.info('获取课程分布统计成功');
    res.json(response);
  });

  // 获取成绩分布统计
  public getScoreDistribution = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const allStudents = await Student.findAll();

    const scoreRanges = [
      { label: '0-4分', min: 0, max: 4, count: 0 },
      { label: '4-6分', min: 4, max: 6, count: 0 },
      { label: '6-8分', min: 6, max: 8, count: 0 },
      { label: '8-9分', min: 8, max: 9, count: 0 },
      { label: '9-10分', min: 9, max: 10, count: 0 },
    ];

    let totalScores = 0;
    let scoreCount = 0;

    allStudents.forEach(student => {
      if (student.rings && student.rings.length > 0) {
        student.rings.forEach((score: number) => {
          totalScores += score;
          scoreCount++;

          // 分类统计
          for (const range of scoreRanges) {
            if (score >= range.min && (score < range.max || (range.max === 10 && score === range.max))) {
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
        score_ranges: scoreRanges.map(range => ({
          ...range,
          percentage: scoreCount > 0 ? Number(((range.count / scoreCount) * 100).toFixed(1)) : 0
        })),
        average_score: Number(averageScore.toFixed(2)),
        total_scores: scoreCount,
        students_with_scores: allStudents.filter(s => s.rings && s.rings.length > 0).length,
      },
    };

    logger.info('获取成绩分布统计成功');
    res.json(response);
  });

  // 获取逾期分期付款统计
  public getOverdueInstallments = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const overdueInstallments = await Installment.findOverdue();

    const responseData = await Promise.all(overdueInstallments.map(async (installment) => {
      const plan = await InstallmentPlan.findByUid(installment.plan_id);
      const student = plan?.student_id ? await Student.findByUid(plan.student_id) : null;

      return {
        uid: installment.uid,
        plan_id: installment.plan_id,
        current_installment: installment.current_installment,
        total_installments: installment.total_installments,
        installment_amount: installment.installment_amount / 100,
        due_date: installment.due_date,
        days_overdue: installment.getDaysOverdue(),
        overdue_amount: (installment.installment_amount / 100) * (1 + installment.getDaysOverdue() * 0.01),
        plan: plan ? {
          frequency: plan.frequency,
          frequency_text: this.getFrequencyText(plan.frequency, plan.custom_days),
          total_amount: plan.total_amount / 100,
        } : null,
        student: student ? {
          uid: student.uid,
          name: student.name,
          phone: student.phone,
        } : null,
      };
    }));

    const totalOverdueAmount = responseData.reduce((sum, item) => sum + item.overdue_amount, 0);

    const response = {
      success: true,
      data: {
        overdue_installments: responseData,
        total_overdue_count: responseData.length,
        total_overdue_amount: Number(totalOverdueAmount.toFixed(2)),
        average_days_overdue: responseData.length > 0 ?
          Math.round(responseData.reduce((sum, item) => sum + item.days_overdue, 0) / responseData.length) : 0,
      },
    };

    logger.info(`获取逾期分期付款统计成功，逾期数量: ${responseData.length}, 逾期金额: ¥${totalOverdueAmount.toFixed(2)}`);
    res.json(response);
  });

  // 私有辅助方法：获取频率文本
  private getFrequencyText(frequency: string, customDays?: number): string {
    const frequencyMap: { [key: string]: string } = {
      'Weekly': '周付',
      'Monthly': '月付',
      'Quarterly': '季付',
      'Custom': customDays ? `${customDays}天一次` : '自定义',
    };
    return frequencyMap[frequency] || frequency;
  }
}

export default new StatsController();