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
   * 获取所有分期付款状态
   */
  static async getInstallmentStatuses(): Promise<Installment[]> {
    return apiCall<Installment[]>(
      baseClient.get('/installments/statuses')
    );
  }

  /**
   * 获取即将到期的分期付款
   */
  static async getUpcomingInstallments(days?: number): Promise<Installment[]> {
    const params = days ? { days: String(days) } : {};
    
    return apiCall<Installment[]>(
      baseClient.get('/installments/upcoming', { params })
    );
  }

  /**
   * 更新分期付款状态
   */
  static async updateInstallmentStatus(
    transactionUid: number,
    status: InstallmentStatus
  ): Promise<Installment> {
    return apiCall<Installment>(
      baseClient.patch(`/installments/${transactionUid}/status`, { status })
    );
  }

  /**
   * 支付下一期
   */
  static async payNextInstallment(planId: number): Promise<{
    installment: Installment;
    transaction: any;
  }> {
    return apiCall(
      baseClient.post(`/installments/${planId}/next`)
    );
  }

  /**
   * 取消分期计划
   */
  static async cancelInstallmentPlan(planId: number): Promise<InstallmentPlan> {
    return apiCall<InstallmentPlan>(
      baseClient.post(`/installments/${planId}/cancel`)
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
}
