// API服务 - 封装所有后端调用
import { invoke } from "@tauri-apps/api/core";

export class ApiService {
  // 学员管理
  static async addStudent(name: string, age: number, classType: string, phone: string) {
    try {
      return await invoke<Student>('add_student', {
        name,
        age,
        classType,
        phone
      });
    } catch (error) {
      console.error('❌ [ApiService.addStudent] 调用失败:', error);
      throw new Error(`添加学员失败: ${error}`);
    }
  }

  static async getAllStudents() {
    try {
      return await invoke<Student[]>('get_all_students');
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
      return await invoke<Transaction>('add_cash_transaction', {
        studentUid,
        amount,
        description
      });
    } catch (error) {
      console.error('❌ [ApiService.addCashTransaction] 调用失败:', error);
      throw new Error(`添加财务记录失败: ${error}`);
    }
  }

  static async getAllTransactions() {
    try {
      return await invoke<Transaction[]>('get_all_transactions');
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
      return await invoke<DashboardStats>('get_dashboard_stats');
    } catch (error) {
      console.error('❌ [ApiService.getDashboardStats] 调用失败:', error);
      throw new Error(`获取统计数据失败: ${error}`);
    }
  }

  // 窗口管理
  static async openSettingsWindow() {
    try {
      return await invoke<null>('open_settings_window');
    } catch (error) {
      console.error('❌ [ApiService.openSettingsWindow] 调用失败:', error);
      throw new Error(`打开设置窗口失败: ${error}`);
    }
  }

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