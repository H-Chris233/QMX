// API服务 - 封装所有后端调用
import { invoke } from '@tauri-apps/api/core';
import {
  transformStudentData,
  transformStudentDataArray,
  transformTransactionData,
  transformTransactionDataArray,
  transformDashboardStatsData,
  validateStudentData,
  validateTransactionData,
  validateDashboardStatsData,
} from './dataTransformers';

export class ApiService {
  // 学员管理
  static async addStudent(
    name: string,
    age: number,
    classType: string,
    phone: string,
    note: string,
    subject: string,
  ) {
    try {
      const rawData = await invoke<any>('add_student', {
        name,
        age,
        classType,
        phone,
        note,
        subject,
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
      const invalidStudents = students.filter(
        (student) => !validateStudentData(student),
      );
      if (invalidStudents.length > 0) {
        console.warn(
          '⚠️ [ApiService.getAllStudents] 发现无效学员数据:',
          invalidStudents,
        );
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
        score,
      });
    } catch (error) {
      console.error('❌ [ApiService.addScore] 调用失败:', error);
      throw new Error(`添加成绩失败: ${error}`);
    }
  }

  static async getStudentScores(studentUid: number) {
    try {
      return await invoke<number[]>('get_student_scores', {
        studentUid,
      });
    } catch (error) {
      console.error('❌ [ApiService.getStudentScores] 调用失败:', error);
      throw new Error(`获取学员成绩失败: ${error}`);
    }
  }

  static async updateStudentInfo(
    studentUid: number,
    updates: {
      name?: string;
      age?: number;
      classType?: string;
      phone?: string;
      note?: string;
      subject?: string;
      lessonLeft?: number;
    },
  ) {
    try {
      return await invoke<null>('update_student_info', {
        studentUid,
        name: updates.name,
        age: updates.age,
        classType: updates.classType,
        phone: updates.phone,
        note: updates.note,
        subject: updates.subject,
        lessonLeft: updates.lessonLeft,
      });
    } catch (error) {
      console.error('❌ [ApiService.updateStudentInfo] 调用失败:', error);
      throw new Error(`更新学员信息失败: ${error}`);
    }
  }

  static async deleteStudent(studentUid: number) {
    try {
      return await invoke<null>('delete_student', {
        studentUid,
      });
    } catch (error) {
      console.error('❌ [ApiService.deleteStudent] 调用失败:', error);
      throw new Error(`删除学员失败: ${error}`);
    }
  }

  // 财务管理 - 普通交易
  static async addCashTransaction(
    studentUid: number | null,
    amount: number,
    note: string = '',
  ) {
    try {
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
      throw new Error(`添加财务记录失败: ${error}`);
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
      throw new Error(`添加分期付款失败: ${error}`);
    }
  }

  static async getAllTransactions() {
    try {
      const rawDataArray = await invoke<any[]>('get_all_transactions');
      const transactions = transformTransactionDataArray(rawDataArray);

      // 验证转换后的数据
      const invalidTransactions = transactions.filter(
        (transaction) => !validateTransactionData(transaction),
      );
      if (invalidTransactions.length > 0) {
        console.warn(
          '⚠️ [ApiService.getAllTransactions] 发现无效交易数据:',
          invalidTransactions,
        );
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
        transactionUid,
      });
    } catch (error) {
      console.error('❌ [ApiService.deleteCashTransaction] 调用失败:', error);
      throw new Error(`删除财务记录失败: ${error}`);
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
      throw new Error(`更新分期付款状态失败: ${error}`);
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
      throw new Error(`生成下一期分期失败: ${error}`);
    }
  }

  static async cancelInstallmentPlan(planId: number) {
    try {
      return await invoke<number>('cancel_installment_plan', {
        planId,
      });
    } catch (error) {
      console.error('❌ [ApiService.cancelInstallmentPlan] 调用失败:', error);
      throw new Error(`取消分期计划失败: ${error}`);
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
      throw new Error(`获取分期计划详情失败: ${error}`);
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
  static async openMainWindow() {
    try {
      return await invoke<null>('open_main_window');
    } catch (error) {
      console.error('❌ [ApiService.openMainWindow] 调用失败:', error);
      throw new Error(`打开主窗口失败: ${error}`);
    }
  }
}

// 类型定义 - 更新Transaction接口以支持分期付款
export interface Student {
  uid: number;
  name: string;
  age: number;
  class: string;
  phone: string;
  rings: number[];
  note: string;
  cash: string;
  subject: string;
  lesson_left?: number;
}

export interface Transaction {
  uid: number;
  student_id: number | null;
  amount: number;
  description: string;
  note: string | null;
  is_installment: boolean;
  installment_plan_id: number | null;
  installment_current: number | null;
  installment_total: number | null;
  installment_due_date: string | null;
  installment_status: string | null;
}

export interface DashboardStats {
  total_students: number;
  total_revenue: number;
  total_expense: number;
  average_score: number;
  max_score: number;
  active_courses: number;
}
