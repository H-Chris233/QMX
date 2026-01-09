/**
 * QMX 前端 API 统一导出入口
 *
 * 使用指南：
 * - 所有组件应从本文件导入 API 服务
 * - 统一使用 ApiService 进行 API 调用
 * - 统一使用 @/api 路径别名
 *
 * 示例：
 *   import { ApiService, type Student } from '@/api';
 */

export { ApiService } from './ApiService';

// 导出类型（便于组件使用）
export type {
  Student,
  StudentUpdateData,
  StudentSearchOptions,
  CurrentStudentInput,
  Transaction,
  TransactionCreateData,
  TransactionUpdateData,
  CashSearchOptions,
  DashboardStats,
  StudentStats,
  FinancialStats,
  Installment,
  InstallmentPlan,
  InstallmentStatus,
  MembershipData,
} from '../types/api';

// 重新导出各模块服务（高级用法）
export { StudentApiService } from './studentApi';
export { TransactionApiService } from './transactionApi';
export { InstallmentsApiService } from './installmentsApi';
export { StatsApiService } from './statsApi';
export { MembershipApiService } from './membershipApi';
export { AuthApiService } from './authApi';
export { AdapterApiService } from './adapterApi';

/**
 * API 方法命名别名映射
 * 解决不同模块开发者使用的命名不一致问题
 */
export const ApiAliases = {
  // 学员相关
  students: {
    list: 'getAllStudents',
    get: 'getStudentById',
    create: 'addStudent',
    update: 'updateStudent',
    delete: 'deleteStudent',
    search: 'searchStudents',
    scores: 'getStudentScores',
    addScore: 'addScore',
    deleteScore: 'deleteScore',
    updateScore: 'updateScore',
  },
  // 交易相关
  transactions: {
    list: 'getAllTransactions',
    get: 'getTransactionById',
    create: 'addCashTransaction',
    update: 'updateTransaction',
    delete: 'deleteCashTransaction',
    search: 'searchCash',
    installment: 'addInstallmentTransaction',
  },
  // 统计相关
  stats: {
    dashboard: 'getDashboardStats',
    student: 'getStudentStats',
    students: 'getStudentStats',  // 别名
    financial: 'getFinancialStats',
    globalStudent: 'getGlobalStudentStats',
    globalFinancial: 'getGlobalFinancialStats',
    membershipExpiring: 'getMembershipExpiringSoon',
  },
  // 会员相关
  membership: {
    set: 'setStudentMembership',
    clear: 'clearStudentMembership',
    setByType: 'setMembershipByType',
    renew: 'renewMembership',
    stats: 'getMembershipStats',
    batch: 'batchSetMembership',
  },
  // 分期相关
  installments: {
    statuses: 'getInstallmentStatuses',
    upcoming: 'getUpcomingInstallments',
    updateStatus: 'updateInstallmentStatus',
    payNext: 'payNextInstallment',
    cancel: 'cancelInstallmentPlan',
    getPlan: 'getInstallmentPlan',
  },
  // 认证相关
  auth: {
    login: 'login',
    logout: 'logout',
    refresh: 'refreshToken',
    currentUser: 'getCurrentUser',
    updateUser: 'updateUser',
    changePassword: 'changePassword',
  },
  // 适配器相关
  adapter: {
    students: 'getAdapterStudents',
    addStudent: 'addAdapterStudent',
    transactions: 'getAdapterTransactions',
    financialStats: 'getAdapterFinancialStats',
    health: 'getHealthStatus',
    info: 'getAdapterInfo',
  },
} as const;
