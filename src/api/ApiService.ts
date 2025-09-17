// API服务 - 封装所有后端调用
import { invoke } from '@tauri-apps/api/core';
import type { Student, StudentUpdateData, TauriCommand, StudentScoresResponse } from '../types/api';
import { assertIsStudent } from '../utils/typeGuards';
import {
  transformStudentData,
  transformStudentDataArray,
  transformTransactionData,
  transformTransactionDataArray,
  transformDashboardStatsData,
  validateTransactionData,
  validateDashboardStatsData,
} from './dataTransformers';

// API 配置常量
const API_CONFIG = {
  DEFAULT_TIMEOUT: 30000, // 30秒默认超时
  RETRY_ATTEMPTS: 3, // 最大重试次数
  RETRY_DELAY: 1000, // 重试延迟(毫秒)
  LONG_OPERATION_TIMEOUT: 60000, // 长操作超时(如文件导出)
} as const;

// 超时处理工具函数
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`操作超时 (${timeoutMs}ms)`));
      }, timeoutMs);
    })
  ]);
}

// 重试机制工具函数
async function withRetry<T>(
  operation: () => Promise<T>, 
  maxAttempts: number = API_CONFIG.RETRY_ATTEMPTS,
  delay: number = API_CONFIG.RETRY_DELAY
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 不重试的错误类型
      if (lastError.message.includes('权限') || 
          lastError.message.includes('认证') ||
          lastError.message.includes('参数无效')) {
        throw lastError;
      }
      
      if (attempt === maxAttempts) {
        throw new Error(`操作失败，已重试 ${maxAttempts} 次: ${lastError.message}`);
      }
      
      console.warn(`API调用失败，第 ${attempt} 次重试中...`, lastError.message);
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError!;
}

// 增强的 invoke 包装器
async function invokeWithEnhancements<T>(
  command: TauriCommand, 
  args?: Record<string, any>,
  options: { timeout?: number; retries?: boolean } = {}
): Promise<T> {
  const { timeout = API_CONFIG.DEFAULT_TIMEOUT, retries = true } = options;
  
  const operation = () => withTimeout(invoke<T>(command, args), timeout);
  
  if (retries) {
    return withRetry(operation);
  } else {
    return operation();
  }
}

