import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ApiService } from '../ApiService';
import { mswServer } from '../../../tests/setup';
import type {
  Student,
  CurrentStudentInput,
  Transaction,
  Installment,
  InstallmentPlan,
  MembershipData,
  DashboardStats,
  FinancialStats,
} from '../../types/api';

const API_BASE = '*/api/v1';

const createMockStudent = (overrides: Partial<Student> = {}): Student => ({
  uid: 101,
  name: '测试学员',
  age: 18,
  phone: '13800000000',
  class: 'Month',
  subject: 'Shooting',
  rings: [9, 9, 10],
  lesson_left: 12,
  note: '优秀学员',
  membership_start_date: '2024-01-01',
  membership_end_date: '2024-12-31',
  membership_status: 'Active',
  is_membership_active: true,
  membership_days_remaining: 300,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-10T00:00:00.000Z',
  ...overrides,
});

const createMockTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  uid: 501,
  student_id: 101,
  amount: 345.67,
  note: '课程费用',
  description: '收入',
  is_income: true,
  is_expense: false,
  is_installment: false,
  created_at: '2024-02-01T00:00:00.000Z',
  updated_at: '2024-02-01T00:00:00.000Z',
  ...overrides,
});

const createMockInstallment = (overrides: Partial<Installment> = {}): Installment => ({
  uid: 301,
  plan_id: 201,
  installment_amount: 200.0,
  current_installment: 2,
  total_installments: 6,
  due_date: '2024-03-01',
  status: 'Pending',
  paid_amount: 200.0,
  paid_at: '2024-02-01',
  student_id: 101,
  cash_uid: 501,
  is_overdue: false,
  days_overdue: 0,
  remaining_amount: 1000,
  created_at: '2024-02-01T00:00:00.000Z',
  updated_at: '2024-02-02T00:00:00.000Z',
  ...overrides,
});

const createMockInstallmentPlan = (overrides: Partial<InstallmentPlan> = {}): InstallmentPlan => ({
  uid: 201,
  student_id: 101,
  total_amount: 1200,
  total_installments: 6,
  frequency: 'Monthly',
  custom_days: null,
  start_date: '2024-01-01',
  status: 'Active',
  note: '训练营分期',
  created_at: '2023-12-31T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const createMockDashboardStats = (overrides: Partial<DashboardStats> = {}): DashboardStats => ({
  total_students: 120,
  total_revenue: 45678.9,
  total_expense: 12345.6,
  net_income: 33333.3,
  average_score: 8.6,
  max_score: 10,
  active_courses: 6,
  active_members: 48,
  active_installments: 12,
  overdue_installments: 1,
  ...overrides,
});

const createMockFinancialStats = (overrides: Partial<FinancialStats> = {}): FinancialStats => ({
  period: 'month',
  date_from: '2024-01-01',
  date_to: '2024-01-31',
  total_income: 50000,
  total_expense: 10000,
  net_income: 40000,
  net_profit: 38000,
  is_profitable: true,
  installment_total: 20000,
  installment_paid: 15000,
  installment_pending: 5000,
  installment_remaining: 0,
  transaction_count: 120,
  ...overrides,
});

beforeEach(() => {
  localStorage.clear();
  (window as any).showError = vi.fn();
});

afterEach(() => {
  vi.clearAllMocks();
  delete (window as any).showError;
});

