// API服务 - 使用RESTful API与后端通信
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type { 
  Student, 
  StudentUpdateData, 
  Transaction,
  DashboardStats,
  InstallmentStatus,
  StudentStats,
  FinancialStats,
  StudentSearchOptions,
  CashSearchOptions,
  ApiResponse,
  PaginatedResponse
} from '../types/api';
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
  BASE_URL: '/api/v1',
  DEFAULT_TIMEOUT: 30000, // 30秒默认超时
  RETRY_ATTEMPTS: 3, // 最大重试次数
  RETRY_DELAY: 1000, // 重试延迟(毫秒)
  LONG_OPERATION_TIMEOUT: 60000, // 长操作超时(如文件导出)
} as const;

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🔍 API请求: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { data } = response;
    console.log(`✅ API响应: ${response.config.method?.toUpperCase()} ${response.config.url}`, data.success ? '成功' : '失败');
    
    if (!data.success) {
      throw new Error(data.error || '请求失败');
    }
    
    return response;
  },
  (error) => {
    console.error('❌ API响应错误:', error.response?.data || error.message);
    
    // 处理网络错误
    if (error.code === 'NETWORK_ERROR') {
      throw new Error('网络连接失败，请检查网络连接');
    }
    
    // 处理超时错误
    if (error.code === 'ECONNABORTED') {
      throw new Error('请求超时，请稍后重试');
    }
    
    // 处理服务器错误
    if (error.response?.status >= 500) {
      throw new Error('服务器内部错误，请稍后重试');
    }
    
    // 处理客户端错误
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    
    throw new Error(error.message || '未知错误');
  }
);

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
          lastError.message.includes('参数无效') ||
          lastError.message.includes('不存在') ||
          lastError.message.includes('已存在')) {
        throw lastError;
      }
      
      if (attempt === maxAttempts) {
        throw new Error(`操作失败，已重试 ${maxAttempts} 次: ${lastError.message}`);
      }
      
      console.warn(`⚠️ API调用失败，第 ${attempt} 次重试中...`, lastError.message);
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError!;
}

// 增强的API调用包装器
async function apiCall<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: any,
  options: { timeout?: number; retries?: boolean } = {}
): Promise<T> {
  const { timeout = API_CONFIG.DEFAULT_TIMEOUT, retries = true } = options;
  
  const operation = () => {
    const config = data ? { timeout, data } : { timeout };
    
    switch (method) {
      case 'GET':
        return apiClient.get(url, config);
      case 'POST':
        return apiClient.post(url, data, config);
      case 'PUT':
        return apiClient.put(url, data, config);
      case 'DELETE':
        return apiClient.delete(url, config);
      default:
        throw new Error(`不支持的HTTP方法: ${method}`);
    }
  };
  
  const response = retries ? await withRetry(operation) : await operation();
  return response.data.data as T;
}

export class ApiService {
  // 学员管理
  static async addStudent(
    name: string,
    age: number | undefined,
    classType: string,
    phone: string,
    note: string,
    subject: string,
  ): Promise<Student> {
    return handleApiOperation(async () => {
      const requestData = {
        name: name.trim(),
        age,
        class: classType,
        phone: phone.trim(),
        note: note?.trim() || '',
        subject,
      };

      const responseData = await apiCall<Student>('POST', '/students', requestData);
      const student = transformStudentData(responseData);

      console.log(`✅ 成功创建学员: ${student.name} (UID: ${student.uid})`);
      return student;
    }, '添加学员', {
      context: { name, age, classType, phone, subject }
    });
  }

  static async getAllStudents(
    options?: {
      page?: number;
      limit?: number;
      sort_by?: string;
      sort_order?: 'ASC' | 'DESC';
      name_contains?: string;
      min_age?: number | null;
      max_age?: number | null;
      class_type?: string;
      subject?: string;
      has_membership?: boolean | null;
    }
  ): Promise<{ students: Student[]; pagination: any }> {
    return handleApiOperation(async () => {
      const params = new URLSearchParams();
      
      if (options) {
        Object.entries(options).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
      }

      const url = `/students${params.toString() ? `?${params.toString()}` : ''}`;
      const responseData = await apiCall<PaginatedResponse<any>>('GET', url);
      
      const students = transformStudentDataArray(responseData.data);

      // 验证转换后的数据
      students.forEach(student => {
        if (!student.uid || !student.name) {
          throw new Error('学员数据格式不正确');
        }
      });

      console.log(`✅ 成功获取 ${students.length} 个学员记录`);
      return {
        students,
        pagination: responseData.pagination
      };
    }, '获取学员列表');
  }

  static async getStudentById(studentUid: number): Promise<Student> {
    return handleApiOperation(async () => {
      const responseData = await apiCall<Student>('GET', `/students/${studentUid}`);
      const student = transformStudentData(responseData);

      console.log(`✅ 成功获取学员详情: ${student.name} (UID: ${student.uid})`);
      return student;
    }, '获取学员详情', {
      context: { studentUid }
    });
  }

