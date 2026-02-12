import { Request, Response } from 'express';
import { IApiResponse, MembershipStatus } from '@/types';
import { catchAsync } from '@/middleware/errorHandler';
import logger from '@/utils/logger';
import { StudentRepository } from '../db/repositories/studentRepository';
import { AppError } from '@/utils/errors';
import type { Student } from '../db/schema/students';
import { presentStudent } from '../services/studentPresenter';

type MembershipType = 'month' | 'year';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const calculateMembershipPeriod = (membershipType: MembershipType, startDate: Date) => {
  const start = new Date(startDate);
  const end = new Date(startDate);

  if (membershipType === 'month') {
    end.setMonth(end.getMonth() + 1);
  } else {
    end.setFullYear(end.getFullYear() + 1);
  }
  end.setDate(end.getDate() - 1);

  return { startDate: start, endDate: end };
};

const normalizeMembershipStatus = (value: unknown): MembershipStatus => {
  if (typeof value === 'string') {
    if ((Object.values(MembershipStatus) as string[]).includes(value)) {
      return value as MembershipStatus;
    }
  }
  return MembershipStatus.NONE;
};

interface PresentedStudent {
  uid: number;
  name: string;
  phone: string | null;
  classType: string;
  subject: string;
  lessonLeft: number | null;
  rings: number[];
  note: string | null;
  membershipStartDate: string | null;
  membershipEndDate: string | null;
  membershipStatus: MembershipStatus;
  membership_status: MembershipStatus;
  isMembershipActive: boolean;
  is_membership_active: boolean;
  membershipDaysRemaining: number | null;
  membership_days_remaining: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MembershipResponseBase {
  uid: number;
  name: string;
  membershipStartDate: string | null;
  membership_start_date: string | null;
  membershipEndDate: string | null;
  membership_end_date: string | null;
  isMembershipActive: boolean;
  is_membership_active: boolean;
  membershipDaysRemaining: number | null;
  membership_days_remaining: number | null;
  membershipStatus: MembershipStatus;
  membership_status: MembershipStatus;
  student: PresentedStudent;
}

const buildMembershipResponse = <T extends Record<string, unknown> = Record<string, never>>(
  student: Student,
  extra?: T,
): MembershipResponseBase & T => {
  const presentedStudent = presentStudent(student as any) as unknown as PresentedStudent;

  const membershipStatus = normalizeMembershipStatus(presentedStudent.membershipStatus);
  const membershipStartDate = presentedStudent.membershipStartDate ?? null;
  const membershipEndDate = presentedStudent.membershipEndDate ?? null;
  const isMembershipActive = typeof presentedStudent.isMembershipActive === 'boolean'
    ? presentedStudent.isMembershipActive
    : membershipStatus === MembershipStatus.ACTIVE;
  const membershipDaysRemaining = presentedStudent.membershipDaysRemaining ?? null;

  const normalizedStudent: PresentedStudent = {
    ...presentedStudent,
    membershipStatus,
    membership_status: membershipStatus,
    isMembershipActive,
    is_membership_active: isMembershipActive,
    membershipDaysRemaining: membershipDaysRemaining,
    membership_days_remaining: membershipDaysRemaining,
  };

  const extras = (extra ?? {}) as T;

  return {
    uid: student.uid,
    name: student.name,
    membershipStartDate,
    membership_start_date: membershipStartDate,
    membershipEndDate,
    membership_end_date: membershipEndDate,
    isMembershipActive,
    is_membership_active: isMembershipActive,
    membershipDaysRemaining,
    membership_days_remaining: membershipDaysRemaining,
    membershipStatus,
    membership_status: membershipStatus,
    student: normalizedStudent,
    ...extras,
  };
};

export class MembershipController {
  public setStudentMembership = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { startDate, endDate } = req.body;

    const student = await StudentRepository.findByUid(Number(id));

    if (!student) {
      throw AppError.notFound('学员不存在');
    }

    const updateData: any = {};
    if (startDate === null && endDate === null) {
      updateData.membershipStartDate = null;
      updateData.membershipEndDate = null;
    } else {
      updateData.membershipStartDate = startDate ? new Date(startDate).toISOString().split('T')[0] : null;
      updateData.membershipEndDate = endDate ? new Date(endDate).toISOString().split('T')[0] : null;
    }

    const updatedStudent = await StudentRepository.updateByUid(Number(id), updateData);

    if (!updatedStudent) {
      throw AppError.notFound('学员不存在');
    }

