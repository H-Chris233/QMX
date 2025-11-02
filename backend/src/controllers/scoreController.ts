import { Request, Response } from 'express';
import { Student } from '@/models';
import { catchAsync } from '@/middleware/errorHandler';
import { validate, validateParams, commonValidations } from '@/middleware/validation';
import { IApiResponse } from '@/types';
import logger from '@/utils/logger';
import Joi from 'joi';

// 成绩控制器
export class ScoreController {
  // 为学员添加成绩
  public addScore = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { score } = req.body;

    const student = await Student.findByPk(Number(id));

    if (!student) {
      res.status(404).json({
        success: false,
        error: '学员不存在',
      });
      return;
    }

    // 验证成绩范围
    if (typeof score !== 'number' || score < 0 || score > 10) {
      res.status(400).json({
        success: false,
        error: '成绩必须在0-10之间',
      });
      return;
    }

    // 添加成绩
    student.addScore(Number(score));
    await student.save();

    const responseData = {
      student_uid: student.uid,
      rings: student.rings,
      message: `成功为学员 ${student.name} 添加成绩 ${score}`,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: '成绩添加成功',
    };

    logger.info(`添加成绩成功，学员UID: ${student.uid}, 成绩: ${score}`);
    res.status(201).json(response);
  });

  // 获取学员成绩列表
  public getStudentScores = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const student = await Student.findByPk(Number(id));

    if (!student) {
      res.status(404).json({
        success: false,
        error: '学员不存在',
      });
      return;
    }

    const responseData = {
      student_uid: student.uid,
      student_name: student.name,
      rings: student.rings,
      total_scores: student.rings.length,
      average_score: student.getAverageScore(),
      max_score: student.getMaxScore(),
      min_score: student.getMinScore(),
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
    };

    logger.info(`获取学员成绩成功，学员UID: ${student.uid}, 成绩数量: ${student.rings.length}`);
    res.json(response);
  });

  // 更新学员成绩
  public updateStudentScore = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id, scoreIndex } = req.params;
    const { newScore } = req.body;

    const student = await Student.findByPk(Number(id));

    if (!student) {
      res.status(404).json({
        success: false,
        error: '学员不存在',
      });
      return;
    }

    const index = Number(scoreIndex);

    // 检查成绩索引是否有效
    if (index < 0 || index >= student.rings.length) {
      res.status(400).json({
        success: false,
        error: '成绩索引无效',
      });
      return;
    }

    // 验证新成绩范围
    if (typeof newScore !== 'number' || newScore < 0 || newScore > 10) {
      res.status(400).json({
        success: false,
        error: '成绩必须在0-10之间',
      });
      return;
    }

    const oldScore = student.rings[index];
    student.updateScore(index, Number(newScore));
    await student.save();

    const responseData = {
      student_uid: student.uid,
      score_index: index,
      old_score: oldScore,
      new_score: Number(newScore),
      updated_rings: student.rings,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: '成绩更新成功',
    };

    logger.info(`更新成绩成功，学员UID: ${student.uid}, 索引: ${index}, 旧成绩: ${oldScore}, 新成绩: ${newScore}`);
    res.json(response);
  });

  // 删除学员成绩
  public deleteStudentScore = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id, scoreIndex } = req.params;

    const student = await Student.findByPk(Number(id));

    if (!student) {
      res.status(404).json({
        success: false,
        error: '学员不存在',
      });
      return;
    }

    const index = Number(scoreIndex);

    // 检查成绩索引是否有效
    if (index < 0 || index >= student.rings.length) {
      res.status(400).json({
        success: false,
        error: '成绩索引无效',
      });
      return;
    }

    const deletedScore = student.rings[index];
    student.removeScore(index);
    await student.save();

    const responseData = {
      student_uid: student.uid,
      score_index: index,
      deleted_score: deletedScore,
      remaining_rings: student.rings,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: '成绩删除成功',
    };

    logger.info(`删除成绩成功，学员UID: ${student.uid}, 索引: ${index}, 删除成绩: ${deletedScore}`);
    res.json(response);
  });

  // 批量添加成绩
  public batchAddScores = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { scores } = req.body;

    const student = await Student.findByPk(Number(id));

    if (!student) {
      res.status(404).json({
        success: false,
        error: '学员不存在',
      });
      return;
    }

    // 验证成绩数组
    if (!Array.isArray(scores) || scores.length === 0) {
      res.status(400).json({
        success: false,
        error: '成绩数组不能为空',
      });
      return;
    }

    // 验证每个成绩
    for (const score of scores) {
      if (typeof score !== 'number' || score < 0 || score > 10) {
        res.status(400).json({
          success: false,
          error: '所有成绩都必须在0-10之间',
        });
        return;
      }
    }

    // 批量添加成绩
    const originalRings = [...student.rings];
    scores.forEach(score => student.addScore(Number(score)));
    await student.save();

    const responseData = {
      student_uid: student.uid,
      added_scores: scores,
      total_added: scores.length,
      original_total: originalRings.length,
      new_total: student.rings.length,
      all_rings: student.rings,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: `成功添加 ${scores.length} 个成绩`,
    };

    logger.info(`批量添加成绩成功，学员UID: ${student.uid}, 添加数量: ${scores.length}`);
    res.status(201).json(response);
  });

  // 清空学员所有成绩
  public clearAllScores = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const student = await Student.findByPk(Number(id));

    if (!student) {
      res.status(404).json({
        success: false,
        error: '学员不存在',
      });
      return;
    }

    const clearedCount = student.rings.length;
    student.rings = [];
    student.changed('rings', true);
    await student.save();

    const responseData = {
      student_uid: student.uid,
      cleared_count: clearedCount,
      current_rings: student.rings,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: `成功清空 ${clearedCount} 个成绩`,
    };

    logger.info(`清空成绩成功，学员UID: ${student.uid}, 清空数量: ${clearedCount}`);
    res.json(response);
  });
}

export default new ScoreController();