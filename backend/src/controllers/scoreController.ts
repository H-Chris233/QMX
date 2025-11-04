import { Request, Response } from 'express';
import { Student } from '@/models/mongo';
import { catchAsync } from '@/middleware/errorHandler';
import { IApiResponse } from '@/types';
import logger from '@/utils/logger';
import { StudentUpdater } from '@/services/studentUpdater';
import { presentStudent } from '@/services/studentPresenter';
import { AppError } from '@/utils/errors';

export class ScoreController {
  public addScore = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { score } = req.body;

    const student = await Student.findByUid(Number(id));

    if (!student) {
      throw AppError.notFound('学员不存在');
    }

    const updater = StudentUpdater.fromDocument(student);
    const updatedStudent = await updater.addRing(Number(score)).commit();
    const studentData = presentStudent(updatedStudent);

    const responseData = {
      student_uid: updatedStudent.uid,
      scores: updatedStudent.rings,
      student: studentData,
      total_scores: updatedStudent.rings.length,
      average_score: updatedStudent.getAverageScore(),
      message: `成功为学员 ${updatedStudent.name} 添加成绩 ${Number(score)}`,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: '成绩添加成功',
    };

    logger.info(`添加成绩成功，学员UID: ${updatedStudent.uid}, 成绩: ${Number(score)}`);
    res.status(201).json(response);
  });

  public getStudentScores = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const student = await Student.findByUid(Number(id));

    if (!student) {
      throw AppError.notFound('学员不存在');
    }

    const studentData = presentStudent(student);

    const responseData = {
      student_uid: student.uid,
      student_name: student.name,
      scores: student.rings,
      total_scores: student.rings.length,
      average_score: student.getAverageScore(),
      max_score: student.getMaxScore(),
      min_score: student.getMinScore(),
      student: studentData,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
    };

    logger.info(`获取学员成绩成功，学员UID: ${student.uid}, 成绩数量: ${student.rings.length}`);
    res.json(response);
  });

  public updateStudentScore = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id, scoreIndex } = req.params;
    const { newScore } = req.body;

    const student = await Student.findByUid(Number(id));

    if (!student) {
      throw AppError.notFound('学员不存在');
    }

    const updater = StudentUpdater.fromDocument(student);
    const index = Number(scoreIndex);
    const previousScore = student.rings[index];
    const updatedStudent = await updater.updateRingAt(index, Number(newScore)).commit();
    const studentData = presentStudent(updatedStudent);

    const responseData = {
      student_uid: updatedStudent.uid,
      score_index: index,
      old_score: previousScore,
      new_score: Number(newScore),
      updated_scores: updatedStudent.rings,
      average_score: updatedStudent.getAverageScore(),
      student: studentData,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: '成绩更新成功',
    };

    logger.info(`更新成绩成功，学员UID: ${updatedStudent.uid}, 索引: ${index}, 旧成绩: ${previousScore}, 新成绩: ${Number(newScore)}`);
    res.json(response);
  });

  public deleteStudentScore = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id, scoreIndex } = req.params;

    const student = await Student.findByUid(Number(id));

    if (!student) {
      throw AppError.notFound('学员不存在');
    }

    const updater = StudentUpdater.fromDocument(student);
    const index = Number(scoreIndex);
    const deletedScore = student.rings[index];
    updater.removeRingAt(index);
    const updatedStudent = await updater.commit();
    const studentData = presentStudent(updatedStudent);

    const responseData = {
      student_uid: updatedStudent.uid,
      score_index: index,
      deleted_score: deletedScore,
      remaining_scores: updatedStudent.rings,
      total_scores: updatedStudent.rings.length,
      student: studentData,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: '成绩删除成功',
    };

    logger.info(`删除成绩成功，学员UID: ${updatedStudent.uid}, 索引: ${index}, 删除成绩: ${deletedScore}`);
    res.json(response);
  });

  public batchAddScores = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { scores } = req.body;

    if (!Array.isArray(scores) || scores.length === 0) {
      throw AppError.invalidInput('成绩数组不能为空');
    }

    const student = await Student.findByUid(Number(id));

    if (!student) {
      throw AppError.notFound('学员不存在');
    }

    const updater = StudentUpdater.fromDocument(student);
    const originalTotal = student.rings.length;
    scores.forEach((score: number) => updater.addRing(Number(score)));
    const updatedStudent = await updater.commit();
    const studentData = presentStudent(updatedStudent);

    const responseData = {
      student_uid: updatedStudent.uid,
      added_scores: scores.map((score: number) => Number(score)),
      total_added: scores.length,
      original_total: originalTotal,
      new_total: updatedStudent.rings.length,
      all_scores: updatedStudent.rings,
      student: studentData,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: `成功添加 ${scores.length} 个成绩`,
    };

    logger.info(`批量添加成绩成功，学员UID: ${updatedStudent.uid}, 添加数量: ${scores.length}`);
    res.status(201).json(response);
  });

  public clearAllScores = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const student = await Student.findByUid(Number(id));

    if (!student) {
      throw AppError.notFound('学员不存在');
    }

    const updater = StudentUpdater.fromDocument(student);
    const clearedCount = student.rings.length;
    updater.setRings([]);
    const updatedStudent = await updater.commit();
    const studentData = presentStudent(updatedStudent);

    const responseData = {
      student_uid: updatedStudent.uid,
      cleared_count: clearedCount,
      current_scores: updatedStudent.rings,
      student: studentData,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: '成功清空所有成绩',
    };

    logger.info(`清空成绩成功，学员UID: ${updatedStudent.uid}, 清空数量: ${clearedCount}`);
    res.json(response);
  });
}

export default new ScoreController();
