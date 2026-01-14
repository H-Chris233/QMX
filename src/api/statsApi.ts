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
      thisweek: 'week',
      thismonth: 'month',
      thisyear: 'year',
    };

    return { period: shorthandMap[lowered] || lowered };
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

/**
 * 统计数据 API 服务类
 */
export class StatsApiService {
  /**
   * 获取仪表盘统计数据
   */
  static async getDashboardStats(period?: StatsPeriod): Promise<DashboardStats> {
    const params = parsePeriodParams(period);

    return apiCall<DashboardStats>(
      baseClient.get('/stats/dashboard', { params })
    );
  }

  /**
   * 获取学员统计数据（按学员ID）
   */
  static async getStudentStats(studentId: number, period?: StatsPeriod): Promise<StudentStats> {
    const params = parsePeriodParams(period);

    return apiCall<StudentStats>(
      baseClient.get(`/stats/students/${studentId}`, { params })
    );
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
    const params = parsePeriodParams(period);

    return apiCall<FinancialStats>(
      baseClient.get('/stats/financial', { params })
    );
  }

  /**
   * 获取全局财务统计数据
   */
  static async getGlobalFinancialStats(period?: StatsPeriod): Promise<FinancialStats> {
    const params = parsePeriodParams(period);

    return apiCall<FinancialStats>(
      baseClient.get('/stats/global-financial-stats', { params })
    );
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
