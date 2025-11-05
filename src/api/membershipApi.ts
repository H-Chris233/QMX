/**
 * 会员管理 API 服务
 */
import { baseClient, apiCall } from './baseClient';
import type { Student, MembershipData, MembershipType } from '../types/api';

/**
 * 会员统计数据类型
 */
export interface MembershipStats {
  total_members: number;
  active_members: number;
  expired_members: number;
  expiring_soon: number;
  upcoming_members: number;
}

/**
 * 会员管理 API 服务类
 */
export class MembershipApiService {
  /**
   * 设置学员会员
   */
  static async setStudentMembership(
    studentId: number,
    membership: MembershipData
  ): Promise<Student> {
    const payload = {
      membership_start_date: membership.startDate,
      membership_end_date: membership.endDate,
    };

    return apiCall<Student>(
      baseClient.patch(`/membership/students/${studentId}/membership`, payload)
    );
  }

  /**
   * 清除学员会员
   */
  static async clearStudentMembership(studentId: number): Promise<Student> {
    return apiCall<Student>(
      baseClient.delete(`/membership/students/${studentId}/membership`)
    );
  }

  /**
   * 按类型设置会员（月卡/年卡）
   */
  static async setMembershipByType(
    studentId: number,
    type: MembershipType,
    startDate?: string
  ): Promise<Student> {
    const payload: Record<string, any> = { type };
    
    if (startDate) {
      payload.start_date = startDate;
    }

    return apiCall<Student>(
      baseClient.post(`/membership/students/${studentId}/membership/type`, payload)
    );
  }

  /**
   * 续费会员
   */
  static async renewMembership(
    studentId: number,
    type: MembershipType
  ): Promise<Student> {
    const payload = { type };

    return apiCall<Student>(
      baseClient.post(`/membership/students/${studentId}/membership/renew`, payload)
    );
  }

  /**
   * 获取会员统计数据
   */
  static async getMembershipStats(): Promise<MembershipStats> {
    return apiCall<MembershipStats>(
      baseClient.get('/membership/stats')
    );
  }

  /**
   * 批量设置会员
   */
  static async batchSetMembership(
    studentIds: number[],
    membership: MembershipData
  ): Promise<{ success: number; failed: number }> {
    const payload = {
      student_ids: studentIds,
      membership_start_date: membership.startDate,
      membership_end_date: membership.endDate,
    };

    return apiCall(
      baseClient.post('/membership/batch', payload)
    );
  }
}
