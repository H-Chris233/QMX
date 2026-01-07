import { Request, Response } from 'express';
import { catchAsync } from '@/middleware/errorHandler';
import { IApiResponse } from '@/types';
import logger from '@/utils/logger';
import { StudentRepository } from '../db/repositories/studentRepository';
import { presentStudent } from '../services/studentPresenter';
import type { Student } from '../db/schema/students';
import { AppError } from '@/utils/errors';

export class ScoreController {
  public addScore = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { score } = req.body;

    const student = await StudentRepository.findByUid(Number(id));

    if (!student) {
      throw AppError.notFound('学员不存在');
    }

    const newRings = [...(student.rings || []), Number(score)];
    const updatedStudent = await StudentRepository.updateByUid(Number(id), { rings: newRings });

    if (!updatedStudent) {
      throw AppError.notFound('学员不存在');
    }

    const studentData = presentStudent(updatedStudent);

    const averageScore = newRings.length > 0
      ? Number((newRings.reduce((sum, s) => sum + s, 0) / newRings.length).toFixed(1))
      : 0;
    const maxScore = newRings.length > 0 ? Math.max(...newRings) : 0;
    const minScore = newRings.length > 0 ? Math.min(...newRings) : 0;

    const responseData = {
      student_uid: updatedStudent.uid,
      scores: updatedStudent.rings,
      student: studentData,
      total_scores: updatedStudent.rings.length,
      average_score: averageScore,
      max_score: maxScore,
      min_score: minScore,
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

    const student = await StudentRepository.findByUid(Number(id));

    if (!student) {
      throw AppError.notFound('学员不存在');
    }

    const studentData = presentStudent(student);
    const rings = student.rings || [];

    const averageScore = rings.length > 0
      ? Number((rings.reduce((sum, s) => sum + s, 0) / rings.length).toFixed(1))
      : 0;
    const maxScore = rings.length > 0 ? Math.max(...rings) : 0;
    const minScore = rings.length > 0 ? Math.min(...rings) : 0;

    const responseData = {
      student_uid: student.uid,
      student_name: student.name,
      scores: rings,
      total_scores: rings.length,
      average_score: averageScore,
      max_score: maxScore,
      min_score: minScore,
      student: studentData,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
    };

    logger.info(`获取学员成绩成功，学员UID: ${student.uid}, 成绩数量: ${rings.length}`);
    res.json(response);
  });

  public updateStudentScore = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id, scoreIndex } = req.params;
    const { newScore } = req.body;

    const student = await StudentRepository.findByUid(Number(id));

    if (!student) {
      throw AppError.notFound('学员不存在');
    }

    const index = Number(scoreIndex);
    const rings = student.rings || [];

    if (index < 0 || index >= rings.length) {
      throw AppError.invalidInput('成绩索引超出范围');
    }

    const newRings = [...rings];
    const previousScore = newRings[index];
    newRings[index] = Number(newScore);

    const updatedStudent = await StudentRepository.updateByUid(Number(id), { rings: newRings });

    if (!updatedStudent) {
      throw AppError.notFound('学员不存在');
    }

    const studentData = presentStudent(updatedStudent);

    const averageScore = newRings.length > 0
      ? Number((newRings.reduce((sum, s) => sum + s, 0) / newRings.length).toFixed(1))
      : 0;
    const maxScore = newRings.length > 0 ? Math.max(...newRings) : 0;
    const minScore = newRings.length > 0 ? Math.min(...newRings) : 0;

    const responseData = {
      student_uid: updatedStudent.uid,
      score_index: index,
      old_score: previousScore,
      new_score: Number(newScore),
      updated_scores: updatedStudent.rings,
      average_score: averageScore,
      max_score: maxScore,
      min_score: minScore,
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

    const student = await StudentRepository.findByUid(Number(id));

    if (!student) {
      throw AppError.notFound('学员不存在');
    }

    const index = Number(scoreIndex);
    const rings = student.rings || [];

    if (index < 0 || index >= rings.length) {
      throw AppError.invalidInput('成绩索引超出范围');
    }

    const deletedScore = rings[index];
    const newRings = rings.filter((_, i) => i !== index);

    const updatedStudent = await StudentRepository.updateByUid(Number(id), { rings: newRings });

    if (!updatedStudent) {
      throw AppError.notFound('学员不存在');
    }

    const studentData = presentStudent(updatedStudent);

    const averageScore = newRings.length > 0
      ? Number((newRings.reduce((sum, s) => sum + s, 0) / newRings.length).toFixed(1))
      : 0;
    const maxScore = newRings.length > 0 ? Math.max(...newRings) : 0;
    const minScore = newRings.length > 0 ? Math.min(...newRings) : 0;

    const responseData = {
      student_uid: updatedStudent.uid,
      score_index: index,
      deleted_score: deletedScore,
      remaining_scores: updatedStudent.rings,
      total_scores: updatedStudent.rings.length,
      average_score: averageScore,
      max_score: maxScore,
      min_score: minScore,
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

    const student = await StudentRepository.findByUid(Number(id));

    if (!student) {
      throw AppError.notFound('学员不存在');
    }

    const originalTotal = (student.rings || []).length;
    const filteredScores = scores.map((s: number) => Number(s));
    const newRings = [...(student.rings || []), ...filteredScores];

    const updatedStudent = await StudentRepository.updateByUid(Number(id), { rings: newRings });

    if (!updatedStudent) {
      throw AppError.notFound('学员不存在');
    }

    const studentData = presentStudent(updatedStudent);

    const averageScore = newRings.length > 0
      ? Number((newRings.reduce((sum, s) => sum + s, 0) / newRings.length).toFixed(1))
      : 0;
    const maxScore = newRings.length > 0 ? Math.max(...newRings) : 0;
    const minScore = newRings.length > 0 ? Math.min(...newRings) : 0;

    const responseData = {
      student_uid: updatedStudent.uid,
      added_scores: filteredScores,
      total_added: filteredScores.length,
      original_total: originalTotal,
      new_total: updatedStudent.rings.length,
      all_scores: updatedStudent.rings,
      average_score: averageScore,
      max_score: maxScore,
      min_score: minScore,
      student: studentData,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: `成功添加 ${filteredScores.length} 个成绩`,
    };

    logger.info(`批量添加成绩成功，学员UID: ${updatedStudent.uid}, 添加数量: ${filteredScores.length}`);
    res.status(201).json(response);
  });

  public clearAllScores = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const student = await StudentRepository.findByUid(Number(id));

    if (!student) {
      throw AppError.notFound('学员不存在');
    }

    const clearedCount = (student.rings || []).length;
    const updatedStudent = await StudentRepository.updateByUid(Number(id), { rings: [] });

    if (!updatedStudent) {
      throw AppError.notFound('学员不存在');
    }

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
