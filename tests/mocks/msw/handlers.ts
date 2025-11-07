import { http, HttpResponse } from 'msw';
import type {
  Student,
  Transaction,
  Installment,
  DashboardStats,
  StudentStats,
  FinancialStats,
  StudentListResponse,
  TransactionListResponse,
} from '@/types/api';

const API_BASE_URL = 'http://localhost:3001/api/v1';

/**
 * 学员列表响应工厂
 */
function createStudentListResponse(
  students: Student[] = [],
  page: number = 1,
  limit: number = 10,
  total: number = 0
): StudentListResponse {
  return {
    students,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
      has_next: page * limit < total,
      has_prev: page > 1,
    },
  };
}

/**
 * 交易列表响应工厂
 */
function createTransactionListResponse(
  transactions: Transaction[] = [],
  page: number = 1,
  limit: number = 10,
  total: number = 0
): TransactionListResponse {
  return {
    transactions,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
      has_next: page * limit < total,
      has_prev: page > 1,
    },
  };
}

/**
 * 示例学员数据
 */
const mockStudents: Student[] = [
  {
    uid: 1,
    name: '张三',
    age: 20,
    phone: '13800138000',
    class: 'Month',
    subject: 'Shooting',
    rings: [8, 9, 7],
    lesson_left: 10,
    membership_start_date: '2024-01-01',
    membership_end_date: '2024-12-31',
    membership_status: 'Active',
    is_membership_active: true,
    membership_days_remaining: 100,
    note: '测试学员',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    uid: 2,
    name: '李四',
    age: 22,
    phone: '13800138001',
    class: 'Year',
    subject: 'Archery',
    rings: [9, 8, 9],
    lesson_left: 50,
    membership_start_date: '2024-01-01',
    membership_end_date: '2024-12-31',
    membership_status: 'Active',
    is_membership_active: true,
    membership_days_remaining: 100,
    note: '',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

/**
 * 示例交易数据
 */
const mockTransactions: Transaction[] = [
  {
    id: 1,
    student_id: 1,
    amount: 100.00,
    transaction_type: 'income',
    note: '课程费用',
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
  },
  {
    id: 2,
    student_id: 2,
    amount: 500.00,
    transaction_type: 'income',
    note: '会员费用',
    created_at: '2024-01-02T10:00:00Z',
    updated_at: '2024-01-02T10:00:00Z',
  },
];

/**
 * MSW 请求处理器
 */
export const handlers = [
  // ============================================================================
  // 学员管理
  // ============================================================================

  /**
   * 获取所有学员
   */
  http.get(`${API_BASE_URL}/students`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    return HttpResponse.json(
      {
        success: true,
        data: createStudentListResponse(mockStudents, page, limit, mockStudents.length),
      },
      { status: 200 }
    );
  }),

  /**
   * 根据 ID 获取学员
   */
  http.get(`${API_BASE_URL}/students/:uid`, ({ params }) => {
    const uid = parseInt(params.uid as string);
    const student = mockStudents.find((s) => s.uid === uid);

    if (!student) {
      return HttpResponse.json(
        {
          success: false,
          error: '学员不存在',
        },
        { status: 404 }
      );
    }

    return HttpResponse.json(
      {
        success: true,
        data: student,
      },
      { status: 200 }
    );
  }),

  /**
   * 搜索学员
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
      {
        success: true,
        data: createStudentListResponse(results, page, limit, results.length),
      },
      { status: 200 }
    );
  }),

  /**
   * 新增学员
   */
  http.post(`${API_BASE_URL}/students`, async ({ request }) => {
    const body = (await request.json()) as any;

    const newStudent: Student = {
      uid: mockStudents.length + 1,
      name: body.name,
      age: body.age,
      phone: body.phone,
      class: body.class,
      subject: body.subject,
      rings: [],
      lesson_left: body.lesson_left || 0,
      membership_start_date: body.membership_start_date,
      membership_end_date: body.membership_end_date,
      membership_status: 'None',
      is_membership_active: false,
      membership_days_remaining: 0,
      note: body.note || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockStudents.push(newStudent);

    return HttpResponse.json(
      {
        success: true,
        data: newStudent,
      },
      { status: 201 }
    );
  }),

  /**
   * 更新学员
   */
  http.put(`${API_BASE_URL}/students/:uid`, async ({ params, request }) => {
    const uid = parseInt(params.uid as string);
    const studentIndex = mockStudents.findIndex((s) => s.uid === uid);

    if (studentIndex === -1) {
      return HttpResponse.json(
        {
          success: false,
          error: '学员不存在',
        },
        { status: 404 }
      );
    }

    const body = (await request.json()) as any;
    const updated = {
      ...mockStudents[studentIndex],
      ...body,
      updated_at: new Date().toISOString(),
    };

    mockStudents[studentIndex] = updated;

    return HttpResponse.json(
      {
        success: true,
        data: updated,
      },
      { status: 200 }
    );
  }),

  /**
   * 删除学员
   */
  http.delete(`${API_BASE_URL}/students/:uid`, ({ params }) => {
    const uid = parseInt(params.uid as string);
    const studentIndex = mockStudents.findIndex((s) => s.uid === uid);

    if (studentIndex === -1) {
      return HttpResponse.json(
        {
          success: false,
          error: '学员不存在',
        },
        { status: 404 }
      );
    }

    mockStudents.splice(studentIndex, 1);

    return HttpResponse.json(
      {
        success: true,
        data: null,
      },
      { status: 200 }
    );
  }),

  // ============================================================================
  // 交易管理
  // ============================================================================

  /**
   * 获取所有交易
   */
  http.get(`${API_BASE_URL}/transactions`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    return HttpResponse.json(
      {
        success: true,
        data: createTransactionListResponse(mockTransactions, page, limit, mockTransactions.length),
      },
      { status: 200 }
    );
  }),

  /**
   * 新增交易
   */
  http.post(`${API_BASE_URL}/transactions`, async ({ request }) => {
    const body = (await request.json()) as any;

    const newTransaction: Transaction = {
      id: mockTransactions.length + 1,
      student_id: body.student_id,
      amount: body.amount,
      transaction_type: body.transaction_type || 'income',
      note: body.note || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockTransactions.push(newTransaction);

    return HttpResponse.json(
      {
        success: true,
        data: newTransaction,
      },
      { status: 201 }
    );
  }),

  // ============================================================================
  // 分期管理
  // ============================================================================

  /**
   * 获取所有分期
   */
  http.get(`${API_BASE_URL}/installments`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    return HttpResponse.json(
      {
        success: true,
        data: {
          installments: [],
          pagination: {
            page,
            limit,
            total: 0,
            total_pages: 0,
            has_next: false,
            has_prev: false,
          },
        },
      },
      { status: 200 }
    );
  }),

  // ============================================================================
  // 统计数据
  // ============================================================================

  /**
   * 获取仪表板统计
   */
  http.get(`${API_BASE_URL}/stats/dashboard`, () => {
    const stats: DashboardStats = {
      totalRevenue: 10000,
      activeStudents: 50,
      averageGrade: 85,
    };

    return HttpResponse.json(
      {
        success: true,
        data: stats,
      },
      { status: 200 }
    );
  }),

  /**
   * 获取学员统计
   */
  http.get(`${API_BASE_URL}/stats/students`, () => {
    const stats: StudentStats = {
      total: 100,
      active: 80,
      inactive: 20,
    };

    return HttpResponse.json(
      {
        success: true,
        data: stats,
      },
      { status: 200 }
    );
  }),

  /**
   * 获取财务统计
   */
  http.get(`${API_BASE_URL}/stats/financial`, () => {
    const stats: FinancialStats = {
      totalIncome: 50000,
      totalExpense: 10000,
      netIncome: 40000,
    };

    return HttpResponse.json(
      {
        success: true,
        data: stats,
      },
      { status: 200 }
    );
  }),
];
