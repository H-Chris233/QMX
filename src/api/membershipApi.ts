/**
 * 会员管理 API 服务
 */
import { baseClient, apiCall } from "./baseClient";
import type { Student, MembershipData, MembershipType } from "../types/api";

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
      startDate: membership.startDate,
      endDate: membership.endDate,
    };

    return apiCall<Student>(
      baseClient.post(`/membership/students/${studentId}/membership`, payload)
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
    membershipType: MembershipType,
    startFromToday: boolean = true
  ): Promise<Student> {
    const payload = {
      membershipType,
      startFromToday,
    };

    return apiCall<Student>(
      baseClient.post(
        `/membership/students/${studentId}/membership/type`,
        payload
      )
    );
  }

  /**
   * 续费会员
   */
  static async renewMembership(
    studentId: number,
    membershipType: MembershipType,
    extendFromCurrent: boolean = true
  ): Promise<Student> {
    const payload = {
      membershipType,
      extendFromCurrent,
    };

    return apiCall<Student>(
      baseClient.post(
        `/membership/students/${studentId}/membership/renew`,
        payload
      )
    );
  }

  /**
   * 获取会员统计数据
   */
  static async getMembershipStats(): Promise<MembershipStats> {
    return apiCall<MembershipStats>(baseClient.get("/membership/stats"));
  }

  /**
   * 批量设置会员
   */
  static async batchSetMembership(
    studentIds: number[],
    membershipType: MembershipType | MembershipData,
    startFromToday: boolean = true
  ): Promise<{ success: number; failed: number }> {
    const payload =
      typeof membershipType === 'string'
        ? {
            studentIds,
            membershipType,
            startFromToday,
          }
        : {
            studentIds,
            startDate: membershipType.startDate,
            endDate: membershipType.endDate,
          };

    return apiCall(baseClient.post("/membership/batch", payload));
  }
}
