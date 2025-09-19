// API服务 - 封装所有后端调用
import { invoke } from '@tauri-apps/api/core';
import type { 
  Student, 
  StudentUpdateData, 
  TauriCommand, 
  StudentScoresResponse,
  Transaction,
  DashboardStats,
  InstallmentStatus,
  StudentStats,
  FinancialStats,
  StudentSearchOptions,
  CashSearchOptions
} from '../types/api';
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
import {
  handleApiOperation
} from '../utils/errorHandler';

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
    // 只做最基本的非空检查，让后端处理详细验证
    if (!name || typeof name !== 'string') throw new Error('学员姓名无效');
    
    return handleApiOperation(async () => {
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
    }, '添加学员', {
      context: { name, age, classType, phone, subject }
    });
  }

  static async getAllStudents(): Promise<Student[]> {
    return handleApiOperation(async () => {
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
    }, '获取学员列表');
  }

  static async addScore(studentUid: number, score: number): Promise<void> {
    // 只做最基本的类型检查，让后端处理详细验证
    if (typeof studentUid !== 'number' || !Number.isInteger(studentUid) || studentUid <= 0) throw new Error('学员ID无效');
    if (typeof score !== 'number' || !isFinite(score)) throw new Error('成绩必须是有效数字');
    
    return handleApiOperation(async () => {
      await invokeWithEnhancements<null>('add_score' as TauriCommand, {
        studentUid,
        score,
      });
      
      console.log(`✅ 成功为学员 ${studentUid} 添加成绩 ${score}`);
    }, '添加成绩', {
      context: { studentUid, score }
    });
  }

  static async getStudentScores(studentUid: number): Promise<number[]> {
    // 只做最基本的类型检查，让后端处理详细验证
    if (typeof studentUid !== 'number' || !Number.isInteger(studentUid) || studentUid <= 0) throw new Error('学员ID无效');
    
    return handleApiOperation(async () => {
      const response = await invokeWithEnhancements<StudentScoresResponse>('get_student_scores' as TauriCommand, {
        studentUid,
      });
      
      console.log('🔍 [getStudentScores] 原始返回数据:', response, '类型:', typeof response);
      
      // 检查响应格式
      if (!response || typeof response !== 'object') {
        throw new Error('返回的成绩数据格式不正确');
      }
      
      // 提取 rings 数组
      const scores = response.rings;
      if (!Array.isArray(scores)) {
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
    }, '获取学员成绩', {
      context: { studentUid }
    });
  }

  static async deleteStudentScore(studentUid: number, scoreIndex: number): Promise<void> {
    // 只做最基本的类型检查，让后端处理详细验证
    if (typeof studentUid !== 'number' || !Number.isInteger(studentUid) || studentUid <= 0) throw new Error('学员ID无效');
    if (typeof scoreIndex !== 'number' || !Number.isInteger(scoreIndex) || scoreIndex < 0) throw new Error('成绩索引无效');
    
    return handleApiOperation(async () => {
      await invokeWithEnhancements<null>('delete_student_score' as TauriCommand, {
        studentUid,
        scoreIndex,
      });
      
      console.log(`✅ 成功删除学员 ${studentUid} 的第 ${scoreIndex} 个成绩`);
    }, '删除学员成绩', {
      context: { studentUid, scoreIndex },
      retryable: false // 删除操作不重试
    });
  }

  static async updateStudentScore(studentUid: number, scoreIndex: number, newScore: number): Promise<void> {
    // 只做最基本的类型检查，让后端处理详细验证
    if (typeof studentUid !== 'number' || !Number.isInteger(studentUid) || studentUid <= 0) throw new Error('学员ID无效');
    if (typeof scoreIndex !== 'number' || !Number.isInteger(scoreIndex) || scoreIndex < 0) throw new Error('成绩索引无效');
    if (typeof newScore !== 'number' || !isFinite(newScore)) throw new Error('成绩必须是有效数字');
    
    return handleApiOperation(async () => {
      await invokeWithEnhancements<null>('update_student_score' as TauriCommand, {
        studentUid,
        scoreIndex,
        newScore,
      });
      
      console.log(`✅ 成功更新学员 ${studentUid} 的第 ${scoreIndex} 个成绩为 ${newScore}`);
    }, '更新学员成绩', {
      context: { studentUid, scoreIndex, newScore }
    });
  }

  static async updateStudentInfo(
    studentUid: number,
    updates: StudentUpdateData,
  ): Promise<void> {
    // 只做最基本的类型检查，让后端处理详细验证
    if (typeof studentUid !== 'number' || !Number.isInteger(studentUid) || studentUid <= 0) throw new Error('学员ID无效');
    if (!updates || typeof updates !== 'object') throw new Error('更新数据无效');
    
    return handleApiOperation(async () => {
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
    }, '更新学员信息', {
      context: { studentUid, updates }
    });
  }

  static async deleteStudent(studentUid: number): Promise<void> {
    // 只做最基本的类型检查，让后端处理详细验证
    if (typeof studentUid !== 'number' || !Number.isInteger(studentUid) || studentUid <= 0) throw new Error('学员ID无效');
    
    return handleApiOperation(async () => {
      await invokeWithEnhancements<null>('delete_student' as TauriCommand, {
        studentUid,
      }, {
        retries: false // 删除操作不重试，避免重复删除
      });
      
      console.log(`✅ 成功删除学员 ${studentUid}`);
    }, '删除学员', {
      context: { studentUid },
      retryable: false // 删除操作不可重试
    });
  }

  // 财务管理 - 普通交易
  static async addCashTransaction(
    studentUid: number | null,
    amount: number,
    note: string = '',
  ): Promise<Transaction> {
    // 只做最基本的类型检查，让后端处理详细验证
    if (typeof amount !== 'number' || !isFinite(amount) || amount <= 0) {
      throw new Error('金额必须是大于0的有效数字');
    }
    if (studentUid !== null && (typeof studentUid !== 'number' || !Number.isInteger(studentUid) || studentUid <= 0)) {
      throw new Error('学员ID无效');
    }
    if (note && note.length > 1000) {
      throw new Error('备注长度不能超过1000字符');
    }

    return handleApiOperation(async () => {
      const rawData = await invokeWithEnhancements<any>('add_cash_transaction' as TauriCommand, {
        studentUid: studentUid === null ? null : Number(studentUid),
        amount,
        note: note || '',
        isInstallment: false,
      });

      const transaction = transformTransactionData(rawData);

      // 验证转换后的数据
      if (!validateTransactionData(transaction)) {
        throw new Error('交易数据验证失败');
      }

      return transaction;
    }, '添加财务记录', {
      context: { studentUid, amount, note }
    });
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
  ): Promise<Transaction> {
    // 只做最基本的类型检查，让后端处理详细验证
    if (typeof totalAmount !== 'number' || !isFinite(totalAmount) || totalAmount <= 0) {
      throw new Error('总金额必须是大于0的有效数字');
    }
    if (typeof totalInstallments !== 'number' || !Number.isInteger(totalInstallments) || totalInstallments <= 0) {
      throw new Error('分期总数必须是大于0的整数');
    }
    if (!frequency || typeof frequency !== 'string') {
      throw new Error('频率参数无效');
    }
    if (!dueDate || typeof dueDate !== 'string') {
      throw new Error('到期日期无效');
    }
    if (studentUid !== null && (typeof studentUid !== 'number' || !Number.isInteger(studentUid) || studentUid <= 0)) {
      throw new Error('学员ID无效');
    }
    if (note && note.length > 1000) {
      throw new Error('备注长度不能超过1000字符');
    }

    return handleApiOperation(async () => {
      const rawData = await invokeWithEnhancements<any>('add_cash_transaction' as TauriCommand, {
        studentUid: studentUid === null ? null : Number(studentUid),
        amount: totalAmount,
        note: note || '',
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
    }, '添加分期付款', {
      context: { studentUid, totalAmount, totalInstallments, frequency, dueDate, planId }
    });
  }

  static async getAllTransactions(): Promise<Transaction[]> {
    return handleApiOperation(async () => {
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
    }, '获取财务记录');
  }

  static async deleteCashTransaction(transactionUid: number): Promise<void> {
    // 只做最基本的类型检查，让后端处理详细验证
    if (!transactionUid || transactionUid <= 0) {
      throw new Error('交易ID无效');
    }

    return handleApiOperation(async () => {
      await invoke<void>('delete_cash_transaction', {
        transactionUid,
      });
    }, '删除财务记录', {
      context: { transactionUid },
      retryable: false // 删除操作不可重试
    });
  }

  // 分期付款管理
  static async updateInstallmentStatus(transactionUid: number, status: InstallmentStatus): Promise<void> {
    // 只做最基本的类型检查，让后端处理详细验证
    if (!transactionUid || transactionUid <= 0) {
      throw new Error('交易ID无效');
    }
    if (!status || typeof status !== 'string') {
      throw new Error('状态参数无效');
    }
    
    return handleApiOperation(async () => {
      await invoke<void>('update_installment_status', {
        transactionUid,
        status,
      });
    }, '更新分期付款状态', {
      context: { transactionUid, status }
    });
  }

  static async generateNextInstallment(planId: number, dueDate: string): Promise<number> {
    // 只做最基本的类型检查，让后端处理详细验证
    if (!planId || planId <= 0) {
      throw new Error('计划ID无效');
    }
    if (!dueDate || typeof dueDate !== 'string') {
      throw new Error('到期日期无效');
    }
    
    return handleApiOperation(async () => {
      return await invoke<number>('generate_next_installment', {
        planId,
        dueDate,
      });
    }, '生成下一期分期', {
      context: { planId, dueDate }
    });
  }

  static async cancelInstallmentPlan(planId: number): Promise<number> {
    // 只做最基本的类型检查，让后端处理详细验证
    if (!planId || planId <= 0) {
      throw new Error('计划ID无效');
    }
    
    return handleApiOperation(async () => {
      return await invoke<number>('cancel_installment_plan', {
        planId,
      });
    }, '取消分期计划', {
      context: { planId },
      retryable: false // 取消操作不可重试
    });
  }

  static async getInstallmentsByPlan(planId: number): Promise<Transaction[]> {
    // 只做最基本的类型检查，让后端处理详细验证
    if (!planId || planId <= 0) {
      throw new Error('计划ID无效');
    }
    
    return handleApiOperation(async () => {
      const rawDataArray = await invoke<any[]>('get_installments_by_plan', {
        planId,
      });
      return transformTransactionDataArray(rawDataArray);
    }, '获取分期计划详情', {
      context: { planId }
    });
  }

  // 统计数据
  static async getDashboardStats(): Promise<DashboardStats> {
    return handleApiOperation(async () => {
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
    }, '获取统计数据');
  }

  // 会员管理
  static async setStudentMembership(
    studentUid: number,
    startDate?: string,
    endDate?: string
  ): Promise<void> {
    // 只做最基本的类型检查，让后端处理详细验证
    if (typeof studentUid !== 'number' || !Number.isInteger(studentUid) || studentUid <= 0) throw new Error('学员ID无效');
    
    return handleApiOperation(async () => {
      await invokeWithEnhancements<null>('set_student_membership' as TauriCommand, {
        studentUid,
        startDate: startDate || null,
        endDate: endDate || null,
      });
      
      console.log(`✅ 成功设置学员 ${studentUid} 的会员信息`);
    }, '设置会员信息', {
      context: { studentUid, startDate, endDate }
    });
  }

  static async clearStudentMembership(studentUid: number): Promise<void> {
    // 只做最基本的类型检查，让后端处理详细验证
    if (typeof studentUid !== 'number' || !Number.isInteger(studentUid) || studentUid <= 0) throw new Error('学员ID无效');
    
    return handleApiOperation(async () => {
      await invokeWithEnhancements<null>('clear_student_membership' as TauriCommand, {
        studentUid,
      });
      
      console.log(`✅ 成功清除学员 ${studentUid} 的会员信息`);
    }, '清除会员信息', {
      context: { studentUid },
      retryable: false
    });
  }

  static async setMembershipByType(
    studentUid: number,
    membershipType: 'month' | 'year',
    startFromToday: boolean = true
  ): Promise<void> {
    // 只做最基本的类型检查，让后端处理详细验证
    if (typeof studentUid !== 'number' || !Number.isInteger(studentUid) || studentUid <= 0) throw new Error('学员ID无效');
    if (!['month', 'year'].includes(membershipType)) {
      throw new Error('会员类型无效，只支持 month 或 year');
    }
    
    return handleApiOperation(async () => {
      await invokeWithEnhancements<null>('set_membership_by_type' as TauriCommand, {
        studentUid,
        membershipType,
        startFromToday,
      });
      
      const typeText = membershipType === 'month' ? '月卡' : '年卡';
      console.log(`✅ 成功为学员 ${studentUid} 设置${typeText}会员`);
    }, '设置会员类型', {
      context: { studentUid, membershipType, startFromToday }
    });
  }

  // 窗口管理
  static async openMainWindow(): Promise<void> {
    return handleApiOperation(async () => {
      await invoke<void>('open_main_window');
    }, '打开主窗口');
  }

  // v2 API - 高级功能
  // 获取特定学员的统计信息
  static async getStudentStats(studentUid: number): Promise<StudentStats> {
    // 只做最基本的类型检查，让后端处理详细验证
    if (typeof studentUid !== 'number' || !Number.isInteger(studentUid) || studentUid <= 0) throw new Error('学员ID无效');
    
    return handleApiOperation(async () => {
      const rawData = await invokeWithEnhancements<unknown>('get_student_stats' as TauriCommand, {
        studentUid,
      });
      
      // 这里需要添加数据转换和验证逻辑
      if (!rawData || typeof rawData !== 'object') {
        throw new Error('返回的学员统计数据格式不正确');
      }
      
      // 简单类型断言，实际应该添加更严格的验证
      return rawData as StudentStats;
    }, '获取学员统计', {
      context: { studentUid }
    });
  }

  // 获取全局学员统计信息（用于仪表板）
  static async getGlobalStudentStats(): Promise<{
    total_students: number;
    average_score: number;
    max_score: number;
    active_courses: number;
  }> {
    return handleApiOperation(async () => {
      const dashboardStats = await this.getDashboardStats();
      
      return {
        total_students: dashboardStats.total_students || 0,
        average_score: dashboardStats.average_score || 0,
        max_score: dashboardStats.max_score || 0,
        active_courses: dashboardStats.active_courses || 0,
      };
    }, '获取全局学员统计');
  }

  // 获取特定周期的财务统计
  static async getFinancialStats(period: 'Today' | 'ThisWeek' | 'ThisMonth' | 'ThisYear' | { start: string; end: string } = 'ThisMonth') {
    return handleApiOperation(async () => {
      return await invokeWithEnhancements<any>('get_financial_stats' as TauriCommand, {
        period,
      });
    }, '获取财务统计', {
      context: { period }
    });
  }

  // 获取全局财务统计信息（用于仪表板）
  static async getGlobalFinancialStats(): Promise<FinancialStats> {
    return handleApiOperation(async () => {
      const dashboardStats = await this.getDashboardStats();
      
      const revenue = dashboardStats.total_revenue || 0;
      const expense = dashboardStats.total_expense || 0;
      
      return {
        total_income: revenue,
        total_expense: expense,
        net_income: revenue - expense,
        net_profit: revenue - expense,
        is_profitable: revenue > expense,
        installment_total: 0,
        installment_paid: 0,
        installment_pending: 0,
      };
    }, '获取全局财务统计');
  }

  static async searchStudents(options: StudentSearchOptions): Promise<Student[]> {
    // 只做最基本的类型检查，让后端处理详细验证
    if (options.min_age !== null && options.min_age !== undefined && (typeof options.min_age !== 'number' || options.min_age < 0)) {
      throw new Error('最小年龄必须是非负数');
    }
    
    if (options.max_age !== null && options.max_age !== undefined && (typeof options.max_age !== 'number' || options.max_age < 0)) {
      throw new Error('最大年龄必须是非负数');
    }
    
    if (options.min_age !== null && options.min_age !== undefined && 
        options.max_age !== null && options.max_age !== undefined && 
        options.min_age > options.max_age) {
      throw new Error('最小年龄不能大于最大年龄');
    }
    
    return handleApiOperation(async () => {
      const rawDataArray = await invokeWithEnhancements<unknown[]>('search_students' as TauriCommand, {
        nameContains: options.name_contains,
        minAge: options.min_age,
        maxAge: options.max_age,
        minScore: options.min_score,
        maxScore: options.max_score,
        classType: options.class_type,
        subject: options.subject,
        hasMembership: options.has_membership,
      });
      
      if (!Array.isArray(rawDataArray)) {
        throw new Error('服务器返回的搜索数据格式不正确');
      }
      
      return transformStudentDataArray(rawDataArray);
    }, '搜索学员', {
      context: { options }
    });
  }

  static async searchCash(options: CashSearchOptions): Promise<Transaction[]> {
    // 只做最基本的类型检查，让后端处理详细验证
    // 验证日期格式
    if (options.date_from && !options.date_to) {
      throw new Error('如果指定开始日期，必须同时指定结束日期');
    }
    if (options.date_to && !options.date_from) {
      throw new Error('如果指定结束日期，必须同时指定开始日期');
    }
    
    // 验证金额范围
    if (options.min_amount !== null && options.min_amount !== undefined && (typeof options.min_amount !== 'number' || options.min_amount < 0)) {
      throw new Error('最小金额必须是非负数');
    }
    
    if (options.max_amount !== null && options.max_amount !== undefined && (typeof options.max_amount !== 'number' || options.max_amount < 0)) {
      throw new Error('最大金额必须是非负数');
    }
    
    if (options.min_amount !== null && options.min_amount !== undefined && 
        options.max_amount !== null && options.max_amount !== undefined && 
        options.min_amount > options.max_amount) {
      throw new Error('最小金额不能大于最大金额');
    }
    
    // 验证学员ID
    if (options.student_id !== null && options.student_id !== undefined && 
        (typeof options.student_id !== 'number' || !Number.isInteger(options.student_id) || options.student_id <= 0)) {
      throw new Error('学员ID必须是正整数');
    }
    
    return handleApiOperation(async () => {
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
    }, '搜索现金记录', {
      context: { options }
    });
  }

  static async getMembershipExpiringSoon(days: number) {
    // 只做最基本的类型检查，让后端处理详细验证
    if (days <= 0) throw new Error('天数必须大于0');
    
    return handleApiOperation(async () => {
      const rawDataArray = await invokeWithEnhancements<unknown[]>('get_membership_expiring_soon' as TauriCommand, {
        days,
      });
      
      if (!Array.isArray(rawDataArray)) {
        throw new Error('服务器返回的到期会员数据格式不正确');
      }
      
      return transformStudentDataArray(rawDataArray);
    }, '获取即将到期会员', {
      context: { days }
    });
  }
}

// 导出类型以保持向后兼容
export type { Student, Transaction, DashboardStats, StudentUpdateData } from '../types/api';
