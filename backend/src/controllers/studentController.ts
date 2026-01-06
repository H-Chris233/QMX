import { Request, Response } from "express";
import { Student } from "@/models/mongo";
import { catchAsync } from "@/middleware/errorHandler";
import logger from "@/utils/logger";
import { StudentBuilder, MembershipPayload } from "@/services/studentBuilder";
import { StudentUpdater } from "@/services/studentUpdater";
import { StudentQuery } from "@/services/studentQuery";
import { presentStudent } from "@/services/studentPresenter";
import type { ClassType, SubjectType } from "@/types";
import { AppError } from "@/utils/errors";

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
): MembershipPayload | null | undefined => {
  if (start === undefined && end === undefined) {
    return undefined;
  }
  if (start === null && end === null) {
    return null;
  }
  return {
    startDate: start ?? null,
    endDate: end ?? null,
  };
};

const applyUpdaterFromPayload = (
  updater: StudentUpdater,
  payload: Record<string, any>
): void => {
  if (payload.name !== undefined) {
    updater.name(payload.name);
  }
  if (payload.age !== undefined) {
    updater.age(payload.age);
  }
  if (payload.phone !== undefined) {
    updater.phone(payload.phone);
  }
  if (payload.class !== undefined) {
    updater.class(payload.class as ClassType);
  }
  if (payload.subject !== undefined) {
    updater.subject(payload.subject as SubjectType);
  }
  if (payload.lesson_left !== undefined) {
    updater.lessonLeft(payload.lesson_left);
  } else if (payload.lessonLeft !== undefined) {
    updater.lessonLeft(payload.lessonLeft);
  }
  if (payload.note !== undefined) {
    updater.note(payload.note);
  }
  if (payload.rings !== undefined) {
    updater.setRings(payload.rings);
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
      updater.membership(membershipPayload);
    }
  }
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

    // 检测是否有过滤参数（除了分页和排序参数）
    // 注意：sort_by不作为过滤条件，避免简单排序触发复杂聚合查询
    const hasFilters = Boolean(
      name_contains ||
        min_age ||
        max_age ||
        min_score ||
        max_score ||
        class_type ||
        subject ||
        has_membership ||
        membership_active_at
    );

    if (hasFilters) {
      // 使用复杂查询构建器
      const queryBuilder = StudentQuery.create()
        .nameContains(name_contains as string | undefined)
        .ageRange(
          parseNumber(min_age as string | undefined),
          parseNumber(max_age as string | undefined)
        )
        .class(class_type as ClassType | undefined)
        .subject(subject as SubjectType | undefined)
        .hasMembership(parseBoolean(has_membership))
        .membershipActiveAt(membership_active_at as string | undefined)
        .scoreRange(
          parseNumber(min_score as string | undefined),
          parseNumber(max_score as string | undefined)
        )
        .paginate(Number(page), Number(limit))
        .sort(
          sort_by as string | undefined,
          (sort_order as "ASC" | "DESC") ?? "DESC"
        );

      const {
        pipeline,
        countPipeline,
        page: currentPage,
        limit: currentLimit,
      } = queryBuilder.build();

      const rawStudents = await Student.aggregate(pipeline).exec();
      const countResult = await Student.aggregate(countPipeline).exec();
      const total = countResult[0]?.count ?? 0;

      return res.json({
        success: true,
        data: rawStudents.map(presentStudent),
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          total_pages: currentLimit > 0 ? Math.ceil(total / currentLimit) : 0,
        },
      });
    }

    // 简单分页查询（无过滤条件，但支持排序）
    // 如果有sort_by参数，也使用StudentQuery构建器以支持排序
    if (sort_by) {
      const queryBuilder = StudentQuery.create()
        .paginate(Number(page), Number(limit))
        .sort(
          sort_by as string | undefined,
          (sort_order as "ASC" | "DESC") ?? "DESC"
        );

      const {
        pipeline,
        countPipeline,
        page: currentPage,
        limit: currentLimit,
      } = queryBuilder.build();

      const rawStudents = await Student.aggregate(pipeline).exec();
      const countResult = await Student.aggregate(countPipeline).exec();
      const total = countResult[0]?.count ?? 0;

      return res.json({
        success: true,
        data: rawStudents.map(presentStudent),
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          total_pages: currentLimit > 0 ? Math.ceil(total / currentLimit) : 0,
        },
      });
    }

    // 完全无参数的简单查询
    const result = await Student.findWithPagination(
      Number(page),
      Number(limit)
    );

    res.json({
      success: true,
      data: result.students.map(presentStudent),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: result.total,
        totalPages: result.totalPages,
        total_pages: result.totalPages,
      },
    });
  });

  public addStudent = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;
    const builder = StudentBuilder.create()
      .name(payload.name)
      .age(payload.age)
      .phone(payload.phone)
      .class(payload.class as ClassType)
      .subject(payload.subject as SubjectType)
      .note(payload.note)
      .lessonLeft(payload.lesson_left ?? payload.lessonLeft)
      .rings(payload.rings);

    const membershipPayload = buildMembershipPayload(
      payload.membership_start_date ?? payload.membershipStartDate,
      payload.membership_end_date ?? payload.membershipEndDate
    );

    if (membershipPayload !== undefined) {
      builder.membership(membershipPayload);
    }

    const student = await builder.build();

    logger.info(`添加学员成功，UID: ${student.uid}, 姓名: ${student.name}`);
    res.status(201).json({
      success: true,
      data: presentStudent(student),
      message: "学员添加成功",
    });
  });

  public updateStudent = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updater = await StudentUpdater.for(Number(id));

    applyUpdaterFromPayload(updater, req.body ?? {});

    const updatedStudent = await updater.commit();

    logger.info(`更新学员成功，UID: ${updatedStudent.uid}`);
    res.json({
      success: true,
      data: presentStudent(updatedStudent),
      message: "学员更新成功",
    });
  });

  public deleteStudent = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const student = await Student.findByUid(Number(id));

    if (!student) {
      throw AppError.notFound("学员不存在");
    }

    const deleted = await Student.deleteByUid(student.uid);

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
    const student = await Student.findByUid(Number(id));

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

    const queryBuilder = StudentQuery.create()
      .nameContains(name_contains as string | undefined)
      .ageRange(
        parseNumber(min_age as string | undefined),
        parseNumber(max_age as string | undefined)
      )
      .class(class_type as ClassType | undefined)
      .subject(subject as SubjectType | undefined)
      .hasMembership(parseBoolean(has_membership))
      .membershipActiveAt(membership_active_at as string | undefined)
      .scoreRange(
        parseNumber(min_score as string | undefined),
        parseNumber(max_score as string | undefined)
      )
      .paginate(Number(page), Number(limit))
      .sort(
        sort_by as string | undefined,
        (sort_order as "ASC" | "DESC") ?? "DESC"
      );

    const {
      pipeline,
      countPipeline,
      page: currentPage,
      limit: currentLimit,
    } = queryBuilder.build();

    const rawStudents = await Student.aggregate(pipeline).exec();
    const countResult = await Student.aggregate(countPipeline).exec();
    const total = countResult[0]?.count ?? 0;

    res.json({
      success: true,
      data: rawStudents.map(presentStudent),
      pagination: {
        page: currentPage,
        limit: currentLimit,
        total,
        total_pages: currentLimit > 0 ? Math.ceil(total / currentLimit) : 0,
      },
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
          const updater = await StudentUpdater.for(Number(studentId));
          applyUpdaterFromPayload(updater, updates ?? {});
          await updater.commit();
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
        const deleted = await Student.deleteByUid(Number(studentId));
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

      const updater = await StudentUpdater.for(Number(id));
      updater.setRings(rings);
      const updatedStudent = await updater.commit();

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

      const expiringStudents = await Student.search({
        membershipEndDate: {
          $gte: new Date(),
          $lte: futureDate,
        },
      });

      res.json({
        success: true,
        data: expiringStudents.map(presentStudent),
        count: expiringStudents.length,
      });
    }
  );

  public getStudentStats = catchAsync(async (_req: Request, res: Response) => {
    const total_students = await Student.count({});

    const now = new Date();
    const active_students = await Student.search({
      membershipStartDate: { $lte: now },
      membershipEndDate: { $gte: now },
    });

    const expired_memberships_count = total_students - active_students.length;

    const allStudents = await Student.findAll();
    const classStats = new Map<string, number>();
    const subjectStats = new Map<string, number>();

    allStudents.forEach((student) => {
      const className = student.class || "Others";
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
        active_students: active_students.length,
        expired_memberships: expired_memberships_count,
        class_statistics,
        subject_statistics,
      },
    });
  });
}

const studentController = new StudentController();
export default studentController;