    const responseData = buildMembershipResponse(updatedStudent, {
      updated_at: updatedStudent.updatedAt || new Date().toISOString(),
    });

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: '会员信息设置成功',
    };

    logger.info(`设置学员会员信息成功，UID: ${updatedStudent.uid}`);
    res.json(response);
  });

  public clearStudentMembership = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const student = await StudentRepository.findByUid(Number(id));

    if (!student) {
      throw AppError.notFound('学员不存在');
    }

    const updatedStudent = await StudentRepository.updateByUid(Number(id), {
      membershipStartDate: null,
      membershipEndDate: null,
    });

    if (!updatedStudent) {
      throw AppError.notFound('学员不存在');
    }

    const responseData = buildMembershipResponse(updatedStudent, {
      cleared_at: updatedStudent.updatedAt || new Date().toISOString(),
    });

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: '会员信息清除成功',
    };

    logger.info(`清除学员会员信息成功，UID: ${updatedStudent.uid}`);
    res.json(response);
  });

  public setMembershipByType = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { membershipType, startFromToday = true } = req.body;

    if (!['month', 'year'].includes(membershipType)) {
      throw AppError.invalidInput('会员类型无效，只支持 month 或 year');
    }

    const student = await StudentRepository.findByUid(Number(id));

    if (!student) {
      throw AppError.notFound('学员不存在');
    }

    const now = new Date();
    const startDate = startFromToday ? now : new Date(now.getFullYear(), now.getMonth(), 1);
    const { startDate: periodStart, endDate: periodEnd } = calculateMembershipPeriod(membershipType as MembershipType, startDate);

    const updatedStudent = await StudentRepository.updateByUid(Number(id), {
      membershipStartDate: periodStart.toISOString().split('T')[0],
      membershipEndDate: periodEnd.toISOString().split('T')[0],
    });

    if (!updatedStudent) {
      throw AppError.notFound('学员不存在');
    }

    const typeText = membershipType === 'month' ? '月卡' : '年卡';
    const responseData = buildMembershipResponse(updatedStudent, {
      membership_type: membershipType,
      membership_type_text: typeText,
      duration_days: Math.ceil((periodEnd.getTime() - periodStart.getTime()) / MS_PER_DAY),
      updated_at: updatedStudent.updatedAt || new Date().toISOString(),
    });

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: `成功为学员 ${updatedStudent.name} 设置${typeText}会员`,
    };

    logger.info(`设置学员会员类型成功，UID: ${updatedStudent.uid}, 类型: ${typeText}`);
    res.json(response);
  });

  public renewMembership = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { membershipType, extendFromCurrent = true } = req.body;

    if (!['month', 'year'].includes(membershipType)) {
      throw AppError.invalidInput('会员类型无效，只支持 month 或 year');
    }

    const student = await StudentRepository.findByUid(Number(id));

    if (!student) {
      throw AppError.notFound('学员不存在');
    }

    let renewalStart: Date;
    if (extendFromCurrent && student.membershipEndDate) {
      renewalStart = new Date(student.membershipEndDate);
      renewalStart.setDate(renewalStart.getDate() + 1);
    } else {
      renewalStart = new Date();
    }

    const { endDate: renewalEnd } = calculateMembershipPeriod(membershipType as MembershipType, renewalStart);
    const membershipStart = student.membershipStartDate ?? renewalStart;

    const updatedStudent = await StudentRepository.updateByUid(Number(id), {
      membershipStartDate: membershipStart instanceof Date ? membershipStart.toISOString().split('T')[0] : membershipStart,
      membershipEndDate: renewalEnd.toISOString().split('T')[0],
    });

    if (!updatedStudent) {
      throw AppError.notFound('学员不存在');
    }

    const typeText = membershipType === 'month' ? '月卡' : '年卡';
    const responseData = buildMembershipResponse(updatedStudent, {
      membership_type: membershipType,
      membership_type_text: typeText,
      renewal_start_date: renewalStart.toISOString(),
      renewal_end_date: renewalEnd.toISOString(),
      duration_days: Math.ceil((renewalEnd.getTime() - renewalStart.getTime()) / MS_PER_DAY),
      renewed_at: updatedStudent.updatedAt || new Date().toISOString(),
    });

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: `学员 ${updatedStudent.name} ${typeText}续费成功`,
    };

    logger.info(`学员会员续费成功，UID: ${updatedStudent.uid}, 类型: ${typeText}`);
    res.json(response);
  });

  public batchSetMembership = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { studentIds, membershipType, startFromToday = true, startDate: customStartDate, endDate: customEndDate } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      throw AppError.invalidInput('学员ID列表不能为空');
    }

    // 验证：必须提供 membershipType 或 自定义日期
    const useCustomDates = customStartDate || customEndDate;
    if (!useCustomDates && !['month', 'year'].includes(membershipType)) {
      throw AppError.invalidInput('必须指定会员类型或自定义日期');
    }

    const results: Array<Record<string, unknown>> = [];
    const now = new Date();

    for (const studentId of studentIds) {
      const student = await StudentRepository.findByUid(Number(studentId));
      if (!student) {
        results.push({
          uid: studentId,
          success: false,
          error: '学员不存在',
        });
        continue;
      }

      try {
        let periodStart: Date;
        let periodEnd: Date;

        if (useCustomDates) {
          // 使用自定义日期
          periodStart = customStartDate ? new Date(customStartDate) : now;
          periodEnd = customEndDate ? new Date(customEndDate) : new Date(periodStart);
          if (!customEndDate) {
            // 如果没有结束日期，默认一个月
            periodEnd.setMonth(periodEnd.getMonth() + 1);
            periodEnd.setDate(periodEnd.getDate() - 1);
          }
        } else {
          // 使用会员类型计算日期
          const baseDate = startFromToday ? now : new Date(now.getFullYear(), now.getMonth(), 1);
          const period = calculateMembershipPeriod(membershipType as MembershipType, baseDate);
          periodStart = period.startDate;
          periodEnd = period.endDate;
        }

        const updatedStudent = await StudentRepository.updateByUid(Number(studentId), {
          membershipStartDate: periodStart.toISOString().split('T')[0],
          membershipEndDate: periodEnd.toISOString().split('T')[0],
        });

        if (!updatedStudent) {
          throw new Error('更新失败');
        }

        results.push({
          uid: updatedStudent.uid,
          name: updatedStudent.name,
          success: true,
          membership_start_date: periodStart,
          membership_end_date: periodEnd,
          student: presentStudent(updatedStudent),
        });
      } catch (error) {
        results.push({
          uid: student.uid,
          name: student.name,
          success: false,
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    }

    const successCount = results.filter(result => result.success).length;
    const typeText = useCustomDates ? '自定义日期' : (membershipType === 'month' ? '月卡' : '年卡');

    const responseData = {
      processed_count: results.length,
      success_count: successCount,
      failed_count: results.length - successCount,
      membership_type: useCustomDates ? 'custom' : membershipType,
      membership_type_text: typeText,
      results,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: `批量设置${typeText}完成，成功 ${successCount}/${results.length} 个学员`,
    };

    logger.info(`批量设置会员完成，类型: ${typeText}, 成功: ${successCount}/${results.length}`);
    res.json(response);
  });

  public getMembershipStats = catchAsync(async (_req: Request, res: Response): Promise<void> => {
    const now = new Date();

    // 总会员数（有会员日期的）
    const allStudents = await StudentRepository.findAll();
    const totalMembers = allStudents.filter(
      s => s.membershipStartDate && s.membershipEndDate
    ).length;

    // 活跃会员数
    const activeMembers = allStudents.filter(student => {
      if (!student.membershipStartDate || !student.membershipEndDate) {
        return false;
      }
      const start = new Date(student.membershipStartDate);
      const end = new Date(student.membershipEndDate);
      return now >= start && now <= end;
    }).length;

    // 30天内到期会员数
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const expiringSoon = allStudents.filter(student => {
      if (!student.membershipEndDate || !student.membershipStartDate) {
        return false;
      }
      const endDate = new Date(student.membershipEndDate);
      return endDate >= now && endDate <= thirtyDaysLater;
    }).length;

    // 已过期会员数
    const expiredMembers = allStudents.filter(student => {
      if (!student.membershipEndDate || !student.membershipStartDate) {
        return false;
      }
      const endDate = new Date(student.membershipEndDate);
      return endDate < now;
    }).length;

    const responseData = {
      total_members: totalMembers,
      active_members: activeMembers,
      expired_members: expiredMembers,
      expiring_soon: expiringSoon,
      activation_rate: totalMembers > 0 ? Number(((activeMembers / totalMembers) * 100).toFixed(1)) : 0,
      expiration_rate: totalMembers > 0 ? Number(((expiringSoon / totalMembers) * 100).toFixed(1)) : 0,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
    };

    logger.info('获取会员统计信息成功');
    res.json(response);
  });
}

export default new MembershipController();
