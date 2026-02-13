/**
 * API服务 - 统一的API调用入口
 * 整合所有模块化的API服务
 */
import { StudentApiService, type StudentListResponse } from './studentApi';
import { TransactionApiService, type TransactionListResponse } from './transactionApi';
import { InstallmentsApiService } from './installmentsApi';
import { StatsApiService, type StatsPeriod } from './statsApi';
import { MembershipApiService, type MembershipStats, type BatchSetMembershipResponse } from './membershipApi';
import { AdapterApiService, type HealthStatus, type AdapterInfo } from './adapterApi';
import { handleApiOperation } from '../utils/errorHandler';
import type {
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
  MembershipData,
  MembershipType,
  Installment,
  InstallmentPlan,
  InstallmentStatus,
} from '../types/api';


/**
 * 统一的 API 服务类
 * 提供所有 API 调用的静态方法
 */
export class ApiService {
  // ============================================================================
  // 学员管理
  // ============================================================================

  /**
   * 获取所有学员（支持分页和搜索）
   * @returns 返回学员列表和分页信息
   */
  static async getAllStudents(params?: StudentSearchOptions, forceRefresh = false): Promise<StudentListResponse> {
    return handleApiOperation(
      () => StudentApiService.getAllStudents(params, forceRefresh),
      '获取学员列表',
      { retryable: true, context: { params, forceRefresh } }
    );
  }

  /**
   * 搜索学员（返回数组）
   */
  static async searchStudents(params: StudentSearchOptions): Promise<Student[]> {
    return handleApiOperation(
      () => StudentApiService.searchStudents(params),
      '搜索学员',
      { retryable: true, context: { params } }
    );
  }

  /**
   * 根据 ID 获取学员信息
   */
  static async getStudentById(uid: number, forceRefresh = false): Promise<Student> {
    return handleApiOperation(
      () => StudentApiService.getStudentById(uid, forceRefresh),
      '获取学员信息',
      { retryable: true, context: { uid, forceRefresh } }
    );
  }

  /**
   * 新增学员（对象参数）
   */
  static async addStudent(student: CurrentStudentInput): Promise<Student>;
  /**
   * 新增学员（多参数 - 向后兼容）
   */
  static async addStudent(
    name: string,
    age?: number,
    classType?: string,
    phone?: string,
    note?: string,
    subject?: string,
    lessonLeft?: number,
    membershipStartDate?: string | null,
    membershipEndDate?: string | null
  ): Promise<Student>;
  static async addStudent(
    studentOrName: CurrentStudentInput | string,
    age?: number,
    classType?: string,
    phone?: string,
    note?: string,
    subject?: string,
    lessonLeft?: number,
    membershipStartDate?: string | null,
    membershipEndDate?: string | null
  ): Promise<Student> {
    let studentInput: CurrentStudentInput;
    
    if (typeof studentOrName === 'string') {
      // 多参数调用 - 向后兼容
      studentInput = {
        name: studentOrName,
        age: age || null,
        phone: phone || '',
        class: classType || 'Others',
        subject: subject || 'Others',
        note: note || '',
        lesson_left: lessonLeft || null,
        membership_start_date: membershipStartDate || null,
        membership_end_date: membershipEndDate || null,
      };
    } else {
      // 对象参数调用
      studentInput = studentOrName;
    }
    
    return handleApiOperation(
      () => StudentApiService.addStudent(studentInput),
      '新增学员',
      { retryable: false, context: { student: studentInput } }
    );
  }

  /**
   * 更新学员信息
   */
  static async updateStudentInfo(uid: number, data: StudentUpdateData | any): Promise<Student> {
    // 将 classType 转换为 class（向后兼容）
    const updateData: StudentUpdateData = { ...data };
    if ('classType' in data && !('class' in data)) {
      updateData.class = data.classType;
      delete (updateData as any).classType;
    }
    
    return handleApiOperation(
      () => StudentApiService.updateStudent(uid, updateData),
      '更新学员信息',
      { retryable: false, context: { uid, data: updateData } }
    );
  }

  /**
   * 删除学员
   */
  static async deleteStudent(uid: number): Promise<void> {
    return handleApiOperation(
      () => StudentApiService.deleteStudent(uid),
      '删除学员',
      { retryable: false, context: { uid } }
    );
  }

  // ============================================================================
  // 成绩管理
  // ============================================================================