describe('ApiService - 学员模块', () => {
  it('should send snake_case params and map response when fetching student list', async () => {
    let receivedUrl: URL | null = null;
    let authorizationHeader: string | null = null;

    const student = createMockStudent({ uid: 999, name: '李四' });

    mswServer.use(
      http.get(`${API_BASE}/students`, ({ request }) => {
        receivedUrl = new URL(request.url);
        authorizationHeader = request.headers.get('authorization');

        return HttpResponse.json({
          success: true,
          data: [student],
          pagination: {
            page: 2,
            limit: 50,
            total: 1,
            total_pages: 1,
          },
        });
      })
    );

    localStorage.setItem('auth_token', 'secure-token');

    const response = await ApiService.getAllStudents(
      {
        page: 2,
        limit: 50,
        has_membership: true,
        membership_status: 'Active',
        membership_active_at: '2024-01-01',
      },
      true
    );

    expect(receivedUrl).not.toBeNull();
    expect(receivedUrl?.pathname).toBe('/api/v1/students');
    expect(receivedUrl?.searchParams.get('page')).toBe('2');
    expect(receivedUrl?.searchParams.get('limit')).toBe('50');
    expect(receivedUrl?.searchParams.get('has_membership')).toBe('true');
    expect(receivedUrl?.searchParams.get('membership_status')).toBe('Active');
    expect(receivedUrl?.searchParams.get('membership_active_at')).toBe('2024-01-01');
    expect(authorizationHeader).toBe('Bearer secure-token');

    expect(response.students).toHaveLength(1);
    expect(response.students[0]).toMatchObject({ uid: 999, name: '李四' });
    expect(response.pagination).toEqual(
      expect.objectContaining({ page: 2, limit: 50, total: 1, total_pages: 1 })
    );
  });

  it('should omit undefined optional fields when creating a student', async () => {
    let capturedPayload: Record<string, unknown> | null = null;

    const input: CurrentStudentInput = {
      name: '王五',
      age: null,
      phone: '13900000001',
      class: 'Month',
      subject: 'Shooting',
      note: undefined,
      lesson_left: undefined,
      membership_start_date: undefined,
      membership_end_date: undefined,
    };

    const createdStudent = createMockStudent({ uid: 888, name: '王五', note: '', lesson_left: 0 });

    mswServer.use(
      http.post(`${API_BASE}/students`, async ({ request }) => {
        capturedPayload = await request.json();

        expect(capturedPayload).toMatchObject({
          name: '王五',
          age: null,
          phone: '13900000001',
          class: 'Month',
          subject: 'Shooting',
        });
        expect('lesson_left' in (capturedPayload ?? {})).toBe(false);
        expect('membership_start_date' in (capturedPayload ?? {})).toBe(false);
        expect('membership_end_date' in (capturedPayload ?? {})).toBe(false);

        return HttpResponse.json({
          success: true,
          data: createdStudent,
        }, { status: 201 });
      })
    );

    const result = await ApiService.addStudent(input);

    expect(capturedPayload).not.toBeNull();
    expect(result).toMatchObject({ uid: 888, name: '王五' });
  });

  it('should surface backend errors via showError when fetching student detail fails', async () => {
    mswServer.use(
      http.get(`${API_BASE}/students/:uid`, () => {
        return HttpResponse.json({
          success: false,
          error: '学员不存在',
        }, { status: 404 });
      })
    );

    await expect(ApiService.getStudentById(404)).rejects.toThrow('获取学员信息失败');

    const showError = (window as { showError: ReturnType<typeof vi.fn> }).showError;
    expect(showError).toHaveBeenCalledWith(
      '获取学员信息失败 (高优先级)',
      expect.stringContaining('学员不存在'),
      expect.any(String),
      true,
      'high'
    );
  });
});

