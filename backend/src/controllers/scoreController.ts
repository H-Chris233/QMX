import { Request, Response } from 'express';
import { catchAsync } from '@/middleware/errorHandler';
import { IApiResponse, SubjectType } from '@/types';
import logger from '@/utils/logger';
import { StudentRepository } from '../db/repositories/studentRepository';
import { presentStudent } from '../services/studentPresenter';
import { AppError } from '@/utils/errors';
import {
  createScoreDetail,
  normalizeScoreDetails,
  scoreDetailsToRings,
} from '../services/scoreDetails';
import type { ScoreDetail } from '../db/schema/students';

const calculateScoreStats = (details: ScoreDetail[]) => {
  const scores = scoreDetailsToRings(details);
  const total = scores.length;

  if (total === 0) {
    return {
      total_scores: 0,
      average_score: 0,
      max_score: 0,
      min_score: 0,
    };
  }

  const sum = scores.reduce((acc, item) => acc + item, 0);

  return {
    total_scores: total,
    average_score: Number((sum / total).toFixed(1)),
    max_score: Math.max(...scores),
    min_score: Math.min(...scores),
  };
};

const getStudentScoreDetails = (student: {
  scoreDetails?: unknown;
  subject?: string | null;
  updatedAt?: Date | string | null;
}) => {
  const parsedUpdatedAt = student.updatedAt ? new Date(student.updatedAt) : null;
  const fallbackRecordedAt = parsedUpdatedAt && !Number.isNaN(parsedUpdatedAt.getTime())
    ? parsedUpdatedAt.toISOString()
    : new Date().toISOString();

  return normalizeScoreDetails(student.scoreDetails, {
    fallbackSubject: (student.subject ?? SubjectType.SHOOTING) as SubjectType,
    fallbackRecordedAt,
  });
};

export class ScoreController {
  public addScore = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { score, subject, recorded_at, note } = req.body;

    const student = await StudentRepository.findByUid(Number(id));
    if (!student) throw AppError.notFound('学员不存在');

    const parsedScore = Number(score);
    if (!Number.isFinite(parsedScore)) {
      throw AppError.invalidInput('成绩必须是有效数字');
    }

    const current = getStudentScoreDetails(student);
    const parsedRecordedAt = recorded_at ? new Date(recorded_at) : null;
    const newDetail = createScoreDetail(parsedScore, {
      fallbackSubject: (
        subject?.toString().trim().toUpperCase()
        ?? student.subject
        ?? SubjectType.SHOOTING
      ) as SubjectType,
      fallbackRecordedAt: parsedRecordedAt && !Number.isNaN(parsedRecordedAt.getTime())
        ? parsedRecordedAt.toISOString()
        : new Date().toISOString(),
      note,
    });

    const nextDetails = [...current, newDetail];
    const nextRings = scoreDetailsToRings(nextDetails);

    const updatedStudent = await StudentRepository.updateByUid(Number(id), {
      scoreDetails: nextDetails,
      rings: nextRings,
    });
    if (!updatedStudent) throw AppError.notFound('学员不存在');

    const stats = calculateScoreStats(nextDetails);
    const responseData = {
      student_uid: updatedStudent.uid,
      score_details: nextDetails,
      student: presentStudent(updatedStudent),
      ...stats,
      message: `成功为学员 ${updatedStudent.name} 添加成绩 ${parsedScore}`,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: '成绩添加成功',
    };

