import request from 'supertest';
import { PaymentFrequency, InstallmentStatus } from '@/types';
import { InstallmentPlanStatus } from '@/models/InstallmentPlanMongo';
import { 
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllCollections,
  resetAllSequences,
  createTestApp, 
  TestDataFactory, 
  dateUtils 
} from '../../../test/setupBackend';

jest.setTimeout(30000);

describe('Installment API Integration Tests', () => {
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

  describe('POST /api/v1/installments', () => {
    it('creates monthly installment plan', async () => {
      const student = await TestDataFactory.createStudent({ name: 'John Doe' });
      const startDate = new Date();

      const response = await request(app)
        .post('/api/v1/installments')
        .send({
          student_id: student.uid,
          total_amount: 1200,
          total_installments: 4,
          frequency: PaymentFrequency.MONTHLY,
          start_date: startDate.toISOString(),
          note: 'Annual course',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.plan).toBeDefined();
      expect(response.body.data.plan.student_id).toBe(student.uid);
      expect(response.body.data.plan.total_amount).toBe(120000);
      expect(response.body.data.plan.total_installments).toBe(4);
      expect(response.body.data.plan.frequency).toBe(PaymentFrequency.MONTHLY);
      expect(response.body.data.installments).toHaveLength(4);
    });

    it('creates weekly installment plan', async () => {
      const startDate = new Date();

      const response = await request(app)
        .post('/api/v1/installments')
        .send({
          total_amount: 400,
          total_installments: 4,
          frequency: PaymentFrequency.WEEKLY,
          start_date: startDate.toISOString(),
        })
        .expect(201);

      expect(response.body.data.plan.frequency).toBe(PaymentFrequency.WEEKLY);
      expect(response.body.data.installments).toHaveLength(4);
      
      const installments = response.body.data.installments;
      expect(installments[0].installment_amount).toBe(10000);
      expect(installments[1].current_installment).toBe(2);
    });

    it('creates custom frequency installment plan', async () => {
      const startDate = new Date();

      const response = await request(app)
        .post('/api/v1/installments')
        .send({
          total_amount: 600,
          total_installments: 3,
          frequency: PaymentFrequency.CUSTOM,
          custom_days: 15,
          start_date: startDate.toISOString(),
        })
        .expect(201);

      expect(response.body.data.plan.frequency).toBe(PaymentFrequency.CUSTOM);
      expect(response.body.data.plan.custom_days).toBe(15);
    });

    it('rejects plan without required fields', async () => {
      const response = await request(app)
        .post('/api/v1/installments')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('rejects plan with invalid frequency', async () => {
      const response = await request(app)
        .post('/api/v1/installments')
        .send({
          total_amount: 1000,
          total_installments: 4,
          frequency: 'INVALID',
          start_date: new Date().toISOString(),
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('rejects custom frequency without custom_days', async () => {
      const response = await request(app)
        .post('/api/v1/installments')
        .send({
          total_amount: 1000,
          total_installments: 4,
          frequency: PaymentFrequency.CUSTOM,
          start_date: new Date().toISOString(),
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/installments', () => {
    beforeEach(async () => {
      const student1 = await TestDataFactory.createStudent({ name: 'Student 1' });
      const student2 = await TestDataFactory.createStudent({ name: 'Student 2' });

      await TestDataFactory.createInstallmentPlan(1000, 4, PaymentFrequency.MONTHLY, new Date(), student1.uid);
      await TestDataFactory.createInstallmentPlan(2000, 3, PaymentFrequency.WEEKLY, new Date(), student1.uid);
      await TestDataFactory.createInstallmentPlan(1500, 5, PaymentFrequency.MONTHLY, new Date(), student2.uid);
    });

    it('retrieves all installment plans with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/installments')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.pagination.total).toBe(3);
    });

    it('filters plans by student', async () => {
      const student = await TestDataFactory.createStudent({ name: 'Student 1' });

      const response = await request(app)
        .get('/api/v1/installments')
        .query({ student_id: student.uid })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      response.body.data.forEach((plan: any) => {
        expect(plan.student_id).toBe(student.uid);
      });
    });

    it('paginates results', async () => {
      const response = await request(app)
        .get('/api/v1/installments')
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
    });
  });

  describe('GET /api/v1/installments/:id', () => {
    it('retrieves installment plan with details', async () => {
      const student = await TestDataFactory.createStudent({ name: 'Test' });
      const plan = await TestDataFactory.createInstallmentPlan(
        1200,
        3,
        PaymentFrequency.MONTHLY,
        new Date(),
        student.uid
      );

      const response = await request(app)
        .get(`/api/v1/installments/${plan.uid}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.uid).toBe(plan.uid);
      expect(response.body.data.student_id).toBe(student.uid);
    });

    it('returns 404 for non-existent plan', async () => {
      const response = await request(app)
        .get('/api/v1/installments/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/installments/overdue', () => {
    it('retrieves overdue installments', async () => {
      const student = await TestDataFactory.createStudent({ name: 'Test' });
      const plan = await TestDataFactory.createInstallmentPlan(
        600,
        2,
        PaymentFrequency.MONTHLY,
        new Date(),
        student.uid
      );

      const overdueDueDate = dateUtils.addDays(new Date(), -10);
      await TestDataFactory.createInstallment(
        plan.uid,
        student.uid,
        1,
        2,
        300,
        overdueDueDate,
        InstallmentStatus.PENDING
      );

      const futureDueDate = dateUtils.addDays(new Date(), 10);
      await TestDataFactory.createInstallment(
        plan.uid,
        student.uid,
        2,
        2,
        300,
        futureDueDate,
        InstallmentStatus.PENDING
      );

      const response = await request(app)
        .get('/api/v1/installments/overdue')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((inst: any) => {
        expect(inst.is_overdue || inst.isOverdue).toBe(true);
      });
    });

    it('excludes paid installments from overdue list', async () => {
      const plan = await TestDataFactory.createInstallmentPlan(
        600,
        2,
        PaymentFrequency.MONTHLY,
        new Date(),
        null
      );

      const overdueDueDate = dateUtils.addDays(new Date(), -10);
      await TestDataFactory.createInstallment(
        plan.uid,
        null,
        1,
        2,
        300,
        overdueDueDate,
        InstallmentStatus.PAID
      );

      const response = await request(app)
        .get('/api/v1/installments/overdue')
        .expect(200);

      expect(response.body.data.length).toBe(0);
    });
  });

  describe('PUT /api/v1/installments/:id/payment', () => {
    it('marks installment as paid', async () => {
      const student = await TestDataFactory.createStudent({ name: 'Test' });
      const plan = await TestDataFactory.createInstallmentPlan(
        600,
        2,
        PaymentFrequency.MONTHLY,
        new Date(),
        student.uid
      );

      const installment = await TestDataFactory.createInstallment(
        plan.uid,
        student.uid,
        1,
        2,
        300,
        new Date(),
        InstallmentStatus.PENDING
      );

      const response = await request(app)
        .put(`/api/v1/installments/${installment.uid}/payment`)
        .send({
          status: InstallmentStatus.PAID,
          amount: 300,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.installment.status).toBe(InstallmentStatus.PAID);
      expect(response.body.data.installment.paid_amount).toBe(30000);
      expect(response.body.data.cashTransaction).toBeDefined();
    });

    it('creates cash transaction when payment is made', async () => {
      const student = await TestDataFactory.createStudent({ name: 'Test' });
      const plan = await TestDataFactory.createInstallmentPlan(
        600,
        2,
        PaymentFrequency.MONTHLY,
        new Date(),
        student.uid
      );

      const installment = await TestDataFactory.createInstallment(
        plan.uid,
        student.uid,
        1,
        2,
        300,
        new Date(),
        InstallmentStatus.PENDING
      );

      const response = await request(app)
        .put(`/api/v1/installments/${installment.uid}/payment`)
        .send({
          status: InstallmentStatus.PAID,
          amount: 300,
        })
        .expect(200);

      const cashTx = response.body.data.cashTransaction;
      expect(cashTx).toBeDefined();
      expect(cashTx.student_id).toBe(student.uid);
      expect(cashTx.cash).toBe(30000);
      expect(cashTx.installment).toBeDefined();
      expect(cashTx.installment.plan_uid).toBe(plan.uid);
    });

    it('returns 404 for non-existent installment', async () => {
      const response = await request(app)
        .put('/api/v1/installments/99999/payment')
        .send({
          status: InstallmentStatus.PAID,
          amount: 100,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('rejects invalid payment status', async () => {
      const installment = await TestDataFactory.createInstallment(
        1,
        null,
        1,
        2,
        300,
        new Date(),
        InstallmentStatus.PENDING
      );

      const response = await request(app)
        .put(`/api/v1/installments/${installment.uid}/payment`)
        .send({
          status: 'INVALID_STATUS',
          amount: 300,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/installments/:id', () => {
    it('deletes installment plan', async () => {
      const plan = await TestDataFactory.createInstallmentPlan(
        600,
        2,
        PaymentFrequency.MONTHLY,
        new Date(),
        null
      );

      const response = await request(app)
        .delete(`/api/v1/installments/${plan.uid}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      const getResponse = await request(app)
        .get(`/api/v1/installments/${plan.uid}`)
        .expect(404);

      expect(getResponse.body.success).toBe(false);
    });

    it('returns 404 for non-existent plan', async () => {
      const response = await request(app)
        .delete('/api/v1/installments/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Installment Plan Response Format', () => {
    it('includes all required fields', async () => {
      const plan = await TestDataFactory.createInstallmentPlan(
        1200,
        4,
        PaymentFrequency.MONTHLY,
        new Date(),
        null
      );

      const response = await request(app)
        .get(`/api/v1/installments/${plan.uid}`)
        .expect(200);

      const data = response.body.data;
      expect(data).toHaveProperty('uid');
      expect(data).toHaveProperty('total_amount');
      expect(data).toHaveProperty('totalAmount');
      expect(data).toHaveProperty('total_installments');
      expect(data).toHaveProperty('totalInstallments');
      expect(data).toHaveProperty('frequency');
      expect(data).toHaveProperty('start_date');
      expect(data).toHaveProperty('startDate');
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('is_active');
      expect(data).toHaveProperty('isActive');
    });
  });

  describe('Edge Cases', () => {
    it('handles single installment plan', async () => {
      const response = await request(app)
        .post('/api/v1/installments')
        .send({
          total_amount: 500,
          total_installments: 1,
          frequency: PaymentFrequency.MONTHLY,
          start_date: new Date().toISOString(),
        })
        .expect(201);

      expect(response.body.data.plan.total_installments).toBe(1);
      expect(response.body.data.installments).toHaveLength(1);
    });

    it('handles large number of installments', async () => {
      const response = await request(app)
        .post('/api/v1/installments')
        .send({
          total_amount: 12000,
          total_installments: 12,
          frequency: PaymentFrequency.MONTHLY,
          start_date: new Date().toISOString(),
        })
        .expect(201);

      expect(response.body.data.plan.total_installments).toBe(12);
      expect(response.body.data.installments).toHaveLength(12);
    });
  });
});
