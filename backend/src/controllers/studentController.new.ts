import { Request, Response } from "express";
import {
  StudentRepository,
} from "../db/repositories/studentRepository";
import {
  CashRepository,
} from "../db/repositories/cashRepository";
import {
  InstallmentPlanRepository,
  InstallmentRepository,
} from "../db/repositories/installmentRepository";
import { catchAsync } from "@/middleware/errorHandler";
import {
  StudentBuilder,
  StudentUpdater,
} from "../services/studentBuilder";
import { StudentQuery } from "../services/studentQuery";
import { presentStudent } from "../services/studentPresenter";
import { AppError } from "@/utils/errors";
import {
  PaymentFrequency,
  InstallmentStatus,
} from "@/types";
import logger from "@/utils/logger";
import { db } from "../db";
import {
  students,
  cashTransactions,
  installmentPlans,
  installments,
} from "../db/schema";
import { eq, and, isNull, count, sql } from "drizzle-orm";

export class StudentController {
  /**
   * 获取所有学员 - 适配新 Repository
   */
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

    // 使用新的 StudentQuery（基于 Drizzle）
    const query = StudentQuery.create()
      .nameContains(name_contains as string | undefined)
      .ageRange(
        min_age !== undefined ? Number(min_age) : undefined,
        max_age !== undefined ? Number(max_age) : undefined
      )
      .classType(class_type as string | undefined)
      .subject(subject as string | undefined)
      .hasMembership(
        has_membership !== undefined ? has_membership === "true" : undefined
      )
      .scoreRange(
        min_score !== undefined ? Number(min_score) : undefined,
        max_score !== undefined ? Number(max_score) : undefined
      )
      .paginate(Number(page), Number(limit))
      .sort(sort_by as string | undefined, sort_order as "ASC" | "DESC");

    const result = await query.build();

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * 添加学员 - 适配新 Builder
   */
  public addStudent = catchAsync(async (req: Request, res: Response) => {
    const {
      name,
      age,
      phone,
      class,
      subject,
      note,
      lesson_left,
      rings,
      membership_start_date,
      membership_end_date,
    } = req.body;

    const student = await StudentBuilder.create()
      .name(name)
      .age(age ?? null)
      .phone(phone)
      .classType(class)
      .subject(subject)
      .lessonLeft(lesson_left)
      .rings(rings)
      .note(note)
      .membership(membership_start_date, membership_end_date)
      .build();

    logger.info(`添加学员成功，UID: ${student.uid}, 姓名: ${student.name}`);

    res.status(201).json({
      success: true,
      data: presentStudent(student),
      message: "学员添加成功",
    });
  });

  /**
   * 更新学员 - 适配新 Updater
   */
  public updateStudent = catchAsync(async (req: Request, res: Response) => {
    const { uid } = req.params;

    const updater = await StudentUpdater.for(Number(uid));

    const payload = req.body;
    if (payload.name !== undefined) updater.name(payload.name);
    if (payload.age !== undefined) updater.age(payload.age);
    if (payload.phone !== undefined) updater.phone(payload.phone);
    if (payload.class !== undefined) updater.classType(payload.class);
    if (payload.subject !== undefined) updater.subject(payload.subject);
    if (payload.lesson_left !== undefined) updater.lessonLeft(payload.lesson_left);
    if (payload.note !== undefined) updater.note(payload.note);
    if (payload.rings !== undefined) updater.rings(payload.rings);
    if (payload.membership_start_date !== undefined || payload.membership_end_date !== undefined) {
      updater.membership(payload.membership_start_date, payload.membership_end_date);
    }

    const updatedStudent = await updater.commit();

    logger.info(`更新学员成功，UID: ${updatedStudent.uid}`);

    res.json({
      success: true,
      data: presentStudent(updatedStudent),
      message: "学员更新成功",
    });
  });

  /**
   * 删除学员 - 适配新 Repository
   */
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

  /**
   * 根据ID获取学员详情
   */
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

  /**
   * 获取学员统计
   */
  public getStudentStats = catchAsync(async (req: Request, res: Response) => {
    const { uid } = req.params;

    const student = await StudentRepository.findByUid(Number(uid));

    if (!student) {
      throw AppError.notFound("学员不存在");
    }

    const students = await StudentRepository.findAll();
    const now = new Date();

    // 统计活跃会员
    let activeMembers = 0;
    let expiredMembers = 0;

    for (const s of students) {
      if (s.membershipStartDate && s.membershipEndDate) {
        const start = new Date(s.membershipStartDate);
        const end = new Date(s.membershipEndDate);
        if (now >= start && now <= end) {
          activeMembers++;
        } else if (now > end) {
          expiredMembers++;
        }
      }
    }

    // 统计班级类型
    const classStats = new Map<string, number>();
    students.forEach((s) => {
      const className = s.classType || "OTHERS";
      const count = (classStats.get(className) || 0) + 1;
      classStats.set(className, count);
    });

    // 统计科目类型
    const subjectStats = new Map<string, number>();
    students.forEach((s) => {
      const subjectName = s.subject || "OTHERS";
      const count = (subjectStats.get(subjectName) || 0) + 1;
      subjectStats.set(subjectName, count);
    });

    const studentsCount = students.length;

    // 计算成绩统计
    let totalScore = 0;
    let scoreCount = 0;
    let maxScore = 0;

    for (const s of students) {
      const rings = s.rings || [];
      if (rings.length > 0) {
        for (const score of rings) {
          if (Number.isFinite(score)) {
            totalScore += score;
            scoreCount += 1;
            if (score > maxScore) {
              maxScore = score;
            }
          }
        }
      }
    }

    const averageScore = scoreCount > 0 ? Number((totalScore / scoreCount).toFixed(1)) : 0;

    res.json({
      success: true,
      data: {
        total_students: studentsCount,
        active_members: activeMembers,
        expired_memberships: expiredMembers,
        class_statistics: Array.from(classStats.entries()).map(([cls, count]) => ({
          class: cls,
          count,
        })),
        subject_statistics: Array.from(subjectStats.entries()).map(([subject, count]) => ({
          subject,
          count,
        })),
        score_statistics: {
          average_score: averageScore,
          max_score: maxScore,
          score_count: scoreCount,
        },
      },
    });
  });
}

const studentController = new StudentController();
export default studentController;
