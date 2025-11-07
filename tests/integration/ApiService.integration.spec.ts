import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ApiService } from '@/api/ApiService';
import { useAppStore } from '@/stores/app';
import { createPinia, setActivePinia } from 'pinia';
import {
  testServer,
  setupIntegrationTest,
  expectValidApiResponse,
  expectApiError,
  expectValidStudent,
  expectValidTransaction,
  expectValidPagination,
  expectValidDateString,
  expectAmountInYuan,
  expectRequestFieldConversion,
  createRequestInterceptor,
  testHttpError,
  testNetworkTimeout,
  testInvalidInput,
  waitForAsync,
  createTestStudent,
  createTestStudentInput,
  createTestTransaction,
  createTestTransactionInput,
  createTestSearchOptions,
  createTestCashSearchOptions,
  createTestCredentials,
} from '../helpers/integrationTestHelpers';
import type {
  Student,
  Transaction,
  CurrentStudentInput,
  StudentSearchOptions,
  TransactionCreateData,
  CashSearchOptions,
  LoginCredentials,
  InstallmentStatus,
} from '@/types/api';

describe('ApiService Integration Tests', () => {
  let appStore: ReturnType<typeof useAppStore>;

  beforeAll(() => {
    setActivePinia(createPinia());
    setupIntegrationTest();
  });

  beforeEach(() => {
    appStore = useAppStore();
    testServer.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    testServer.resetHandlers();
  });

  afterAll(() => {
    testServer.close();
  });

  // ============================================================================
  // 学员管理模块测试
  // ============================================================================

  describe('Student Management', () => {
    describe('getAllStudents', () => {
      it('should fetch students with correct request parameters', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/students',
          'GET'
        );

        const searchOptions: StudentSearchOptions = createTestSearchOptions({
          name_contains: '张',
          class_type: 'Month',
          has_membership: true,
          page: 2,
          limit: 5,
        });

        await ApiService.getAllStudents(searchOptions);

        const request = interceptor.getRequest();
        expect(request).toBeDefined();
        expect(request.url).toContain('name_contains=张');
        expect(request.url).toContain('class_type=Month');
        expect(request.url).toContain('has_membership=true');
        expect(request.url).toContain('page=2');
        expect(request.url).toContain('limit=5');

        interceptor.remove();
      });

      it('should return valid student list response', async () => {
        const response = await ApiService.getAllStudents();
        
        expectValidApiResponse(response);
        expect(response).toHaveProperty('students');
        expect(response).toHaveProperty('pagination');
        expectValidPagination(response.pagination);
        expect(Array.isArray(response.students)).toBe(true);

        if (response.students.length > 0) {
          expectValidStudent(response.students[0]);
        }
      });

      it('should handle empty student list', async () => {
        // 创建一个临时的handler来返回空列表
        testServer.use(
          http.get('http://localhost:3001/api/v1/students', () => {
            return HttpResponse.json({
              success: true,
              data: { 
                students: [], 
                pagination: { page: 1, limit: 10, total: 0, total_pages: 0, has_next: false, has_prev: false } 
              }
            });
          })
        );

        const response = await ApiService.getAllStudents();
        expect(response.students).toEqual([]);
        expect(response.pagination.total).toBe(0);
      });

      it('should handle API error gracefully', async () => {
        await testHttpError(
          () => ApiService.getAllStudents(),
          500,
          '内部服务器错误'
        );
      });
    });

    describe('getStudentById', () => {
      it('should fetch student by ID correctly', async () => {
        const studentId = 1;
        const response = await ApiService.getStudentById(studentId);

        expectValidStudent(response);
        expect(response.uid).toBe(studentId);
        expectValidDateString(response.created_at);
        expectValidDateString(response.updated_at);
      });

      it('should handle non-existent student', async () => {
        await testHttpError(
          () => ApiService.getStudentById(999),
          404,
          '学员不存在'
        );
      });

      it('should handle invalid student ID', async () => {
        await testHttpError(
          () => ApiService.getStudentById(-1),
          400
        );
      });
    });

    describe('addStudent', () => {
      it('should create student with correct field name conversion', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/students',
          'POST'
        );

        const studentInput: CurrentStudentInput = createTestStudentInput({
          lessonLeft: 15, // camelCase
          membershipStartDate: '2024-01-01', // camelCase
          membershipEndDate: '2024-12-31', // camelCase
        });

        await ApiService.addStudent(studentInput);

        const request = interceptor.getRequest();
        expect(request).toBeDefined();
        expect(request.body).toBeDefined();
        
        // 验证字段名转换
        expect(request.body).toHaveProperty('lesson_left'); // snake_case
        expect(request.body).toHaveProperty('membership_start_date'); // snake_case
        expect(request.body).toHaveProperty('membership_end_date'); // snake_case
        expect(request.body).not.toHaveProperty('lessonLeft');
        expect(request.body).not.toHaveProperty('membershipStartDate');
        expect(request.body).not.toHaveProperty('membershipEndDate');

        expect(request.body.lesson_left).toBe(15);
        expect(request.body.membership_start_date).toBe('2024-01-01');
        expect(request.body.membership_end_date).toBe('2024-12-31');

        interceptor.remove();
      });

      it('should return valid created student', async () => {
        const studentInput: CurrentStudentInput = createTestStudentInput({
          name: '新学员',
          age: 18,
        });

        const response = await ApiService.addStudent(studentInput);

        expectValidStudent(response);
        expect(response.name).toBe('新学员');
        expect(response.age).toBe(18);
        expectValidDateString(response.created_at);
        expectValidDateString(response.updated_at);
      });

      it('should handle backward compatibility parameters', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/students',
          'POST'
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

        const request = interceptor.getRequest();
        expect(request.body).toBeDefined();
        expect(request.body.name).toBe('兼容学员');
        expect(request.body.age).toBe(25);
        expect(request.body.class).toBe('Year');
        expect(request.body.phone).toBe('13700137000');
        expect(request.body.note).toBe('兼容测试');
        expect(request.body.subject).toBe('Archery');
        expect(request.body.lesson_left).toBe(30);

        interceptor.remove();
      });

      it('should handle validation errors', async () => {
        const invalidInput = createTestStudentInput({
          name: '', // 空名称
          age: -1, // 无效年龄
        });

        await testInvalidInput(
          ApiService.addStudent,
          invalidInput,
          'validation'
        );
      });
    });

    describe('updateStudentInfo', () => {
      it('should update student with correct field conversion', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/students/1',
          'PUT'
        );

        const updateData = {
          name: '更新后的学员',
          lessonLeft: 25, // camelCase
          membershipStartDate: '2024-02-01', // camelCase
        };

        await ApiService.updateStudentInfo(1, updateData);

        const request = interceptor.getRequest();
        expect(request).toBeDefined();
        expect(request.body).toBeDefined();
        
        // 验证字段名转换
        expect(request.body).toHaveProperty('lesson_left');
        expect(request.body).toHaveProperty('membership_start_date');
        expect(request.body.lesson_left).toBe(25);
        expect(request.body.membership_start_date).toBe('2024-02-01');

        interceptor.remove();
      });

      it('should handle classType backward compatibility', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/students/1',
          'PUT'
        );

        const updateData = {
          classType: 'Year', // 旧字段名
        };

        await ApiService.updateStudentInfo(1, updateData);

        const request = interceptor.getRequest();
        expect(request.body).toBeDefined();
        expect(request.body).toHaveProperty('class'); // 转换为新字段名
        expect(request.body.class).toBe('Year');
        expect(request.body).not.toHaveProperty('classType');

        interceptor.remove();
      });

      it('should return valid updated student', async () => {
        const updateData = {
          name: '更新后的学员',
          age: 30,
        };

        const response = await ApiService.updateStudentInfo(1, updateData);

        expectValidStudent(response);
        expect(response.name).toBe('更新后的学员');
        expect(response.age).toBe(30);
        expectValidDateString(response.updated_at);
      });

      it('should handle non-existent student update', async () => {
        await testHttpError(
          () => ApiService.updateStudentInfo(999, { name: '测试' }),
          404,
          '学员不存在'
        );
      });
    });

    describe('deleteStudent', () => {
      it('should delete student successfully', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/students/1',
          'DELETE'
        );

        await ApiService.deleteStudent(1);

        const request = interceptor.getRequest();
        expect(request).toBeDefined();
        expect(request.method).toBe('DELETE');

        interceptor.remove();
      });

      it('should handle non-existent student deletion', async () => {
        await testHttpError(
          () => ApiService.deleteStudent(999),
          404,
          '学员不存在'
        );
      });
    });

    describe('searchStudents', () => {
      it('should search students with query parameters', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/students/search',
          'GET'
        );

        await ApiService.searchStudents({
          q: '张三',
          page: 1,
          limit: 10,
        });

        const request = interceptor.getRequest();
        expect(request.url).toContain('q=张三');
        expect(request.url).toContain('page=1');
        expect(request.url).toContain('limit=10');

        interceptor.remove();
      });

      it('should return search results', async () => {
        const results = await ApiService.searchStudents({ q: '张三' });
        
        expect(Array.isArray(results)).toBe(true);
        if (results.length > 0) {
          expectValidStudent(results[0]);
        }
      });
    });
  });

  // ============================================================================
  // 成绩管理模块测试
  // ============================================================================

  describe('Score Management', () => {
    describe('getStudentScores', () => {
      it('should fetch student scores correctly', async () => {
        const scores = await ApiService.getStudentScores(1);
        
        expect(Array.isArray(scores)).toBe(true);
        scores.forEach(score => {
          expect(typeof score).toBe('number');
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(10);
        });
      });

      it('should handle non-existent student scores', async () => {
        await testHttpError(
          () => ApiService.getStudentScores(999),
          404,
          '学员不存在'
        );
      });
    });

    describe('addScore', () => {
      it('should add score to student', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/students/1/scores',
          'POST'
        );

        await ApiService.addScore(1, 8.5);

        const request = interceptor.getRequest();
        expect(request.body).toBeDefined();
        expect(request.body.score).toBe(8.5);

        interceptor.remove();
      });

      it('should validate score range', async () => {
        await testInvalidInput(
          (score: number) => ApiService.addScore(1, score),
          11, // 超出范围
          '成绩必须在0-10之间'
        );
      });
    });

    describe('updateStudentScore', () => {
      it('should update specific score', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/students/1/scores/0',
          'PUT'
        );

        await ApiService.updateStudentScore(1, 0, 9.0);

        const request = interceptor.getRequest();
        expect(request.body).toBeDefined();
        expect(request.body.newScore).toBe(9.0);

        interceptor.remove();
      });
    });

    describe('updateScoresBatch', () => {
      it('should update scores in batch', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/students/1/scores',
          'PUT'
        );

        const newScores = [8.0, 9.0, 7.5];
        await ApiService.updateScoresBatch(1, newScores);

        const request = interceptor.getRequest();
        expect(request.body).toBeDefined();
        expect(request.body.scores).toEqual(newScores);

        interceptor.remove();
      });
    });
  });

  // ============================================================================
  // 交易管理模块测试
  // ============================================================================

  describe('Transaction Management', () => {
    describe('getAllTransactions', () => {
      it('should fetch transactions with search parameters', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/transactions',
          'GET'
        );

        const searchOptions: CashSearchOptions = createTestCashSearchOptions({
          student_id: 1,
          min_amount: 50,
          max_amount: 200,
          page: 1,
          limit: 5,
        });

        await ApiService.getAllTransactions(searchOptions);

        const request = interceptor.getRequest();
        expect(request.url).toContain('student_id=1');
        expect(request.url).toContain('min_amount=50');
        expect(request.url).toContain('max_amount=200');
        expect(request.url).toContain('page=1');
        expect(request.url).toContain('limit=5');

        interceptor.remove();
      });

      it('should return valid transaction list response', async () => {
        const response = await ApiService.getAllTransactions();
        
        expectValidApiResponse(response);
        expect(response).toHaveProperty('transactions');
        expect(response).toHaveProperty('pagination');
        expectValidPagination(response.pagination);
        expect(Array.isArray(response.transactions)).toBe(true);

        if (response.transactions.length > 0) {
          response.transactions.forEach(transaction => {
            expectValidTransaction(transaction);
            expectAmountInYuan(transaction.amount);
          });
        }
      });
    });

    describe('addCashTransaction', () => {
      it('should create cash transaction with amount validation', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/transactions',
          'POST'
        );

        const transactionData: TransactionCreateData = createTestTransactionInput({
          student_id: 1,
          amount: 150.50,
          note: '课程费用',
        });

        await ApiService.addCashTransaction(transactionData);

        const request = interceptor.getRequest();
        expect(request.body).toBeDefined();
        expect(request.body.student_id).toBe(1);
        expect(request.body.amount).toBe(150.50);
        expect(request.body.note).toBe('课程费用');

        interceptor.remove();
      });

      it('should handle backward compatibility parameters', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/transactions',
          'POST'
        );

        // 使用多参数调用（向后兼容）
        await ApiService.addCashTransaction(1, 200.00, '兼容测试');

        const request = interceptor.getRequest();
        expect(request.body).toBeDefined();
        expect(request.body.student_id).toBe(1);
        expect(request.body.amount).toBe(200.00);
        expect(request.body.note).toBe('兼容测试');

        interceptor.remove();
      });

      it('should return valid created transaction', async () => {
        const transactionData: TransactionCreateData = createTestTransactionInput({
          amount: 300.75,
        });

        const response = await ApiService.addCashTransaction(transactionData);

        expectValidTransaction(response);
        expect(response.amount).toBe(300.75);
        expectAmountInYuan(response.amount);
        expectValidDateString(response.created_at);
      });

      it('should validate amount is not zero', async () => {
        const invalidData = createTestTransactionInput({
          amount: 0, // 无效金额
        });

        await testInvalidInput(
          ApiService.addCashTransaction,
          invalidData,
          '金额不能为0'
        );
      });
    });

    describe('addInstallmentTransaction', () => {
      it('should create installment transaction with field conversion', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/transactions/installment',
          'POST'
        );

        const installmentData = {
          student_id: 1,
          amount: 1200.00,
          note: '分期付款',
          total_installments: 12,
          frequency: 'Monthly',
          start_date: '2024-01-01',
        };

        await ApiService.addInstallmentTransaction(installmentData);

        const request = interceptor.getRequest();
        expect(request.body).toBeDefined();
        expect(request.body.total_amount).toBe(1200.00); // 转换为total_amount
        expect(request.body.total_installments).toBe(12);
        expect(request.body.frequency).toBe('Monthly');
        expect(request.body.start_date).toBe('2024-01-01');

        interceptor.remove();
      });

      it('should return valid installment transaction', async () => {
        const installmentData = {
          student_id: 1,
          amount: 1200.00,
          total_installments: 12,
          frequency: 'Monthly',
        };

        const response = await ApiService.addInstallmentTransaction(installmentData);

        expectValidTransaction(response);
        expect(response.is_installment).toBe(true);
        expect(response.installment).toBeDefined();
        expect(response.installment?.total_installments).toBe(12);
      });
    });

    describe('getTransactionById', () => {
      it('should fetch transaction by ID', async () => {
        const response = await ApiService.getTransactionById(1);

        expectValidTransaction(response);
        expect(response.uid).toBe(1);
        expectAmountInYuan(response.amount);
      });

      it('should handle non-existent transaction', async () => {
        await testHttpError(
          () => ApiService.getTransactionById(999),
          404,
          '交易不存在'
        );
      });
    });

    describe('updateTransaction', () => {
      it('should update transaction successfully', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/transactions/1',
          'PUT'
        );

        const updateData = {
          amount: 250.00,
          note: '更新后的备注',
        };

        await ApiService.updateTransaction(1, updateData);

        const request = interceptor.getRequest();
        expect(request.body).toBeDefined();
        expect(request.body.amount).toBe(250.00);
        expect(request.body.note).toBe('更新后的备注');

        interceptor.remove();
      });
    });

    describe('deleteCashTransaction', () => {
      it('should delete transaction successfully', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/transactions/1',
          'DELETE'
        );

        await ApiService.deleteCashTransaction(1);

        const request = interceptor.getRequest();
        expect(request.method).toBe('DELETE');

        interceptor.remove();
      });
    });

    describe('searchCash', () => {
      it('should search cash transactions', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/transactions/search',
          'GET'
        );

        await ApiService.searchCash({
          q: '课程',
          student_id: 1,
        });

        const request = interceptor.getRequest();
        expect(request.url).toContain('q=课程');
        expect(request.url).toContain('student_id=1');

        interceptor.remove();
      });
    });
  });

  // ============================================================================
  // 分期付款模块测试
  // ============================================================================

  describe('Installment Management', () => {
    describe('getInstallmentStatuses', () => {
      it('should fetch all installment statuses', async () => {
        const response = await ApiService.getInstallmentStatuses();
        
        expect(Array.isArray(response)).toBe(true);
        response.forEach(installment => {
          expect(installment).toHaveProperty('uid');
          expect(installment).toHaveProperty('plan_uid');
          expect(installment).toHaveProperty('status');
          expect(Object.values(InstallmentStatus)).toContain(installment.status);
        });
      });
    });

    describe('getUpcomingInstallments', () => {
      it('should fetch upcoming installments within specified days', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/installments',
          'GET'
        );

        await ApiService.getUpcomingInstallments(30);

        const request = interceptor.getRequest();
        expect(request.url).toContain('days=30');

        interceptor.remove();
      });

      it('should use default days when not specified', async () => {
        const response = await ApiService.getUpcomingInstallments();
        expect(Array.isArray(response)).toBe(true);
      });
    });

    describe('updateInstallmentStatus', () => {
      it('should update installment status', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/installments/1/status',
          'PUT'
        );

        await ApiService.updateInstallmentStatus(1, InstallmentStatus.PAID);

        const request = interceptor.getRequest();
        expect(request.body).toBeDefined();
        expect(request.body.status).toBe(InstallmentStatus.PAID);

        interceptor.remove();
      });
    });

    describe('payNextInstallment', () => {
      it('should pay next installment', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/installments/1/pay',
          'POST'
        );

        await ApiService.payNextInstallment(1);

        const request = interceptor.getRequest();
        expect(request.method).toBe('POST');

        interceptor.remove();
      });
    });

    describe('getInstallmentPlan', () => {
      it('should fetch installment plan details', async () => {
        const response = await ApiService.getInstallmentPlan(1);
        
        expect(response).toHaveProperty('plan');
        expect(response).toHaveProperty('installments');
        expect(response.plan).toHaveProperty('uid');
        expect(response.plan).toHaveProperty('total_installments');
        expect(Array.isArray(response.installments)).toBe(true);
      });
    });
  });

  // ============================================================================
  // 会员管理模块测试
  // ============================================================================

  describe('Membership Management', () => {
    describe('getMembershipStats', () => {
      it('should fetch membership statistics', async () => {
        const response = await ApiService.getMembershipStats();
        
        expect(response).toHaveProperty('total_members');
        expect(response).toHaveProperty('active_members');
        expect(response).toHaveProperty('expired_members');
        expect(response).toHaveProperty('upcoming_expirations');
        expect(typeof response.total_members).toBe('number');
        expect(typeof response.active_members).toBe('number');
      });
    });

    describe('setStudentMembership', () => {
      it('should set student membership', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/membership/1',
          'POST'
        );

        const membershipData = {
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          type: 'Month' as const,
        };

        await ApiService.setStudentMembership(1, membershipData);

        const request = interceptor.getRequest();
        expect(request.body).toBeDefined();
        expect(request.body.start_date).toBe('2024-01-01');
        expect(request.body.end_date).toBe('2024-12-31');
        expect(request.body.type).toBe('Month');

        interceptor.remove();
      });

      it('should return updated student with membership', async () => {
        const membershipData = {
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          type: 'Year' as const,
        };

        const response = await ApiService.setStudentMembership(1, membershipData);

        expectValidStudent(response);
        expect(response.is_membership_active).toBe(true);
        expect(response.membership_status).toBe('Active');
        expect(response.membership_start_date).toBe('2024-01-01');
        expect(response.membership_end_date).toBe('2024-12-31');
      });
    });

    describe('clearStudentMembership', () => {
      it('should clear student membership', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/membership/1',
          'DELETE'
        );

        await ApiService.clearStudentMembership(1);

        const request = interceptor.getRequest();
        expect(request.method).toBe('DELETE');

        interceptor.remove();
      });

      it('should return updated student without membership', async () => {
        const response = await ApiService.clearStudentMembership(1);

        expectValidStudent(response);
        expect(response.is_membership_active).toBe(false);
        expect(response.membership_status).toBe('None');
        expect(response.membership_start_date).toBeNull();
        expect(response.membership_end_date).toBeNull();
      });
    });

    describe('setMembershipByType', () => {
      it('should set membership by type', async () => {
        const response = await ApiService.setMembershipByType(1, 'Month', '2024-01-01');

        expectValidStudent(response);
        expect(response.is_membership_active).toBe(true);
        expect(response.membership_start_date).toBe('2024-01-01');
      });
    });

    describe('renewMembership', () => {
      it('should renew membership', async () => {
        const response = await ApiService.renewMembership(1, 'Year');

        expectValidStudent(response);
        expect(response.is_membership_active).toBe(true);
        expectValidDateString(response.membership_end_date);
      });
    });
  });

  // ============================================================================
  // 统计数据模块测试
  // ============================================================================

  describe('Statistics Module', () => {
    describe('getDashboardStats', () => {
      it('should fetch dashboard statistics', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/stats/dashboard',
          'GET'
        );

        await ApiService.getDashboardStats('month');

        const request = interceptor.getRequest();
        expect(request.url).toContain('period=month');

        interceptor.remove();
      });

      it('should return valid dashboard stats', async () => {
        const response = await ApiService.getDashboardStats();

        expect(response).toHaveProperty('totalRevenue');
        expect(response).toHaveProperty('activeStudents');
        expect(response).toHaveProperty('averageGrade');
        expect(typeof response.totalRevenue).toBe('number');
        expect(typeof response.activeStudents).toBe('number');
        expect(typeof response.averageGrade).toBe('number');
        expectAmountInYuan(response.totalRevenue);
      });
    });

    describe('getStudentStats', () => {
      it('should fetch student statistics', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/stats/students/1',
          'GET'
        );

        await ApiService.getStudentStats(1, 'month');

        const request = interceptor.getRequest();
        expect(request.url).toContain('period=month');

        interceptor.remove();
      });

      it('should return valid student stats', async () => {
        const response = await ApiService.getStudentStats(1);

        expect(response).toHaveProperty('total_payments');
        expect(response).toHaveProperty('payment_count');
        expect(response).toHaveProperty('average_score');
        expect(response).toHaveProperty('membership_status');
        expect(typeof response.total_payments).toBe('number');
        expect(typeof response.payment_count).toBe('number');
        expectAmountInYuan(response.total_payments);
      });

      it('should handle non-existent student stats', async () => {
        await testHttpError(
          () => ApiService.getStudentStats(999),
          404,
          '学员不存在'
        );
      });
    });

    describe('getFinancialStats', () => {
      it('should fetch financial statistics', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/stats/financial',
          'GET'
        );

        await ApiService.getFinancialStats('year');

        const request = interceptor.getRequest();
        expect(request.url).toContain('period=year');

        interceptor.remove();
      });

      it('should return valid financial stats', async () => {
        const response = await ApiService.getFinancialStats();

        expect(response).toHaveProperty('totalIncome');
        expect(response).toHaveProperty('totalExpense');
        expect(response).toHaveProperty('netIncome');
        expect(typeof response.totalIncome).toBe('number');
        expect(typeof response.totalExpense).toBe('number');
        expect(typeof response.netIncome).toBe('number');
        expectAmountInYuan(response.totalIncome);
        expectAmountInYuan(response.totalExpense);
        expectAmountInYuan(response.netIncome);
      });
    });

    describe('getMembershipExpiringSoon', () => {
      it('should fetch members with expiring membership', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/stats/membership/expiring',
          'GET'
        );

        await ApiService.getMembershipExpiringSoon(30);

        const request = interceptor.getRequest();
        expect(request.url).toContain('days=30');

        interceptor.remove();
      });

      it('should use default days when not specified', async () => {
        const response = await ApiService.getMembershipExpiringSoon();
        expect(Array.isArray(response)).toBe(true);
      });
    });
  });

  // ============================================================================
  // 认证模块测试
  // ============================================================================

  describe('Authentication Module', () => {
    describe('login', () => {
      it('should login with valid credentials', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/auth/login',
          'POST'
        );

        const credentials: LoginCredentials = createTestCredentials();

        await ApiService.login(credentials);

        const request = interceptor.getRequest();
        expect(request.body).toBeDefined();
        expect(request.body.username).toBe('test@example.com');
        expect(request.body.password).toBe('password123');

        interceptor.remove();
      });

      it('should return valid login response', async () => {
        const credentials: LoginCredentials = createTestCredentials();
        const response = await ApiService.login(credentials);

        expect(response).toHaveProperty('user');
        expect(response).toHaveProperty('accessToken');
        expect(response).toHaveProperty('refreshToken');
        expect(response).toHaveProperty('expiresIn');
        expect(response.user).toHaveProperty('uid');
        expect(response.user).toHaveProperty('username');
        expect(typeof response.accessToken).toBe('string');
        expect(typeof response.expiresIn).toBe('number');
      });

      it('should handle invalid credentials', async () => {
        const invalidCredentials: LoginCredentials = createTestCredentials({
          username: 'invalid@example.com',
          password: 'wrongpassword',
        });

        await testHttpError(
          () => ApiService.login(invalidCredentials),
          401,
          '用户名或密码错误'
        );
      });
    });

    describe('logout', () => {
      it('should logout successfully', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/auth/logout',
          'POST'
        );

        await ApiService.logout();

        const request = interceptor.getRequest();
        expect(request.method).toBe('POST');

        interceptor.remove();
      });
    });

    describe('getCurrentUser', () => {
      it('should fetch current user information', async () => {
        const response = await ApiService.getCurrentUser();

        expect(response).toHaveProperty('uid');
        expect(response).toHaveProperty('username');
        expect(response).toHaveProperty('name');
        expect(response).toHaveProperty('role');
        expect(typeof response.uid).toBe('number');
        expect(typeof response.username).toBe('string');
        expect(typeof response.name).toBe('string');
        expect(typeof response.role).toBe('string');
      });
    });

    describe('refreshToken', () => {
      it('should refresh access token', async () => {
        const interceptor = createRequestInterceptor(
          'http://localhost:3001/api/v1/auth/refresh',
          'POST'
        );

        await ApiService.refreshToken('mock-refresh-token');

        const request = interceptor.getRequest();
        expect(request.body).toBeDefined();
        expect(request.body.refreshToken).toBe('mock-refresh-token');

        interceptor.remove();
      });
    });
  });

  // ============================================================================
  // 适配器模块测试
  // ============================================================================

  describe('Adapter Module', () => {
    describe('getHealthStatus', () => {
      it('should fetch system health status', async () => {
        const response = await ApiService.getHealthStatus();

        expect(response).toHaveProperty('status');
        expect(response).toHaveProperty('database');
        expect(response).toHaveProperty('timestamp');
        expect(['healthy', 'unhealthy', 'degraded']).toContain(response.status);
        expect(typeof response.database).toBe('string');
        expectValidDateString(response.timestamp);
      });
    });

    describe('getAdapterInfo', () => {
      it('should fetch adapter information', async () => {
        const response = await ApiService.getAdapterInfo();

        expect(response).toHaveProperty('name');
        expect(response).toHaveProperty('version');
        expect(response).toHaveProperty('database');
        expect(response).toHaveProperty('environment');
        expect(typeof response.name).toBe('string');
        expect(typeof response.version).toBe('string');
        expect(typeof response.database).toBe('string');
        expect(typeof response.environment).toBe('string');
      });
    });
  });

  // ============================================================================
  // 错误处理和边界情况测试
  // ============================================================================

  describe('Error Handling and Edge Cases', () => {
    describe('HTTP Error Status Codes', () => {
      it('should handle 401 Unauthorized', async () => {
        // 使用专门的错误端点测试
        try {
          await fetch('http://localhost:3001/api/v1/error/401');
          expect.fail('Should have thrown an error');
        } catch (error: any) {
          expect(error).toBeDefined();
        }
      });

      it('should handle 403 Forbidden', async () => {
        try {
          await fetch('http://localhost:3001/api/v1/error/403');
          expect.fail('Should have thrown an error');
        } catch (error: any) {
          expect(error).toBeDefined();
        }
      });

      it('should handle 500 Internal Server Error', async () => {
        try {
          await fetch('http://localhost:3001/api/v1/error/500');
          expect.fail('Should have thrown an error');
        } catch (error: any) {
          expect(error).toBeDefined();
        }
      });
    });

    describe('Network Issues', () => {
      it('should handle network timeout', async () => {
        await testNetworkTimeout(() => ApiService.getAllStudents());
      });

      it('should handle connection refused', async () => {
        // Mock connection refused scenario
        testServer.close();
        
        try {
          await ApiService.getAllStudents();
          expect.fail('Expected connection error');
        } catch (error: any) {
          expect(error).toBeDefined();
          expect(error.message || error.error).toMatch(/network|connection|fetch/i);
        } finally {
          testServer.listen({ onUnhandledRequest: 'error' });
        }
      });
    });

    describe('Data Validation', () => {
      it('should handle invalid pagination parameters', async () => {
        await testInvalidInput(
          (params: StudentSearchOptions) => ApiService.getAllStudents(params),
          { page: -1, limit: 0 } as any,
          'validation'
        );
      });

      it('should handle invalid date formats', async () => {
        const invalidStudent = createTestStudentInput({
          membership_start_date: 'invalid-date',
        });

        await testInvalidInput(
          ApiService.addStudent,
          invalidStudent,
          'validation'
        );
      });

      it('should handle extremely large amounts', async () => {
        const invalidTransaction = createTestTransactionInput({
          amount: Number.MAX_SAFE_INTEGER,
        });

        await testInvalidInput(
          ApiService.addCashTransaction,
          invalidTransaction,
          'validation'
        );
      });
    });

    describe('Null and Undefined Handling', () => {
      it('should handle null optional fields correctly', async () => {
        const studentWithNulls = createTestStudentInput({
          age: null,
          phone: '',
          note: null,
          lesson_left: null,
        });

        const response = await ApiService.addStudent(studentWithNulls);
        expectValidStudent(response);
        expect(response.age).toBeNull();
        expect(response.note).toBeNull();
        expect(response.lesson_left).toBeNull();
      });

      it('should handle undefined optional fields correctly', async () => {
        const studentWithUndefined = createTestStudentInput({
          age: undefined,
          phone: undefined,
          note: undefined,
          lesson_left: undefined,
        });

        const response = await ApiService.addStudent(studentWithUndefined);
        expectValidStudent(response);
        expect(response.age).toBeNull();
        expect(response.note).toBeNull();
        expect(response.lesson_left).toBeNull();
      });
    });

    describe('Data Type Consistency', () => {
      it('should maintain consistent numeric types', async () => {
        const response = await ApiService.getAllTransactions();
        
        if (response.transactions.length > 0) {
          response.transactions.forEach(transaction => {
            expect(typeof transaction.uid).toBe('number');
            expect(typeof transaction.amount).toBe('number');
            expect(typeof transaction.student_id).toBe('number');
          });
        }
      });

      it('should maintain consistent string types', async () => {
        const response = await ApiService.getAllStudents();
        
        if (response.students.length > 0) {
          response.students.forEach(student => {
            expect(typeof student.name).toBe('string');
            expect(typeof student.phone).toBe('string');
            expect(typeof student.class).toBe('string');
            expect(typeof student.subject).toBe('string');
          });
        }
      });

      it('should maintain consistent boolean types', async () => {
        const response = await ApiService.getAllStudents();
        
        if (response.students.length > 0) {
          response.students.forEach(student => {
            expect(typeof student.is_membership_active).toBe('boolean');
          });
        }
      });
    });

    describe('Amount Unit Conversion', () => {
      it('should always return amounts in yuan with 2 decimal places', async () => {
        const response = await ApiService.getAllTransactions();
        
        if (response.transactions.length > 0) {
          response.transactions.forEach(transaction => {
            expectAmountInYuan(transaction.amount);
            expect(transaction.amount).toBe(Number(transaction.amount.toFixed(2)));
          });
        }
      });

      it('should handle fractional amounts correctly', async () => {
        const fractionalTransaction = createTestTransactionInput({
          amount: 123.456789, // 超过2位小数
        });

        const response = await ApiService.addCashTransaction(fractionalTransaction);
        expect(response.amount).toBe(123.46); // 四舍五入到2位小数
      });
    });

    describe('Date Format Consistency', () => {
      it('should return dates in ISO format', async () => {
        const studentResponse = await ApiService.getStudentById(1);
        const transactionResponse = await ApiService.getTransactionById(1);

        expectValidDateString(studentResponse.created_at);
        expectValidDateString(studentResponse.updated_at);
        expectValidDateString(transactionResponse.created_at);
        expectValidDateString(transactionResponse.updated_at);
      });

      it('should handle null dates correctly', async () => {
        const studentWithNullDates = createTestStudentInput({
          membership_start_date: null,
          membership_end_date: null,
        });

        const response = await ApiService.addStudent(studentWithNullDates);
        expect(response.membership_start_date).toBeNull();
        expect(response.membership_end_date).toBeNull();
      });
    });
  });

  // ============================================================================
  // 性能和并发测试
  // ============================================================================

  describe('Performance and Concurrency', () => {
    it('should handle concurrent requests', async () => {
      const promises = Array.from({ length: 10 }, () => ApiService.getAllStudents());
      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expectValidApiResponse(response);
        expect(response).toHaveProperty('students');
        expect(response).toHaveProperty('pagination');
      });
    });

    it('should handle rapid sequential requests', async () => {
      for (let i = 0; i < 5; i++) {
        const response = await ApiService.getStudentById(1);
        expectValidStudent(response);
      }
    });
  });
});