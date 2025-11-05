// API服务 - 模块化的API调用入口
// TODO: 以下模块尚未实现，暂时注释掉以通过类型检查
// import { StudentApiService } from './studentApi';
// import { TransactionApiService } from './transactionApi';
// import { StatsApiService } from './statsApi';
// import { MembershipApiService } from './membershipApi';
// import { apiCall } from './baseClient';
// import { handleApiOperation } from '../utils/errorHandler';

// 将所有API服务合并到一个API服务类中
export class ApiService {
  // 学员管理 - 待实现
  static async addStudent(): Promise<never> {
    throw new Error('未实现');
  }
  static async getAllStudents(): Promise<never> {
    throw new Error('未实现');
  }
  static async getStudentById(): Promise<never> {
    throw new Error('未实现');
  }
  static async updateStudentInfo(): Promise<never> {
    throw new Error('未实现');
  }
  static async deleteStudent(): Promise<never> {
    throw new Error('未实现');
  }
  static async searchStudents(): Promise<never> {
    throw new Error('未实现');
  }

  // 成绩管理 - 待实现
  static async addScore(): Promise<never> {
    throw new Error('未实现');
  }

  static async getStudentScores(): Promise<never> {
    throw new Error('未实现');
  }

  static async deleteStudentScore(): Promise<never> {
    throw new Error('未实现');
  }

  static async updateStudentScore(): Promise<never> {
    throw new Error('未实现');
  }

  // 财务管理 - 待实现
  static async addCashTransaction(): Promise<never> {
    throw new Error('未实现');
  }
  static async addInstallmentTransaction(): Promise<never> {
    throw new Error('未实现');
  }
  static async getAllTransactions(): Promise<never> {
    throw new Error('未实现');
  }
  static async deleteCashTransaction(): Promise<never> {
    throw new Error('未实现');
  }
  static async searchCash(): Promise<never> {
    throw new Error('未实现');
  }

  // 统计数据 - 待实现
  static async getDashboardStats(): Promise<never> {
    throw new Error('未实现');
  }
  static async getStudentStats(): Promise<never> {
    throw new Error('未实现');
  }
  static async getGlobalStudentStats(): Promise<never> {
    throw new Error('未实现');
  }
  static async getFinancialStats(): Promise<never> {
    throw new Error('未实现');
  }
  static async getGlobalFinancialStats(): Promise<never> {
    throw new Error('未实现');
  }
  static async getMembershipExpiringSoon(): Promise<never> {
    throw new Error('未实现');
  }

  // 会员管理 - 待实现
  static async setStudentMembership(): Promise<never> {
    throw new Error('未实现');
  }
  static async clearStudentMembership(): Promise<never> {
    throw new Error('未实现');
  }
  static async setMembershipByType(): Promise<never> {
    throw new Error('未实现');
  }
}

// 导出类型以保持向后兼容
export type { Student, Transaction, DashboardStats, StudentUpdateData } from '../types/api';