  /**
   * 获取学员成绩
   */
  static async getStudentScores(uid: number): Promise<number[]> {
    return handleApiOperation(
      () => StudentApiService.getStudentScores(uid),
      '获取学员成绩',
      { retryable: true, context: { uid } }
    );
  }

  /**
   * 添加学员成绩
   */
  static async addScore(uid: number, score: number): Promise<number[]> {
    return handleApiOperation(
      () => StudentApiService.addScore(uid, score),
      '添加成绩',
      { retryable: false, context: { uid, score } }
    );
  }

  /**
   * 删除学员成绩
   */
  static async deleteStudentScore(uid: number, scoreIndex: number): Promise<number[]> {
    return handleApiOperation(
      () => StudentApiService.deleteScore(uid, scoreIndex),
      '删除成绩',
      { retryable: false, context: { uid, scoreIndex } }
    );
  }

  /**
   * 更新学员成绩
   */
  static async updateStudentScore(uid: number, scoreIndex: number, newScore: number): Promise<number[]> {
    return handleApiOperation(
      () => StudentApiService.updateScore(uid, scoreIndex, newScore),
      '更新成绩',
      { retryable: false, context: { uid, scoreIndex, newScore } }
    );
  }

  /**
   * 批量更新学员成绩
   */
  static async updateScoresBatch(uid: number, scores: number[]): Promise<number[]> {
    return handleApiOperation(
      () => StudentApiService.updateScoresBatch(uid, scores),
      '批量更新成绩',
      { retryable: false, context: { uid, scores } }
    );
  }

  /**
   * 清空学员所有成绩
   */
  static async clearAllScores(uid: number): Promise<void> {
    return handleApiOperation(
      () => StudentApiService.clearAllScores(uid),
      '清空所有成绩',
      { retryable: false, context: { uid } }
    );
  }

  // ============================================================================
  // 交易/财务管理
  // ============================================================================

  /**
   * 获取所有交易（支持分页和搜索）
   */
  static async getAllTransactions(params?: CashSearchOptions): Promise<TransactionListResponse> {
    return handleApiOperation(
      () => TransactionApiService.getAllTransactions(params),
      '获取交易列表',
      { retryable: true, context: { params } }
    );
  }

  /**
   * 搜索现金交易
   */
  static async searchCash(params: CashSearchOptions): Promise<Transaction[]> {
    return handleApiOperation(
      () => TransactionApiService.searchCash(params),
      '搜索交易',
      { retryable: true, context: { params } }
    );
  }

  /**
   * 根据 ID 获取交易信息
   */
  static async getTransactionById(uid: number): Promise<Transaction> {
    return handleApiOperation(
      () => TransactionApiService.getTransactionById(uid),
      '获取交易信息',
      { retryable: true, context: { uid } }
    );
  }

  /**
   * 更新交易信息
   */
  static async updateTransaction(uid: number, data: TransactionUpdateData): Promise<Transaction> {
    return handleApiOperation(
      () => TransactionApiService.updateTransaction(uid, data),
      '更新交易信息',
      { retryable: false, context: { uid, data } }
    );
  }

  /**
   * 新增普通交易（对象参数）
   */
  static async addCashTransaction(data: TransactionCreateData): Promise<Transaction>;
  /**
   * 新增普通交易（多参数 - 向后兼容）
   */
  static async addCashTransaction(
    student_id: number | null,
    amount: number,
    note?: string | null
  ): Promise<Transaction>;
  static async addCashTransaction(
    dataOrStudentId: TransactionCreateData | number | null,
    amount?: number,
    note?: string | null
  ): Promise<Transaction> {
    let transactionData: TransactionCreateData;
    
    if (typeof dataOrStudentId === 'object' && dataOrStudentId !== null) {
      // 对象参数调用
      transactionData = dataOrStudentId;
    } else {
      // 多参数调用 - 向后兼容
      transactionData = {
        student_id: dataOrStudentId,
        amount: amount!,
        note: note || null,
      };
    }
    
    return handleApiOperation(
      () => TransactionApiService.addCashTransaction(transactionData),
      '新增交易',
      { retryable: false, context: { data: transactionData } }
    );
  }

