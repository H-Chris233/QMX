import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { 
  Student, 
  Cash,
  Installment,
  InstallmentPlan,
  InstallmentStatus,
  IDashboardStats,
  IStudentStats,
  IFinancialStats,
  IApiResponse
} from '@/models';
import { catchAsync } from '@/middleware/errorHandler';
import logger from '@/utils/logger';

// 统计控制器
export class StatsController {
  // 获取仪表板统计数据
  public getDashboardStats = catchAsync(async (req: Request, res: Response): Promise<void> => {
    // 获取总学员数
    const totalStudents = await Student.count();

    // 获取所有交易记录计算收入支出
    const transactions = await Cash.findAll({
      attributes: ['cash'],
    });

    const totalRevenue = transactions
      .filter(t => t.cash > 0)
      .reduce((sum, t) => sum + t.cash, 0) / 100; // 转换为元

    const totalExpense = Math.abs(
      transactions
        .filter(t => t.cash < 0)
        .reduce((sum, t) => sum + t.cash, 0) / 100 // 转换为元
    );

    // 计算平均分和最高分
    const allStudents = await Student.findAll({
      attributes: ['rings'],
    });

    let totalScore = 0;
    let scoreCount = 0;
    let maxScore = 0;

    allStudents.forEach(student => {
      if (student.rings && student.rings.length > 0) {
        student.rings.forEach((score: number) => {
          totalScore += score;
          scoreCount++;
          maxScore = Math.max(maxScore, score);
        });
      }
    });

    const averageScore = scoreCount > 0 ? Number((totalScore / scoreCount).toFixed(1)) : 0;

    // 计算活跃课程数（有剩余课时的学员数）
    const activeCourses = await Student.count({
      where: {
        lesson_left: {
          [Op.gt]: 0,
        },
      },
    });

    const responseData: IDashboardStats = {
      total_students: totalStudents,
      total_revenue: Number(totalRevenue.toFixed(2)),
      total_expense: Number(totalExpense.toFixed(2)),
      average_score: averageScore,
      max_score: maxScore,
      active_courses: activeCourses,
    };

    const response: IApiResponse<IDashboardStats> = {
      success: true,
      data: responseData,
    };

    logger.info('获取仪表板统计数据成功');
    res.json(response);
  });

  // 获取特定学员的统计信息
  public getStudentStats = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const student = await Student.findByPk(Number(id), {
      include: [
        {
          model: Cash,
          as: 'cashTransactions',
          attributes: ['cash', 'createdAt'],
        },
      ],
    });

    if (!student) {
      res.status(404).json({
        success: false,
        error: '学员不存在',
      });
      return;
    }

    // 计算支付统计
    const payments = (student as any).cashTransactions?.filter((t: any) => t.cash > 0) || [];
    const totalPayments = payments.reduce((sum: number, p: any) => sum + p.cash, 0) / 100; // 转换为元
    const paymentCount = payments.length;

    // 计算成绩统计
    const averageScore = student.getAverageScore();
    const scoreCount = student.rings.length;

    // 计算会员状态
    let membershipStatus = '无会员';
    if (student.hasMembership()) {
      const daysRemaining = student.getMembershipDaysRemaining();
      if (daysRemaining && daysRemaining > 30) {
        membershipStatus = '会员有效';
      } else if (daysRemaining && daysRemaining > 0) {
        membershipStatus = `会员即将到期 (${daysRemaining}天)`;
      } else {
        membershipStatus = '会员已过期';
      }
    }

    const responseData: IStudentStats = {
      total_payments: Number(totalPayments.toFixed(2)),
      payment_count: paymentCount,
      average_score: averageScore,
      score_count: scoreCount,
      membership_status: membershipStatus,
    };

    const response: IApiResponse<IStudentStats> = {
      success: true,
      data: responseData,
    };

