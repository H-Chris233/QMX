import request from 'supertest';
import { 
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllCollections,
  resetAllSequences,
  createTestApp, 
  TestDataFactory 
} from '../../../test/setupBackend';

jest.setTimeout(30000);

describe('Transaction API Integration Tests', () => {
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

  describe('POST /api/v1/transactions', () => {
    it('creates income transaction with student', async () => {
      const student = await TestDataFactory.createStudent({ name: 'John Doe' });

      const response = await request(app)
        .post('/api/v1/transactions')
        .send({
          student_id: student.uid,
          amount: 500,
          note: 'Tuition Payment',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.student_id).toBe(student.uid);
      expect(response.body.data.cash).toBe(50000);
      expect(response.body.data.amount).toBe(500);
      expect(response.body.data.note).toBe('Tuition Payment');
      expect(response.body.data.isIncome).toBe(true);
    });

    it('creates expense transaction without student', async () => {
      const response = await request(app)
        .post('/api/v1/transactions')
        .send({
          amount: -150.50,
          note: 'Office Rent',
        })
        .expect(201);

      expect(response.body.data.cash).toBe(-15050);
      expect(response.body.data.amount).toBe(150.50);
      expect(response.body.data.student_id).toBeNull();
      expect(response.body.data.isIncome).toBe(false);
      expect(response.body.data.isExpense).toBe(true);
    });

    it('rejects transaction with zero amount', async () => {
      const response = await request(app)
        .post('/api/v1/transactions')
        .send({
          amount: 0,
          note: 'Zero amount',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('金额不能为0');
    });

    it('rejects transaction with missing amount', async () => {
      const response = await request(app)
        .post('/api/v1/transactions')
        .send({
          note: 'No amount',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('rejects transaction with invalid student id', async () => {
      const response = await request(app)
        .post('/api/v1/transactions')
        .send({
          student_id: 99999,
          amount: 100,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('rejects amount with more than 2 decimal places', async () => {
      const response = await request(app)
        .post('/api/v1/transactions')
        .send({
          amount: 123.456,
          note: 'Invalid precision',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/transactions', () => {
    beforeEach(async () => {
      const student1 = await TestDataFactory.createStudent({ name: 'Student 1' });
      const student2 = await TestDataFactory.createStudent({ name: 'Student 2' });

      await TestDataFactory.createCashTransaction(100, { studentId: student1.uid, note: 'Payment 1' });
      await TestDataFactory.createCashTransaction(200, { studentId: student1.uid, note: 'Payment 2' });
      await TestDataFactory.createCashTransaction(150, { studentId: student2.uid, note: 'Payment 3' });
      await TestDataFactory.createCashTransaction(-50, { studentId: null, note: 'Expense 1' });
      await TestDataFactory.createCashTransaction(-75, { studentId: null, note: 'Expense 2' });
    });

    it('retrieves all transactions with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/transactions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(5);
      expect(response.body.pagination.total).toBe(5);
    });

    it('filters transactions by student', async () => {
      const student = await TestDataFactory.createStudent({ name: 'Student 1' });

      const response = await request(app)
        .get('/api/v1/transactions')
        .query({ student_id: student.uid })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      response.body.data.forEach((tx: any) => {
        expect(tx.student_id).toBe(student.uid);
      });
    });

    it('paginates results', async () => {
      const response = await request(app)
        .get('/api/v1/transactions')
        .query({ page: 1, limit: 3 })
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(3);
    });

    it('sorts by created_at descending', async () => {
      const response = await request(app)
        .get('/api/v1/transactions')
        .query({ sort_by: 'created_at', sort_order: 'DESC' })
        .expect(200);

      const transactions = response.body.data;
      for (let i = 1; i < transactions.length; i++) {
        const prev = new Date(transactions[i - 1].created_at);
        const curr = new Date(transactions[i].created_at);
        expect(prev.getTime()).toBeGreaterThanOrEqual(curr.getTime());
      }
    });
  });

  describe('GET /api/v1/transactions/search', () => {
    beforeEach(async () => {
      await TestDataFactory.createCashTransaction(100, { studentId: null, note: 'Income 1' });
      await TestDataFactory.createCashTransaction(200, { studentId: null, note: 'Income 2' });
      await TestDataFactory.createCashTransaction(-50, { studentId: null, note: 'Expense 1' });
      await TestDataFactory.createCashTransaction(-100, { studentId: null, note: 'Expense 2' });
    });

    it('filters income transactions', async () => {
      const response = await request(app)
        .get('/api/v1/transactions/search')
        .query({ min_amount: 0 })
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((tx: any) => {
        expect(tx.isIncome).toBe(true);
      });
    });

    it('filters by amount range', async () => {
      const response = await request(app)
        .get('/api/v1/transactions/search')
        .query({ min_amount: 100, max_amount: 200 })
        .expect(200);

      response.body.data.forEach((tx: any) => {
        expect(tx.amount).toBeGreaterThanOrEqual(100);
        expect(tx.amount).toBeLessThanOrEqual(200);
      });
    });

    it('filters by date range', async () => {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .get('/api/v1/transactions/search')
        .query({
          date_from: yesterday.toISOString(),
          date_to: tomorrow.toISOString(),
        })
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/transactions/:id', () => {
    it('retrieves transaction by id', async () => {
      const transaction = await TestDataFactory.createCashTransaction(100, { studentId: null, note: 'Test Transaction' });

      const response = await request(app)
        .get(`/api/v1/transactions/${transaction.uid}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.uid).toBe(transaction.uid);
      expect(response.body.data.note).toBe('Test Transaction');
    });

    it('returns 404 for non-existent transaction', async () => {
      const response = await request(app)
        .get('/api/v1/transactions/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/transactions/:id', () => {
    it('deletes transaction', async () => {
      const transaction = await TestDataFactory.createCashTransaction(100, { studentId: null, note: 'To Delete' });

      const response = await request(app)
        .delete(`/api/v1/transactions/${transaction.uid}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      const getResponse = await request(app)
        .get(`/api/v1/transactions/${transaction.uid}`)
        .expect(404);

      expect(getResponse.body.success).toBe(false);
    });

    it('returns 404 for non-existent transaction', async () => {
      const response = await request(app)
        .delete('/api/v1/transactions/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Transaction Response Format', () => {
    it('includes all required fields in response', async () => {
      const student = await TestDataFactory.createStudent({ name: 'Test' });
      const transaction = await TestDataFactory.createCashTransaction(123.45, { studentId: student.uid, note: 'Test Note' });

      const response = await request(app)
        .get(`/api/v1/transactions/${transaction.uid}`)
        .expect(200);

      const data = response.body.data;
      expect(data).toHaveProperty('uid');
      expect(data).toHaveProperty('student_id');
      expect(data).toHaveProperty('studentId');
      expect(data).toHaveProperty('cash');
      expect(data).toHaveProperty('cashInCents');
      expect(data).toHaveProperty('amount');
      expect(data).toHaveProperty('note');
      expect(data).toHaveProperty('is_income');
      expect(data).toHaveProperty('isIncome');
      expect(data).toHaveProperty('is_expense');
      expect(data).toHaveProperty('isExpense');
      expect(data).toHaveProperty('formatted_amount');
      expect(data).toHaveProperty('formattedAmount');
      expect(data).toHaveProperty('description');
      expect(data).toHaveProperty('created_at');
      expect(data).toHaveProperty('createdAt');
      expect(data).toHaveProperty('updated_at');
      expect(data).toHaveProperty('updatedAt');
    });
  });

  describe('Edge Cases', () => {
    it('handles very small amounts', async () => {
      const response = await request(app)
        .post('/api/v1/transactions')
        .send({
          amount: 0.01,
          note: 'Tiny amount',
        })
        .expect(201);

      expect(response.body.data.cash).toBe(1);
      expect(response.body.data.amount).toBe(0.01);
    });

    it('handles large amounts', async () => {
      const response = await request(app)
        .post('/api/v1/transactions')
        .send({
          amount: 999999.99,
          note: 'Large amount',
        })
        .expect(201);

      expect(response.body.data.cash).toBe(99999999);
      expect(response.body.data.amount).toBe(999999.99);
    });

    it('normalizes empty note to null', async () => {
      const response = await request(app)
        .post('/api/v1/transactions')
        .send({
          amount: 100,
          note: '   ',
        })
        .expect(201);

      expect(response.body.data.note).toBeNull();
    });
  });
});
