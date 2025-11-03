// API服务 - 模块化的API调用入口
import { StudentApiService } from './studentApi';
import { TransactionApiService } from './transactionApi';
import { StatsApiService } from './statsApi';
import { MembershipApiService } from './membershipApi';

// 成绩管理相关的API调用
import { apiCall } from './baseClient';
import type { ApiResponse, InstallmentStatus } from '../types/api';
import { handleApiOperation } from '../utils/errorHandler';

// 将所有API服务合并到一个API服务类中
export class ApiService {
  // 学员管理 - 使用模块化服务
  static addStudent = StudentApiService.addStudent.bind(StudentApiService);
  static getAllStudents = StudentApiService.getAllStudents.bind(StudentApiService);
  static getStudentById = StudentApiService.getStudentById.bind(StudentApiService);
  static updateStudentInfo = StudentApiService.updateStudentInfo.bind(StudentApiService);
  static deleteStudent = StudentApiService.deleteStudent.bind(StudentApiService);
  static searchStudents = StudentApiService.searchStudents.bind(StudentApiService);

  // 成绩管理 - 单独实现
  static async addScore(studentUid: number, score: number): Promise<void> {
    return handleApiOperation(async () => {
      const requestData = { score };
      await apiCall('POST', '/students/' + studentUid + '/scores', requestData);
      
      console.log('✅ 成功为学员 ' + studentUid + ' 添加成绩 ' + score);
    }, '添加成绩', {
      context: { studentUid, score }
    });
  }

  static async getStudentScores(studentUid: number): Promise<number[]> {
    return handleApiOperation(async () => {
      const responseData = await apiCall<{ scores: number[] }>('GET', '/students/' + studentUid + '/scores');
      
      console.log('✅ 获取学员 ' + studentUid + ' 的 ' + responseData.scores.length + ' 条成绩记录');
      return responseData.scores;
    }, '获取学员成绩', {
      context: { studentUid }
    });
  }

  static async deleteStudentScore(studentUid: number, scoreIndex: number): Promise<void> {
    return handleApiOperation(async () => {
      await apiCall('DELETE', '/students/' + studentUid + '/scores/' + scoreIndex, undefined, { retries: false });
      
      console.log('✅ 成功删除学员 ' + studentUid + ' 的第 ' + scoreIndex + ' 个成绩');
    }, '删除学员成绩', {
      context: { studentUid, scoreIndex },
      retryable: false
    });
  }

  static async updateStudentScore(studentUid: number, scoreIndex: number, newScore: number): Promise<void> {
    return handleApiOperation(async () => {
      const requestData = { newScore };
      await apiCall('PUT', '/students/' + studentUid + '/scores/' + scoreIndex, requestData);
      
      console.log('✅ 成功更新学员 ' + studentUid + ' 的第 ' + scoreIndex + ' 个成绩为 ' + newScore);
    }, '更新学员成绩', {
      context: { studentUid, scoreIndex, newScore }
    });
  }

  // 财务管理 - 使用模块化服务
  static addCashTransaction = TransactionApiService.addCashTransaction.bind(TransactionApiService);
  static addInstallmentTransaction = TransactionApiService.addInstallmentTransaction.bind(TransactionApiService);
  static getAllTransactions = TransactionApiService.getAllTransactions.bind(TransactionApiService);
  static deleteCashTransaction = TransactionApiService.deleteCashTransaction.bind(TransactionApiService);
  static searchCash = TransactionApiService.searchCash.bind(TransactionApiService);

  // 统计数据 - 使用模块化服务
  static getDashboardStats = StatsApiService.getDashboardStats.bind(StatsApiService);
  static getStudentStats = StatsApiService.getStudentStats.bind(StatsApiService);
  static getGlobalStudentStats = StatsApiService.getGlobalStudentStats.bind(StatsApiService);
  static getFinancialStats = StatsApiService.getFinancialStats.bind(StatsApiService);
  static getGlobalFinancialStats = StatsApiService.getGlobalFinancialStats.bind(StatsApiService);
  static getMembershipExpiringSoon = StatsApiService.getMembershipExpiringSoon.bind(StatsApiService);

  // 会员管理 - 使用模块化服务
  static setStudentMembership = MembershipApiService.setStudentMembership.bind(MembershipApiService);
  static clearStudentMembership = MembershipApiService.clearStudentMembership.bind(MembershipApiService);
  static setMembershipByType = MembershipApiService.setMembershipByType.bind(MembershipApiService);
}

// 导出类型以保持向后兼容
export type { Student, Transaction, DashboardStats, StudentUpdateData } from '../types/api';