    logger.info(`获取学员统计信息成功，UID: ${student.uid}`);
    res.json(response);
  });

  // 获取财务统计
  public getFinancialStats = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { period = 'ThisMonth' } = req.query;

    // 计算时间范围
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now.getFullYear(), now.getMonth() + 1, 0); // 月底

    switch (period) {
      case 'Today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'ThisWeek':
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getTime() - (dayOfWeek * 24 * 60 * 60 * 1000));
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'ThisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'ThisYear':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // 获取时间范围内的交易
    const transactions = await Cash.findAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate],
        },
      },
      attributes: ['cash'],
    });

    const totalIncome = transactions
      .filter(t => t.cash > 0)
      .reduce((sum, t) => sum + t.cash, 0) / 100; // 转换为元

    const totalExpense = Math.abs(
      transactions
        .filter(t => t.cash < 0)
        .reduce((sum, t) => sum + t.cash, 0) / 100 // 转换为元
    );

    const netIncome = totalIncome - totalExpense;
    const isProfitable = netIncome > 0;

    // 获取分期付款统计
    const installmentPlans = await InstallmentPlan.findAll({
      include: [
        {
          model: Installment,
          as: 'installments',
          where: {
            createdAt: {
              [Op.between]: [startDate, endDate],
            },
          },
          required: false, // LEFT JOIN
        },
      ],
    });

    let installmentTotal = 0;
    let installmentPaid = 0;
    let installmentPending = 0;

    installmentPlans.forEach(plan => {
      const installments = (plan as any).installments;
      if (installments && installments.length > 0) {
        installments.forEach((installment: any) => {
          const amount = installment.getInstallmentAmount() / 100; // 转换为元
          installmentTotal += amount;

          if (installment.status === InstallmentStatus.PAID) {
            installmentPaid += amount;
          } else if (installment.status === InstallmentStatus.PENDING) {
            installmentPending += amount;
          }
        });
      }
    });

    const responseData: IFinancialStats = {
      total_income: Number(totalIncome.toFixed(2)),
      total_expense: Number(totalExpense.toFixed(2)),
      net_income: Number(netIncome.toFixed(2)),
      net_profit: Number(netIncome.toFixed(2)),
      is_profitable: isProfitable,
      installment_total: Number(installmentTotal.toFixed(2)),
      installment_paid: Number(installmentPaid.toFixed(2)),
      installment_pending: Number(installmentPending.toFixed(2)),
    };

    const response: IApiResponse<IFinancialStats> = {
      success: true,
      data: responseData,
    };

    logger.info(`获取财务统计成功，周期: ${period}`);
    res.json(response);
  });

  // 获取全局学员统计
  public getGlobalStudentStats = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const dashboardStats = await this.calculateDashboardStats();

    const responseData = {
      total_students: dashboardStats.total_students,
      average_score: dashboardStats.average_score,
      max_score: dashboardStats.max_score,
      active_courses: dashboardStats.active_courses,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
    };

    res.json(response);
  });

  // 获取全局财务统计
  public getGlobalFinancialStats = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const dashboardStats = await this.calculateDashboardStats();

    const revenue = dashboardStats.total_revenue;
    const expense = dashboardStats.total_expense;

    const responseData = {
      total_income: revenue,
      total_expense: expense,
      net_income: revenue - expense,
      net_profit: revenue - expense,
      is_profitable: revenue > expense,
      installment_total: 0,
      installment_paid: 0,
      installment_pending: 0,
    };

    const response: IApiResponse<typeof responseData> = {
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

    const students = await Student.findAll({
      where: {
        membership_end_date: {
          [Op.between]: [new Date(), targetDate],
        },
        membership_start_date: {
          [Op.not]: null,
        },
      },
      order: [['membership_end_date', 'ASC']],
    });

    const responseData = students.map(student => {
      const daysRemaining = student.getMembershipDaysRemaining();
      return {
        uid: student.uid,
        name: student.name,
        phone: student.phone,
        class: student.class,
        subject: student.subject,
        membership_end_date: student.membership_end_date,
        days_remaining: daysRemaining,
        is_membership_active: student.hasMembership(),
        membership_status: daysRemaining && daysRemaining <= 7 ? '即将到期' : '正常',
      };
    });

    const response: IApiResponse<typeof responseData> = {
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
      let iterations = 12; // 默认12个月
      
      switch (period) {
        case 'week':
          iterations = 12; // 12周
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
          iterations = 12; // 12个月
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
          iterations = 8; // 8个季度
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
          iterations = 5; // 5年
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
          const revenueTransactions = await Cash.findAll({
            where: {
              createdAt: {
                [Op.between]: [point.start, point.end]
              },
              cash: {
                [Op.gt]: 0
              }
            },
            attributes: ['cash']
          });
          value = revenueTransactions.reduce((sum, t) => sum + t.cash, 0) / 100;
          break;

        case 'expense':
          const expenseTransactions = await Cash.findAll({
            where: {
              createdAt: {
                [Op.between]: [point.start, point.end]
              },
              cash: {
                [Op.lt]: 0
              }
            },
            attributes: ['cash']
          });
          value = Math.abs(expenseTransactions.reduce((sum, t) => sum + t.cash, 0)) / 100;
          break;

        case 'students':
          value = await Student.count({
            where: {
              createdAt: {
                [Op.between]: [point.start, point.end]
              }
            }
          });
          break;

        case 'installments':
          const installmentData = await Installment.findAll({
            where: {
              createdAt: {
                [Op.between]: [point.start, point.end]
              }
            },
            attributes: ['total_amount']
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
    const students = await Student.findAll({
      attributes: ['class', 'subject'],
    });

    // 按班级统计
    const classDistribution = new Map<string, number>();
    // 按科目统计
    const subjectDistribution = new Map<string, number>();

    students.forEach(student => {
      const className = student.class;
      const subjectName = student.subject;
      
      classDistribution.set(className, (classDistribution.get(className) || 0) + 1);
      subjectDistribution.set(subjectName, (subjectDistribution.get(subjectName) || 0) + 1);
    });

    const response = {
      success: true,
      data: {
        class_distribution: Array.from(classDistribution.entries()).map(([name, count]) => ({
          name,
          count,
          percentage: Number(((count / students.length) * 100).toFixed(1))
        })),
        subject_distribution: Array.from(subjectDistribution.entries()).map(([name, count]) => ({
          name,
          count,
          percentage: Number(((count / students.length) * 100).toFixed(1))
        })),
        total_students: students.length,
      },
    };

    logger.info('获取课程分布统计成功');
    res.json(response);
  });

  // 获取成绩分布统计
  public getScoreDistribution = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const students = await Student.findAll({
      attributes: ['rings'],
    });

    const scoreRanges = [
      { label: '0-4分', min: 0, max: 4, count: 0 },
      { label: '4-6分', min: 4, max: 6, count: 0 },
      { label: '6-8分', min: 6, max: 8, count: 0 },
      { label: '8-9分', min: 8, max: 9, count: 0 },
      { label: '9-10分', min: 9, max: 10, count: 0 },
    ];

    let totalScores = 0;
    let scoreCount = 0;

    students.forEach(student => {
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
        students_with_scores: students.filter(s => s.rings && s.rings.length > 0).length,
      },
    };

    logger.info('获取成绩分布统计成功');
    res.json(response);
  });

  // 获取逾期分期付款统计
  public getOverdueInstallments = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const now = new Date();
    
    const overdueInstallments = await Installment.findAll({
      where: {
        due_date: {
          [Op.lt]: now
        },
        status: InstallmentStatus.PENDING
      },
      include: [
        {
          model: InstallmentPlan,
          as: 'installment_plan',
          attributes: ['total_amount', 'total_installments', 'frequency'],
          required: true,
        },
      ],
      order: [['due_date', 'ASC']]
    });

    const responseData = overdueInstallments.map(installment => ({
      uid: installment.uid,
      plan_id: installment.plan_id,
      total_amount: installment.total_amount / 100,
      current_installment: installment.current_installment,
      total_installments: installment.total_installments,
      due_date: installment.due_date,
      days_overdue: installment.getDaysOverdue(),
      installment_amount: installment.getInstallmentAmount(),
      overdue_amount: installment.getInstallmentAmount() * (1 + installment.getDaysOverdue() * 0.01), // 简单的逾期费用计算
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

  // 私有方法：计算仪表板统计数据
  private async calculateDashboardStats(): Promise<IDashboardStats> {
    // 获取总学员数
    const totalStudents = await Student.count();

    // 获取所有交易记录
    const transactions = await Cash.findAll({
      attributes: ['cash'],
    });

    const totalRevenue = transactions
      .filter(t => t.cash > 0)
      .reduce((sum, t) => sum + t.cash, 0) / 100;

    const totalExpense = Math.abs(
      transactions
        .filter(t => t.cash < 0)
        .reduce((sum, t) => sum + t.cash, 0) / 100
    );

    // 计算成绩统计
    const allStudents = await Student.findAll({
      attributes: ['rings'],
    });

    let totalScore = 0;
    let scoreCount = 0;
    let maxScore = 0;

    allStudents.forEach(student => {
      if (student.rings && student.rings.length > 0) {
        student.rings.forEach((score: number) => {
          totalScore += score;
          scoreCount++;
          maxScore = Math.max(maxScore, score);
        });
      }
    });

    const averageScore = scoreCount > 0 ? Number((totalScore / scoreCount).toFixed(1)) : 0;

    // 计算活跃课程数
    const activeCourses = await Student.count({
      where: {
        lesson_left: {
          [Op.gt]: 0,
        },
      },
    });

    return {
      total_students: totalStudents,
      total_revenue: Number(totalRevenue.toFixed(2)),
      total_expense: Number(totalExpense.toFixed(2)),
      average_score: averageScore,
      max_score: maxScore,
      active_courses: activeCourses,
    };
  }
}

export default new StatsController();