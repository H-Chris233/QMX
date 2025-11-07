import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { ApiService } from '@/api/ApiService';
import { integrationHandlers } from '../mocks/msw/integrationHandlers';

// 设置测试服务器
const testServer = setupServer(...integrationHandlers);

beforeAll(() => {
  testServer.listen({ onUnhandledRequest: 'warn' });
});

afterAll(() => {
  testServer.close();
});

describe('ApiService Integration - Quick Validation', () => {
  // ============================================================================
  // 基础连接测试
  // ============================================================================

  describe('Basic Connectivity', () => {
    it('should fetch students successfully', async () => {
      const response = await ApiService.getAllStudents();
      expect(response).toHaveProperty('students');
      expect(response).toHaveProperty('pagination');
      expect(Array.isArray(response.students)).toBe(true);
    });

    it('should fetch transactions successfully', async () => {
      const response = await ApiService.getAllTransactions();
      expect(response).toHaveProperty('transactions');
      expect(response).toHaveProperty('pagination');
      expect(Array.isArray(response.transactions)).toBe(true);
    });

    it('should fetch dashboard stats successfully', async () => {
      const stats = await ApiService.getDashboardStats();
      expect(stats).toHaveProperty('totalRevenue');
      expect(stats).toHaveProperty('activeStudents');
      expect(stats).toHaveProperty('averageGrade');
      expect(typeof stats.totalRevenue).toBe('number');
      expect(typeof stats.activeStudents).toBe('number');
      expect(typeof stats.averageGrade).toBe('number');
    });
  });

  // ============================================================================
  // 请求映射验证
  // ============================================================================

  describe('Request Mapping', () => {
    it('should send correct parameters for student search', async () => {
      // 创建一个临时的handler来捕获请求
      let capturedUrl = '';
      
      testServer.use(
        http.get('http://localhost:3001/api/v1/students', ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: { students: [], pagination: { page: 1, limit: 10, total: 0, total_pages: 0, has_next: false, has_prev: false } }
          });
        })
      );

      await ApiService.getAllStudents({
        name_contains: '张',
        class_type: 'Month',
        has_membership: true,
        page: 2,
        limit: 5
      });

      expect(capturedUrl).toContain('name_contains=张');
      expect(capturedUrl).toContain('class_type=Month');
      expect(capturedUrl).toContain('has_membership=true');
      expect(capturedUrl).toContain('page=2');
      expect(capturedUrl).toContain('limit=5');
    });

    it('should convert camelCase to snakeCase in POST requests', async () => {
      let capturedBody: any = null;
      
      testServer.use(
        http.post('http://localhost:3001/api/v1/students', async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({
            success: true,
            data: { uid: 1, name: 'Test', created_at: new Date().toISOString() }
          });
        })
      );

      await ApiService.addStudent({
        name: 'Test',
        lessonLeft: 15, // camelCase
        membershipStartDate: '2024-01-01', // camelCase
        membershipEndDate: '2024-12-31' // camelCase
      });

      expect(capturedBody).toBeDefined();
      expect(capturedBody.lesson_left).toBe(15); // snake_case
      expect(capturedBody.membership_start_date).toBe('2024-01-01'); // snake_case
      expect(capturedBody.membership_end_date).toBe('2024-12-31'); // snake_case
      expect(capturedBody).not.toHaveProperty('lessonLeft');
      expect(capturedBody).not.toHaveProperty('membershipStartDate');
      expect(capturedBody).not.toHaveProperty('membershipEndDate');
    });
  });

  // ============================================================================
  // 响应映射验证
  // ============================================================================

  describe('Response Mapping', () => {
    it('should return amounts in yuan with 2 decimal places', async () => {
      // Mock一个返回分的交易（后端存储格式）
      testServer.use(
        http.post('http://localhost:3001/api/v1/transactions', async ({ request }) => {
          const body = await request.json();
          // 模拟后端存储为分，返回时转换为元
          const amountInCents = Math.round(body.amount * 100);
          const amountInYuan = (amountInCents / 100).toFixed(2);
          
          return HttpResponse.json({
            success: true,
            data: {
              uid: 1,
              student_id: body.student_id,
              amount: parseFloat(amountInYuan), // 确保是数字类型
              created_at: new Date().toISOString()
            }
          });
        })
      );

      const transaction = await ApiService.addCashTransaction({
        student_id: 1,
        amount: 123.456789 // 超过2位小数的输入
      });

      expect(typeof transaction.amount).toBe('number');
      expect(transaction.amount).toBe(123.46); // 四舍五入到2位小数
      expect(transaction.amount).toBe(Number(transaction.amount.toFixed(2)));
    });

    it('should handle null values correctly', async () => {
      testServer.use(
        http.post('http://localhost:3001/api/v1/students', async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            success: true,
            data: {
              uid: 1,
              name: body.name,
              age: body.age || null,
              phone: body.phone || '',
              lesson_left: body.lesson_left || null,
              membership_start_date: body.membership_start_date || null,
              membership_end_date: body.membership_end_date || null,
              created_at: new Date().toISOString()
            }
          });
        })
      );

      const student = await ApiService.addStudent({
        name: 'Test Student',
        age: null,
        lesson_left: null,
        membership_start_date: null,
        membership_end_date: null
      });

      expect(student.age).toBeNull();
      expect(student.lesson_left).toBeNull();
      expect(student.membership_start_date).toBeNull();
      expect(student.membership_end_date).toBeNull();
    });

    it('should return dates in ISO format', async () => {
      const student = await ApiService.getStudentById(1);
      
      if (student.created_at) {
        expect(student.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        const date = new Date(student.created_at);
        expect(date.getTime()).not.toBeNaN();
      }
      
      if (student.updated_at) {
        expect(student.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        const date = new Date(student.updated_at);
        expect(date.getTime()).not.toBeNaN();
      }
    });
  });

  // ============================================================================
  // 错误处理验证
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle 404 errors correctly', async () => {
      try {
        await ApiService.getStudentById(999);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeDefined();
        const errorMessage = error.message || error.error || error.toString();
        expect(errorMessage).toBeDefined();
      }
    });

    it('should handle validation errors', async () => {
      // Mock一个验证错误的响应
      testServer.use(
        http.post('http://localhost:3001/api/v1/students', () => {
          return HttpResponse.json(
            {
              success: false,
              error: '姓名不能为空'
            },
            { status: 400 }
          );
        })
      );

      try {
        await ApiService.addStudent({
          name: '', // 空名称应该触发验证错误
          age: 20
        });
        expect.fail('Should have thrown a validation error');
      } catch (error: any) {
        expect(error).toBeDefined();
        const errorMessage = error.message || error.error || error.toString();
        expect(errorMessage).toContain('姓名不能为空');
      }
    });
  });

  // ============================================================================
  // 兼容性验证
  // ============================================================================

  describe('Compatibility', () => {
    it('should handle backward compatibility parameters', async () => {
      let capturedBody: any = null;
      
      testServer.use(
        http.post('http://localhost:3001/api/v1/students', async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({
            success: true,
            data: { uid: 1, name: 'Compat Test', created_at: new Date().toISOString() }
          });
        })
      );

      // 使用多参数调用（向后兼容）
      await ApiService.addStudent(
        '兼容学员',
        25,
        'Year',
        '13700137000',
        '兼容测试',
        'Archery',
        30,
        '2024-01-01',
        '2024-12-31'
      );

      expect(capturedBody).toBeDefined();
      expect(capturedBody.name).toBe('兼容学员');
      expect(capturedBody.age).toBe(25);
      expect(capturedBody.class).toBe('Year');
      expect(capturedBody.phone).toBe('13700137000');
      expect(capturedBody.note).toBe('兼容测试');
      expect(capturedBody.subject).toBe('Archery');
      expect(capturedBody.lesson_left).toBe(30);
    });

    it('should handle pagination structure correctly', async () => {
      const response = await ApiService.getAllStudents({ page: 1, limit: 5 });
      
      expect(response.pagination).toHaveProperty('currentPage');
      expect(response.pagination).toHaveProperty('itemsPerPage');
      expect(response.pagination).toHaveProperty('totalItems');
      expect(response.pagination).toHaveProperty('totalPages');
      expect(response.pagination).toHaveProperty('hasNextPage');
      expect(response.pagination).toHaveProperty('hasPrevPage');
      
      expect(typeof response.pagination.currentPage).toBe('number');
      expect(typeof response.pagination.itemsPerPage).toBe('number');
      expect(typeof response.pagination.totalItems).toBe('number');
      expect(typeof response.pagination.totalPages).toBe('number');
      expect(typeof response.pagination.hasNextPage).toBe('boolean');
      expect(typeof response.pagination.hasPrevPage).toBe('boolean');
    });
  });

  // ============================================================================
  // 核心模块覆盖验证
  // ============================================================================

  describe('Core Module Coverage', () => {
    it('should cover student management endpoints', async () => {
      // 获取学员列表
      const studentsResponse = await ApiService.getAllStudents();
      expect(studentsResponse.students).toBeDefined();

      // 获取单个学员
      const student = await ApiService.getStudentById(1);
      expect(student.uid).toBe(1);

      // 创建学员
      const newStudent = await ApiService.addStudent({
        name: 'New Student',
        age: 20,
        class: 'Month'
      });
      expect(newStudent.name).toBe('New Student');

      // 更新学员
      const updatedStudent = await ApiService.updateStudentInfo(1, {
        name: 'Updated Student'
      });
      expect(updatedStudent.name).toBe('Updated Student');
    });

    it('should cover transaction management endpoints', async () => {
      // 获取交易列表
      const transactionsResponse = await ApiService.getAllTransactions();
      expect(transactionsResponse.transactions).toBeDefined();

      // 创建交易
      const newTransaction = await ApiService.addCashTransaction({
        student_id: 1,
        amount: 100.00,
        note: 'Test Transaction'
      });
      expect(newTransaction.amount).toBe(100.00);

      // 获取单个交易
      const transaction = await ApiService.getTransactionById(1);
      expect(transaction.uid).toBe(1);
    });

    it('should cover statistics endpoints', async () => {
      // 仪表板统计
      const dashboardStats = await ApiService.getDashboardStats();
      expect(dashboardStats.totalRevenue).toBeDefined();

      // 学员统计
      const studentStats = await ApiService.getStudentStats(1);
      expect(studentStats.total_payments).toBeDefined();

      // 财务统计
      const financialStats = await ApiService.getFinancialStats();
      expect(financialStats.totalIncome).toBeDefined();
    });

    it('should cover membership endpoints', async () => {
      // 会员统计
      const membershipStats = await ApiService.getMembershipStats();
      expect(membershipStats.total_members).toBeDefined();

      // 设置会员
      const studentWithMembership = await ApiService.setStudentMembership(1, {
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        type: 'Month'
      });
      expect(studentWithMembership.is_membership_active).toBe(true);

      // 清除会员
      const studentWithoutMembership = await ApiService.clearStudentMembership(1);
      expect(studentWithoutMembership.is_membership_active).toBe(false);
    });

    it('should cover installment endpoints', async () => {
      // 获取分期状态
      const installmentStatuses = await ApiService.getInstallmentStatuses();
      expect(Array.isArray(installmentStatuses)).toBe(true);

      // 获取即将到期的分期
      const upcomingInstallments = await ApiService.getUpcomingInstallments(30);
      expect(Array.isArray(upcomingInstallments)).toBe(true);
    });

    it('should cover authentication endpoints', async () => {
      // 登录
      const loginResponse = await ApiService.login({
        username: 'test@example.com',
        password: 'password123'
      });
      expect(loginResponse.user).toBeDefined();
      expect(loginResponse.accessToken).toBeDefined();

      // 获取当前用户
      const currentUser = await ApiService.getCurrentUser();
      expect(currentUser.uid).toBeDefined();
      expect(currentUser.username).toBeDefined();
    });
  });
});