describe('ApiService - 交易模块', () => {
  it('should map transaction list filters to query parameters', async () => {
    let receivedUrl: URL | null = null;

    const transaction = createMockTransaction();

    mswServer.use(
      http.get(`${API_BASE}/transactions`, ({ request }) => {
        receivedUrl = new URL(request.url);

        return HttpResponse.json({
          success: true,
          data: [transaction],
          pagination: {
            page: 3,
            limit: 10,
            total: 1,
            total_pages: 1,
          },
        });
      })
    );

    const response = await ApiService.getAllTransactions({
      page: 3,
      limit: 10,
      min_amount: 100,
      is_income: true,
      sort_by: undefined,
    });

    expect(receivedUrl).not.toBeNull();
    expect(receivedUrl?.pathname).toBe('/api/v1/transactions');
    expect(receivedUrl?.searchParams.get('page')).toBe('3');
    expect(receivedUrl?.searchParams.get('limit')).toBe('10');
    expect(receivedUrl?.searchParams.get('min_amount')).toBe('100');
    expect(receivedUrl?.searchParams.get('is_income')).toBe('true');
    expect(receivedUrl?.searchParams.has('sort_by')).toBe(false);

    expect(response.items).toHaveLength(1);
    expect(response.items[0]).toMatchObject({ uid: 501, amount: 345.67 });
  });

  it('should send snake_case body when creating cash transaction', async () => {
    let capturedPayload: Record<string, unknown> | null = null;

    const created = createMockTransaction({ uid: 777, amount: 120.5 });

    mswServer.use(
      http.post(`${API_BASE}/transactions`, async ({ request }) => {
        capturedPayload = await request.json();

        expect(capturedPayload).toEqual({
          student_id: 101,
          amount: 120.5,
          note: '报名费',
        });

        return HttpResponse.json({
          success: true,
          data: created,
        }, { status: 201 });
      })
    );

    const result = await ApiService.addCashTransaction({
      student_id: 101,
      amount: 120.5,
      note: '报名费',
    });

    expect(capturedPayload).not.toBeNull();
    expect(result).toMatchObject({ uid: 777, amount: 120.5 });
  });

  it('should use showError mapping when backend rejects cash transaction', async () => {
    mswServer.use(
      http.post(`${API_BASE}/transactions`, () => {
        return HttpResponse.json({
          success: false,
          error: '余额不足',
        }, { status: 422 });
      })
    );

    await expect(
      ApiService.addCashTransaction({ student_id: 1, amount: 200 })
    ).rejects.toThrow('新增交易失败');

    const showError = (window as { showError: ReturnType<typeof vi.fn> }).showError;
    expect(showError).toHaveBeenCalledWith(
      '新增交易失败 (高优先级)',
      expect.stringContaining('余额不足'),
      expect.any(String),
      false,
      'high'
    );
  });
});

describe('ApiService - 分期模块', () => {
  it('should send status updates with snake_case path', async () => {
    let capturedPayload: Record<string, unknown> | null = null;
    let requestedPath: string | null = null;

    const updatedInstallment = createMockInstallment({ status: 'Paid' });

    mswServer.use(
      http.patch(`${API_BASE}/installments/:transactionUid/status`, async ({ request, params }) => {
        capturedPayload = await request.json();
        requestedPath = request.url;

        expect(params.transactionUid).toBe('901');
        expect(capturedPayload).toEqual({ status: 'Paid' });

        return HttpResponse.json({
          success: true,
          data: updatedInstallment,
        });
      })
    );

    const result = await ApiService.updateInstallmentStatus(901, 'Paid');

    expect(requestedPath).toContain('/api/v1/installments/901/status');
    expect(result).toMatchObject({ uid: updatedInstallment.uid, status: 'Paid' });
  });

  it('should expose errors when retrieving plan fails', async () => {
    mswServer.use(
      http.get(`${API_BASE}/installments/:planId`, () => {
        return HttpResponse.json({
          success: false,
          error: '计划不存在',
        }, { status: 404 });
      })
    );

    await expect(ApiService.getInstallmentPlan(404)).rejects.toThrow('获取分期计划失败');

    const showError = (window as { showError: ReturnType<typeof vi.fn> }).showError;
    expect(showError).toHaveBeenCalledWith(
      '获取分期计划失败 (高优先级)',
      expect.stringContaining('计划不存在'),
      expect.any(String),
      true,
      'high'
    );
  });

  it('should fetch upcoming installments without days parameter when omitted', async () => {
    let receivedUrl: URL | null = null;

    mswServer.use(
      http.get(`${API_BASE}/installments/upcoming`, ({ request }) => {
        receivedUrl = new URL(request.url);

        return HttpResponse.json({
          success: true,
          data: [createMockInstallment()],
        });
      })
    );

    const result = await ApiService.getUpcomingInstallments();

    expect(receivedUrl).not.toBeNull();
    expect(receivedUrl?.searchParams.has('days')).toBe(false);
    expect(result).toHaveLength(1);
  });

  it('should map pay next installment response structure', async () => {
    const installment = createMockInstallment({ status: 'Paid', current_installment: 3 });
    const transaction = createMockTransaction({ uid: 888, amount: 200 });

    mswServer.use(
      http.post(`${API_BASE}/installments/:planId/next`, () => {
        return HttpResponse.json({
          success: true,
          data: {
            installment,
            transaction,
          },
        });
      })
    );

    const result = await ApiService.payNextInstallment(201);

    expect(result.installment).toMatchObject({ uid: installment.uid, status: 'Paid' });
    expect(result.transaction).toMatchObject({ uid: 888, amount: 200 });
  });
});