  static async updateStudentInfo(
    studentUid: number,
    updates: StudentUpdateData,
  ): Promise<void> {
    return handleApiOperation(async () => {
      const requestData: any = {};
      
      if (updates.name !== undefined) requestData.name = updates.name?.trim();
      if (updates.age !== undefined) requestData.age = updates.age;
      if (updates.classType !== undefined) requestData.class = updates.classType;
      if (updates.phone !== undefined) requestData.phone = updates.phone?.trim();
      if (updates.note !== undefined) requestData.note = updates.note?.trim();
      if (updates.subject !== undefined) requestData.subject = updates.subject;
      if (updates.lessonLeft !== undefined) requestData.lesson_left = updates.lessonLeft;
      if (updates.membershipStartDate !== undefined) requestData.membership_start_date = updates.membershipStartDate;
      if (updates.membershipEndDate !== undefined) requestData.membership_end_date = updates.membershipEndDate;

      await apiCall('PUT', `/students/${studentUid}`, requestData);
      
      console.log(`✅ 成功更新学员 ${studentUid} 的信息`);
    }, '更新学员信息', {
      context: { studentUid, updates }
    });
  }

  static async deleteStudent(studentUid: number): Promise<void> {
    return handleApiOperation(async () => {
      await apiCall('DELETE', `/students/${studentUid}`, undefined, { retries: false });
      
      console.log(`✅ 成功删除学员 ${studentUid}`);
    }, '删除学员', {
      context: { studentUid },
      retryable: false
    });
  }

  static async searchStudents(options: StudentSearchOptions): Promise<Student[]> {
    return handleApiOperation(async () => {
      const params = new URLSearchParams();
      
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const responseData = await apiCall<Student[]>('GET', `/students/search?${params.toString()}`);
      return transformStudentDataArray(responseData);
    }, '搜索学员', {
      context: { options }
    });
  }

  // 成绩管理
  static async addScore(studentUid: number, score: number): Promise<void> {
    return handleApiOperation(async () => {
      const requestData = { score };
      await apiCall('POST', `/students/${studentUid}/scores`, requestData);
      
      console.log(`✅ 成功为学员 ${studentUid} 添加成绩 ${score}`);
    }, '添加成绩', {
      context: { studentUid, score }
    });
  }

  static async getStudentScores(studentUid: number): Promise<number[]> {
    return handleApiOperation(async () => {
      const responseData = await apiCall<{ scores: number[] }>('GET', `/students/${studentUid}/scores`);
      
      console.log(`✅ 获取学员 ${studentUid} 的 ${responseData.scores.length} 条成绩记录`);
      return responseData.scores;
    }, '获取学员成绩', {
      context: { studentUid }
    });
  }

  static async deleteStudentScore(studentUid: number, scoreIndex: number): Promise<void> {
    return handleApiOperation(async () => {
      await apiCall('DELETE', `/students/${studentUid}/scores/${scoreIndex}`, undefined, { retries: false });
      
      console.log(`✅ 成功删除学员 ${studentUid} 的第 ${scoreIndex} 个成绩`);
    }, '删除学员成绩', {
      context: { studentUid, scoreIndex },
      retryable: false
    });
  }

  static async updateStudentScore(studentUid: number, scoreIndex: number, newScore: number): Promise<void> {
    return handleApiOperation(async () => {
      const requestData = { newScore };
      await apiCall('PUT', `/students/${studentUid}/scores/${scoreIndex}`, requestData);
      
      console.log(`✅ 成功更新学员 ${studentUid} 的第 ${scoreIndex} 个成绩为 ${newScore}`);
    }, '更新学员成绩', {
      context: { studentUid, scoreIndex, newScore }
    });
  }

  // 财务管理
  static async addCashTransaction(
    studentUid: number | null,
    amount: number,
    note: string = '',
  ): Promise<Transaction> {
    return handleApiOperation(async () => {
      const requestData = {
        student_id: studentUid,
        amount,
        note: note || '',
        is_installment: false,
      };

      const responseData = await apiCall<Transaction>('POST', '/transactions', requestData);
      const transaction = transformTransactionData(responseData);

      if (!validateTransactionData(transaction)) {
        throw new Error('交易数据验证失败');
      }

      console.log(`✅ 成功添加交易记录，金额: ¥${amount}`);
      return transaction;
    }, '添加财务记录', {
      context: { studentUid, amount, note }
    });
  }

