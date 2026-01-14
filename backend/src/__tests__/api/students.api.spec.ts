import request from 'supertest';
import { ClassType, SubjectType } from '@/types';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllCollections,
  resetAllSequences,
  createTestApp,
  TestDataFactory
} from '../setupBackend';

jest.setTimeout(30000);

console.log('=== 学生API测试文件已加载 ===');

describe('Student API Integration Tests', () => {
  let app: any;

  beforeAll(async () => {
    console.log('=== beforeAll: 开始设置测试环境 ===');
    await setupTestDatabase();
    console.log('=== beforeAll: 数据库设置完成，创建应用 ===');
    app = await createTestApp();
    console.log('=== beforeAll: 测试应用创建完成，等待路由加载 ===');

    // 等待路由异步加载完成
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log('=== beforeAll: 路由加载等待完成 ===');
  });

  afterEach(async () => {
    console.log('=== afterEach: 清理测试数据 ===');
    await clearAllCollections();
    await resetAllSequences();
    console.log('=== afterEach: 清理完成 ===');
  });

  afterAll(async () => {
    console.log('=== afterAll: 清理测试环境 ===');
    await cleanupTestDatabase();
    console.log('=== afterAll: 清理完成 ===');
  });

  describe('POST /api/v1/students', () => {
    it('creates a new student with valid data', async () => {
      console.log('=== 第一个测试开始执行 ===');
      try {
        const studentData = {
          name: 'John Doe',
          age: 25,
          class: ClassType.MONTH,
          phone: '13800138000',
          subject: SubjectType.SHOOTING,
          note: 'Test student',
        };

        console.log('=== 发送POST请求到 /api/v1/students ===');
        const response = await request(app)
          .post('/api/v1/students')
          .send(studentData)
          .expect(201);

        console.log('=== 请求成功，响应状态:', response.status);
        console.log('=== 响应体:', response.body);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          name: 'John Doe',
          age: 25,
          class: ClassType.MONTH,
          phone: '13800138000',
          subject: SubjectType.SHOOTING,
          note: 'Test student',
        });
        expect(response.body.data.uid).toBeGreaterThan(0);
        console.log('=== 第一个测试通过 ===');
      } catch (error) {
        console.error('=== 第一个测试失败:', error.message);
        console.error('=== 错误堆栈:', error.stack);
        throw error;
      }
    });

    it('creates TenTry student with default lesson count', async () => {
      const studentData = {
        name: 'Trial Student',
        class: ClassType.TEN_TRY,
        phone: '13800138001',
        subject: SubjectType.ARCHERY,
      };

      const response = await request(app)
        .post('/api/v1/students')
        .send(studentData)
        .expect(201);

      expect(response.body.data.class).toBe(ClassType.TEN_TRY);
      expect(response.body.data.lesson_left).toBe(10);
      expect(response.body.data.lessonLeft).toBe(10);
    });

    it('rejects student with missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/students')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeTruthy();
    });

    it('rejects student with invalid phone format', async () => {
      const response = await request(app)
        .post('/api/v1/students')
        .send({
          name: 'Test',
          phone: '123',
          class: ClassType.MONTH,
          subject: SubjectType.SHOOTING,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/students', () => {
    it('basic API connectivity test', async () => {
      // 最基本的API连接测试
      try {
        const response = await request(app)
          .get('/api/v1/students')
          .timeout(5000); // 5秒超时

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        console.log('Response body type:', typeof response.body);
        console.log('Response body:', response.body);

        expect(response.status).toBe(200);
      } catch (error) {
        console.error('API调用失败:', error);
        throw error;
      }
    });

    it('filters students by class type', async () => {
      const response = await request(app)
        .get('/api/v1/students')
        .query({ class_type: ClassType.TEN_TRY })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].class).toBe(ClassType.TEN_TRY);
      expect(response.body.data[0].name).toBe('Bob');
    });

    it('searches students by name', async () => {
      const response = await request(app)
        .get('/api/v1/students/search')
        .query({ name_contains: 'Ali' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Alice');
    });

    it('paginates results correctly', async () => {
      const response = await request(app)
        .get('/api/v1/students')
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.total).toBe(3);
    });
  });

  describe('GET /api/v1/students/:id', () => {
    it('retrieves student by id', async () => {
      const student = await TestDataFactory.createStudent({ name: 'Test Student' });

      const response = await request(app)
        .get(`/api/v1/students/${student.uid}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.uid).toBe(student.uid);
      expect(response.body.data.name).toBe('Test Student');
    });

    it('returns 404 for non-existent student', async () => {
      const response = await request(app)
        .get('/api/v1/students/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('不存在');
    });

    it('returns 400 for invalid id', async () => {
      const response = await request(app)
        .get('/api/v1/students/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/students/:id', () => {
    it('updates student information', async () => {
      const student = await TestDataFactory.createStudent({ name: 'Original Name' });

      const response = await request(app)
        .put(`/api/v1/students/${student.uid}`)
        .send({ name: 'Updated Name', age: 30 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
      expect(response.body.data.age).toBe(30);
    });

    it('updates student membership', async () => {
      const student = await TestDataFactory.createStudent({ name: 'Test' });

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const response = await request(app)
        .put(`/api/v1/students/${student.uid}`)
        .send({
          membership_start_date: startDate.toISOString(),
          membership_end_date: endDate.toISOString(),
        })
        .expect(200);

      expect(response.body.data.membership_start_date).toBeTruthy();
      expect(response.body.data.membership_end_date).toBeTruthy();
    });

    it('returns 404 for non-existent student', async () => {
      const response = await request(app)
        .put('/api/v1/students/99999')
        .send({ name: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/students/:id', () => {
    it('deletes student', async () => {
      const student = await TestDataFactory.createStudent({ name: 'To Delete' });

      const response = await request(app)
        .delete(`/api/v1/students/${student.uid}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      const getResponse = await request(app)
        .get(`/api/v1/students/${student.uid}`)
        .expect(404);

      expect(getResponse.body.success).toBe(false);
    });

    it('returns 404 for non-existent student', async () => {
      const response = await request(app)
        .delete('/api/v1/students/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Advanced Filtering', () => {
    beforeEach(async () => {
      const membershipStart = new Date();
      const membershipEnd = new Date();
      membershipEnd.setDate(membershipEnd.getDate() + 30);

      await TestDataFactory.createStudent({
        name: 'High Scorer',
        rings: [9.5, 9.8, 9.2],
        membership: { startDate: membershipStart, endDate: membershipEnd },
      });

      await TestDataFactory.createStudent({
        name: 'Low Scorer',
        rings: [5.5, 6.0],
      });

      await TestDataFactory.createStudent({
        name: 'No Scores',
      });
    });

    it('filters by score range', async () => {
      const response = await request(app)
        .get('/api/v1/students')
        .query({ min_score: 9, max_score: 10 })
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      const student = response.body.data[0];
      expect(student.name).toBe('High Scorer');
    });

    it('filters by membership status', async () => {
      const response = await request(app)
        .get('/api/v1/students')
        .query({ has_membership: true })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('High Scorer');
    });

    it('filters by active membership', async () => {
      const response = await request(app)
        .get('/api/v1/students')
        .query({ membership_active_at: new Date().toISOString() })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].is_membership_active).toBe(true);
    });
  });
});
