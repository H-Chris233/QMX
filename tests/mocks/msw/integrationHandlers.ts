import { http, HttpResponse } from 'msw';
import { 
  InstallmentStatus,
  ClassType,
  SubjectType,
  MembershipStatus,
  PaymentFrequency,
} from '@/types/api';
import type {
  Student,
  Transaction,
  Installment,
  InstallmentPlan,
  DashboardStats,
  StudentStats,
  FinancialStats,
  MembershipStats,
  StudentListResponse,
  TransactionListResponse,
  CurrentStudentInput,
  LoginCredentials,
  LoginResponse,
  User,
  HealthStatus,
  AdapterInfo,
  MembershipData,
  MembershipType,
  ApiResponse,
  ApiErrorPayload,
} from '@/types/api';

const API_BASE_URL = 'http://localhost:3001/api/v1';

// ============================================================================
// 数据工厂函数
// ============================================================================

/**
 * 创建学员数据
 */
export function createMockStudent(overrides: Partial<Student> = {}): Student {
  return {
    uid: 1,
    name: '测试学员',
    age: 20,
    phone: '13800138000',
    class: ClassType.MONTH,
    subject: SubjectType.SHOOTING,
    rings: [8, 9, 7],
    lesson_left: 10,
    membership_start_date: '2024-01-01',
    membership_end_date: '2024-12-31',
    membership_status: MembershipStatus.ACTIVE,
    is_membership_active: true,
    membership_days_remaining: 100,
    note: '测试学员',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * 创建交易数据
 */
export function createMockTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    uid: 1,
    student_id: 1,
    amount: 100.00,
    description: '测试交易',
    note: '测试备注',
    is_income: true,
    is_expense: false,
    is_installment: false,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
    ...overrides,
  };
}

/**
 * 创建分期付款数据
 */
