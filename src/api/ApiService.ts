// API服务 - 封装所有后端调用
import { invoke } from "@tauri-apps/api/core";
import {
  transformStudentData,
  transformStudentDataArray,
  transformTransactionData,
  transformTransactionDataArray,
  transformDashboardStatsData,
  validateStudentData,
  validateTransactionData,
  validateDashboardStatsData
} from './dataTransformers';

export class ApiService {
  // 学员管理
  static async addStudent(name: string, age: number, classType: string, phone: string) {
    try {
      const rawData = await invoke<any>('add_student', {
        name,
        age,
        classType,
        phone
      });
      
      const student = transformStudentData(rawData);
      
      // 验证转换后的数据
      if (!validateStudentData(student)) {
        throw new Error('学员数据验证失败');
      }
      
      return student;
    } catch (error) {
      console.error('❌ [ApiService.addStudent] 调用失败:', error);
      throw new Error(`添加学员失败: ${error}`);
    }
  }

  static async getAllStudents() {
    try {
      const rawDataArray = await invoke<any[]>('get_all_students');
      const students = transformStudentDataArray(rawDataArray);
      
      // 验证转换后的数据
      const invalidStudents = students.filter(student => !validateStudentData(student));
      if (invalidStudents.length > 0) {
        console.warn('⚠️ [ApiService.getAllStudents] 发现无效学员数据:', invalidStudents);
      }
      
      return students;
    } catch (error) {
      console.error('❌ [ApiService.getAllStudents] 调用失败:', error);
      throw new Error(`获取学员列表失败: ${error}`);
    }
  }

  static async addScore(studentUid: number, score: number) {
    try {
      return await invoke<null>('add_score', {
        studentUid,
        score
      });
    } catch (error) {
      console.error('❌ [ApiService.addScore] 调用失败:', error);
      throw new Error(`添加成绩失败: ${error}`);
    }
  }

  static async getStudentScores(studentUid: number) {
    try {
      return await invoke<number[]>('get_student_scores', {
        studentUid
      });
    } catch (error) {
      console.error('❌ [ApiService.getStudentScores] 调用失败:', error);
      throw new Error(`获取学员成绩失败: ${error}`);
    }
  }

  static async updateStudentInfo(studentUid: number, updates: {
    name?: string
    age?: number
    classType?: string
    phone?: string
  }) {
    try {
      return await invoke<null>('update_student_info', {
        studentUid,
        name: updates.name,
        age: updates.age,
        classType: updates.classType,
        phone: updates.phone
      });
    } catch (error) {
      console.error('❌ [ApiService.updateStudentInfo] 调用失败:', error);
      throw new Error(`更新学员信息失败: ${error}`);
    }
  }

  static async deleteStudent(studentUid: number) {
    try {
      return await invoke<null>('delete_student', {
        studentUid
      });
    } catch (error) {
      console.error('❌ [ApiService.deleteStudent] 调用失败:', error);
      throw new Error(`删除学员失败: ${error}`);
    }
  }

  // 财务管理
  static async addCashTransaction(studentUid: number | null, amount: number, description: string) {
    try {
      const rawData = await invoke<any>('add_cash_transaction', {
        studentUid,
        amount,
        description
      });
      
      const transaction = transformTransactionData(rawData);
      
      // 验证转换后的数据
      if (!validateTransactionData(transaction)) {
        throw new Error('交易数据验证失败');
      }
      
      return transaction;
    } catch (error) {
      console.error('❌ [ApiService.addCashTransaction] 调用失败:', error);
      throw new Error(`添加财务记录失败: ${error}`);
    }
  }

  static async getAllTransactions() {
    try {
      const rawDataArray = await invoke<any[]>('get_all_transactions');
      const transactions = transformTransactionDataArray(rawDataArray);
      
      // 验证转换后的数据
      const invalidTransactions = transactions.filter(transaction => !validateTransactionData(transaction));
      if (invalidTransactions.length > 0) {
        console.warn('⚠️ [ApiService.getAllTransactions] 发现无效交易数据:', invalidTransactions);
      }
      
      return transactions;
    } catch (error) {
      console.error('❌ [ApiService.getAllTransactions] 调用失败:', error);
      throw new Error(`获取财务记录失败: ${error}`);
    }
  }

  static async deleteCashTransaction(transactionUid: number) {
    try {
      return await invoke<null>('delete_cash_transaction', {
        transactionUid
      });
    } catch (error) {
      console.error('❌ [ApiService.deleteCashTransaction] 调用失败:', error);
      throw new Error(`删除财务记录失败: ${error}`);
    }
  }

  // 统计数据
  static async getDashboardStats() {
    try {
      const rawData = await invoke<any>('get_dashboard_stats');
      const stats = transformDashboardStatsData(rawData);
      
      // 验证转换后的数据
      if (!validateDashboardStatsData(stats)) {
        throw new Error('统计数据验证失败');
      }
      
      return stats;
    } catch (error) {
      console.error('❌ [ApiService.getDashboardStats] 调用失败:', error);
      throw new Error(`获取统计数据失败: ${error}`);
    }
  }

  // 窗口管理
  // 注意：独立设置窗口功能已移除，设置现在通过主应用的标签页实现

  static async openMainWindow() {
    try {
      return await invoke<null>('open_main_window');
    } catch (error) {
      console.error('❌ [ApiService.openMainWindow] 调用失败:', error);
      throw new Error(`打开主窗口失败: ${error}`);
    }
  }
}

// 类型定义
export interface Student {
  uid: number
  name: string
  age: number
  class: string
  phone: string
  rings: number[]
  note: string
  cash: string
}

export interface Transaction {
  uid: number
  student_id: string
  amount: number
  description: string
}

export interface DashboardStats {
  total_students: number
  total_revenue: number
  total_expense: number
  average_score: number
  max_score: number
  active_courses: number
}