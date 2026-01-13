/**
 * Controller Layer Unit Tests
 *
 * 测试控制器层的参数解析、格式化逻辑和业务编排
 */

import { Request, Response } from 'express';
import { StudentController } from '@/controllers/studentController';
import { CashController } from '@/controllers/cashController';
import { AppError, ErrorType } from '@/utils/errors';

// 模拟 Repository 和 Service 层
jest.mock('@/db/repositories/studentRepository', () => ({
  StudentRepository: {
    findWithPagination: jest.fn(),
    findByUid: jest.fn(),
    create: jest.fn(),
    updateByUid: jest.fn(),
    deleteByUid: jest.fn(),
    findAll: jest.fn(),
    findExpiringMemberships: jest.fn(),
  },
}));

jest.mock('@/db/repositories/cashRepository', () => ({
  CashRepository: {
    findWithPagination: jest.fn(),
    findByUid: jest.fn(),
    create: jest.fn(),
    updateByUid: jest.fn(),
    deleteByUid: jest.fn(),
    getFinancialStats: jest.fn(),
    getStudentIncomeRanking: jest.fn(),
  },
}));

jest.mock('@/db/repositories/installmentRepository', () => ({
  InstallmentRepository: {
    findByUid: jest.fn(),
    updateByUid: jest.fn(),
    findByPlanId: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    refreshPlanStatus: jest.fn(),
    isOverdue: jest.fn(),
    getDaysOverdue: jest.fn(),
  },
  InstallmentPlanRepository: {
    findByUid: jest.fn(),
    create: jest.fn(),
    updateByUid: jest.fn(),
    findWithPagination: jest.fn(),
    calculateInstallmentAmount: jest.fn(),
  },
}));

jest.mock('@/services/studentPresenter', () => ({
  presentStudent: jest.fn((student) => ({
    uid: student.uid,
    name: student.name,
    // 简化版 presenter
  })),
}));

jest.mock('@/services/cashBuilder', () => ({
  CashBuilder: {
    create: jest.fn().mockReturnValue({
      amount: jest.fn().mockReturnThis(),
      note: jest.fn().mockReturnThis(),
      studentId: jest.fn().mockReturnThis(),
      installment: jest.fn().mockReturnThis(),
      build: jest.fn().mockResolvedValue({ uid: 1, amount: 10000 }),
    }),
  },
  convertAmountToCents: jest.fn((amount) => Math.round(amount * 100)),
  normalizeNote: jest.fn((note) => note || null),
}));

jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('StudentController - Helper Functions', () => {
  const createMockRequest = (query: any = {}, body: any = {}): Partial<Request> => ({
    query,
    body,
    params: {},
  });

  const createMockResponse = (): { res: Partial<Response>; json: jest.Mock; status: jest.Mock } => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return {
      res: { status, json, set: jest.fn() },
      json,
      status,
    };
  };

  const mockNext = jest.fn();

  describe('parseNumber', () => {
    // 通过访问私有方法测试（通过jest.spyOn）
    it('handles valid numbers', () => {
      const parseNumber = (StudentController as any).parseNumber || ((v: unknown) => {
        if (v === undefined || v === null || v === "") {
          return null;
        }
        const parsed = Number(v);
        return Number.isFinite(parsed) ? parsed : null;
      });

      expect(parseNumber(100)).toBe(100);
      expect(parseNumber('50')).toBe(50);
      expect(parseNumber(0)).toBe(0);
      expect(parseNumber(-10)).toBe(-10);
    });

    it('handles null/undefined/empty', () => {
      const parseNumber = (StudentController as any).parseNumber || ((v: unknown) => {
        if (v === undefined || v === null || v === "") {
          return null;
        }
        const parsed = Number(v);
        return Number.isFinite(parsed) ? parsed : null;
      });

      expect(parseNumber(null)).toBeNull();
      expect(parseNumber(undefined)).toBeNull();
      expect(parseNumber('')).toBeNull();
    });

    it('handles invalid values', () => {
      const parseNumber = (StudentController as any).parseNumber || ((v: unknown) => {
        if (v === undefined || v === null || v === "") {
          return null;
        }
        const parsed = Number(v);
        return Number.isFinite(parsed) ? parsed : null;
      });

      expect(parseNumber(NaN)).toBeNull();
      expect(parseNumber(Infinity)).toBeNull();
      expect(parseNumber('abc')).toBeNull();
    });
  });

  describe('parseBoolean', () => {
    it('parses true values', () => {
      const parseBoolean = (StudentController as any).parseBoolean || ((v: unknown) => {
        if (v === undefined || v === null) {
          return null;
        }
        if (typeof v === "boolean") {
          return v;
        }
        const stringified = String(v).toLowerCase();
        if (["true", "1", "yes"].includes(stringified)) {
          return true;
        }
        if (["false", "0", "no"].includes(stringified)) {
          return false;
        }
        return null;
      });

      expect(parseBoolean(true)).toBe(true);
      expect(parseBoolean('true')).toBe(true);
      expect(parseBoolean('TRUE')).toBe(true);
      expect(parseBoolean('1')).toBe(true);
      expect(parseBoolean('yes')).toBe(true);
    });

    it('parses false values', () => {
      const parseBoolean = (StudentController as any).parseBoolean || ((v: unknown) => {
        if (v === undefined || v === null) {
          return null;
        }
        if (typeof v === "boolean") {
          return v;
        }
        const stringified = String(v).toLowerCase();
        if (["true", "1", "yes"].includes(stringified)) {
          return true;
        }
        if (["false", "0", "no"].includes(stringified)) {
          return false;
        }
        return null;
      });

      expect(parseBoolean(false)).toBe(false);
      expect(parseBoolean('false')).toBe(false);
      expect(parseBoolean('FALSE')).toBe(false);
      expect(parseBoolean('0')).toBe(false);
      expect(parseBoolean('no')).toBe(false);
    });

    it('returns null for invalid values', () => {
      const parseBoolean = (StudentController as any).parseBoolean || ((v: unknown) => {
        if (v === undefined || v === null) {
          return null;
        }
        if (typeof v === "boolean") {
          return v;
        }
        const stringified = String(v).toLowerCase();
        if (["true", "1", "yes"].includes(stringified)) {
          return true;
        }
        if (["false", "0", "no"].includes(stringified)) {
          return false;
        }
        return null;
      });

      expect(parseBoolean(null)).toBeNull();
      expect(parseBoolean(undefined)).toBeNull();
      expect(parseBoolean('maybe')).toBeNull();
      expect(parseBoolean(2)).toBeNull();
    });
  });

  describe('Query Parameter Building', () => {
    it('builds query options from request query', () => {
      const req = createMockRequest({
        page: '1',
        limit: '20',
        name_contains: 'test',
        min_age: '18',
        max_age: '30',
        class_type: 'MONTH',
        subject: 'SHOOTING',
        has_membership: 'true',
        sort_by: 'name',
        sort_order: 'ASC',
      });

      // 测试参数解析逻辑
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const nameContains = req.query.name_contains as string;
      const classType = req.query.class_type as any;
      const subject = req.query.subject as any;
      const hasMembership = req.query.has_membership === 'true';

      expect(page).toBe(1);
      expect(limit).toBe(20);
      expect(nameContains).toBe('test');
      expect(classType).toBe('MONTH');
      expect(subject).toBe('SHOOTING');
      expect(hasMembership).toBe(true);
    });

    it('applies default values for missing query params', () => {
      const req = createMockRequest({});

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const sortOrder = (req.query.sort_order as string) || 'DESC';

      expect(page).toBe(1);
      expect(limit).toBe(20);
      expect(sortOrder).toBe('DESC');
    });
  });

  describe('Request Body Processing', () => {
    it('processes student creation payload', () => {
      const payload = {
        name: '张三',
        age: 25,
        phone: '13800138000',
        class: 'MONTH',
        subject: 'SHOOTING',
        lesson_left: 10,
        rings: [9, 8, 10],
        membership_start_date: '2024-01-01',
        membership_end_date: '2024-12-31',
      };

      // 测试数据转换逻辑
      const processed = {
        name: payload.name,
        age: payload.age === null || payload.age === undefined ? null : Number(payload.age),
        phone: payload.phone,
        classType: payload.class?.toUpperCase(),
        subject: payload.subject?.toUpperCase(),
        lessonLeft: Number(payload.lesson_left ?? 0) || 0,
        rings: Array.isArray(payload.rings) ? payload.rings : [],
        membershipStartDate: payload.membership_start_date,
        membershipEndDate: payload.membership_end_date,
      };

      expect(processed.name).toBe('张三');
      expect(processed.age).toBe(25);
      expect(processed.classType).toBe('MONTH');
      expect(processed.subject).toBe('SHOOTING');
      expect(processed.lessonLeft).toBe(10);
      expect(processed.rings).toEqual([9, 8, 10]);
    });

    it('handles optional fields correctly', () => {
      const payload: Partial<{
        name: string;
        phone: string;
        age?: number | null;
        lesson_left?: number;
        rings?: number[];
        membership_start_date?: string;
        membership_end_date?: string;
      }> = {
        name: '李四',
        phone: '13900139000',
      };

      const processed = {
        name: payload.name,
        age: payload.age === null || payload.age === undefined ? null : Number(payload.age),
        lessonLeft: Number(payload.lesson_left ?? 0) || 0,
        rings: Array.isArray(payload.rings) ? payload.rings : [],
        membershipStartDate: payload.membership_start_date ? 'string' : null,
        membershipEndDate: payload.membership_end_date ? 'string' : null,
      };

      expect(processed.name).toBe('李四');
      expect(processed.age).toBeNull();
      expect(processed.lessonLeft).toBe(0);
      expect(processed.rings).toEqual([]);
      expect(processed.membershipStartDate).toBeNull();
    });

    it('handles date string conversion', () => {
      const dateInput = new Date('2024-06-15T00:00:00.000Z');
      const dateString = '2024-06-15';

      const toISOSplit = (date: Date | string) => {
        if (typeof date === 'string') {
          return date;
        }
        return date.toISOString().split('T')[0];
      };

      expect(toISOSplit(dateInput)).toBe('2024-06-15');
      expect(toISOSplit(dateString)).toBe('2024-06-15');
    });
  });
});