  /**
   * 新增分期交易（对象参数）
   */
  static async addInstallmentTransaction(data: {
    student_id?: number | null;
    amount: number;
    note?: string | null;
    total_installments: number;
    frequency: string;
    custom_days?: number | null;
    start_date: string;
    due_date: string;
  }): Promise<Transaction>;
  /**
   * 新增分期交易（多参数 - 向后兼容）
   */
  static async addInstallmentTransaction(
    student_id: number | null,
    amount: number,
    note: string | null,
    total_installments: number,
    frequency: string,
    start_date: string,
    due_date: string
  ): Promise<Transaction>;
  static async addInstallmentTransaction(
    dataOrStudentId: any,
    amount?: number,
    note?: string | null,
    total_installments?: number,
    frequency?: string,
    start_date?: string | null,
    due_date?: string | null
  ): Promise<Transaction> {
    let installmentData: any;

    if (typeof dataOrStudentId === 'object' && dataOrStudentId !== null && 'frequency' in dataOrStudentId) {
      // 对象参数调用
      installmentData = { ...dataOrStudentId };
    } else {
      // 多参数调用 - 向后兼容
      installmentData = {
        student_id: dataOrStudentId,
        total_amount: amount!,
        note: note || null,
        total_installments: total_installments!,
        frequency: frequency!,
        start_date: start_date || '',
        due_date: due_date || '',
      };
    }

    if ('amount' in installmentData && !('total_amount' in installmentData)) {
      installmentData.total_amount = installmentData.amount;
      delete installmentData.amount;
    }

    return handleApiOperation(
      () => TransactionApiService.addInstallmentTransaction(installmentData),
      '新增分期交易',
      { retryable: false, context: { data: installmentData } }
    );
  }

  /**
   * 删除交易
   */
  static async deleteCashTransaction(uid: number): Promise<void> {
    return handleApiOperation(
      () => TransactionApiService.deleteTransaction(uid),
      '删除交易',
      { retryable: false, context: { uid } }
    );
  }

  // ============================================================================
  // 分期付款管理
  // ============================================================================

  /**
   * 获取所有分期计划（支持分页）
   */
  static async getAllInstallmentPlans(params?: {
    page?: number;
    limit?: number;
    student_id?: number;
    status?: string;
  }): Promise<{
    data: InstallmentPlan[];
    pagination: { page: number; limit: number; total: number; total_pages: number };
  }> {
    return handleApiOperation(
      () => InstallmentsApiService.getAllInstallmentPlans(params),
      '获取分期计划列表',
      { retryable: true, context: params }
    );
  }

  /**
   * 获取逾期分期列表
   */
  static async getOverdueInstallments(): Promise<{
    overdue_installments: Installment[];
    total_overdue_count: number;
    total_overdue_amount: number;
    average_days_overdue: number;
  }> {
    return handleApiOperation(
      () => InstallmentsApiService.getOverdueInstallments(),
      '获取逾期分期',
      { retryable: true }
    );
  }

  /**
   * 获取分期计划详情
   */
  static async getInstallmentPlan(planId: number): Promise<{
    plan: InstallmentPlan;
    installments: Installment[];
  }> {
    return handleApiOperation(
      () => InstallmentsApiService.getInstallmentPlan(planId),
      '获取分期计划',
      { retryable: true, context: { planId } }
    );
  }

  /**
   * 创建分期计划
   */
  static async createInstallmentPlan(data: {
    student_id?: number | null;
    total_amount: number;
    note?: string;
    total_installments: number;
    frequency: string;
    custom_days?: number | null;
    start_date: string;
  }): Promise<InstallmentPlan> {
    return handleApiOperation(
      () => InstallmentsApiService.createInstallmentPlan(data),
      '创建分期计划',
      { retryable: false, context: data }
    );
  }

  /**
   * 更新分期付款状态（支付/标记逾期等）
   */
  static async updateInstallmentPayment(
    installmentUid: number,
    data: { status: InstallmentStatus; amount?: number }
  ): Promise<{ installment: Installment; plan: InstallmentPlan }> {
    return handleApiOperation(
      () => InstallmentsApiService.updateInstallmentPayment(installmentUid, data),
      '更新分期付款状态',
      { retryable: false, context: { installmentUid, ...data } }
    );
  }

  /**
   * 记录分期支付
   */
  static async recordInstallmentPayment(
    planId: number,
    data?: { installment_index?: number; paid_amount?: number; paid_date?: string }
  ): Promise<{ installment: Installment; plan: InstallmentPlan }> {
    return handleApiOperation(
      () => InstallmentsApiService.recordPayment(planId, data),
      '记录分期支付',
      { retryable: false, context: { planId, ...data } }
    );
  }