  static async addInstallmentTransaction(
    studentUid: number | null,
    totalAmount: number,
    note: string = '',
    totalInstallments: number,
    frequency: string,
    dueDate: string,
    planId?: number,
  ): Promise<Transaction> {
    return handleApiOperation(async () => {
      const requestData = {
        student_id: studentUid,
        total_amount: totalAmount,
        note: note || '',
        total_installments: totalInstallments,
        frequency,
        due_date: dueDate,
        current_installment: 1,
        plan_id: planId || null,
      };

      const responseData = await apiCall<Transaction>('POST', '/transactions/installment', requestData);
      const transaction = transformTransactionData(responseData);

      if (!validateTransactionData(transaction)) {
        throw new Error('分期付款数据验证失败');
      }

      console.log(`✅ 成功创建分期付款，总金额: ¥${totalAmount}`);
      return transaction;
    }, '添加分期付款', {
      context: { studentUid, totalAmount, totalInstallments, frequency, dueDate, planId }
    });
  }

  static async getAllTransactions(): Promise<Transaction[]> {
    return handleApiOperation(async () => {
      const responseData = await apiCall<PaginatedResponse<any>>('GET', '/transactions');
      const transactions = transformTransactionDataArray(responseData.data);

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
    return handleApiOperation(async () => {
      await apiCall('DELETE', `/transactions/${transactionUid}`, undefined, { retries: false });
    }, '删除财务记录', {
      context: { transactionUid },
      retryable: false
    });
  }

  static async searchCash(options: CashSearchOptions): Promise<Transaction[]> {
    return handleApiOperation(async () => {
      const params = new URLSearchParams();
      
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const responseData = await apiCall<PaginatedResponse<any>>('GET', `/transactions/search?${params.toString()}`);
      return transformTransactionDataArray(responseData.data);
    }, '搜索现金记录', {
      context: { options }
    });
  }

  // 统计数据
  static async getDashboardStats(): Promise<DashboardStats> {
    return handleApiOperation(async () => {
      const responseData = await apiCall<DashboardStats>('GET', '/dashboard/stats');
      const stats = transformDashboardStatsData(responseData);

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
    return handleApiOperation(async () => {
      const requestData = {
        startDate: startDate || null,
        endDate: endDate || null,
      };

      await apiCall('POST', `/membership/students/${studentUid}/membership`, requestData);
      
      console.log(`✅ 成功设置学员 ${studentUid} 的会员信息`);
    }, '设置会员信息', {
      context: { studentUid, startDate, endDate }
    });
  }

  static async clearStudentMembership(studentUid: number): Promise<void> {
    return handleApiOperation(async () => {
      await apiCall('DELETE', `/membership/students/${studentUid}/membership`, undefined, { retries: false });
      
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
    return handleApiOperation(async () => {
      const requestData = {
        membershipType,
        startFromToday,
      };

      await apiCall('POST', `/membership/students/${studentUid}/membership/type`, requestData);
      
      const typeText = membershipType === 'month' ? '月卡' : '年卡';
      console.log(`✅ 成功为学员 ${studentUid} 设置${typeText}会员`);
    }, '设置会员类型', {
      context: { studentUid, membershipType, startFromToday }
    });
  }

  // v2 API - 高级功能
  static async getStudentStats(studentUid: number): Promise<StudentStats> {
    return handleApiOperation(async () => {
      const responseData = await apiCall<StudentStats>('GET', `/dashboard/students/${studentUid}/stats`);
      return responseData;
    }, '获取学员统计', {
      context: { studentUid }
    });
  }

  static async getGlobalStudentStats(): Promise<{
    total_students: number;
    average_score: number;
    max_score: number;
    active_courses: number;
  }> {
    return handleApiOperation(async () => {
      const responseData = await apiCall<any>('GET', '/dashboard/global-student-stats');
      return responseData;
    }, '获取全局学员统计');
  }

  static async getFinancialStats(period: 'Today' | 'ThisWeek' | 'ThisMonth' | 'ThisYear' = 'ThisMonth'): Promise<FinancialStats> {
    return handleApiOperation(async () => {
      const params = new URLSearchParams();
      params.append('period', period);
      
      const responseData = await apiCall<FinancialStats>('GET', `/dashboard/financial-stats?${params.toString()}`);
      return responseData;
    }, '获取财务统计', {
      context: { period }
    });
  }

  static async getGlobalFinancialStats(): Promise<FinancialStats> {
    return handleApiOperation(async () => {
      const responseData = await apiCall<FinancialStats>('GET', '/dashboard/global-financial-stats');
      return responseData;
    }, '获取全局财务统计');
  }

  static async getMembershipExpiringSoon(days: number): Promise<Student[]> {
    return handleApiOperation(async () => {
      const params = new URLSearchParams();
      params.append('days', String(days));
      
      const responseData = await apiCall<Student[]>('GET', `/dashboard/membership-expiring?${params.toString()}`);
      return transformStudentDataArray(responseData);
    }, '获取即将到期会员', {
      context: { days }
    });
  }
}

// 导出类型以保持向后兼容
export type { Student, Transaction, DashboardStats, StudentUpdateData } from '../types/api';