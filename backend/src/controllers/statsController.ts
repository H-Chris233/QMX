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
  public getDashboardStats = catchAsync(async (req: Request, res: Response) => {
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
  public getStudentStats = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;

    const student = await Student.findByPk(Number(id), {
      include: [
        {
          model: Cash,
          as: 'cashTransactions',
          attributes: ['cash', 'created_at'],
        },
      ],
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: '学员不存在',
      });
    }

    // 计算支付统计
    const payments = student.cashTransactions?.filter(t => t.cash > 0) || [];
    const totalPayments = payments.reduce((sum, p) => sum + p.cash, 0) / 100; // 转换为元
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
  public getFinancialStats = catchAsync(async (req: Request, res: Response) => {
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
        created_at: {
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
            created_at: {
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
      if (plan.installments && plan.installments.length > 0) {
        plan.installments.forEach(installment => {
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
  public getGlobalStudentStats = catchAsync(async (req: Request, res: Response) => {
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
  public getGlobalFinancialStats = catchAsync(async (req: Request, res: Response) => {
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
  public getMembershipExpiringSoon = catchAsync(async (req: Request, res: Response) => {
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