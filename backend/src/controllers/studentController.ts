import { Request, Response } from "express";
import { catchAsync } from "@/middleware/errorHandler";
import logger from "@/utils/logger";
import type { ClassType, SubjectType } from "@/types";
import { AppError } from "@/utils/errors";
import { StudentRepository } from "../db/repositories/studentRepository";
import { StudentQuery } from "../services/studentQuery";
import { presentStudent } from "../services/studentPresenter";

const parseNumber = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseBoolean = (value: unknown): boolean | null => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === "boolean") {
    return value;
  }
  const stringified = String(value).toLowerCase();
  if (["true", "1", "yes"].includes(stringified)) {
    return true;
  }
  if (["false", "0", "no"].includes(stringified)) {
    return false;
  }
  return null;
};

const buildMembershipPayload = (
  start?: any,
  end?: any
): { start?: string | null; end?: string | null } | null | undefined => {
  if (start === undefined && end === undefined) {
    return undefined;
  }
  if (start === null && end === null) {
    return null;
  }
  return {
    start: start ? (typeof start === 'string' ? start : start.toISOString().split('T')[0]) ?? null : null,
    end: end ? (typeof end === 'string' ? end : end.toISOString().split('T')[0]) ?? null : null,
  };
};

const applyUpdaterFromPayload = async (
  studentId: number,
  payload: Record<string, any>
): Promise<any> => {
  const updateData: Record<string, unknown> = {};

  if (payload.name !== undefined) {
    updateData.name = payload.name;
  }
  if (payload.age !== undefined) {
    updateData.age = payload.age === null ? null : Number(payload.age);
  }
  if (payload.phone !== undefined) {
    updateData.phone = payload.phone;
  }
  if (payload.class !== undefined) {
    updateData.classType = payload.class;
  }
  if (payload.subject !== undefined) {
    updateData.subject = payload.subject;
  }
  if (payload.lesson_left !== undefined || payload.lessonLeft !== undefined) {
    updateData.lessonLeft = payload.lesson_left ?? payload.lessonLeft === null ? null : Number(payload.lessonLeft);
  }
  if (payload.note !== undefined) {
    updateData.note = payload.note;
  }
  if (payload.rings !== undefined) {
    updateData.rings = Array.isArray(payload.rings) ? payload.rings : [];
  }

  if (
    payload.membership_start_date !== undefined ||
    payload.membership_end_date !== undefined ||
    payload.membershipStartDate !== undefined ||
    payload.membershipEndDate !== undefined
  ) {
    const membershipPayload = buildMembershipPayload(
      payload.membership_start_date ?? payload.membershipStartDate,
      payload.membership_end_date ?? payload.membershipEndDate
    );

    if (membershipPayload !== undefined) {
      updateData.membershipStartDate = membershipPayload.start;
      updateData.membershipEndDate = membershipPayload.end;
    }
  }

  return await StudentRepository.updateByUid(studentId, updateData);
};

export class StudentController {
  public getAllStudents = catchAsync(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 20,
      name_contains,
      min_age,
      max_age,
      min_score,
      max_score,
      class_type,
      subject,
      has_membership,
      membership_active_at,
      sort_by,
      sort_order = "DESC",
    } = req.query;

    // 构建查询选项
    const options = {
      page: Number(page),
      limit: Number(limit),
      nameContains: name_contains as string | undefined,
      minAge: parseNumber(min_age),
      maxAge: parseNumber(max_age),
      minScore: parseNumber(min_score),
      maxScore: parseNumber(max_score),
      classType: class_type as ClassType | undefined,
      subject: subject as SubjectType | undefined,
      hasMembership: parseBoolean(has_membership),
      membershipActiveAt: membership_active_at as string | undefined,
      sortBy: sort_by as string | undefined,
      sortOrder: sort_order as "ASC" | "DESC",
    };

    const result = await StudentRepository.findWithPagination(options);