  /**
   * 支付下一期
   */
  static async payNextInstallment(planId: number): Promise<{
    installment: Installment;
    transaction: { uid: number; amount: number; note: string };
  }> {
    return handleApiOperation(
      () => InstallmentsApiService.payNextInstallment(planId),
      '支付下一期',
      { retryable: false, context: { planId } }
    );
  }

  /**
   * 取消分期计划
   */
  static async cancelInstallmentPlan(planId: number): Promise<InstallmentPlan> {
    return handleApiOperation(
      () => InstallmentsApiService.updateInstallmentPlan(planId, { status: 'CANCELLED' }),
      '取消分期计划',
      { retryable: false, context: { planId } }
    );
  }

  /**
   * 删除分期计划
   */
  static async deleteInstallmentPlan(planId: number): Promise<void> {
    return handleApiOperation(
      () => InstallmentsApiService.deleteInstallmentPlan(planId),
      '删除分期计划',
      { retryable: false, context: { planId } }
    );
  }

  /**
   * 获取即将到期的分期
   */
  static async getUpcomingInstallments(days?: number): Promise<{
    uid: number;
    plan_id: number;
    current_installment: number;
    installment_amount: number;
    due_date: string;
    days_until_due: number;
    status: string;
    status_text: string;
    plan: {
      uid: number;
      total_installments: number;
      student: { uid: number; name: string; phone: string } | null;
    } | null;
  }[]> {
    return handleApiOperation(
      () => InstallmentsApiService.getUpcomingInstallments(days),
      '获取即将到期分期',
      { retryable: true, context: { days } }
    );
  }

  /**
   * 更新分期状态（简洁版）
   */
  static async updateInstallmentStatus(
    installmentUid: number,
    status: InstallmentStatus
  ): Promise<{
    uid: number;
    status: string;
    plan: { uid: number; status: string } | null;
  }> {
    return handleApiOperation(
      () => InstallmentsApiService.updateInstallmentStatus(installmentUid, status),
      '更新分期状态',
      { retryable: false, context: { installmentUid, status } }
    );
  }

  // ============================================================================
  // 统计数据
  // ============================================================================

  /**
   * 获取仪表盘统计数据
   */
  static async getDashboardStats(period?: StatsPeriod): Promise<DashboardStats> {
    return handleApiOperation(
      () => StatsApiService.getDashboardStats(period),
      '获取仪表盘统计',
      { retryable: true, context: { period } }
    );
  }

  /**
   * 获取学员统计数据
   */
  static async getStudentStats(studentId: number, period?: StatsPeriod): Promise<StudentStats> {
    return handleApiOperation(
      () => StatsApiService.getStudentStats(studentId, period),
      '获取学员统计',
      { retryable: true, context: { studentId, period } }
    );
  }

  /**
   * 获取全局学员统计数据
   */
  static async getGlobalStudentStats(period?: StatsPeriod): Promise<{
    total_students: number;
    average_score: number;
    max_score: number;
    min_score: number;
    students_with_scores: number;
    top_students: Array<{
      uid: number;
      name: string;
      average_score: number;
      max_score: number;
    }>;
  }> {
    return handleApiOperation(
      () => StatsApiService.getGlobalStudentStats(period),
      '获取全局学员统计',
      { retryable: true, context: { period } }
    );
  }

  /**
   * 获取财务统计数据
   */
  static async getFinancialStats(period?: StatsPeriod): Promise<FinancialStats> {
    return handleApiOperation(
      () => StatsApiService.getFinancialStats(period),
      '获取财务统计',
      { retryable: true, context: { period } }
    );
  }

  /**
   * 获取全局财务统计数据
   */
  static async getGlobalFinancialStats(period?: StatsPeriod): Promise<FinancialStats> {
    return handleApiOperation(
      () => StatsApiService.getGlobalFinancialStats(period),
      '获取全局财务统计',
      { retryable: true, context: { period } }
    );
  }

  /**
   * 获取即将到期的会员
   */
  static async getMembershipExpiringSoon(days: number = 30): Promise<Student[]> {
    return handleApiOperation(
      () => StatsApiService.getMembershipExpiringSoon(days),
      '获取即将到期会员',
      { retryable: true, context: { days } }
    );
  }

  // ============================================================================
  // 会员管理
  // ============================================================================

  /**
   * 设置学员会员
   */
  static async setStudentMembership(
    studentId: number,
    membership: MembershipData
  ): Promise<Student> {
    return handleApiOperation(
      () => MembershipApiService.setStudentMembership(studentId, membership),
      '设置会员',
      { retryable: false, context: { studentId, membership } }
    );
  }

