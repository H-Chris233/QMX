/**
 * 分期付款管理 API 服务
 */
import { baseClient, apiCall } from './baseClient';
import type {
  Installment,
  InstallmentPlan,
  InstallmentStatus,
} from '../types/api';

/**
 * 分期付款 API 服务类
 */
export class InstallmentsApiService {
  /**
   * 获取所有分期计划（支持分页）
   */
  static async getAllInstallmentPlans(params?: {
    page?: number;
    limit?: number;
    student_id?: number;
    status?: string;
  }): Promise<{
    data: InstallmentPlan[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  }> {
    return apiCall(
      baseClient.get('/installments', { params })
    );
  }

  /**
   * 获取逾期分期列表
   */
  static async getOverdueInstallments(): Promise<{
    overdue_installments: Installment[];
    total_overdue_count: number;
    total_overdue_amount: number;
    average_days_overdue: number;
  }> {
    return apiCall(
      baseClient.get('/installments/overdue')
    );
  }

  /**
   * 获取即将到期的分期
   */
  static async getUpcomingInstallments(days?: number): Promise<{
    uid: number;
    plan_id: number;
    current_installment: number;
    installment_amount: number;
    due_date: string;
    days_until_due: number;
    status: string;
    status_text: string;
    plan: {
      uid: number;
      total_installments: number;
      student: { uid: number; name: string; phone: string } | null;
    } | null;
  }[]> {
    const params = days === undefined ? undefined : { days: String(days) };

    return apiCall(
      baseClient.get('/installments/upcoming', { params })
    );
  }

  /**
   * 更新分期状态（简洁版，不创建交易记录）
   */
  static async updateInstallmentStatus(
    installmentUid: number,
    status: InstallmentStatus
  ): Promise<{
    uid: number;
    status: string;
    plan: { uid: number; status: string } | null;
  }> {
    return apiCall(
      baseClient.patch(`/installments/${installmentUid}/status`, { status })
    );
  }

  /**
   * 获取分期计划详情
   */
  static async getInstallmentPlan(planId: number): Promise<{
    plan: InstallmentPlan;
    installments: Installment[];
  }> {
    return apiCall(
      baseClient.get(`/installments/${planId}`)
    );
  }

  /**
   * 创建分期计划
   */
  static async createInstallmentPlan(data: {
    student_id?: number | null;
    total_amount: number;
    note?: string;
    total_installments: number;
    frequency: string;
    custom_days?: number | null;
    start_date: string;
  }): Promise<InstallmentPlan> {
    return apiCall<InstallmentPlan>(
      baseClient.post('/installments', data)
    );
  }

  /**
   * 更新分期计划
   */
  static async updateInstallmentPlan(
    planId: number,
    data: { note?: string; status?: string }
  ): Promise<InstallmentPlan> {
    return apiCall<InstallmentPlan>(
      baseClient.put(`/installments/${planId}`, data)
    );
  }

  /**
   * 更新分期付款状态（支付/标记逾期等）
   */
  static async updateInstallmentPayment(
    installmentUid: number,
    data: { status: InstallmentStatus; amount?: number }
  ): Promise<{
    installment: Installment;
    plan: InstallmentPlan;
  }> {
    return apiCall(
      baseClient.put(`/installments/${installmentUid}/payment`, data)
    );
  }

  /**
   * 记录分期支付
   */
  static async recordPayment(
    planId: number,
    data?: { installment_index?: number; paid_amount?: number; paid_date?: string }
  ): Promise<{
    installment: Installment;
    plan: InstallmentPlan;
  }> {
    return apiCall(
      baseClient.post(`/installments/${planId}/payments`, data)
    );
  }

  /**
   * 支付分期计划的下一期
   */
  static async payNextInstallment(planId: number): Promise<{
    installment: Installment;
    transaction: { uid: number; amount: number; note: string };
  }> {
    return apiCall(
      baseClient.post(`/installments/${planId}/next`)
    );
  }

  /**
   * 删除分期计划
   */
  static async deleteInstallmentPlan(planId: number): Promise<void> {
    return apiCall(
      baseClient.delete(`/installments/${planId}`)
    );
  }

  /**
   * 取消分期计划
   * 将计划标记为已取消状态，保留已支付的分期记录
   */
  static async cancelInstallmentPlan(planId: number): Promise<{
    uid: number;
    status: string;
    status_text: string;
    total_amount: number;
    total_installments: number;
    paid_count: number;
    note: string | null;
  }> {
    return apiCall(
      baseClient.post(`/installments/${planId}/cancel`)
    );
  }
}