    res.json({
      success: true,
      data: result.data.map(presentStudent),
      pagination: result.pagination,
    });
  });

  public addStudent = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;

    // 构建学员数据
    const newStudent = {
      name: payload.name,
      age: payload.age === null || payload.age === undefined ? null : Number(payload.age),
      phone: payload.phone,
      classType: payload.class as ClassType ?? 'TEN_TRY',
      subject: payload.subject as SubjectType ?? 'SHOOTING',
      note: payload.note ?? '',
      lessonLeft: payload.lesson_left ?? payload.lessonLeft === null ? null : Number(payload.lesson_left ?? payload.lessonLeft),
      rings: Array.isArray(payload.rings) ? payload.rings : [],
      membershipStartDate: payload.membership_start_date ?? payload.membershipStartDate
        ? (typeof (payload.membership_start_date ?? payload.membershipStartDate) === 'string'
          ? payload.membership_start_date ?? payload.membershipStartDate
          : (payload.membership_start_date ?? payload.membershipStartDate).toISOString().split('T')[0])
        : null,
      membershipEndDate: payload.membership_end_date ?? payload.membershipEndDate
        ? (typeof (payload.membership_end_date ?? payload.membershipEndDate) === 'string'
          ? payload.membership_end_date ?? payload.membershipEndDate
          : (payload.membership_end_date ?? payload.membershipEndDate).toISOString().split('T')[0])
        : null,
    };

    const student = await StudentRepository.create(newStudent);

    logger.info(`添加学员成功，UID: ${student.uid}, 姓名: ${student.name}`);
    res.status(201).json({
      success: true,
      data: presentStudent(student),
      message: "学员添加成功",
    });
  });

  public updateStudent = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;

    const updatedStudent = await applyUpdaterFromPayload(Number(id), req.body ?? {});

    if (!updatedStudent) {
      throw AppError.notFound("学员不存在");
    }

    logger.info(`更新学员成功，UID: ${updatedStudent.uid}`);
    res.json({
      success: true,
      data: presentStudent(updatedStudent),
      message: "学员更新成功",
    });
  });

  public deleteStudent = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;

    const student = await StudentRepository.findByUid(Number(id));

    if (!student) {
      throw AppError.notFound("学员不存在");
    }

    const deleted = await StudentRepository.deleteByUid(student.uid);

    if (!deleted) {
      throw AppError.other("删除学员失败");
    }

    logger.info(`删除学员成功，UID: ${student.uid}`);
    res.json({
      success: true,
      message: "学员删除成功",
    });
  });

  public getStudentById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const student = await StudentRepository.findByUid(Number(id));

    if (!student) {
      throw AppError.notFound("学员不存在");
    }

    res.json({
      success: true,
      data: presentStudent(student),
    });
  });

  public searchStudents = catchAsync(async (req: Request, res: Response) => {
    const {
      name_contains,
      min_age,
      max_age,
      min_score,
      max_score,
      class_type,
      subject,
      has_membership,
      membership_active_at,
      page = 1,
      limit = 20,
      sort_by,
      sort_order = "DESC",
    } = req.query;

    const options = {
      page: Number(page),
      limit: Number(limit),
      nameContains: name_contains as string | undefined,
      minAge: parseNumber(min_age),
      maxAge: parseNumber(max_age),
      minScore: parseNumber(min_score),
      maxScore: parseNumber(max_score),
      classType: class_type as ClassType | undefined,
      subject: subject as SubjectType | undefined,
      hasMembership: parseBoolean(has_membership),
      membershipActiveAt: membership_active_at as string | undefined,
      sortBy: sort_by as string | undefined,
      sortOrder: sort_order as "ASC" | "DESC",
    };

    const result = await StudentRepository.findWithPagination(options);

    res.json({
      success: true,
      data: result.data.map(presentStudent),
      pagination: result.pagination,
    });
  });

  public batchUpdateStudents = catchAsync(
    async (req: Request, res: Response) => {
      const { studentIds, updates } = req.body as {
        studentIds: number[];
        updates: Record<string, any>;
      };

      if (
        !studentIds ||
        !Array.isArray(studentIds) ||
        studentIds.length === 0
      ) {
        throw AppError.invalidInput("学员ID列表不能为空");
      }

      let updatedCount = 0;

      for (const studentId of studentIds) {
        try {
          await applyUpdaterFromPayload(Number(studentId), updates ?? {});
          updatedCount += 1;
        } catch (error) {
          logger.warn(
            `批量更新学员失败，UID: ${studentId}, 错误: ${
              (error as Error).message
            }`
          );
        }
      }

      logger.info(`批量更新学员成功，影响数量: ${updatedCount}`);
      res.json({
        success: true,
        data: {
          updated_count: updatedCount,
        },
        message: `成功更新${updatedCount}个学员`,
      });
    }
  );

  public batchDeleteStudents = catchAsync(
    async (req: Request, res: Response) => {
      const { studentIds } = req.body as { studentIds: number[] };

      if (
        !studentIds ||
        !Array.isArray(studentIds) ||
        studentIds.length === 0
      ) {
        throw AppError.invalidInput("学员ID列表不能为空");
      }

      let deletedCount = 0;
      for (const studentId of studentIds) {
        const deleted = await StudentRepository.deleteByUid(Number(studentId));
        if (deleted) {
          deletedCount += 1;
        }
      }

      logger.info(`批量删除学员成功，删除数量: ${deletedCount}`);
      res.json({
        success: true,
        data: {
          deleted_count: deletedCount,
        },
        message: `成功删除${deletedCount}个学员`,
      });
    }
  );

  public updateStudentScores = catchAsync(
    async (req: Request, res: Response) => {
      const { id } = req.params;
      const { rings } = req.body;

      if (!Array.isArray(rings)) {
        throw AppError.invalidInput("成绩必须是数组格式");
      }

      const updatedStudent = await StudentRepository.updateByUid(Number(id), {
        rings,
      });

      if (!updatedStudent) {
        throw AppError.notFound("学员不存在");
      }

      logger.info(`更新学员成绩成功，UID: ${updatedStudent.uid}`);
      res.json({
        success: true,
        data: presentStudent(updatedStudent),
        message: "学员成绩更新成功",
      });
    }
  );

  public getExpiringMemberships = catchAsync(
    async (req: Request, res: Response) => {
      const { days = 30 } = req.query;

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + Number(days));

      const expiringStudents = await StudentRepository.findExpiringMemberships(
        Number(days)
      );

      res.json({
        success: true,
        data: expiringStudents.map(presentStudent),
        count: expiringStudents.length,
      });
    }
  );

  public getStudentStats = catchAsync(async (_req: Request, res: Response) => {
    const allStudents = await StudentRepository.findAll();

    const total_students = allStudents.length;

    const now = new Date();
    let active_students_count = 0;

    allStudents.forEach((student) => {
      if (student.membershipStartDate && student.membershipEndDate) {
        const start = new Date(student.membershipStartDate);
        const end = new Date(student.membershipEndDate);
        if (now >= start && now <= end) {
          active_students_count++;
        }
      }
    });

    const expired_memberships = total_students - active_students_count;

    const classStats = new Map<string, number>();
    const subjectStats = new Map<string, number>();

    allStudents.forEach((student) => {
      const className = student.classType || "Others";
      const subjectName = student.subject || "Others";

      classStats.set(className, (classStats.get(className) || 0) + 1);
      subjectStats.set(subjectName, (subjectStats.get(subjectName) || 0) + 1);
    });

    const class_statistics = Array.from(classStats.entries()).map(
      ([cls, count]) => ({
        class: cls,
        count,
      })
    );

    const subject_statistics = Array.from(subjectStats.entries()).map(
      ([subj, count]) => ({
        subject: subj,
        count,
      })
    );

    res.json({
      success: true,
      data: {
        total_students,
        active_students: active_students_count,
        expired_memberships: expired_memberships,
        class_statistics,
        subject_statistics,
      },
    });
  });
}

const studentController = new StudentController();
export default studentController;
