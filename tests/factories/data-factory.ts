import type { Student, Transaction, Installment, DashboardStats } from '@/types/api';

/**
 * 测试数据工厂
 * 提供各种类型的测试数据生成器
 */

/**
 * 学生数据工厂
 */
export class StudentFactory {
  static create(overrides: Partial<Student> = {}): Student {
    return {
      uid: Math.floor(Math.random() * 1000) + 1,
      name: '测试学生',
      age: 20,
      phone: '13800138000',
      class: 'Month',
      subject: 'Shooting',
      rings: [85, 90, 88],
      note: '测试备注',
      lesson_left: 10,
      membership_start_date: '2024-01-01T00:00:00.000Z',
      membership_end_date: '2024-12-31T23:59:59.999Z',
      is_membership_active: true,
      membership_days_remaining: 365,
      membership_status: 'Active',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<Student> = {}): Student[] {
    return Array.from({ length: count }, (_, index) => 
      this.create({ 
        ...overrides, 
        uid: (overrides.uid as number || 0) + index + 1 
      })
    );
  }

  static createWithMembership(days: number, overrides: Partial<Student> = {}): Student {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + days);

    return this.create({
      membership_start_date: startDate.toISOString(),
      membership_end_date: endDate.toISOString(),
      is_membership_active: days > 0,
      membership_days_remaining: Math.max(0, days),
      membership_status: days > 0 ? 'Active' : 'Expired',
      ...overrides,
    });
  }

  static createExpired(overrides: Partial<Student> = {}): Student {
    return this.createWithMembership(-10, {
      membership_status: 'Expired',
      ...overrides,
    });
  }

  static createInactive(overrides: Partial<Student> = {}): Student {
    return this.create({
      is_membership_active: false,
      membership_status: 'Inactive',
      membership_days_remaining: 0,
      ...overrides,
    });
  }
}

/**
 * 交易数据工厂
 */
export class TransactionFactory {
  static create(overrides: Partial<Transaction> = {}): Transaction {
    return {
      id: Math.floor(Math.random() * 1000) + 1,
      student_id: 1,
      amount: 100.00,
      transaction_type: 'income',
      note: '测试交易',
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<Transaction> = {}): Transaction[] {
    return Array.from({ length: count }, (_, index) => 
      this.create({ 
        ...overrides, 
        id: (overrides.id as number || 0) + index + 1 
      })
    );
  }

  static createIncome(amount: number, overrides: Partial<Transaction> = {}): Transaction {
    return this.create({
      amount,
      transaction_type: 'income',
      note: '收入交易',
      ...overrides,
    });
  }

  static createExpense(amount: number, overrides: Partial<Transaction> = {}): Transaction {
    return this.create({
      amount,
      transaction_type: 'expense',
      note: '支出交易',
      ...overrides,
    });
  }
}

/**
 * 分期数据工厂
 */
export class InstallmentFactory {
  static create(overrides: Partial<Installment> = {}): Installment {
    return {
      id: Math.floor(Math.random() * 1000) + 1,
      student_id: 1,
      total_amount: 1000.00,
      paid_amount: 0.00,
      remaining_amount: 1000.00,
      installment_count: 10,
      paid_installments: 0,
      next_payment_date: '2024-02-01',
      status: 'pending',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<Installment> = {}): Installment[] {
    return Array.from({ length: count }, (_, index) => 
      this.create({ 
        ...overrides, 
        id: (overrides.id as number || 0) + index + 1 
      })
    );
  }

  static createPartialPaid(paidAmount: number, overrides: Partial<Installment> = {}): Installment {
    const totalAmount = overrides.total_amount || 1000.00;
    return this.create({
      total_amount: totalAmount,
      paid_amount: paidAmount,
      remaining_amount: totalAmount - paidAmount,
      paid_installments: Math.floor(paidAmount / (totalAmount / 10)),
      status: 'partial',
      ...overrides,
    });
  }

  static createFullyPaid(overrides: Partial<Installment> = {}): Installment {
    const totalAmount = overrides.total_amount || 1000.00;
    return this.create({
      total_amount: totalAmount,
      paid_amount: totalAmount,
      remaining_amount: 0,
      paid_installments: 10,
      status: 'completed',
      ...overrides,
    });
  }
}

/**
 * 统计数据工厂
 */
export class StatsFactory {
  static createDashboard(overrides: Partial<DashboardStats> = {}): DashboardStats {
    return {
      totalRevenue: 10000.00,
      activeStudents: 50,
      averageGrade: 85.5,
      ...overrides,
    };
  }

  static createStudentStats() {
    return {
      total: 100,
      active: 80,
      inactive: 20,
    };
  }

  static createFinancialStats() {
    return {
      totalIncome: 50000.00,
      totalExpense: 10000.00,
      netIncome: 40000.00,
    };
  }
}

/**
 * 响应数据工厂
 */
export class ResponseFactory {
  static createStudentList(
    students: Student[] = [],
    page: number = 1,
    limit: number = 20,
    total: number = 0
  ) {
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

  static createTransactionList(
    transactions: Transaction[] = [],
    page: number = 1,
    limit: number = 20,
    total: number = 0
  ) {
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

  static createInstallmentList(
    installments: Installment[] = [],
    page: number = 1,
    limit: number = 20,
    total: number = 0
  ) {
    return {
      installments,
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

  static createSuccess<T>(data: T) {
    return {
      success: true,
      data,
    };
  }

  static createError(error: string, details?: any) {
    return {
      success: false,
      error,
      details,
    };
  }
}

/**
 * 表单数据工厂
 */
export class FormDataFactory {
  static createStudentForm(overrides: Record<string, any> = {}) {
    return {
      name: '测试学生',
      age: 20,
      phone: '13800138000',
      class: 'Month',
      subject: 'Shooting',
      note: '测试备注',
      lesson_left: 10,
      membership_start_date: '2024-01-01',
      membership_end_date: '2024-12-31',
      ...overrides,
    };
  }

  static createInvalidStudentForm() {
    return {
      name: '',
      age: 150,
      phone: 'invalid-phone',
      class: 'InvalidClass',
      subject: 'InvalidSubject',
      note: '',
      lesson_left: -1,
      membership_start_date: 'invalid-date',
      membership_end_date: 'invalid-date',
    };
  }

  static createSearchFilters(overrides: Record<string, any> = {}) {
    return {
      name: '',
      subject: '',
      classType: '',
      hasMembership: '',
      membershipStatus: '',
      ...overrides,
    };
  }
}

/**
 * 日期工厂
 */
export class DateFactory {
  static today(): string {
    return new Date().toISOString().split('T')[0];
  }

  static future(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  static past(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  static iso(date: string = '2024-01-01'): string {
    return new Date(date).toISOString();
  }
}