export class ApiService {
  // 学员管理
  static async addStudent(
    name: string,
    age: number,
    classType: string,
    phone: string,
    note: string,
    subject: string,
  ): Promise<Student> {
    try {
      // 输入验证增强
      if (!name?.trim()) throw new Error('学员姓名不能为空');
      if (!age || age < 1 || age > 120) throw new Error('年龄必须在1-120之间');
      if (!phone?.trim()) throw new Error('电话号码不能为空');
      if (note && note.length > 500) throw new Error('备注长度不能超过500字符');
      
      const rawData = await invokeWithEnhancements<unknown>('add_student' as TauriCommand, {
        name: name.trim(),
        age,
        classType,
        phone: phone.trim(),
        note: note?.trim() || '',
        subject,
      });

      const student = transformStudentData(rawData);
      assertIsStudent(student);

      return student;
    } catch (error) {
      console.error('❌ [ApiService.addStudent] 调用失败:', error);
      throw new Error(`添加学员失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async getAllStudents(): Promise<Student[]> {
    try {
      const rawDataArray = await invokeWithEnhancements<unknown[]>('get_all_students' as TauriCommand, {}, {
        timeout: API_CONFIG.LONG_OPERATION_TIMEOUT // 获取所有学员可能需要更长时间
      });
      
      if (!Array.isArray(rawDataArray)) {
        throw new Error('服务器返回的数据格式不正确');
      }
      
      const students = transformStudentDataArray(rawDataArray);

      // 验证转换后的数据
      students.forEach(student => assertIsStudent(student));

      console.log(`✅ 成功获取 ${students.length} 个学员记录`);
      return students;
    } catch (error) {
      console.error('❌ [ApiService.getAllStudents] 调用失败:', error);
      throw new Error(`获取学员列表失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async addScore(studentUid: number, score: number): Promise<void> {
    try {
      // 输入验证增强
      if (!studentUid || studentUid <= 0) throw new Error('学员ID无效');
      if (typeof score !== 'number' || !isFinite(score)) throw new Error('成绩必须是有效数字');
      if (score < 0 || score > 1000) throw new Error('成绩范围无效');
      
      await invokeWithEnhancements<null>('add_score' as TauriCommand, {
        studentUid,
        score,
      });
      
      console.log(`✅ 成功为学员 ${studentUid} 添加成绩 ${score}`);
    } catch (error) {
      console.error('❌ [ApiService.addScore] 调用失败:', error);
      throw new Error(`添加成绩失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async getStudentScores(studentUid: number): Promise<number[]> {
    try {
      // 输入验证
      if (!studentUid || studentUid <= 0) throw new Error('学员ID无效');
      
      const response = await invokeWithEnhancements<StudentScoresResponse>('get_student_scores' as TauriCommand, {
        studentUid,
      });
      
      console.log('🔍 [getStudentScores] 原始返回数据:', response, '类型:', typeof response);
      
      // 检查响应格式
      if (!response || typeof response !== 'object') {
        console.error('❌ [getStudentScores] 响应不是对象格式:', response);
        throw new Error('返回的成绩数据格式不正确');
      }
      
      // 提取 rings 数组
      const scores = response.rings;
      if (!Array.isArray(scores)) {
        console.error('❌ [getStudentScores] rings 不是数组格式:', scores);
        throw new Error('返回的成绩数据格式不正确');
      }
      
      // 数据清理和验证
      const validScores = scores.filter(score => 
        typeof score === 'number' && isFinite(score) && score >= 0
      );
      
      if (validScores.length !== scores.length) {
        console.warn(`⚠️ 过滤了 ${scores.length - validScores.length} 个无效成绩`);
      }
      
      console.log(`✅ 获取学员 ${studentUid} 的 ${validScores.length} 条成绩记录`);
      return validScores;
    } catch (error) {
      console.error('❌ [ApiService.getStudentScores] 调用失败:', error);
      throw new Error(`获取学员成绩失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async deleteStudentScore(studentUid: number, scoreIndex: number): Promise<void> {
    try {
      // 输入验证
      if (!studentUid || studentUid <= 0) throw new Error('学员ID无效');
      if (scoreIndex < 0) throw new Error('成绩索引无效');
      
      await invokeWithEnhancements<null>('delete_student_score' as TauriCommand, {
        studentUid,
        scoreIndex,
      });
      
      console.log(`✅ 成功删除学员 ${studentUid} 的第 ${scoreIndex} 个成绩`);
    } catch (error) {
      console.error('❌ [ApiService.deleteStudentScore] 调用失败:', error);
      throw new Error(`删除学员成绩失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async updateStudentScore(studentUid: number, scoreIndex: number, newScore: number): Promise<void> {
    try {
      // 输入验证
      if (!studentUid || studentUid <= 0) throw new Error('学员ID无效');
      if (scoreIndex < 0) throw new Error('成绩索引无效');
      if (typeof newScore !== 'number' || !isFinite(newScore)) throw new Error('成绩必须是有效数字');
      if (newScore < 0 || newScore > 1000) throw new Error('成绩范围无效');
      
      await invokeWithEnhancements<null>('update_student_score' as TauriCommand, {
        studentUid,
        scoreIndex,
        newScore,
      });
      
      console.log(`✅ 成功更新学员 ${studentUid} 的第 ${scoreIndex} 个成绩为 ${newScore}`);
    } catch (error) {
      console.error('❌ [ApiService.updateStudentScore] 调用失败:', error);
      throw new Error(`更新学员成绩失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async updateStudentInfo(
    studentUid: number,
    updates: StudentUpdateData,
  ): Promise<void> {
    try {
      // 输入验证增强
      if (!studentUid || studentUid <= 0) throw new Error('学员ID无效');
      if (!updates || typeof updates !== 'object') throw new Error('更新数据无效');
      
      // 验证更新字段
      if (updates.name !== undefined && (!updates.name?.trim())) {
        throw new Error('学员姓名不能为空');
      }
      if (updates.age !== undefined && (updates.age < 1 || updates.age > 120)) {
        throw new Error('年龄必须在1-120之间');
      }
      if (updates.phone !== undefined && (!updates.phone?.trim())) {
        throw new Error('电话号码不能为空');
      }
      if (updates.note !== undefined && updates.note.length > 500) {
        throw new Error('备注长度不能超过500字符');
      }
      
      await invokeWithEnhancements<null>('update_student_info' as TauriCommand, {
        studentUid,
        name: updates.name?.trim(),
        age: updates.age,
        classType: updates.classType,
        phone: updates.phone?.trim(),
        note: updates.note?.trim(),
        subject: updates.subject,
        lessonLeft: updates.lessonLeft,
        membershipStartDate: updates.membershipStartDate,
        membershipEndDate: updates.membershipEndDate,
      });
      
      console.log(`✅ 成功更新学员 ${studentUid} 的信息`);
    } catch (error) {
      console.error('❌ [ApiService.updateStudentInfo] 调用失败:', error);
      throw new Error(`更新学员信息失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async deleteStudent(studentUid: number): Promise<void> {
    try {
      // 输入验证
      if (!studentUid || studentUid <= 0) throw new Error('学员ID无效');
      
      await invokeWithEnhancements<null>('delete_student' as TauriCommand, {
        studentUid,
      }, {
        retries: false // 删除操作不重试，避免重复删除
      });
      
      console.log(`✅ 成功删除学员 ${studentUid}`);
    } catch (error) {
      console.error('❌ [ApiService.deleteStudent] 调用失败:', error);
      throw new Error(`删除学员失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 财务管理 - 普通交易
  static async addCashTransaction(
    studentUid: number | null,
    amount: number,
    note: string = '',
  ) {
    try {
      // 输入验证增强
      if (typeof amount !== 'number' || !isFinite(amount) || amount <= 0) {
        throw new Error('金额必须是大于0的有效数字');
      }
      if (studentUid !== null && (!studentUid || studentUid <= 0)) {
        throw new Error('学员ID无效');
      }
      if (note && note.length > 500) {
        throw new Error('备注长度不能超过500字符');
      }

      const rawData = await invoke<any>('add_cash_transaction', {
        studentUid: studentUid || null,
        amount,
        note: note || null,
        isInstallment: false,
      });

      const transaction = transformTransactionData(rawData);

      // 验证转换后的数据
      if (!validateTransactionData(transaction)) {
        throw new Error('交易数据验证失败');
      }

      return transaction;
    } catch (error) {
      console.error('❌ [ApiService.addCashTransaction] 调用失败:', error);
      throw new Error(`添加财务记录失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 财务管理 - 分期付款
  static async addInstallmentTransaction(
    studentUid: number | null,
    totalAmount: number,
    note: string = '',
    totalInstallments: number,
    frequency: string,
    dueDate: string,
    planId?: number,
  ) {
    try {
      const rawData = await invoke<any>('add_cash_transaction', {
        studentUid: studentUid || null,
        amount: totalAmount,
        note: note || null,
        isInstallment: true,
        totalAmount,
        totalInstallments,
        frequency,
        dueDate,
        currentInstallment: 1,
        planId: planId || null,
      });

      const transaction = transformTransactionData(rawData);

      // 验证转换后的数据
      if (!validateTransactionData(transaction)) {
        throw new Error('分期付款数据验证失败');
      }

      return transaction;
    } catch (error) {
      console.error(
        '❌ [ApiService.addInstallmentTransaction] 调用失败:',
        error,
      );
      throw new Error(`添加分期付款失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async getAllTransactions() {
    try {
      const rawDataArray = await invokeWithEnhancements<any[]>('get_all_transactions', {}, {
        timeout: API_CONFIG.LONG_OPERATION_TIMEOUT // 获取所有交易可能需要更长时间
      });
      
      if (!Array.isArray(rawDataArray)) {
        throw new Error('服务器返回的交易数据格式不正确');
      }
      
      const transactions = transformTransactionDataArray(rawDataArray);

      // 验证转换后的数据
      const validTransactions = transactions.filter(validateTransactionData);
      const invalidCount = transactions.length - validTransactions.length;
      
      if (invalidCount > 0) {
        console.warn(`⚠️ 过滤了 ${invalidCount} 个无效交易记录`);
      }

      console.log(`✅ 成功获取 ${validTransactions.length} 条交易记录`);
      return validTransactions;
    } catch (error) {
      console.error('❌ [ApiService.getAllTransactions] 调用失败:', error);
      throw new Error(`获取财务记录失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async deleteCashTransaction(transactionUid: number) {
    try {
      // 输入验证
      if (!transactionUid || transactionUid <= 0) {
        throw new Error('交易ID无效');
      }

      return await invoke<null>('delete_cash_transaction', {
        transactionUid,
      });
    } catch (error) {
      console.error('❌ [ApiService.deleteCashTransaction] 调用失败:', error);
      throw new Error(`删除财务记录失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 分期付款管理
  static async updateInstallmentStatus(transactionUid: number, status: string) {
    try {
      return await invoke<null>('update_installment_status', {
        transactionUid,
        status,
      });
    } catch (error) {
      console.error('❌ [ApiService.updateInstallmentStatus] 调用失败:', error);
      throw new Error(`更新分期付款状态失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async generateNextInstallment(planId: number, dueDate: string) {
    try {
      return await invoke<number>('generate_next_installment', {
        planId,
        dueDate,
      });
    } catch (error) {
      console.error('❌ [ApiService.generateNextInstallment] 调用失败:', error);
      throw new Error(`生成下一期分期失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async cancelInstallmentPlan(planId: number) {
    try {
      return await invoke<number>('cancel_installment_plan', {
        planId,
      });
    } catch (error) {
      console.error('❌ [ApiService.cancelInstallmentPlan] 调用失败:', error);
      throw new Error(`取消分期计划失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async getInstallmentsByPlan(planId: number) {
    try {
      const rawDataArray = await invoke<any[]>('get_installments_by_plan', {
        planId,
      });
      return transformTransactionDataArray(rawDataArray);
    } catch (error) {
      console.error('❌ [ApiService.getInstallmentsByPlan] 调用失败:', error);
      throw new Error(`获取分期计划详情失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 统计数据
  static async getDashboardStats() {
    try {
      const rawData = await invokeWithEnhancements<any>('get_dashboard_stats', {}, {
        timeout: API_CONFIG.LONG_OPERATION_TIMEOUT // 统计计算可能需要更长时间
      });
      
      if (!rawData || typeof rawData !== 'object') {
        throw new Error('服务器返回的统计数据格式不正确');
      }
      
      const stats = transformDashboardStatsData(rawData);

      // 验证转换后的数据
      if (!validateDashboardStatsData(stats)) {
        throw new Error('统计数据验证失败');
      }

      console.log('✅ 成功获取仪表板统计数据');
      return stats;
    } catch (error) {
      console.error('❌ [ApiService.getDashboardStats] 调用失败:', error);
      throw new Error(`获取统计数据失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 会员管理
  static async setStudentMembership(
    studentUid: number,
    startDate?: string,
    endDate?: string
  ): Promise<void> {
    try {
      if (!studentUid || studentUid <= 0) throw new Error('学员ID无效');
      
      await invokeWithEnhancements<null>('set_student_membership' as TauriCommand, {
        studentUid,
        startDate: startDate || null,
        endDate: endDate || null,
      });
      
      console.log(`✅ 成功设置学员 ${studentUid} 的会员信息`);
    } catch (error) {
      console.error('❌ [ApiService.setStudentMembership] 调用失败:', error);
      throw new Error(`设置会员信息失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async clearStudentMembership(studentUid: number): Promise<void> {
    try {
      if (!studentUid || studentUid <= 0) throw new Error('学员ID无效');
      
      await invokeWithEnhancements<null>('clear_student_membership' as TauriCommand, {
        studentUid,
      });
      
      console.log(`✅ 成功清除学员 ${studentUid} 的会员信息`);
    } catch (error) {
      console.error('❌ [ApiService.clearStudentMembership] 调用失败:', error);
      throw new Error(`清除会员信息失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async setMembershipByType(
    studentUid: number,
    membershipType: 'month' | 'year',
    startFromToday: boolean = true
  ): Promise<void> {
    try {
      if (!studentUid || studentUid <= 0) throw new Error('学员ID无效');
      if (!['month', 'year'].includes(membershipType)) {
        throw new Error('会员类型无效，只支持 month 或 year');
      }
      
      await invokeWithEnhancements<null>('set_membership_by_type' as TauriCommand, {
        studentUid,
        membershipType,
        startFromToday,
      });
      
      const typeText = membershipType === 'month' ? '月卡' : '年卡';
      console.log(`✅ 成功为学员 ${studentUid} 设置${typeText}会员`);
    } catch (error) {
      console.error('❌ [ApiService.setMembershipByType] 调用失败:', error);
      throw new Error(`设置会员类型失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 窗口管理
  static async openMainWindow() {
    try {
      return await invoke<null>('open_main_window');
    } catch (error) {
      console.error('❌ [ApiService.openMainWindow] 调用失败:', error);
      throw new Error(`打开主窗口失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // v2 API - 高级功能
  // 获取特定学员的统计信息
  static async getStudentStats(studentUid: number) {
    try {
      if (!studentUid || studentUid <= 0) throw new Error('学员ID无效');
      
      return await invokeWithEnhancements<any>('get_student_stats' as TauriCommand, {
        studentUid,
      });
    } catch (error) {
      console.error('❌ [ApiService.getStudentStats] 调用失败:', error);
      throw new Error(`获取学员统计失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 获取全局学员统计信息（用于仪表板）
  static async getGlobalStudentStats() {
    try {
      const dashboardStats = await this.getDashboardStats();
      
      return {
        total_students: dashboardStats.total_students || 0,
        average_score: dashboardStats.average_score || 0,
        max_score: dashboardStats.max_score || 0,
        active_courses: dashboardStats.active_courses || 0,
      };
    } catch (error) {
      console.error('❌ [ApiService.getGlobalStudentStats] 调用失败:', error);
      throw new Error(`获取全局学员统计失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 获取特定周期的财务统计
  static async getFinancialStats(period: 'Today' | 'ThisWeek' | 'ThisMonth' | 'ThisYear' | { start: string; end: string } = 'ThisMonth') {
    try {
      return await invokeWithEnhancements<any>('get_financial_stats' as TauriCommand, {
        period,
      });
    } catch (error) {
      console.error('❌ [ApiService.getFinancialStats] 调用失败:', error);
      throw new Error(`获取财务统计失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 获取全局财务统计信息（用于仪表板）
  static async getGlobalFinancialStats() {
    try {
      const dashboardStats = await this.getDashboardStats();
      
      return {
        total_income: dashboardStats.total_revenue || 0,
        total_expense: dashboardStats.total_expense || 0,
        net_profit: (dashboardStats.total_revenue || 0) - (dashboardStats.total_expense || 0),
      };
    } catch (error) {
      console.error('❌ [ApiService.getGlobalFinancialStats] 调用失败:', error);
      throw new Error(`获取全局财务统计失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async searchStudents(options: any) {
    try {
      const rawDataArray = await invokeWithEnhancements<unknown[]>('search_students' as TauriCommand, {
        nameContains: options.name_contains,
        minAge: options.min_age,
        maxAge: options.max_age,
        classType: options.class_type,
        subject: options.subject,
        hasMembership: options.has_membership,
      });
      
      if (!Array.isArray(rawDataArray)) {
        throw new Error('服务器返回的搜索数据格式不正确');
      }
      
      return transformStudentDataArray(rawDataArray);
    } catch (error) {
      console.error('❌ [ApiService.searchStudents] 调用失败:', error);
      throw new Error(`搜索学员失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async searchCash(options: any) {
    try {
      // 验证日期格式
      if (options.date_from && !options.date_to) {
        throw new Error('如果指定开始日期，必须同时指定结束日期');
      }
      if (options.date_to && !options.date_from) {
        throw new Error('如果指定结束日期，必须同时指定开始日期');
      }
      
      const rawDataArray = await invokeWithEnhancements<unknown[]>('search_cash' as TauriCommand, {
        studentId: options.student_id,
        minAmount: options.min_amount,
        maxAmount: options.max_amount,
        hasInstallment: options.has_installment,
        dateFrom: options.date_from,
        dateTo: options.date_to,
      });
      
      if (!Array.isArray(rawDataArray)) {
        throw new Error('服务器返回的现金搜索数据格式不正确');
      }
      
      return transformTransactionDataArray(rawDataArray);
    } catch (error) {
      console.error('❌ [ApiService.searchCash] 调用失败:', error);
      throw new Error(`搜索现金记录失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async getMembershipExpiringSoon(days: number) {
    try {
      if (days <= 0) throw new Error('天数必须大于0');
      
      const rawDataArray = await invokeWithEnhancements<unknown[]>('get_membership_expiring_soon' as TauriCommand, {
        days,
      });
      
      if (!Array.isArray(rawDataArray)) {
        throw new Error('服务器返回的到期会员数据格式不正确');
      }
      
      return transformStudentDataArray(rawDataArray);
    } catch (error) {
      console.error('❌ [ApiService.getMembershipExpiringSoon] 调用失败:', error);
      throw new Error(`获取即将到期会员失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// 导出类型以保持向后兼容
export type { Student, Transaction, DashboardStats, StudentUpdateData } from '../types/api';
