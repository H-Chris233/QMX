import request from 'supertest';
import { ClassType, SubjectType, PaymentFrequencyValues, InstallmentStatusValues } from '@/types';
import { StudentUpdater } from '@/services/studentUpdater';
import { 
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllCollections,
  resetAllSequences,
  createTestApp, 
  TestDataFactory, 
  dateUtils 
} from '../setupBackend';

jest.setTimeout(30000);

describe('Dashboard/Stats API Integration Tests', () => {
  let app: any;

  beforeAll(async () => {
    await setupTestDatabase();
    app = await createTestApp();
  });

  afterEach(async () => {
    await clearAllCollections();
    await resetAllSequences();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('GET /api/v1/stats/dashboard', () => {
    beforeEach(async () => {
      const membershipStart = new Date();
      const membershipEnd = dateUtils.addDays(new Date(), 30);

      const activeStudent = await TestDataFactory.createStudent({
        name: 'Active Student',
        class: ClassType.MONTH,
        rings: [8.5, 9.0],
        membership: { startDate: membershipStart, endDate: membershipEnd },
      });

      const trialStudent = await TestDataFactory.createStudent({
        name: 'Trial Student',
        class: ClassType.TEN_TRY,
        rings: [7.0],
      });

      const inactiveStudent = await TestDataFactory.createStudent({
        name: 'Inactive Student',
        class: ClassType.OTHERS,
      });

      await TestDataFactory.createCashTransaction(500, { studentId: activeStudent.uid, note: 'Tuition' });
      await TestDataFactory.createCashTransaction(300, { studentId: trialStudent.uid, note: 'Trial Fee' });
      await TestDataFactory.createCashTransaction(-100, { studentId: null, note: 'Rent' });
      await TestDataFactory.createCashTransaction(-50, { studentId: null, note: 'Utilities' });

      const plan = await TestDataFactory.createInstallmentPlan(
        1200,
        4,
        PaymentFrequencyValues.MONTHLY,
        new Date(),
        { studentId: activeStudent.uid }
      );

      const overdueDueDate = dateUtils.addDays(new Date(), -10);
      await TestDataFactory.createInstallment(
        plan.uid,
        activeStudent.uid,
        1,
        4,
        300,
        overdueDueDate,
        InstallmentStatusValues.PENDING
      );

      await TestDataFactory.createInstallment(
        plan.uid,
        activeStudent.uid,
        2,
        4,
        300,
        new Date(),
        InstallmentStatusValues.PAID
      );
    });

    it('returns comprehensive dashboard statistics', async () => {
      const response = await request(app)
        .get('/api/v1/stats/dashboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      const stats = response.body.data;

      expect(stats.totalStudents).toBe(3);
      expect(stats.totalRevenueCents).toBe(80000);
      expect(stats.totalExpenseCents).toBe(15000);
      expect(stats.netIncomeCents).toBe(65000);
      expect(stats.activeCourses).toBeGreaterThan(0);
      expect(stats.activeMembers).toBe(1);
      expect(stats.activeInstallmentPlans).toBe(1);
      expect(stats.overdueInstallmentCount).toBe(1);
    });

    it('calculates correct average score', async () => {
      const response = await request(app)
        .get('/api/v1/stats/dashboard')
        .expect(200);

      const stats = response.body.data;
      expect(stats.averageScore).toBeGreaterThan(0);
      expect(stats.maxScore).toBeGreaterThan(0);
    });

    it('includes all required dashboard fields', async () => {
      const response = await request(app)
        .get('/api/v1/stats/dashboard')
        .expect(200);

      const stats = response.body.data;
      expect(stats).toHaveProperty('totalStudents');
      expect(stats).toHaveProperty('totalRevenueCents');
      expect(stats).toHaveProperty('totalExpenseCents');
      expect(stats).toHaveProperty('netIncomeCents');
      expect(stats).toHaveProperty('averageScore');
      expect(stats).toHaveProperty('maxScore');
      expect(stats).toHaveProperty('activeCourses');
      expect(stats).toHaveProperty('activeMembers');
      expect(stats).toHaveProperty('activeInstallmentPlans');
      expect(stats).toHaveProperty('overdueInstallmentCount');
    });
  });

  describe('GET /api/v1/stats/student/:id', () => {
    it('returns detailed student statistics', async () => {
      const student = await TestDataFactory.createStudent({
        name: 'Test Student',
        rings: [8.0, 9.0, 8.5],
      });

      await TestDataFactory.createCashTransaction(500, { studentId: student.uid, note: 'Payment 1' });
      await TestDataFactory.createCashTransaction(300, { studentId: student.uid, note: 'Payment 2' });

      const plan = await TestDataFactory.createInstallmentPlan(
        1200,
        4,
        PaymentFrequencyValues.MONTHLY,
        new Date(),
        { studentId: student.uid }
      );

      await TestDataFactory.createInstallment(
        plan.uid,
        student.uid,
        1,
        4,
        300,
        new Date(),
        InstallmentStatusValues.PAID
      );

      const response = await request(app)
        .get(`/api/v1/stats/student/${student.uid}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const stats = response.body.data;

      expect(stats.studentUid).toBe(student.uid);
      expect(stats.payments.totalAmountCents).toBe(80000);
      expect(stats.payments.count).toBe(2);
      expect(stats.scores.count).toBe(3);
      expect(stats.scores.average).toBeCloseTo(8.5, 1);
      expect(stats.installments.totalAmountCents).toBe(120000);
      expect(stats.installments.paidAmountCents).toBe(30000);
    });

    it('returns membership information', async () => {
      const membershipStart = new Date();
      const membershipEnd = dateUtils.addDays(new Date(), 30);

      const student = await TestDataFactory.createStudent({
        name: 'Member Student',
        membership: { startDate: membershipStart, endDate: membershipEnd },
      });

      const response = await request(app)
        .get(`/api/v1/stats/student/${student.uid}`)
        .expect(200);

      const stats = response.body.data;
      expect(stats.membership.isActive).toBe(true);
      expect(stats.membership.daysRemaining).toBeGreaterThan(0);
    });

    it('returns 404 for non-existent student', async () => {
      const response = await request(app)
        .get('/api/v1/stats/student/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/stats/financial', () => {
    beforeEach(async () => {
      const student1 = await TestDataFactory.createStudent({ name: 'Student 1' });
      const student2 = await TestDataFactory.createStudent({ name: 'Student 2' });

      await TestDataFactory.createCashTransaction(1000, { studentId: student1.uid, note: 'Payment 1' });
      await TestDataFactory.createCashTransaction(500, { studentId: student2.uid, note: 'Payment 2' });
      await TestDataFactory.createCashTransaction(-200, { studentId: null, note: 'Expense 1' });

      const plan = await TestDataFactory.createInstallmentPlan(
        1200,
        3,
        PaymentFrequencyValues.MONTHLY,
        new Date(),
        { studentId: student1.uid }
      );

      await TestDataFactory.createInstallment(
        plan.uid,
        student1.uid,
        1,
        3,
        400,
        new Date(),
        InstallmentStatusValues.PAID
      );

      await TestDataFactory.createInstallment(
        plan.uid,
        student1.uid,
        2,
        3,
        400,
        dateUtils.addDays(new Date(), 30),
        InstallmentStatusValues.PENDING
      );
    });

    it('returns financial statistics for current month', async () => {
      const response = await request(app)
        .get('/api/v1/stats/financial')
        .query({ period: 'ThisMonth' })
        .expect(200);

      expect(response.body.success).toBe(true);
      const stats = response.body.data;

      expect(stats.period).toBe('ThisMonth');
      expect(stats.totals.incomeCents).toBeGreaterThan(0);
      expect(stats.totals.expenseCents).toBeGreaterThan(0);
      expect(stats.totals.netIncomeCents).toBeGreaterThan(0);
      expect(stats.transactionCount).toBeGreaterThan(0);
    });

    it('includes date range information', async () => {
      const response = await request(app)
        .get('/api/v1/stats/financial')
        .query({ period: 'ThisMonth' })
        .expect(200);

      const stats = response.body.data;
      expect(stats.dateRange).toBeDefined();
      expect(stats.dateRange.start).toBeDefined();
      expect(stats.dateRange.end).toBeDefined();
    });

    it('includes top student income breakdown', async () => {
      const response = await request(app)
        .get('/api/v1/stats/financial')
        .query({ period: 'ThisMonth' })
        .expect(200);

      const stats = response.body.data;
      expect(stats.studentIncome).toBeDefined();
      expect(Array.isArray(stats.studentIncome)).toBe(true);
      
      if (stats.studentIncome.length > 0) {
        const topStudent = stats.studentIncome[0];
        expect(topStudent).toHaveProperty('studentId');
        expect(topStudent).toHaveProperty('studentName');
        expect(topStudent).toHaveProperty('amountCents');
      }
    });

    it('includes installment statistics', async () => {
      const response = await request(app)
        .get('/api/v1/stats/financial')
        .query({ period: 'ThisMonth' })
        .expect(200);

      const stats = response.body.data;
      expect(stats.installments).toBeDefined();
      expect(stats.installments.totalCents).toBeGreaterThan(0);
      expect(stats.installments.paidCents).toBeGreaterThan(0);
      expect(stats.installments.pendingCents).toBeGreaterThan(0);
      expect(stats.installments.remainingCents).toBeGreaterThan(0);
    });

    it('supports different time periods', async () => {
      const periods = ['ThisWeek', 'ThisMonth', 'ThisYear', 'All'];

      for (const period of periods) {
        const response = await request(app)
          .get('/api/v1/stats/financial')
          .query({ period })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.period).toBe(period);
      }
    });

    it('defaults to ThisMonth when period not specified', async () => {
      const response = await request(app)
        .get('/api/v1/stats/financial')
        .expect(200);

      expect(response.body.data.period).toBe('ThisMonth');
    });
  });

  describe('Stats with Empty Data', () => {
    it('returns zero values when no data exists', async () => {
      const response = await request(app)
        .get('/api/v1/stats/dashboard')
        .expect(200);

      const stats = response.body.data;
      expect(stats.totalStudents).toBe(0);
      expect(stats.totalRevenueCents).toBe(0);
      expect(stats.totalExpenseCents).toBe(0);
      expect(stats.netIncomeCents).toBe(0);
      expect(stats.activeMembers).toBe(0);
    });

    it('handles student with no transactions', async () => {
      const student = await TestDataFactory.createStudent({ name: 'No Transactions' });

      const response = await request(app)
        .get(`/api/v1/stats/student/${student.uid}`)
        .expect(200);

      const stats = response.body.data;
      expect(stats.payments.totalAmountCents).toBe(0);
      expect(stats.payments.count).toBe(0);
    });
  });

  describe('Stats Calculations', () => {
    it('calculates net income correctly', async () => {
      await TestDataFactory.createCashTransaction(1000, { studentId: null, note: 'Income' });
      await TestDataFactory.createCashTransaction(-300, { studentId: null, note: 'Expense' });

      const response = await request(app)
        .get('/api/v1/stats/dashboard')
        .expect(200);

      const stats = response.body.data;
      expect(stats.totalRevenueCents).toBe(100000);
      expect(stats.totalExpenseCents).toBe(30000);
      expect(stats.netIncomeCents).toBe(70000);
    });

    it('identifies profitable periods', async () => {
      await TestDataFactory.createCashTransaction(1000, { studentId: null, note: 'Income' });
      await TestDataFactory.createCashTransaction(-300, { studentId: null, note: 'Expense' });

      const response = await request(app)
        .get('/api/v1/stats/financial')
        .query({ period: 'ThisMonth' })
        .expect(200);

      const stats = response.body.data;
      expect(stats.totals.isProfitable).toBe(true);
    });

    it('identifies unprofitable periods', async () => {
      await TestDataFactory.createCashTransaction(100, { studentId: null, note: 'Income' });
      await TestDataFactory.createCashTransaction(-500, { studentId: null, note: 'Expense' });

      const response = await request(app)
        .get('/api/v1/stats/financial')
        .query({ period: 'ThisMonth' })
        .expect(200);

      const stats = response.body.data;
      expect(stats.totals.isProfitable).toBe(false);
    });
  });
});
