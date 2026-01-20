/**
 * 统计数据 API 服务
 */
import { baseClient, apiCall } from './baseClient';
import type {
  DashboardStats,
  StudentStats,
  FinancialStats,
  Student,
} from '../types/api';

/**
 * 统计周期类型
 * 支持多种格式以兼容组件的不同使用方式
 */
export type StatsPeriod = 
  | 'today' | 'week' | 'month' | 'year' | 'all'
  | 'Today' | 'ThisWeek' | 'ThisMonth' | 'ThisYear' 
  | { date_from: string; date_to: string }
  | { start: string; end: string };

/**
 * 将周期参数转换为查询参数
 */
function parsePeriodParams(period?: StatsPeriod): Record<string, string> {
  if (!period) {
    return {};
  }

  if (typeof period === 'string') {
    const normalized = period.trim();
    const lowered = normalized.toLowerCase();
    const shorthandMap: Record<string, string> = {
      today: 'Today',
      week: 'ThisWeek',
      month: 'ThisMonth',
      year: 'ThisYear',
      all: 'All',
      thisweek: 'ThisWeek',
      thismonth: 'ThisMonth',
      thisyear: 'ThisYear',
    };

    return { period: shorthandMap[lowered] || normalized };
  }

  // 自定义日期范围 - 支持两种格式
  if ('date_from' in period && 'date_to' in period) {
    return {
      date_from: period.date_from,
      date_to: period.date_to,
    };
  }

  if ('start' in period && 'end' in period) {
    return {
      date_from: period.start,
      date_to: period.end,
    };
  }

  return {};
}

const toAmount = (cents?: number): number => {
  if (!Number.isFinite(cents)) return 0;
  return Number(((cents || 0) / 100).toFixed(2));
};

const mapDashboardStats = (raw: any): DashboardStats => ({
  total_students: raw.total_students ?? raw.totalStudents ?? 0,
  total_revenue: raw.total_revenue ?? toAmount(raw.totalRevenueCents),
  total_expense: raw.total_expense ?? toAmount(raw.totalExpenseCents),
  net_income: raw.net_income ?? toAmount(raw.netIncomeCents),
  average_score: raw.average_score ?? raw.averageScore ?? 0,
  max_score: raw.max_score ?? raw.maxScore ?? 0,
  active_courses: raw.active_courses ?? raw.activeCourses ?? 0,
  active_members: raw.active_members ?? raw.activeMembers,
  active_installments: raw.active_installments ?? raw.activeInstallmentPlans,
  overdue_installments: raw.overdue_installments ?? raw.overdueInstallmentCount,
});

const mapStudentStats = (raw: any): StudentStats => ({
  total_payments: raw.total_payments ?? toAmount(raw.payments?.totalAmountCents),
  payment_count: raw.payment_count ?? raw.payments?.count ?? 0,
  average_score: raw.average_score ?? raw.scores?.average,
  max_score: raw.max_score ?? raw.scores?.max,
  min_score: raw.min_score ?? raw.scores?.min,
  score_count: raw.score_count ?? raw.scores?.count ?? 0,
  membership_status: raw.membership_status ?? raw.membership?.status ?? '',
  membership_status_code: raw.membership_status_code ?? raw.membership?.statusCode,
  membership_is_active: raw.membership_is_active ?? raw.membership?.isActive,
  membership_days_remaining: raw.membership_days_remaining ?? raw.membership?.daysRemaining ?? null,
  membership_days_until_start: raw.membership_days_until_start ?? raw.membership?.daysUntilStart ?? null,
  installment_stats: raw.installment_stats ?? (raw.installments
    ? {
        total_amount: toAmount(raw.installments.totalAmountCents),
        paid_amount: toAmount(raw.installments.paidAmountCents),
        pending_amount: toAmount(raw.installments.pendingAmountCents),
        pending_count: raw.installments.pendingCount ?? 0,
        remaining_amount: toAmount(raw.installments.remainingAmountCents),
      }
    : undefined),
});

const mapFinancialStats = (raw: any): FinancialStats => ({
  period: raw.period,
  date_from: raw.date_from ?? raw.dateRange?.start ?? raw.dateRange?.from,
  date_to: raw.date_to ?? raw.dateRange?.end ?? raw.dateRange?.to,
  total_income: raw.total_income ?? toAmount(raw.totals?.incomeCents),
  total_expense: raw.total_expense ?? toAmount(raw.totals?.expenseCents),
  net_income: raw.net_income ?? toAmount(raw.totals?.netIncomeCents),
  net_profit: raw.net_profit ?? undefined,
  is_profitable: raw.is_profitable ?? raw.totals?.isProfitable,
  installment_total: raw.installment_total ?? toAmount(raw.installments?.totalCents),
  installment_paid: raw.installment_paid ?? toAmount(raw.installments?.paidCents),
  installment_pending: raw.installment_pending ?? toAmount(raw.installments?.pendingCents),
  installment_remaining: raw.installment_remaining ?? toAmount(raw.installments?.remainingCents),
  transaction_count: raw.transaction_count ?? raw.transactionCount,
  student_income: raw.student_income ?? (raw.studentIncome
    ? raw.studentIncome.map((entry: any) => ({
        student_id: entry.studentId,
        student_name: entry.studentName,
        amount: toAmount(entry.amountCents),
      }))
    : undefined),
});

/**
 * 统计数据 API 服务类
 */
export class StatsApiService {
  /**
   * 获取仪表盘统计数据
   */
  static async getDashboardStats(period?: StatsPeriod): Promise<DashboardStats> {
    const params = parsePeriodParams(period);

    const raw = await apiCall<any>(
      baseClient.get('/stats/dashboard', { params })
    );
    return mapDashboardStats(raw);
  }

  /**
   * 获取学员统计数据（按学员ID）
   */
  static async getStudentStats(studentId: number, period?: StatsPeriod): Promise<StudentStats> {
    const params = parsePeriodParams(period);

    const raw = await apiCall<any>(
      baseClient.get(`/stats/students/${studentId}`, { params })
    );
    return mapStudentStats(raw);
  }

  /**
   * 获取全局学员统计数据
   */
  static async getGlobalStudentStats(period?: StatsPeriod): Promise<{
    total_students: number;
    average_score: number;
    max_score: number;
    min_score: number;
    students_with_scores: number;
    top_students: Array<{
      uid: number;
      name: string;
      average_score: number;
      max_score: number;
    }>;
  }> {
    const params = parsePeriodParams(period);

    return apiCall(
      baseClient.get('/stats/global-student-stats', { params })
    );
  }

  /**
   * 获取财务统计数据（已废弃，请使用 getGlobalFinancialStats）
   * @deprecated 请使用 getGlobalFinancialStats
   */
  static async getFinancialStats(period?: StatsPeriod): Promise<FinancialStats> {
    const params = typeof period === 'string' ? parsePeriodParams(period) : {};

    const raw = await apiCall<any>(
      baseClient.get('/stats/financial', { params })
    );
    return mapFinancialStats(raw);
  }

  /**
   * 获取全局财务统计数据
   */
  static async getGlobalFinancialStats(period?: StatsPeriod): Promise<FinancialStats> {
    const params = parsePeriodParams(period);

    const raw = await apiCall<any>(
      baseClient.get('/stats/global-financial-stats', { params })
    );
    return mapFinancialStats(raw);
  }

  /**
   * 获取即将到期的会员
   */
  static async getMembershipExpiringSoon(days: number = 30): Promise<Student[]> {
    const params = { days: String(days) };

    return apiCall<Student[]>(
      baseClient.get('/stats/membership-expiring', { params })
    );
  }
}
