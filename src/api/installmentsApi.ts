/**
 * 分期付款管理 API 服务
 */
import { baseClient, apiCall } from './baseClient';
import type {
  Installment,
  InstallmentPlan,
  InstallmentStatus,
  PaginatedResponse,
} from '../types/api';
import {
  toInstallmentPlanStatus,
  toInstallmentStatus,
  toPaymentFrequency,
  toFrontendInstallmentStatus,
  toFrontendInstallmentPlanStatus,
  toFrontendPaymentFrequency,
} from './paramMappers';

/**
 * 分期付款 API 服务类
 */
export class InstallmentsApiService {
  private static normalizePlan(plan: InstallmentPlan): InstallmentPlan {
    return {
      ...plan,
      frequency: (toFrontendPaymentFrequency(String(plan.frequency)) as any) || plan.frequency,
      status: (toFrontendInstallmentPlanStatus(String(plan.status)) as any) || plan.status,
    };
  }

  private static normalizeInstallment(installment: Installment): Installment {
    return {
      ...installment,
      status: (toFrontendInstallmentStatus(String(installment.status)) as any) || installment.status,
    };
  }
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
    const response = await baseClient.get<PaginatedResponse<InstallmentPlan>>(
      '/installments',
      { params },
    );
    const rawPlans = Array.isArray(response.data?.data)
      ? response.data.data
      : [];

    return {
      data: rawPlans.map((plan: InstallmentPlan) =>
        InstallmentsApiService.normalizePlan(plan)
      ),
      pagination: response.data?.pagination || {
        page: params?.page ?? 1,
        limit: params?.limit ?? rawPlans.length,
        total: rawPlans.length,
        total_pages: 1,
      },
    };
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
    const response = await apiCall<any>(
      baseClient.patch(`/installments/${installmentUid}/status`, { status: toInstallmentStatus(String(status)) })
    );
    return {
      ...response,
      status: toFrontendInstallmentStatus(String(response.status)) || response.status,
      plan: response.plan
        ? {
            ...response.plan,
            status: toFrontendInstallmentPlanStatus(String(response.plan.status)) || response.plan.status,
          }
        : null,
    };
  }

  /**
   * 获取分期计划详情
   */
  static async getInstallmentPlan(planId: number): Promise<{
    plan: InstallmentPlan;
    installments: Installment[];
  }> {
    const raw = await apiCall<any>(
      baseClient.get(`/installments/${planId}`)
    );
    return {
      plan: InstallmentsApiService.normalizePlan(raw.plan),
      installments: (raw.installments || []).map((installment: Installment) =>
        InstallmentsApiService.normalizeInstallment(installment)
      ),
    };
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
    const payload = {
      ...data,
      frequency: toPaymentFrequency(data.frequency) || data.frequency,
    };

    const plan = await apiCall<InstallmentPlan>(
      baseClient.post('/installments', payload)
    );
    return InstallmentsApiService.normalizePlan(plan);
  }

  /**
   * 更新分期计划
   */
  static async updateInstallmentPlan(
    planId: number,
    data: { note?: string; status?: string }
  ): Promise<InstallmentPlan> {
    const payload = {
      ...data,
      status: data.status ? toInstallmentPlanStatus(data.status) : data.status,
    };

    const plan = await apiCall<InstallmentPlan>(
      baseClient.put(`/installments/${planId}`, payload)
    );
    return InstallmentsApiService.normalizePlan(plan);
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
    const payload = {
      ...data,
      status: toInstallmentStatus(String(data.status)) || data.status,
    };

    const response = await apiCall<any>(
      baseClient.put(`/installments/${installmentUid}/payment`, payload)
    );
    return {
      installment: InstallmentsApiService.normalizeInstallment(response.installment),
      plan: InstallmentsApiService.normalizePlan(response.plan),
    };
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
    const response = await apiCall<any>(
      baseClient.post(`/installments/${planId}/payments`, data)
    );
    return {
      installment: InstallmentsApiService.normalizeInstallment(response.installment),
      plan: InstallmentsApiService.normalizePlan(response.plan),
    };
  }

  /**
   * 支付分期计划的下一期
   */
  static async payNextInstallment(planId: number): Promise<{
    installment: Installment;
    transaction: { uid: number; amount: number; note: string };
  }> {
    const response = await apiCall<any>(
      baseClient.post(`/installments/${planId}/next`)
    );
    return {
      ...response,
      installment: InstallmentsApiService.normalizeInstallment(response.installment),
    };
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
    const response = await apiCall<any>(
      baseClient.post(`/installments/${planId}/cancel`)
    );
    return {
      ...response,
      status: toFrontendInstallmentPlanStatus(String(response.status)) || response.status,
    };
  }
}