  /**
   * 清除学员会员
   */
  static async clearStudentMembership(studentId: number): Promise<Student> {
    return handleApiOperation(
      () => MembershipApiService.clearStudentMembership(studentId),
      '清除会员',
      { retryable: false, context: { studentId } }
    );
  }

  /**
   * 按类型设置会员（月卡/年卡）
   */
  static async setMembershipByType(
    studentId: number,
    membershipType: MembershipType,
    startFromToday: boolean = true
  ): Promise<Student> {
    return handleApiOperation(
      () => MembershipApiService.setMembershipByType(studentId, membershipType, startFromToday),
      '按类型设置会员',
      { retryable: false, context: { studentId, membershipType, startFromToday } }
    );
  }

  /**
   * 续费会员
   */
  static async renewMembership(
    studentId: number,
    membershipType: MembershipType,
    extendFromCurrent: boolean = true
  ): Promise<Student> {
    return handleApiOperation(
      () => MembershipApiService.renewMembership(studentId, membershipType, extendFromCurrent),
      '续费会员',
      { retryable: false, context: { studentId, membershipType, extendFromCurrent } }
    );
  }

  /**
   * 获取会员统计数据
   */
  static async getMembershipStats(): Promise<MembershipStats> {
    return handleApiOperation(
      () => MembershipApiService.getMembershipStats(),
      '获取会员统计',
      { retryable: true }
    );
  }

  /**
   * 批量设置会员
   */
  static async batchSetMembership(
    studentIds: number[],
    membership: MembershipData
  ): Promise<BatchSetMembershipResponse>;
  static async batchSetMembership(
    studentIds: number[],
    membershipType: MembershipType | MembershipData,
    startFromToday: boolean = true
  ): Promise<BatchSetMembershipResponse> {
    return handleApiOperation(
      () => MembershipApiService.batchSetMembership(studentIds, membershipType, startFromToday),
      '批量设置会员',
      {
        retryable: false,
        context:
          typeof membershipType === 'string'
            ? { studentIds, membershipType, startFromToday }
            : { studentIds, membership: membershipType }
      }
    );
  }

  // ============================================================================
  // 适配器接口
  // ============================================================================

  /**
   * 获取学员列表（通过适配器）
   */
  static async getAdapterStudents(params?: Record<string, any>): Promise<Student[]> {
    return handleApiOperation(
      () => AdapterApiService.getStudents(params),
      '获取学员（适配器）',
      { retryable: true, context: { params } }
    );
  }

  /**
   * 添加学员（通过适配器）
   */
  static async addAdapterStudent(student: Partial<Student>): Promise<Student> {
    return handleApiOperation(
      () => AdapterApiService.addStudent(student),
      '添加学员（适配器）',
      { retryable: false, context: { student } }
    );
  }

  /**
   * 获取交易列表（通过适配器）
   */
  static async getAdapterTransactions(params?: Record<string, any>): Promise<Transaction[]> {
    return handleApiOperation(
      () => AdapterApiService.getTransactions(params),
      '获取交易（适配器）',
      { retryable: true, context: { params } }
    );
  }

  /**
   * 获取财务统计（通过适配器）
   */
  static async getAdapterFinancialStats(params?: {
    period?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<FinancialStats> {
    return handleApiOperation(
      () => AdapterApiService.getFinancialStats(params),
      '获取财务统计（适配器）',
      { retryable: true, context: { params } }
    );
  }

  /**
   * 获取数据库健康状态
   */
  static async getHealthStatus(): Promise<HealthStatus> {
    return handleApiOperation(
      () => AdapterApiService.getHealthStatus(),
      '获取健康状态',
      { retryable: true }
    );
  }

  /**
   * 获取适配器信息
   */
  static async getAdapterInfo(): Promise<AdapterInfo> {
    return handleApiOperation(
      () => AdapterApiService.getAdapterInfo(),
      '获取适配器信息',
      { retryable: true }
    );
  }
}

// 导出类型以保持向后兼容
export type { Student, Transaction, DashboardStats, StudentUpdateData } from '../types/api';
export type { StudentListResponse } from './studentApi';
export type { TransactionListResponse } from './transactionApi';
export type { MembershipStats } from './membershipApi';
export type { HealthStatus, AdapterInfo } from './adapterApi';
export type { StatsPeriod } from './statsApi';
