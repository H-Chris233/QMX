import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { 
  Student,
  IApiResponse
} from '@/models';
import { catchAsync } from '@/middleware/errorHandler';
import logger from '@/utils/logger';

// 会员管理控制器
export class MembershipController {
  // 设置学员会员信息
  public setStudentMembership = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { startDate, endDate } = req.body;

    const student = await Student.findByPk(Number(id));

    if (!student) {
      return res.status(404).json({
        success: false,
        error: '学员不存在',
      });
    }

    // 验证日期
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start && end && start > end) {
      return res.status(400).json({
        success: false,
        error: '会员开始日期不能晚于结束日期',
      });
    }

    // 更新会员信息
    await student.update({
      membership_start_date: start,
      membership_end_date: end,
    });

    const responseData = {
      uid: student.uid,
      name: student.name,
      membership_start_date: student.membership_start_date,
      membership_end_date: student.membership_end_date,
      is_membership_active: student.hasMembership(),
      membership_days_remaining: student.getMembershipDaysRemaining(),
      updated_at: student.updatedAt,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: '会员信息设置成功',
    };

    logger.info(`设置学员会员信息成功，UID: ${student.uid}, 有效期: ${startDate} - ${endDate}`);
    res.json(response);
  });

  // 清除学员会员信息
  public clearStudentMembership = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;

    const student = await Student.findByPk(Number(id));

    if (!student) {
      return res.status(404).json({
        success: false,
        error: '学员不存在',
      });
    }

    // 清除会员信息
    await student.update({
      membership_start_date: null,
      membership_end_date: null,
    });

    const responseData = {
      uid: student.uid,
      name: student.name,
      membership_start_date: null,
      membership_end_date: null,
      is_membership_active: false,
      membership_days_remaining: null,
      cleared_at: student.updatedAt,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: '会员信息清除成功',
    };

    logger.info(`清除学员会员信息成功，UID: ${student.uid}`);
    res.json(response);
  });

  // 按类型设置会员（月卡/年卡）
  public setMembershipByType = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { membershipType, startFromToday = true } = req.body;

    const student = await Student.findByPk(Number(id));

    if (!student) {
      return res.status(404).json({
        success: false,
        error: '学员不存在',
      });
    }

    // 验证会员类型
    if (!['month', 'year'].includes(membershipType)) {
      return res.status(400).json({
        success: false,
        error: '会员类型无效，只支持 month 或 year',
      });
    }

    // 计算会员期限
    const now = new Date();
    const startDate = startFromToday ? now : new Date(now.getFullYear(), now.getMonth(), 1); // 月初
    let endDate: Date;

    if (membershipType === 'month') {
      // 月卡：从开始日期加1个月
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(endDate.getDate() - 1); // 前一天，即月底
    } else {
      // 年卡：从开始日期加1年
      endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);
      endDate.setDate(endDate.getDate() - 1); // 前一天
    }

    // 更新会员信息
    await student.update({
      membership_start_date: startDate,
      membership_end_date: endDate,
    });

    const typeText = membershipType === 'month' ? '月卡' : '年卡';
    const responseData = {
      uid: student.uid,
      name: student.name,
      membership_type: membershipType,
      membership_type_text: typeText,
      membership_start_date: student.membership_start_date,
      membership_end_date: student.membership_end_date,
      is_membership_active: student.hasMembership(),
      membership_days_remaining: student.getMembershipDaysRemaining(),
      duration_days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      updated_at: student.updatedAt,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: `成功为学员 ${student.name} 设置${typeText}会员`,
    };

    logger.info(`设置学员会员类型成功，UID: ${student.uid}, 类型: ${typeText}, 有效期: ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`);
    res.json(response);
  });

  // 续费会员
  public renewMembership = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { membershipType, extendFromCurrent = true } = req.body;

    const student = await Student.findByPk(Number(id));

    if (!student) {
      return res.status(404).json({
        success: false,
        error: '学员不存在',
      });
    }

    // 验证会员类型
    if (!['month', 'year'].includes(membershipType)) {
      return res.status(400).json({
        success: false,
        error: '会员类型无效，只支持 month 或 year',
      });
    }

    // 计算续费开始日期
    let startDate: Date;
    if (extendFromCurrent && student.membership_end_date) {
      // 从当前结束日期的下一天开始
      startDate = new Date(student.membership_end_date);
      startDate.setDate(startDate.getDate() + 1);
    } else {
      // 从今天开始
      startDate = new Date();
    }

    // 计算续费结束日期
    let endDate: Date;

    if (membershipType === 'month') {
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(endDate.getDate() - 1);
    } else {
      endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);
      endDate.setDate(endDate.getDate() - 1);
    }

    // 更新会员信息
    await student.update({
      membership_start_date: student.membership_start_date || startDate, // 如果是首次开通，使用开始日期
      membership_end_date: endDate,
    });

    const typeText = membershipType === 'month' ? '月卡' : '年卡';
    const responseData = {
      uid: student.uid,
      name: student.name,
      membership_type: membershipType,
      membership_type_text: typeText,
      membership_start_date: student.membership_start_date,
      membership_end_date: student.membership_end_date,
      is_membership_active: student.hasMembership(),
      membership_days_remaining: student.getMembershipDaysRemaining(),
      renewal_start_date: startDate,
      renewal_end_date: endDate,
      duration_days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      renewed_at: student.updatedAt,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: `学员 ${student.name} ${typeText}续费成功`,
    };

    logger.info(`学员会员续费成功，UID: ${student.uid}, 类型: ${typeText}, 新有效期: ${student.membership_start_date?.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`);
    res.json(response);
  });

  // 批量设置会员
  public batchSetMembership = catchAsync(async (req: Request, res: Response) => {
    const { studentIds, membershipType, startFromToday = true } = req.body;

    // 验证输入
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '学员ID列表不能为空',
      });
    }

    if (!['month', 'year'].includes(membershipType)) {
      return res.status(400).json({
        success: false,
        error: '会员类型无效，只支持 month 或 year',
      });
    }

    // 查找学员
    const students = await Student.findAll({
      where: {
        uid: studentIds.map((id: any) => Number(id)),
      },
    });

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        error: '未找到任何有效的学员',
      });
    }

    // 批量处理
    const results = [];
    const now = new Date();

    for (const student of students) {
      try {
        // 计算会员期限
        const startDate = startFromToday ? now : new Date(now.getFullYear(), now.getMonth(), 1);
        let endDate: Date;

        if (membershipType === 'month') {
          endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + 1);
          endDate.setDate(endDate.getDate() - 1);
        } else {
          endDate = new Date(startDate);
          endDate.setFullYear(endDate.getFullYear() + 1);
          endDate.setDate(endDate.getDate() - 1);
        }

        // 更新会员信息
        await student.update({
          membership_start_date: startDate,
          membership_end_date: endDate,
        });

        results.push({
          uid: student.uid,
          name: student.name,
          success: true,
          membership_start_date: student.membership_start_date,
          membership_end_date: student.membership_end_date,
          is_membership_active: student.hasMembership(),
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

    const successCount = results.filter(r => r.success).length;
    const typeText = membershipType === 'month' ? '月卡' : '年卡';

    const responseData = {
      processed_count: results.length,
      success_count: successCount,
      failed_count: results.length - successCount,
      membership_type: membershipType,
      membership_type_text: typeText,
      results: results,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: `批量设置${typeText}完成，成功 ${successCount}/${results.length} 个学员`,
    };

    logger.info(`批量设置会员完成，类型: ${typeText}, 成功: ${successCount}/${results.length}`);
    res.json(response);
  });

  // 获取会员统计信息
  public getMembershipStats = catchAsync(async (req: Request, res: Response) => {
    const now = new Date();

    // 总会员数
    const totalMembers = await Student.count({
      where: {
        membership_start_date: { [Op.not]: null },
        membership_end_date: { [Op.not]: null },
      },
    });

    // 有效会员数
    const activeMembers = await Student.count({
      where: {
        membership_start_date: { [Op.lte]: now },
        membership_end_date: { [Op.gte]: now },
      },
    });

    // 即将到期的会员（30天内）
    const thirtyDaysLater = new Date(now);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const expiringSoon = await Student.count({
      where: {
        membership_end_date: {
          [Op.between]: [now, thirtyDaysLater],
        },
        membership_start_date: { [Op.not]: null },
      },
    });

    // 已过期的会员
    const expiredMembers = await Student.count({
      where: {
        membership_end_date: { [Op.lt]: now },
        membership_start_date: { [Op.not]: null },
      },
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