/**
 * 增强的MSW请求处理器
 * 使用测试数据工厂和fixture提供更灵活的mock
 */

import { http } from 'msw';
import { StudentFactory, TransactionFactory, InstallmentFactory, InstallmentPlanFactory } from '../../factories';
import { DashboardStatsFactory, StudentStatsFactory, FinancialStatsFactory } from '../../factories';
import {
  jsonSuccess,
  jsonError,
  jsonPaginated,
  ErrorHttpResponses,
  RequestHelpers,
  DataFilterHelpers,
} from '../../fixtures';

const API_BASE_URL = 'http://localhost:3001/api/v1';

// 模拟数据存储（在实际测试中可以被重置或修改）
export const mockData = {
  students: StudentFactory.buildMany(50),
  transactions: TransactionFactory.buildMany(100),
  installments: InstallmentFactory.buildMany(20),
  installmentPlans: InstallmentPlanFactory.buildMany(10),
};

/**
 * 重置模拟数据
 */
export function resetMockData(): void {
  StudentFactory.resetCounter();
  TransactionFactory.resetCounter();
  InstallmentFactory.resetCounter();
  InstallmentPlanFactory.resetCounter();
  
  mockData.students = StudentFactory.buildMany(50);
  mockData.transactions = TransactionFactory.buildMany(100);
  mockData.installments = InstallmentFactory.buildMany(20);
  mockData.installmentPlans = InstallmentPlanFactory.buildMany(10);
}

/**
 * 增强的MSW handlers
 */