export function createMockInstallment(overrides: Partial<Installment> = {}): Installment {
  return {
    uid: 1,
    plan_uid: 1,
    installment_number: 1,
    total_installments: 12,
    amount: 100.00,
    due_date: '2024-02-01',
    status: InstallmentStatus.PENDING,
    note: '第一期',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * 创建分期计划数据
 */
export function createMockInstallmentPlan(overrides: Partial<InstallmentPlan> = {}): InstallmentPlan {
  return {
    uid: 1,
    student_id: 1,
    total_amount: 1200.00,
    total_installments: 12,
    frequency: 'Monthly',
    custom_days: 30,
    start_date: '2024-01-01',
    status: 'Active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * 创建学员列表响应
 */
export function createStudentListResponse(
  students: Student[] = [],
  page: number = 1,
  limit: number = 10,
  total: number = 0
): StudentListResponse {
  return {
    students,
    pagination: {
      currentPage: page,
      itemsPerPage: limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * 创建交易列表响应
 */
export function createTransactionListResponse(
  transactions: Transaction[] = [],
  page: number = 1,
  limit: number = 10,
  total: number = 0
): TransactionListResponse {
  return {
    transactions,
    pagination: {
      currentPage: page,
      itemsPerPage: limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * 创建API成功响应
 */
export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * 创建API错误响应
 */
export function createErrorResponse(error: string, status: number = 400): HttpResponse {
  return HttpResponse.json(
    {
      success: false,
      error,
    } as ApiErrorPayload,
    { status }
  );
}

// ============================================================================
// 请求验证助手
// ============================================================================

/**
 * 验证snake_case字段名转换
 */
export function validateSnakeCaseFields(body: any): Record<string, any> {
  const converted: Record<string, any> = {};
  
  // 字段名映射表
  const fieldMap: Record<string, string> = {
    lessonLeft: 'lesson_left',
    membershipStartDate: 'membership_start_date',
    membershipEndDate: 'membership_end_date',
    classType: 'class',
    studentId: 'student_id',
    totalAmount: 'total_amount',
    totalInstallments: 'total_installments',
    dueDate: 'due_date',
    currentInstallment: 'current_installment',
    planId: 'plan_id',
    customDays: 'custom_days',
  };

  Object.keys(body).forEach(key => {
    const convertedKey = fieldMap[key] || key;
    converted[convertedKey] = body[key];
  });

  return converted;
}

/**
 * 验证金额单位转换（分 -> 元）
 */
export function validateAmountConversion(amountInCents: number): number {
  return Number((amountInCents / 100).toFixed(2));
}

// ============================================================================
// 内存数据存储
// ============================================================================

const mockStudents: Student[] = [
  createMockStudent({ uid: 1, name: '张三' }),
  createMockStudent({ uid: 2, name: '李四', age: 22, class: ClassType.YEAR, subject: SubjectType.ARCHERY }),
];

const mockTransactions: Transaction[] = [
  createMockTransaction({ uid: 1, student_id: 1, amount: 100.00 }),
  createMockTransaction({ uid: 2, student_id: 2, amount: 500.00 }),
];

const mockInstallments: Installment[] = [
  createMockInstallment({ uid: 1, plan_uid: 1, installment_number: 1 }),
  createMockInstallment({ uid: 2, plan_uid: 1, installment_number: 2 }),
];

const mockInstallmentPlans: InstallmentPlan[] = [
  createMockInstallmentPlan({ uid: 1, student_id: 1 }),
];

let nextStudentId = 3;
let nextTransactionId = 3;
let nextInstallmentId = 3;
let nextPlanId = 2;

// ============================================================================
// MSW Handlers
// ============================================================================

export const integrationHandlers = [
  // ============================================================================
  // 学员管理 API
  // ============================================================================

  /**
   * GET /api/v1/students - 获取学员列表
   */
  http.get(`${API_BASE_URL}/students`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const nameContains = url.searchParams.get('name_contains');
    const classType = url.searchParams.get('class_type');
    const hasMembership = url.searchParams.get('has_membership');

    let filteredStudents = [...mockStudents];

    // 应用筛选
    if (nameContains) {
      filteredStudents = filteredStudents.filter(s => 
        s.name.includes(nameContains)
      );
    }
    if (classType) {
      filteredStudents = filteredStudents.filter(s => 
        s.class === classType
      );
    }
    if (hasMembership !== null) {
      const hasMembershipBool = hasMembership === 'true';
      filteredStudents = filteredStudents.filter(s => 
        s.is_membership_active === hasMembershipBool
      );
    }

    const start = (page - 1) * limit;
    const paginatedStudents = filteredStudents.slice(start, start + limit);

    return HttpResponse.json(
      createSuccessResponse(
        createStudentListResponse(paginatedStudents, page, limit, filteredStudents.length)
      )
    );
  }),

  /**
   * GET /api/v1/students/search - 搜索学员
   */
  http.get(`${API_BASE_URL}/students/search`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    const results = mockStudents.filter(
      (s) =>
        s.name.includes(query) ||
        s.phone.includes(query) ||
        s.uid.toString().includes(query)
    );

    return HttpResponse.json(
      createSuccessResponse(
        createStudentListResponse(results, page, limit, results.length)
      )
    );
  }),

  /**
   * GET /api/v1/students/:id - 获取学员详情
   */
  http.get(`${API_BASE_URL}/students/:id`, ({ params }) => {
    const uid = parseInt(params.id as string);
    const student = mockStudents.find((s) => s.uid === uid);

    if (!student) {
      return createErrorResponse('学员不存在', 404);
    }

    return HttpResponse.json(createSuccessResponse(student));
  }),

  /**
   * POST /api/v1/students - 创建学员
   */
  http.post(`${API_BASE_URL}/students`, async ({ request }) => {
    const body = await request.json() as CurrentStudentInput;
    
    // 验证字段名转换
    const convertedBody = validateSnakeCaseFields(body);

    const newStudent: Student = createMockStudent({
      uid: nextStudentId++,
      name: convertedBody.name,
      age: convertedBody.age || null,
      phone: convertedBody.phone || '',
      class: convertedBody.class || ClassType.OTHERS,
      subject: convertedBody.subject || SubjectType.OTHERS,
      lesson_left: convertedBody.lesson_left || null,
      membership_start_date: convertedBody.membership_start_date || null,
      membership_end_date: convertedBody.membership_end_date || null,
      membership_status: convertedBody.membership_start_date ? MembershipStatus.ACTIVE : MembershipStatus.NONE,
      is_membership_active: !!convertedBody.membership_start_date,
      membership_days_remaining: convertedBody.membership_end_date ? 
        Math.ceil((new Date(convertedBody.membership_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0,
      note: convertedBody.note || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    mockStudents.push(newStudent);

    return HttpResponse.json(createSuccessResponse(newStudent), { status: 201 });
  }),

  /**
   * PUT /api/v1/students/:id - 更新学员
   */
  http.put(`${API_BASE_URL}/students/:id`, async ({ params, request }) => {
    const uid = parseInt(params.id as string);
    const studentIndex = mockStudents.findIndex((s) => s.uid === uid);

    if (studentIndex === -1) {
      return createErrorResponse('学员不存在', 404);
    }

    const body = await request.json();
    const convertedBody = validateSnakeCaseFields(body);

    const updated = {
      ...mockStudents[studentIndex],
      ...convertedBody,
      updated_at: new Date().toISOString(),
    };

    mockStudents[studentIndex] = updated;

    return HttpResponse.json(createSuccessResponse(updated));
  }),

  /**
   * DELETE /api/v1/students/:id - 删除学员
   */
  http.delete(`${API_BASE_URL}/students/:id`, ({ params }) => {
    const uid = parseInt(params.id as string);
    const studentIndex = mockStudents.findIndex((s) => s.uid === uid);

    if (studentIndex === -1) {
      return createErrorResponse('学员不存在', 404);
    }

    mockStudents.splice(studentIndex, 1);

    return HttpResponse.json(createSuccessResponse(null));
  }),

  // ============================================================================
  // 成绩管理 API
  // ============================================================================

  /**
   * GET /api/v1/students/:id/scores - 获取学员成绩
   */
  http.get(`${API_BASE_URL}/students/:id/scores`, ({ params }) => {
    const uid = parseInt(params.id as string);
    const student = mockStudents.find((s) => s.uid === uid);

    if (!student) {
      return createErrorResponse('学员不存在', 404);
    }

    return HttpResponse.json(createSuccessResponse({ rings: student.rings }));
  }),

  /**
   * POST /api/v1/students/:id/scores - 添加成绩
   */
  http.post(`${API_BASE_URL}/students/:id/scores`, async ({ params, request }) => {
    const uid = parseInt(params.id as string);
    const student = mockStudents.find((s) => s.uid === uid);

    if (!student) {
      return createErrorResponse('学员不存在', 404);
    }

    const { score } = await request.json() as { score: number };
    
    if (typeof score !== 'number' || score < 0 || score > 10) {
      return createErrorResponse('成绩必须在0-10之间', 400);
    }

    student.rings.push(score);
    student.updated_at = new Date().toISOString();

    return HttpResponse.json(createSuccessResponse({ rings: student.rings }));
  }),

  // ============================================================================
  // 交易管理 API
  // ============================================================================

  /**
   * GET /api/v1/transactions - 获取交易列表
   */
  http.get(`${API_BASE_URL}/transactions`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const studentId = url.searchParams.get('student_id');

    let filteredTransactions = [...mockTransactions];

    if (studentId) {
      filteredTransactions = filteredTransactions.filter(t => 
        t.student_id === parseInt(studentId)
      );
    }

    const start = (page - 1) * limit;
    const paginatedTransactions = filteredTransactions.slice(start, start + limit);

    return HttpResponse.json(
      createSuccessResponse(
        createTransactionListResponse(paginatedTransactions, page, limit, filteredTransactions.length)
      )
    );
  }),

  /**
   * GET /api/v1/transactions/search - 搜索交易
   */
  http.get(`${API_BASE_URL}/transactions/search`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    const results = mockTransactions.filter(
      (t) =>
        t.note?.includes(query) ||
        t.description?.includes(query) ||
        t.uid.toString().includes(query) ||
        t.student_id?.toString().includes(query)
    );

    return HttpResponse.json(
      createSuccessResponse(
        createTransactionListResponse(results, page, limit, results.length)
      )
    );
  }),

  /**
   * GET /api/v1/transactions/:id - 获取交易详情
   */
  http.get(`${API_BASE_URL}/transactions/:id`, ({ params }) => {
    const uid = parseInt(params.id as string);
    const transaction = mockTransactions.find((t) => t.uid === uid);

    if (!transaction) {
      return createErrorResponse('交易不存在', 404);
    }

    return HttpResponse.json(createSuccessResponse(transaction));
  }),

  /**
   * POST /api/v1/transactions - 创建普通交易
   */
  http.post(`${API_BASE_URL}/transactions`, async ({ request }) => {
    const body = await request.json();
    
    // 验证金额单位转换（前端传入元，后端转换为分）
    const amountInCents = Math.round(body.amount * 100);

    const newTransaction: Transaction = createMockTransaction({
      uid: nextTransactionId++,
      student_id: body.student_id || null,
      amount: validateAmountConversion(amountInCents),
      note: body.note || null,
      description: '交易记录',
      is_income: body.amount > 0,
      is_expense: body.amount < 0,
      is_installment: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    mockTransactions.push(newTransaction);

    return HttpResponse.json(createSuccessResponse(newTransaction), { status: 201 });
  }),

  /**
   * POST /api/v1/transactions/installment - 创建分期交易
   */
  http.post(`${API_BASE_URL}/transactions/installment`, async ({ request }) => {
    const body = await request.json();
    const convertedBody = validateSnakeCaseFields(body);

    const newPlan: InstallmentPlan = createMockInstallmentPlan({
      uid: nextPlanId++,
      student_id: convertedBody.student_id || null,
      total_amount: validateAmountConversion(Math.round(convertedBody.total_amount * 100)),
      total_installments: convertedBody.total_installments,
      frequency: convertedBody.frequency as PaymentFrequency,
      custom_days: convertedBody.custom_days,
      start_date: convertedBody.start_date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    mockInstallmentPlans.push(newPlan);

    // 创建首期交易
    const firstTransaction: Transaction = createMockTransaction({
      uid: nextTransactionId++,
      student_id: convertedBody.student_id || null,
      amount: validateAmountConversion(Math.round((convertedBody.total_amount / convertedBody.total_installments) * 100)),
      is_installment: true,
      installment: {
        plan_uid: newPlan.uid,
        installment_uid: null,
        installment_number: 1,
        total_installments: convertedBody.total_installments,
        due_date: convertedBody.start_date || new Date().toISOString().split('T')[0],
        status: InstallmentStatus.PENDING,
        note: '首期分期',
      },
    });

    mockTransactions.push(firstTransaction);

    return HttpResponse.json(createSuccessResponse(firstTransaction), { status: 201 });
  }),

  /**
   * DELETE /api/v1/transactions/:id - 删除交易
   */
  http.delete(`${API_BASE_URL}/transactions/:id`, ({ params }) => {
    const uid = parseInt(params.id as string);
    const transactionIndex = mockTransactions.findIndex((t) => t.uid === uid);

    if (transactionIndex === -1) {
      return createErrorResponse('交易不存在', 404);
    }

    mockTransactions.splice(transactionIndex, 1);

    return HttpResponse.json(createSuccessResponse(null));
  }),

  // ============================================================================
  // 分期管理 API
  // ============================================================================

  /**
   * GET /api/v1/installments - 获取分期状态
   */
  http.get(`${API_BASE_URL}/installments`, ({ request }) => {
    const url = new URL(request.url);
    const days = url.searchParams.get('days');
    
    let installments = [...mockInstallments];

    if (days) {
      const daysNum = parseInt(days);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + daysNum);
      
      installments = installments.filter(i => 
        new Date(i.due_date) <= cutoffDate && i.status === InstallmentStatus.PENDING
      );
    }

    return HttpResponse.json(createSuccessResponse(installments));
  }),

  /**
   * GET /api/v1/installments/:id - 获取分期计划详情
   */
  http.get(`${API_BASE_URL}/installments/:id`, ({ params }) => {
    const uid = parseInt(params.id as string);
    const plan = mockInstallmentPlans.find((p) => p.uid === uid);

    if (!plan) {
      return createErrorResponse('分期计划不存在', 404);
    }

    const planInstallments = mockInstallments.filter(i => i.plan_uid === uid);

    return HttpResponse.json(createSuccessResponse({
      plan,
      installments: planInstallments,
    }));
  }),

  /**
   * PUT /api/v1/installments/:id/status - 更新分期状态
   */
  http.put(`${API_BASE_URL}/installments/:id/status`, async ({ params, request }) => {
    const uid = parseInt(params.id as string);
    const { status } = await request.json() as { status: InstallmentStatus };

    const installmentIndex = mockInstallments.findIndex((i) => i.uid === uid);

    if (installmentIndex === -1) {
      return createErrorResponse('分期不存在', 404);
    }

    mockInstallments[installmentIndex].status = status;
    mockInstallments[installmentIndex].updated_at = new Date().toISOString();

    return HttpResponse.json(createSuccessResponse(mockInstallments[installmentIndex]));
  }),

  // ============================================================================
  // 会员管理 API
  // ============================================================================

  /**
   * GET /api/v1/membership/stats - 获取会员统计
   */
  http.get(`${API_BASE_URL}/membership/stats`, () => {
    const stats: MembershipStats = {
      total_members: mockStudents.filter(s => s.is_membership_active).length,
      active_members: mockStudents.filter(s => s.membership_status === 'Active').length,
      expired_members: mockStudents.filter(s => s.membership_status === 'Expired').length,
      upcoming_expirations: mockStudents.filter(s => {
        if (!s.membership_end_date) return false;
        const daysUntilExpiry = Math.ceil((new Date(s.membership_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
      }).length,
    };

    return HttpResponse.json(createSuccessResponse(stats));
  }),

  /**
   * POST /api/v1/membership/:studentId - 设置学员会员
   */
  http.post(`${API_BASE_URL}/membership/:studentId`, async ({ params, request }) => {
    const studentId = parseInt(params.studentId as string);
    const membershipData = await request.json() as MembershipData;

    const studentIndex = mockStudents.findIndex((s) => s.uid === studentId);

    if (studentIndex === -1) {
      return createErrorResponse('学员不存在', 404);
    }

    mockStudents[studentIndex] = {
      ...mockStudents[studentIndex],
      membership_start_date: membershipData.start_date,
      membership_end_date: membershipData.end_date,
      membership_status: 'Active',
      is_membership_active: true,
      membership_days_remaining: Math.ceil((new Date(membershipData.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      updated_at: new Date().toISOString(),
    };

    return HttpResponse.json(createSuccessResponse(mockStudents[studentIndex]));
  }),

  /**
   * DELETE /api/v1/membership/:studentId - 清除学员会员
   */
  http.delete(`${API_BASE_URL}/membership/:studentId`, ({ params }) => {
    const studentId = parseInt(params.studentId as string);
    const studentIndex = mockStudents.findIndex((s) => s.uid === studentId);

    if (studentIndex === -1) {
      return createErrorResponse('学员不存在', 404);
    }

    mockStudents[studentIndex] = {
      ...mockStudents[studentIndex],
      membership_start_date: null,
      membership_end_date: null,
      membership_status: 'None',
      is_membership_active: false,
      membership_days_remaining: 0,
      updated_at: new Date().toISOString(),
    };

    return HttpResponse.json(createSuccessResponse(mockStudents[studentIndex]));
  }),

  // ============================================================================
  // 统计数据 API
  // ============================================================================

  /**
   * GET /api/v1/stats/dashboard - 获取仪表板统计
   */
  http.get(`${API_BASE_URL}/stats/dashboard`, ({ request }) => {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'month';

    const stats: DashboardStats = {
      totalRevenue: mockTransactions.reduce((sum, t) => sum + (t.is_income ? t.amount : 0), 0),
      activeStudents: mockStudents.filter(s => s.is_membership_active).length,
      averageGrade: mockStudents.reduce((sum, s) => {
        const avg = s.rings.length > 0 ? s.rings.reduce((a, b) => a + b, 0) / s.rings.length : 0;
        return sum + avg;
      }, 0) / mockStudents.length,
    };

    return HttpResponse.json(createSuccessResponse(stats));
  }),

  /**
   * GET /api/v1/stats/students/:id - 获取学员统计
   */
  http.get(`${API_BASE_URL}/stats/students/:id`, ({ params }) => {
    const studentId = parseInt(params.id as string);
    const student = mockStudents.find((s) => s.uid === studentId);

    if (!student) {
      return createErrorResponse('学员不存在', 404);
    }

    const studentTransactions = mockTransactions.filter(t => t.student_id === studentId);
    const stats: StudentStats = {
      total_payments: studentTransactions.reduce((sum, t) => sum + (t.is_income ? t.amount : 0), 0),
      payment_count: studentTransactions.filter(t => t.is_income).length,
      average_score: student.rings.length > 0 ? student.rings.reduce((a, b) => a + b, 0) / student.rings.length : 0,
      max_score: student.rings.length > 0 ? Math.max(...student.rings) : 0,
      min_score: student.rings.length > 0 ? Math.min(...student.rings) : 0,
      score_count: student.rings.length,
      membership_status: student.membership_status || 'None',
      membership_is_active: student.is_membership_active,
      membership_days_remaining: student.membership_days_remaining,
    };

    return HttpResponse.json(createSuccessResponse(stats));
  }),

  /**
   * GET /api/v1/stats/financial - 获取财务统计
   */
  http.get(`${API_BASE_URL}/stats/financial`, ({ request }) => {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'month';

    const stats: FinancialStats = {
      totalIncome: mockTransactions.filter(t => t.is_income).reduce((sum, t) => sum + t.amount, 0),
      totalExpense: mockTransactions.filter(t => t.is_expense).reduce((sum, t) => sum + Math.abs(t.amount), 0),
      netIncome: mockTransactions.reduce((sum, t) => sum + t.amount, 0),
    };

    return HttpResponse.json(createSuccessResponse(stats));
  }),

  // ============================================================================
  // 认证 API
  // ============================================================================

  /**
   * POST /api/v1/auth/login - 用户登录
   */
  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const credentials = await request.json() as LoginCredentials;

    if (credentials.username === 'test@example.com' && credentials.password === 'password123') {
      const response: LoginResponse = {
        user: {
          uid: 1,
          username: 'test@example.com',
          name: '测试用户',
          role: 'admin',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        } as User,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600,
      };

      return HttpResponse.json(createSuccessResponse(response));
    }

    return createErrorResponse('用户名或密码错误', 401);
  }),

  /**
   * POST /api/v1/auth/logout - 用户登出
   */
  http.post(`${API_BASE_URL}/auth/logout`, () => {
    return HttpResponse.json(createSuccessResponse(null));
  }),

  /**
   * GET /api/v1/auth/me - 获取当前用户信息
   */
  http.get(`${API_BASE_URL}/auth/me`, () => {
    const user: User = {
      uid: 1,
      username: 'test@example.com',
      name: '测试用户',
      role: 'admin',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    return HttpResponse.json(createSuccessResponse(user));
  }),

  // ============================================================================
  // 适配器 API
  // ============================================================================

  /**
   * GET /api/v1/adapter/health - 获取健康状态
   */
  http.get(`${API_BASE_URL}/adapter/health`, () => {
    const health: HealthStatus = {
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    };

    return HttpResponse.json(createSuccessResponse(health));
  }),

  /**
   * GET /api/v1/adapter/info - 获取适配器信息
   */
  http.get(`${API_BASE_URL}/adapter/info`, () => {
    const info: AdapterInfo = {
      name: 'QMX Adapter',
      version: '1.0.0',
      database: 'mongodb',
      environment: 'test',
    };

    return HttpResponse.json(createSuccessResponse(info));
  }),

  // ============================================================================
  // 错误场景模拟
  // ============================================================================

  /**
   * 500 内部服务器错误
   */
  http.get(`${API_BASE_URL}/error/500`, () => {
    return createErrorResponse('内部服务器错误', 500);
  }),

  /**
   * 401 未授权错误
   */
  http.get(`${API_BASE_URL}/error/401`, () => {
    return createErrorResponse('未授权访问', 401);
  }),

  /**
   * 403 禁止访问错误
   */
  http.get(`${API_BASE_URL}/error/403`, () => {
    return createErrorResponse('禁止访问', 403);
  }),

  /**
   * 网络超时模拟
   */
  http.get(`${API_BASE_URL}/error/timeout`, () => {
    // 模拟网络延迟
    return new Promise(() => {}); // 永不响应
  }),
];