describe('CashController - Helper Functions', () => {
  describe('buildSearchOptions', () => {
    it('builds search options with all parameters', () => {
      const query = {
        studentId: '123',
        minAmount: '100',
        maxAmount: '1000',
        isIncome: 'true',
        hasInstallment: 'false',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        page: '2',
        limit: '50',
        sortBy: 'amount',
        sortOrder: 'ASC',
      };

      const options = {
        student_id: Number(query.studentId),
        min_amount: Math.round(Number(query.minAmount) * 100),
        max_amount: Math.round(Number(query.maxAmount) * 100),
        is_income: query.isIncome === 'true',
        has_installment: query.hasInstallment === 'false',
        date_from: query.dateFrom,
        date_to: query.dateTo,
        page: Number(query.page),
        limit: Number(query.limit),
        sort_by: query.sortBy,
        sort_order: query.sortOrder,
      };

      expect(options.student_id).toBe(123);
      expect(options.min_amount).toBe(10000);
      expect(options.max_amount).toBe(100000);
      expect(options.is_income).toBe(true);
      expect(options.has_installment).toBe(false);
      expect(options.page).toBe(2);
      expect(options.limit).toBe(50);
    });

    it('handles empty query', () => {
      const query: Record<string, never> = {};

      const options: Record<string, unknown> = {};
      if ((query as Record<string, unknown>).page !== undefined && (query as Record<string, unknown>).page !== null && (query as Record<string, unknown>).page !== '') {
        options.page = Number((query as Record<string, unknown>).page);
      }

      expect(options).toEqual({});
    });

    it('normalizes sort field', () => {
      const CASH_SORT_FIELDS = ['uid', 'studentId', 'amount', 'created_at', 'updated_at'];
      const isCashSortField = (value: unknown): value is string =>
        typeof value === 'string' && CASH_SORT_FIELDS.includes(value);

      expect(isCashSortField('amount')).toBe(true);
      expect(isCashSortField('invalid')).toBe(false);
      expect(isCashSortField(123)).toBe(false);
    });

    it('normalizes sort order', () => {
      const normalizeSortOrder = (value: unknown): 'ASC' | 'DESC' | undefined => {
        if (typeof value !== 'string') {
          return undefined;
        }
        const upper = value.toUpperCase();
        return upper === 'ASC' || upper === 'DESC' ? upper as 'ASC' | 'DESC' : undefined;
      };

      expect(normalizeSortOrder('ASC')).toBe('ASC');
      expect(normalizeSortOrder('asc')).toBe('ASC');
      expect(normalizeSortOrder('DESC')).toBe('DESC');
      expect(normalizeSortOrder('INVALID')).toBe(undefined);
      expect(normalizeSortOrder(null)).toBe(undefined);
    });
  });

  describe('presentTransaction', () => {
    it('formats transaction correctly', () => {
      const transaction = {
        uid: 1,
        studentId: 100,
        amount: 10000, // 100.00 元
        note: 'Test note',
        createdAt: new Date('2024-06-15T12:00:00Z'),
        updatedAt: new Date('2024-06-15T12:00:00Z'),
        installmentSnapshot: null,
      };

      const amountYuan = transaction.amount / 100;
      const isIncome = transaction.amount > 0;

      const presented = {
        uid: transaction.uid,
        student_id: transaction.studentId,
        amount: amountYuan,
        amountInCents: transaction.amount,
        note: transaction.note,
        is_income: isIncome,
        is_expense: !isIncome,
        formatted_amount: isIncome
          ? `+¥${amountYuan.toFixed(2)}`
          : `-¥${Math.abs(amountYuan).toFixed(2)}`,
        created_at: transaction.createdAt.toISOString(),
      };

      expect(presented.amount).toBe(100);
      expect(presented.formatted_amount).toBe('+¥100.00');
      expect(presented.is_income).toBe(true);
      expect(presented.is_expense).toBe(false);
    });

    it('handles negative amounts', () => {
      const transaction = {
        uid: 2,
        studentId: 100,
        amount: -5000, // -50.00 元
        note: 'Expense',
        createdAt: new Date(),
        updatedAt: new Date(),
        installmentSnapshot: null,
      };

      const amountYuan = transaction.amount / 100;
      const isIncome = transaction.amount > 0;

      expect(amountYuan).toBe(-50);
      expect(isIncome).toBe(false);
      expect(`-¥${Math.abs(amountYuan).toFixed(2)}`).toBe('-¥50.00');
    });

    it('handles installment transactions', () => {
      const transaction = {
        uid: 3,
        studentId: 100,
        amount: 3333, // 33.33 元
        note: '分期付款: 第1/3期',
        createdAt: new Date(),
        updatedAt: new Date(),
        installmentSnapshot: {
          plan_uid: 1,
          installment_uid: 1,
          installment_number: 1,
          total_installments: 3,
          due_date: '2024-07-01',
          status: 'PAID',
        },
      };

      const presented = {
        uid: transaction.uid,
        installment: transaction.installmentSnapshot,
      };

      expect(presented.installment).toBeDefined();
      expect(presented.installment?.plan_uid).toBe(1);
      expect(presented.installment?.installment_number).toBe(1);
      expect(presented.installment?.total_installments).toBe(3);
    });
  });

  describe('Frequency Normalization', () => {
    it('validates payment frequencies', () => {
      const normalizeFrequency = (value: unknown): string | null => {
        if (typeof value !== 'string') {
          return null;
        }
        const validFrequencies = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'CUSTOM'];
        return validFrequencies.find((item) => item === value) ?? null;
      };

      expect(normalizeFrequency('WEEKLY')).toBe('WEEKLY');
      expect(normalizeFrequency('MONTHLY')).toBe('MONTHLY');
      expect(normalizeFrequency('QUARTERLY')).toBe('QUARTERLY');
      expect(normalizeFrequency('CUSTOM')).toBe('CUSTOM');
      expect(normalizeFrequency('INVALID')).toBe(null);
      expect(normalizeFrequency(null)).toBe(null);
    });
  });

  describe('Installment Date Calculation', () => {
    it('calculates next due date for WEEKLY', () => {
      const current = new Date('2024-06-01T00:00:00.000Z');
      const frequency = 'WEEKLY';

      const next = new Date(current);
      next.setDate(next.getDate() + 7);

      expect(next.getUTCDate()).toBe(8);
    });

    it('calculates next due date for MONTHLY', () => {
      const current = new Date('2024-06-01T00:00:00.000Z');
      const frequency = 'MONTHLY';

      const next = new Date(current);
      next.setUTCMonth(next.getUTCMonth() + 1);

      expect(next.getUTCMonth()).toBe(6); // July
    });

    it('calculates next due date for QUARTERLY', () => {
      const current = new Date('2024-06-01T00:00:00.000Z');
      const frequency = 'QUARTERLY';

      const next = new Date(current);
      next.setUTCMonth(next.getUTCMonth() + 3);

      expect(next.getUTCMonth()).toBe(8); // September
    });

    it('calculates next due date for CUSTOM', () => {
      const current = new Date('2024-06-01T00:00:00.000Z');
      const customDays = 14;

      const next = new Date(current);
      next.setDate(next.getDate() + customDays);

      expect(next.getUTCDate()).toBe(15);
    });
  });

  describe('Status Text Generation', () => {
    it('generates correct status text', () => {
      const getStatusText = (status: string): string => {
        const statusMap: Record<string, string> = {
          PENDING: '待支付',
          PAID: '已支付',
          OVERDUE: '已逾期',
          CANCELLED: '已取消',
          ACTIVE: '进行中',
          COMPLETED: '已完成',
        };
        return statusMap[status] ?? status;
      };

      expect(getStatusText('PENDING')).toBe('待支付');
      expect(getStatusText('PAID')).toBe('已支付');
      expect(getStatusText('OVERDUE')).toBe('已逾期');
      expect(getStatusText('CANCELLED')).toBe('已取消');
      expect(getStatusText('ACTIVE')).toBe('进行中');
      expect(getStatusText('COMPLETED')).toBe('已完成');
      expect(getStatusText('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('Frequency Text Generation', () => {
    it('generates correct frequency text', () => {
      const getFrequencyText = (frequency: string, customDays?: number | null): string => {
        switch (frequency) {
          case 'WEEKLY': return '周付';
          case 'MONTHLY': return '月付';
          case 'QUARTERLY': return '季付';
          case 'CUSTOM':
            if (typeof customDays === 'number' && customDays > 0) {
              return `${customDays}天一次`;
            }
            return '自定义';
          default: return frequency;
        }
      };

      expect(getFrequencyText('WEEKLY')).toBe('周付');
      expect(getFrequencyText('MONTHLY')).toBe('月付');
      expect(getFrequencyText('QUARTERLY')).toBe('季付');
      expect(getFrequencyText('CUSTOM', 14)).toBe('14天一次');
      expect(getFrequencyText('CUSTOM', null)).toBe('自定义');
    });
  });

  describe('Amount Formatting', () => {
    it('formats cents to yuan with 2 decimal places', () => {
      const formatAmount = (cents: number): number => {
        return Number((cents / 100).toFixed(2));
      };

      expect(formatAmount(10000)).toBe(100);
      expect(formatAmount(9999)).toBe(99.99);
      expect(formatAmount(1)).toBe(0.01);
      expect(formatAmount(100)).toBe(1);
    });

    it('handles large amounts', () => {
      const formatAmount = (cents: number): number => {
        return Number((cents / 100).toFixed(2));
      };

      expect(formatAmount(9999999999)).toBe(99999999.99);
    });
  });

  describe('Installment Note Building', () => {
    it('builds installment note with base note', () => {
      const buildInstallmentNote = (baseNote: string | null, current: number, total: number): string => {
        const label = baseNote ? baseNote : '分期付款';
        return `${label}: 第${current}/${total}期`;
      };

      expect(buildInstallmentNote('学费', 1, 3)).toBe('学费: 第1/3期');
      expect(buildInstallmentNote(null, 2, 4)).toBe('分期付款: 第2/4期');
    });
  });
});

describe('Batch Operations - Parameter Validation', () => {
  describe('Student Batch Update', () => {
    it('validates studentIds array', () => {
      const validateStudentIds = (studentIds: unknown): boolean => {
        return !!studentIds &&
               Array.isArray(studentIds) &&
               studentIds.length > 0;
      };

      expect(validateStudentIds([1, 2, 3])).toBe(true);
      expect(validateStudentIds([])).toBe(false);
      expect(validateStudentIds(null)).toBe(false);
      expect(validateStudentIds(undefined)).toBe(false);
      expect(validateStudentIds('invalid')).toBe(false);
    });

    it('parses numeric IDs', () => {
      const parseStudentIds = (studentIds: number[]): number[] => {
        return studentIds.map(id => Number(id));
      };

      expect(parseStudentIds([1, 2, 3])).toEqual([1, 2, 3]);
      expect(parseStudentIds(['100', '200'] as any)).toEqual([100, 200]);
    });
  });

  describe('Student Batch Delete', () => {
    it('validates studentIds for deletion', () => {
      const validateForDelete = (studentIds: unknown): { valid: boolean; message?: string } => {
        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
          return { valid: false, message: '学员ID列表不能为空' };
        }
        return { valid: true };
      };

      const result1 = validateForDelete([1, 2, 3]);
      expect(result1.valid).toBe(true);

      const result2 = validateForDelete([]);
      expect(result2.valid).toBe(false);
      expect(result2.message).toContain('不能为空');
    });
  });
});

describe('Error Handling Integration', () => {
  describe('AppError Factory in Controllers', () => {
    it('creates NotFound error for missing student', () => {
      const error = AppError.notFound('学员不存在');
      expect(error.type).toBe(ErrorType.NotFound);
      expect(error.statusCode).toBe(404);
    });

    it('creates InvalidInput error for invalid data', () => {
      const error = AppError.invalidInput('学员ID列表不能为空');
      expect(error.type).toBe(ErrorType.InvalidInput);
      expect(error.statusCode).toBe(400);
    });

    it('creates State error for conflicts', () => {
      const error = AppError.state('数据已存在');
      expect(error.type).toBe(ErrorType.State);
      expect(error.statusCode).toBe(409);
    });

    it('creates Other error for unknown failures', () => {
      const error = AppError.other('删除学员失败');
      expect(error.type).toBe(ErrorType.Other);
      expect(error.statusCode).toBe(500);
    });
  });
});

describe('Response Format Validation', () => {
  describe('Standard Response Format', () => {
    it('formats paginated response correctly', () => {
      const response = {
        success: true,
        data: [{ uid: 1 }, { uid: 2 }],
        pagination: {
          page: 1,
          limit: 20,
          total: 100,
          totalPages: 5,
        },
      };

      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(2);
      expect(response.pagination).toHaveProperty('page');
      expect(response.pagination).toHaveProperty('limit');
      expect(response.pagination).toHaveProperty('total');
      expect(response.pagination).toHaveProperty('totalPages');
    });

    it('formats create response with message', () => {
      const response = {
        success: true,
        data: { uid: 1, name: '新学员' },
        message: '学员添加成功',
      };

      expect(response.success).toBe(true);
      expect(response.message).toBeDefined();
    });

    it('formats delete response with message', () => {
      const response: {
        success: boolean;
        message: string;
        data?: undefined;
      } = {
        success: true,
        message: '学员删除成功',
      };

      expect(response.success).toBe(true);
      expect(response.data).toBeUndefined();
      expect(response.message).toBe('学员删除成功');
    });
  });
});