    logger.info(`添加成绩成功，学员UID: ${updatedStudent.uid}, 成绩: ${parsedScore}`);
    res.status(201).json(response);
  });

  public getStudentScores = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const student = await StudentRepository.findByUid(Number(id));
    if (!student) throw AppError.notFound('学员不存在');

    const details = getStudentScoreDetails(student);
    const stats = calculateScoreStats(details);

    const responseData = {
      student_uid: student.uid,
      student_name: student.name,
      score_details: details,
      student: presentStudent(student),
      ...stats,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
    };

    logger.info(`获取学员成绩成功，学员UID: ${student.uid}, 成绩数量: ${details.length}`);
    res.json(response);
  });

  public updateStudentScore = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id, scoreIndex } = req.params;
    const { newScore, subject, recorded_at, note } = req.body;

    const student = await StudentRepository.findByUid(Number(id));
    if (!student) throw AppError.notFound('学员不存在');

    const index = Number(scoreIndex);
    const details = getStudentScoreDetails(student);
    if (index < 0 || index >= details.length) {
      throw AppError.invalidInput('成绩索引超出范围');
    }

    const parsedScore = Number(newScore);
    if (!Number.isFinite(parsedScore)) {
      throw AppError.invalidInput('成绩必须是有效数字');
    }

    const previous = details[index];
    const parsedRecordedAt = recorded_at ? new Date(recorded_at) : null;
    const nextDetails = [...details];
    nextDetails[index] = {
      score: parsedScore,
      subject: (
        subject?.toString().trim().toUpperCase()
        ?? previous.subject
        ?? student.subject
        ?? SubjectType.SHOOTING
      ) as SubjectType,
      recorded_at: recorded_at
        ? (parsedRecordedAt && !Number.isNaN(parsedRecordedAt.getTime())
            ? parsedRecordedAt.toISOString()
            : previous.recorded_at)
        : previous.recorded_at,
      note: note === undefined ? previous.note : note,
    };

    const updatedStudent = await StudentRepository.updateByUid(Number(id), {
      scoreDetails: nextDetails,
      rings: scoreDetailsToRings(nextDetails),
    });
    if (!updatedStudent) throw AppError.notFound('学员不存在');

    const stats = calculateScoreStats(nextDetails);
    const responseData = {
      student_uid: updatedStudent.uid,
      score_index: index,
      old_score: previous.score,
      new_score: parsedScore,
      score_detail: nextDetails[index],
      score_details: nextDetails,
      student: presentStudent(updatedStudent),
      ...stats,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: '成绩更新成功',
    };

    logger.info(
      `更新成绩成功，学员UID: ${updatedStudent.uid}, 索引: ${index}, 旧成绩: ${previous.score}, 新成绩: ${parsedScore}`,
    );
    res.json(response);
  });

  public deleteStudentScore = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id, scoreIndex } = req.params;

    const student = await StudentRepository.findByUid(Number(id));
    if (!student) throw AppError.notFound('学员不存在');

    const index = Number(scoreIndex);
    const details = getStudentScoreDetails(student);
    if (index < 0 || index >= details.length) {
      throw AppError.invalidInput('成绩索引超出范围');
    }

    const deletedDetail = details[index];
    const nextDetails = details.filter((_, i) => i !== index);

    const updatedStudent = await StudentRepository.updateByUid(Number(id), {
      scoreDetails: nextDetails,
      rings: scoreDetailsToRings(nextDetails),
    });
    if (!updatedStudent) throw AppError.notFound('学员不存在');

    const stats = calculateScoreStats(nextDetails);
    const responseData = {
      student_uid: updatedStudent.uid,
      score_index: index,
      deleted_score_detail: deletedDetail,
      score_details: nextDetails,
      student: presentStudent(updatedStudent),
      ...stats,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: '成绩删除成功',
    };

    logger.info(
      `删除成绩成功，学员UID: ${updatedStudent.uid}, 索引: ${index}, 删除成绩: ${deletedDetail.score}`,
    );
    res.json(response);
  });

  public batchAddScores = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { score_details } = req.body;

    if (!Array.isArray(score_details) || score_details.length === 0) {
      throw AppError.invalidInput('成绩明细数组不能为空');
    }

    const student = await StudentRepository.findByUid(Number(id));
    if (!student) throw AppError.notFound('学员不存在');

    const incoming = normalizeScoreDetails(score_details, {
      fallbackSubject: (student.subject ?? SubjectType.SHOOTING) as SubjectType,
      fallbackRecordedAt: new Date().toISOString(),
    });

    if (incoming.length === 0) {
      throw AppError.invalidInput('成绩明细数组不能为空');
    }

    const current = getStudentScoreDetails(student);
    const nextDetails = [...current, ...incoming];

    const updatedStudent = await StudentRepository.updateByUid(Number(id), {
      scoreDetails: nextDetails,
      rings: scoreDetailsToRings(nextDetails),
    });
    if (!updatedStudent) throw AppError.notFound('学员不存在');

    const stats = calculateScoreStats(nextDetails);
    const responseData = {
      student_uid: updatedStudent.uid,
      added_score_details: incoming,
      total_added: incoming.length,
      original_total: current.length,
      new_total: nextDetails.length,
      score_details: nextDetails,
      student: presentStudent(updatedStudent),
      ...stats,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: `成功添加 ${incoming.length} 个成绩`,
    };

    logger.info(
      `批量添加成绩成功，学员UID: ${updatedStudent.uid}, 添加数量: ${incoming.length}`,
    );
    res.status(201).json(response);
  });

  public clearAllScores = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const student = await StudentRepository.findByUid(Number(id));
    if (!student) throw AppError.notFound('学员不存在');

    const current = getStudentScoreDetails(student);
    const updatedStudent = await StudentRepository.updateByUid(Number(id), {
      scoreDetails: [],
      rings: [],
    });
    if (!updatedStudent) throw AppError.notFound('学员不存在');

    const responseData = {
      student_uid: updatedStudent.uid,
      cleared_count: current.length,
      score_details: [],
      student: presentStudent(updatedStudent),
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: '成功清空所有成绩',
    };

    logger.info(`清空成绩成功，学员UID: ${updatedStudent.uid}, 清空数量: ${current.length}`);
    res.json(response);
  });
}

export default new ScoreController();