describe('ApiService - 会员模块', () => {
  it('should map membership payload fields correctly', async () => {
    let capturedPayload: Record<string, unknown> | null = null;

    const membership: MembershipData = {
      startDate: '2024-03-01',
      endDate: '2024-06-01',
    };

    const updatedStudent = createMockStudent({
      membership_start_date: '2024-03-01',
      membership_end_date: '2024-06-01',
    });

    mswServer.use(
      http.patch(`${API_BASE}/membership/students/:studentId/membership`, async ({ request, params }) => {
        capturedPayload = await request.json();
        expect(params.studentId).toBe('101');
        expect(capturedPayload).toEqual({
          membership_start_date: '2024-03-01',
          membership_end_date: '2024-06-01',
        });

        return HttpResponse.json({
          success: true,
          data: updatedStudent,
        });
      })
    );

    const result = await ApiService.setStudentMembership(101, membership);
    expect(result).toMatchObject({ uid: 101, membership_start_date: '2024-03-01' });
  });

  it('should propagate errors when renew membership fails', async () => {
    mswServer.use(
      http.post(`${API_BASE}/membership/students/:studentId/membership/renew`, () => {
        return HttpResponse.json({
          success: false,
          error: '会员已过期',
        }, { status: 400 });
      })
    );

    await expect(ApiService.renewMembership(1, 'year')).rejects.toThrow('续费会员失败');

    const showError = (window as { showError: ReturnType<typeof vi.fn> }).showError;
    expect(showError).toHaveBeenCalledWith(
      '续费会员失败 (高优先级)',
      expect.stringContaining('会员已过期'),
      expect.any(String),
      false,
      'high'
    );
  });

  it('should send batch membership payload with snake_case keys', async () => {
    let capturedPayload: Record<string, unknown> | null = null;

    mswServer.use(
      http.post(`${API_BASE}/membership/batch`, async ({ request }) => {
        capturedPayload = await request.json();

        expect(capturedPayload).toEqual({
          student_ids: [1, 2, 3],
          membership_start_date: null,
          membership_end_date: '2024-05-01',
        });

        return HttpResponse.json({
          success: true,
          data: { success: 3, failed: 0 },
        });
      })
    );

    const result = await ApiService.batchSetMembership([1, 2, 3], {
      startDate: null,
      endDate: '2024-05-01',
    });

    expect(capturedPayload).not.toBeNull();
    expect(result).toEqual({ success: 3, failed: 0 });
  });
});

