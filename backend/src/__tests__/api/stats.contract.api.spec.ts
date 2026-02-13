import request from 'supertest';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllCollections,
  resetAllSequences,
  createTestApp,
  TestDataFactory,
  dateUtils,
} from '../setupBackend';

jest.setTimeout(30000);

describe('Stats API Contract', () => {
  let app: any;

  beforeAll(async () => {
    try {
      await setupTestDatabase();
      app = await createTestApp();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`[stats-contract] 数据库不可用，无法执行契约测试: ${message}`);
    }
  });

  afterEach(async () => {
    await clearAllCollections();
    await resetAllSequences();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  it('GET /api/v1/stats/dashboard returns documented snake_case keys', async () => {
    const response = await request(app)
      .get('/api/v1/stats/dashboard')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('total_students');
    expect(response.body.data).toHaveProperty('total_revenue_cents');
    expect(response.body.data).toHaveProperty('total_expense_cents');
    expect(response.body.data).toHaveProperty('net_income_cents');
    expect(response.body.data).toHaveProperty('average_score');
    expect(response.body.data).toHaveProperty('max_score');
    expect(response.body.data).toHaveProperty('active_courses');
    expect(response.body.data).toHaveProperty('active_members');
    expect(response.body.data).toHaveProperty('active_installment_plans');
    expect(response.body.data).toHaveProperty('overdue_installment_count');
  });

  it('GET /api/v1/stats/students/:id returns nested contract', async () => {
    const student = await TestDataFactory.createStudent({
      name: 'Contract Student',
      rings: [8.0, 9.0],
    });
    await TestDataFactory.createCashTransaction(500, { studentId: student.uid });

    const response = await request(app)
      .get(`/api/v1/stats/students/${student.uid}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.student_uid).toBe(student.uid);
    expect(response.body.data).toHaveProperty('payments');
    expect(response.body.data).toHaveProperty('scores');
    expect(response.body.data).toHaveProperty('membership');
    expect(response.body.data).toHaveProperty('installments');
    expect(response.body.data.payments).toHaveProperty('total_amount_cents');
    expect(response.body.data.payments).toHaveProperty('count');
    expect(response.body.data.membership).toHaveProperty('status_code');
    expect(response.body.data.membership).toHaveProperty('is_active');
    expect(response.body.data.installments).toHaveProperty('pending_amount_cents');
  });

  it('GET /api/v1/stats/global-student-stats returns documented keys', async () => {
    await TestDataFactory.createStudent({
      name: 'Global Student',
      rings: [7.5, 8.5],
      membership: {
        startDate: new Date(),
        endDate: dateUtils.addDays(new Date(), 15),
      },
      lessonLeft: 5,
    });

    const response = await request(app)
      .get('/api/v1/stats/global-student-stats')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('total_students');
    expect(response.body.data).toHaveProperty('students_with_scores');
    expect(response.body.data).toHaveProperty('average_score');
    expect(response.body.data).toHaveProperty('max_score');
    expect(response.body.data).toHaveProperty('active_courses');
    expect(response.body.data).toHaveProperty('active_members');
  });

  it('GET /api/v1/stats/global-financial-stats returns documented keys', async () => {
    const student = await TestDataFactory.createStudent({ name: 'Financial Student' });
    await TestDataFactory.createCashTransaction(300, { studentId: student.uid });
    await TestDataFactory.createCashTransaction(-100, { studentId: null });

    const response = await request(app)
      .get('/api/v1/stats/global-financial-stats')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('total_income');
    expect(response.body.data).toHaveProperty('total_expense');
    expect(response.body.data).toHaveProperty('net_income');
    expect(response.body.data).toHaveProperty('is_profitable');
    expect(response.body.data).toHaveProperty('transaction_count');
    expect(response.body.data).toHaveProperty('installment_pending');
  });

  it('GET /api/v1/stats/membership-expiring returns documented list item shape', async () => {
    await TestDataFactory.createStudent({
      name: 'Expiring Member',
      membership: {
        startDate: dateUtils.addDays(new Date(), -10),
        endDate: dateUtils.addDays(new Date(), 5),
      },
    });

    const response = await request(app)
      .get('/api/v1/stats/membership-expiring')
      .query({ days: 30 })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);

    if (response.body.data.length > 0) {
      const item = response.body.data[0];
      expect(item).toHaveProperty('uid');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('phone');
      expect(item).toHaveProperty('class');
      expect(item).toHaveProperty('subject');
      expect(item).toHaveProperty('membership_end_date');
      expect(item).toHaveProperty('days_remaining');
      expect(item).toHaveProperty('is_membership_active');
      expect(item).toHaveProperty('membership_status');
    }
  });
});
