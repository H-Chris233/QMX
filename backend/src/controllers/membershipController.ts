import { Request, Response } from 'express';
import { Student, IStudentDoc } from '@/models/mongo';
import { IApiResponse, MembershipStatus } from '@/types';
import { catchAsync } from '@/middleware/errorHandler';
import logger from '@/utils/logger';
import { StudentUpdater } from '@/services/studentUpdater';
import { presentStudent } from '@/services/studentPresenter';

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

const buildMembershipResponse = (student: IStudentDoc, extra: Record<string, unknown> = {}) => {
  const studentData = presentStudent(student);
  const status = (studentData.membership_status as MembershipStatus) ?? MembershipStatus.NONE;
  return {
    uid: student.uid,
    name: student.name,
    membership_start_date: studentData.membership_start_date ?? studentData.membershipStartDate,
    membership_end_date: studentData.membership_end_date ?? studentData.membershipEndDate,
    is_membership_active: student.hasMembership(),
    membership_days_remaining: student.getMembershipDaysRemaining(),
    membership_status: status,
    membershipStatus: status,
    student: studentData,
    ...extra,
  };
};

export class MembershipController {
  public setStudentMembership = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { startDate, endDate } = req.body;

    const student = await Student.findByUid(Number(id));

    if (!student) {
      res.status(404).json({
        success: false,
        error: '学员不存在',
      });
      return;
    }

    const updater = StudentUpdater.fromDocument(student);
    const membershipPayload = startDate === null && endDate === null ? null : { startDate, endDate };
    updater.membership(membershipPayload);
    const updatedStudent = await updater.commit();

    const responseData = buildMembershipResponse(updatedStudent, {
      updated_at: updatedStudent.updatedAt,
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

    const student = await Student.findByUid(Number(id));

    if (!student) {
      res.status(404).json({
        success: false,
        error: '学员不存在',
      });
      return;
    }

    const updater = StudentUpdater.fromDocument(student);
    updater.membership(null);
    const updatedStudent = await updater.commit();

    const responseData = buildMembershipResponse(updatedStudent, {
      cleared_at: updatedStudent.updatedAt,
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
      res.status(400).json({
        success: false,
        error: '会员类型无效，只支持 month 或 year',
      });
      return;
    }

    const student = await Student.findByUid(Number(id));

    if (!student) {
      res.status(404).json({
        success: false,
        error: '学员不存在',
      });
      return;
    }

    const now = new Date();
    const startDate = startFromToday ? now : new Date(now.getFullYear(), now.getMonth(), 1);
    const { startDate: periodStart, endDate: periodEnd } = calculateMembershipPeriod(membershipType, startDate);

    const updater = StudentUpdater.fromDocument(student);
    updater.membership({ startDate: periodStart, endDate: periodEnd });
    const updatedStudent = await updater.commit();

    const typeText = membershipType === 'month' ? '月卡' : '年卡';
    const responseData = buildMembershipResponse(updatedStudent, {
      membership_type: membershipType,
      membership_type_text: typeText,
      duration_days: Math.ceil((periodEnd.getTime() - periodStart.getTime()) / MS_PER_DAY),
      updated_at: updatedStudent.updatedAt,
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
      res.status(400).json({
        success: false,
        error: '会员类型无效，只支持 month 或 year',
      });
      return;
    }

    const student = await Student.findByUid(Number(id));

    if (!student) {
      res.status(404).json({
        success: false,
        error: '学员不存在',
      });
      return;
    }

    let renewalStart: Date;
    if (extendFromCurrent && student.membershipEndDate) {
      renewalStart = new Date(student.membershipEndDate);
      renewalStart.setDate(renewalStart.getDate() + 1);
    } else {
      renewalStart = new Date();
    }

    const { endDate: renewalEnd } = calculateMembershipPeriod(membershipType, renewalStart);
    const membershipStart = student.membershipStartDate ?? renewalStart;

    const updater = StudentUpdater.fromDocument(student);
    updater.membership({ startDate: membershipStart, endDate: renewalEnd });
    const updatedStudent = await updater.commit();

    const typeText = membershipType === 'month' ? '月卡' : '年卡';
    const responseData = buildMembershipResponse(updatedStudent, {
      membership_type: membershipType,
      membership_type_text: typeText,
      renewal_start_date: renewalStart,
      renewal_end_date: renewalEnd,
      duration_days: Math.ceil((renewalEnd.getTime() - renewalStart.getTime()) / MS_PER_DAY),
      renewed_at: updatedStudent.updatedAt,
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
    const { studentIds, membershipType, startFromToday = true } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      res.status(400).json({
        success: false,
        error: '学员ID列表不能为空',
      });
      return;
    }

    if (!['month', 'year'].includes(membershipType)) {
      res.status(400).json({
        success: false,
        error: '会员类型无效，只支持 month 或 year',
      });
      return;
    }

    const results: Array<Record<string, unknown>> = [];
    const now = new Date();

    for (const studentId of studentIds) {
      const student = await Student.findByUid(Number(studentId));
      if (!student) {
        results.push({
          uid: studentId,
          success: false,
          error: '学员不存在',
        });
        continue;
      }

      try {
        const startDate = startFromToday ? now : new Date(now.getFullYear(), now.getMonth(), 1);
        const { startDate: periodStart, endDate: periodEnd } = calculateMembershipPeriod(membershipType, startDate);
        const updater = StudentUpdater.fromDocument(student);
        updater.membership({ startDate: periodStart, endDate: periodEnd });
        const updatedStudent = await updater.commit();

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
    const typeText = membershipType === 'month' ? '月卡' : '年卡';

    const responseData = {
      processed_count: results.length,
      success_count: successCount,
      failed_count: results.length - successCount,
      membership_type: membershipType,
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

    const totalMembers = await Student.count({
      membershipStartDate: { $exists: true, $ne: null },
      membershipEndDate: { $exists: true, $ne: null },
    });

    const activeMembers = await Student.count({
      membershipStartDate: { $lte: now },
      membershipEndDate: { $gte: now },
    });

    const thirtyDaysLater = new Date(now);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const expiringSoon = await Student.count({
      membershipEndDate: {
        $gte: now,
        $lte: thirtyDaysLater,
      },
      membershipStartDate: { $exists: true, $ne: null },
    });

    const expiredMembers = await Student.count({
      membershipEndDate: { $lt: now },
      membershipStartDate: { $exists: true, $ne: null },
    });

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