describe('ApiService - 成绩模块', () => {
  it('should post scores to the correct endpoint', async () => {
    let capturedPayload: Record<string, unknown> | null = null;
    let requestedPath: string | null = null;

    mswServer.use(
      http.post(`${API_BASE}/students/:uid/scores`, async ({ request, params }) => {
        capturedPayload = await request.json();
        requestedPath = request.url;

        expect(params.uid).toBe('101');
        expect(capturedPayload).toEqual({ score: 95 });

        return HttpResponse.json({
          success: true,
          data: { rings: [90, 95] },
        }, { status: 201 });
      })
    );

    const result = await ApiService.addScore(101, 95);

    expect(requestedPath).toContain('/api/v1/students/101/scores');
    expect(result).toEqual([90, 95]);
  });

  it('should fallback to scores array when rings field missing', async () => {
    mswServer.use(
      http.put(`${API_BASE}/students/:uid/scores/batch`, async ({ params }) => {
        expect(params.uid).toBe('202');
        return HttpResponse.json({
          success: true,
          data: { scores: [88, 92, 96] },
        });
      })
    );

    const result = await ApiService.updateScoresBatch(202, [88, 92, 96]);
    expect(result).toEqual([88, 92, 96]);
  });

  it('should notify error handler when deleting score fails', async () => {
    mswServer.use(
      http.delete(`${API_BASE}/students/:uid/scores/:index`, () => {
        return HttpResponse.json({
          success: false,
          error: '成绩不存在',
        }, { status: 404 });
      })
    );

    await expect(ApiService.deleteStudentScore(1, 3)).rejects.toThrow('删除成绩失败');

    const showError = (window as { showError: ReturnType<typeof vi.fn> }).showError;
    expect(showError).toHaveBeenCalledWith(
      '删除成绩失败 (高优先级)',
      expect.stringContaining('成绩不存在'),
      expect.any(String),
      false,
      'high'
    );
  });
});

describe('ApiService - 统计模块', () => {
  it('should normalize uppercase period when fetching dashboard stats', async () => {
    let receivedUrl: URL | null = null;

    mswServer.use(
      http.get(`${API_BASE}/dashboard/stats`, ({ request }) => {
        receivedUrl = new URL(request.url);
        return HttpResponse.json({
          success: true,
          data: createMockDashboardStats(),
        });
      })
    );

    const result = await ApiService.getDashboardStats('ThisMonth');

    expect(receivedUrl).not.toBeNull();
    expect(receivedUrl?.searchParams.get('period')).toBe('month');
    expect(result.total_revenue).toBe(45678.9);
  });

  it('should map custom date range to query parameters for financial stats', async () => {
    let receivedUrl: URL | null = null;

    mswServer.use(
      http.get(`${API_BASE}/dashboard/financial-stats`, ({ request }) => {
        receivedUrl = new URL(request.url);
        return HttpResponse.json({
          success: true,
          data: createMockFinancialStats(),
        });
      })
    );

    const result = await ApiService.getFinancialStats({ start: '2024-01-01', end: '2024-01-31' });

    expect(receivedUrl).not.toBeNull();
    expect(receivedUrl?.searchParams.get('date_from')).toBe('2024-01-01');
    expect(receivedUrl?.searchParams.get('date_to')).toBe('2024-01-31');
    expect(result.net_income).toBe(40000);
  });

  it('should notify UI when student stats fetch fails', async () => {
    mswServer.use(
      http.get(`${API_BASE}/dashboard/students/:studentId/stats`, () => {
        return HttpResponse.json({
          success: false,
          error: '统计不可用',
        }, { status: 500 });
      })
    );

    await expect(ApiService.getStudentStats(1, 'today')).rejects.toThrow('获取学员统计失败');

    const showError = (window as { showError: ReturnType<typeof vi.fn> }).showError;
    expect(showError).toHaveBeenCalledWith(
      '获取学员统计失败 (高优先级)',
      expect.stringContaining('统计不可用'),
      expect.any(String),
      true,
      'high'
    );
  });

  it('should include days query when fetching expiring memberships', async () => {
    let receivedUrl: URL | null = null;

    mswServer.use(
      http.get(`${API_BASE}/dashboard/membership-expiring`, ({ request }) => {
        receivedUrl = new URL(request.url);
        return HttpResponse.json({
          success: true,
          data: [createMockStudent({ uid: 1 })],
        });
      })
    );

    const result = await ApiService.getMembershipExpiringSoon(15);

    expect(receivedUrl).not.toBeNull();
    expect(receivedUrl?.searchParams.get('days')).toBe('15');
    expect(result).toHaveLength(1);
  });
});