export const enhancedHandlers = [
  // ============================================================================
  // 学员管理
  // ============================================================================

  /**
   * 获取所有学员（支持分页和搜索）
   */
  http.get(`${API_BASE_URL}/students`, ({ request }) => {
    const { page, limit } = RequestHelpers.getPaginationParams(request);
    const query = RequestHelpers.getSearchQuery(request, 'q');
    const { sortBy, sortOrder } = RequestHelpers.getSortParams(request);

    let filteredStudents = mockData.students;

    // 搜索过滤
    if (query) {
      filteredStudents = DataFilterHelpers.filterStudentsByQuery(filteredStudents, query);
    }

    // 排序
    if (sortBy) {
      filteredStudents = DataFilterHelpers.sort(filteredStudents, sortBy as any, sortOrder);
    }

    // 分页
    const paginatedStudents = DataFilterHelpers.paginate(filteredStudents, page, limit);

    return jsonPaginated(paginatedStudents, page, limit, filteredStudents.length);
  }),

  /**
   * 根据ID获取学员
   */
  http.get(`${API_BASE_URL}/students/:uid`, ({ params }) => {
    const uid = parseInt(params.uid as string, 10);
    const student = mockData.students.find((s) => s.uid === uid);

    if (!student) {
      return ErrorHttpResponses.notFound('学员');
    }

    return jsonSuccess(student);
  }),

  /**
   * 搜索学员
   */
  http.get(`${API_BASE_URL}/students/search`, ({ request }) => {
    const { page, limit } = RequestHelpers.getPaginationParams(request);
    const query = RequestHelpers.getSearchQuery(request);

    const results = DataFilterHelpers.filterStudentsByQuery(mockData.students, query);
    const paginated = DataFilterHelpers.paginate(results, page, limit);

    return jsonPaginated(paginated, page, limit, results.length);
  }),

  /**
   * 新增学员
   */
  http.post(`${API_BASE_URL}/students`, async ({ request }) => {
    const body = await RequestHelpers.getBody(request);

    // 验证必填字段
    if (!body.name || !body.name.trim()) {
      return ErrorHttpResponses.validationError({
        name: ['姓名不能为空'],
      });
    }

    if (body.phone && !/^1[3-9]\d{9}$/.test(body.phone)) {
      return ErrorHttpResponses.validationError({
        phone: ['手机号格式不正确'],
      });
    }

    const newStudent = StudentFactory.build({
      name: body.name,
      age: body.age,
      phone: body.phone,
      class: body.class,
      subject: body.subject,
      lesson_left: body.lesson_left,
      membership_start_date: body.membership_start_date,
      membership_end_date: body.membership_end_date,
      note: body.note,
    });

    mockData.students.push(newStudent);

    return jsonSuccess(newStudent, 201);
  }),

  /**
   * 更新学员
   */
  http.put(`${API_BASE_URL}/students/:uid`, async ({ params, request }) => {
    const uid = parseInt(params.uid as string, 10);
    const studentIndex = mockData.students.findIndex((s) => s.uid === uid);

    if (studentIndex === -1) {
      return ErrorHttpResponses.notFound('学员');
    }

    const body = await RequestHelpers.getBody(request);
    const updated = {
      ...mockData.students[studentIndex],
      ...body,
      updated_at: new Date().toISOString(),
    };

    mockData.students[studentIndex] = updated;

    return jsonSuccess(updated);
  }),

  /**
   * 删除学员
   */
  http.delete(`${API_BASE_URL}/students/:uid`, ({ params }) => {
    const uid = parseInt(params.uid as string, 10);
    const studentIndex = mockData.students.findIndex((s) => s.uid === uid);

    if (studentIndex === -1) {
      return ErrorHttpResponses.notFound('学员');
    }

    mockData.students.splice(studentIndex, 1);

    return jsonSuccess(null, 204);
  }),

  /**
   * 获取学员统计
   */
  http.get(`${API_BASE_URL}/students/:uid/stats`, ({ params }) => {
    const uid = parseInt(params.uid as string, 10);
    const student = mockData.students.find((s) => s.uid === uid);

    if (!student) {
      return ErrorHttpResponses.notFound('学员');
    }

    const stats = StudentStatsFactory.build({
      total_payments: 5000,
      payment_count: 10,
      average_score: student.rings.length > 0 
        ? student.rings.reduce((a, b) => a + b, 0) / student.rings.length 
        : 0,
      score_count: student.rings.length,
    });

    return jsonSuccess(stats);
  }),

  // ============================================================================
  // 交易管理
  // ============================================================================

  /**
   * 获取所有交易
   */
  http.get(`${API_BASE_URL}/transactions`, ({ request }) => {
    const { page, limit } = RequestHelpers.getPaginationParams(request);
    const url = new URL(request.url);
    const studentId = url.searchParams.get('student_id');

    let filteredTransactions = mockData.transactions;

    if (studentId) {
      filteredTransactions = DataFilterHelpers.filterTransactionsByStudentId(
        filteredTransactions,
        parseInt(studentId, 10)
      );
    }

    const paginated = DataFilterHelpers.paginate(filteredTransactions, page, limit);

    return jsonPaginated(paginated, page, limit, filteredTransactions.length);
  }),

  /**
   * 根据ID获取交易
   */
  http.get(`${API_BASE_URL}/transactions/:uid`, ({ params }) => {
    const uid = parseInt(params.uid as string, 10);
    const transaction = mockData.transactions.find((t) => t.uid === uid);

    if (!transaction) {
      return ErrorHttpResponses.notFound('交易记录');
    }

    return jsonSuccess(transaction);
  }),

  /**
   * 新增交易
   */
  http.post(`${API_BASE_URL}/transactions`, async ({ request }) => {
    const body = await RequestHelpers.getBody(request);

    // 验证必填字段
    if (body.amount === undefined || body.amount === null) {
      return ErrorHttpResponses.validationError({
        amount: ['金额不能为空'],
      });
    }

    if (body.amount === 0) {
      return ErrorHttpResponses.validationError({
        amount: ['金额不能为0'],
      });
    }

    const newTransaction = TransactionFactory.build({
      student_id: body.student_id,
      amount: body.amount,
      note: body.note,
      installment: body.installment,
    });

    mockData.transactions.push(newTransaction);

    return jsonSuccess(newTransaction, 201);
  }),

  /**
   * 更新交易
   */
  http.put(`${API_BASE_URL}/transactions/:uid`, async ({ params, request }) => {
    const uid = parseInt(params.uid as string, 10);
    const transactionIndex = mockData.transactions.findIndex((t) => t.uid === uid);

    if (transactionIndex === -1) {
      return ErrorHttpResponses.notFound('交易记录');
    }

    const body = await RequestHelpers.getBody(request);
    const updated = {
      ...mockData.transactions[transactionIndex],
      ...body,
      updated_at: new Date().toISOString(),
    };

    mockData.transactions[transactionIndex] = updated;

    return jsonSuccess(updated);
  }),

  /**
   * 删除交易
   */
  http.delete(`${API_BASE_URL}/transactions/:uid`, ({ params }) => {
    const uid = parseInt(params.uid as string, 10);
    const transactionIndex = mockData.transactions.findIndex((t) => t.uid === uid);

    if (transactionIndex === -1) {
      return ErrorHttpResponses.notFound('交易记录');
    }

    mockData.transactions.splice(transactionIndex, 1);

    return jsonSuccess(null, 204);
  }),

  // ============================================================================
  // 分期管理
  // ============================================================================

  /**
   * 获取所有分期
   */
  http.get(`${API_BASE_URL}/installments`, ({ request }) => {
    const { page, limit } = RequestHelpers.getPaginationParams(request);
    const paginated = DataFilterHelpers.paginate(mockData.installments, page, limit);

    return jsonPaginated(paginated, page, limit, mockData.installments.length);
  }),

  /**
   * 获取分期计划
   */
  http.get(`${API_BASE_URL}/installment-plans`, ({ request }) => {
    const { page, limit } = RequestHelpers.getPaginationParams(request);
    const paginated = DataFilterHelpers.paginate(mockData.installmentPlans, page, limit);

    return jsonPaginated(paginated, page, limit, mockData.installmentPlans.length);
  }),

  /**
   * 根据ID获取分期
   */
  http.get(`${API_BASE_URL}/installments/:uid`, ({ params }) => {
    const uid = parseInt(params.uid as string, 10);
    const installment = mockData.installments.find((i) => i.uid === uid);

    if (!installment) {
      return ErrorHttpResponses.notFound('分期记录');
    }

    return jsonSuccess(installment);
  }),

  /**
   * 支付分期
   */
  http.post(`${API_BASE_URL}/installments/:uid/pay`, async ({ params, request }) => {
    const uid = parseInt(params.uid as string, 10);
    const installmentIndex = mockData.installments.findIndex((i) => i.uid === uid);

    if (installmentIndex === -1) {
      return ErrorHttpResponses.notFound('分期记录');
    }

    const installment = mockData.installments[installmentIndex];
    
    if (installment.status === 'Paid') {
      return ErrorHttpResponses.badRequest('该分期已支付');
    }

    const body = await RequestHelpers.getBody(request);
    
    mockData.installments[installmentIndex] = {
      ...installment,
      status: 'Paid' as any,
      paid_amount: installment.installment_amount,
      paid_at: new Date().toISOString(),
      remaining_amount: 0,
      updated_at: new Date().toISOString(),
    };

    return jsonSuccess(mockData.installments[installmentIndex]);
  }),

  // ============================================================================
  // 统计数据
  // ============================================================================

  /**
   * 获取仪表板统计
   */
  http.get(`${API_BASE_URL}/stats/dashboard`, () => {
    const stats = DashboardStatsFactory.build({
      totalRevenue: mockData.transactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0),
      activeStudents: mockData.students.filter(s => s.is_membership_active).length,
      averageGrade: 85,
    });

    return jsonSuccess(stats);
  }),

  /**
   * 获取财务统计
   */
  http.get(`${API_BASE_URL}/stats/global-financial-stats`, () => {
    const totalIncome = mockData.transactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = Math.abs(
      mockData.transactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + t.amount, 0)
    );

    const stats = FinancialStatsFactory.buildProfit(totalIncome, totalExpense);

    return jsonSuccess(stats);
  }),
];

/**
 * 默认导出所有handlers
 */
export const handlers = enhancedHandlers;
