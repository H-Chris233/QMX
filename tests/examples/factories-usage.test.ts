/**
 * 测试数据工厂使用示例
 * 展示如何使用工厂、fixture和断言助手
 */

import { describe, it, expect } from 'vitest';
import {
  StudentFactory,
  TransactionFactory,
  InstallmentFactory,
  InstallmentPlanFactory,
  DashboardStatsFactory,
  yuanToCents,
  centsToYuan,
  isoToYYYYMMDD,
  yyyymmddToISO,
  randomInt,
  testId,
} from '../factories';
import {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  ErrorResponses,
} from '../fixtures';
import {
  assertSuccess,
  assertError,
  assertPaginatedResponse,
  assertStudentStructure,
  assertTransactionStructure,
  assertDateFormat,
  assertAmountFormat,
} from '../helpers';
import { ClassType, SubjectType, MembershipStatus } from '@/types/api';

describe('StudentFactory 使用示例', () => {
  it('应该快速创建默认学员', () => {
    const student = StudentFactory.build();
    
    assertStudentStructure(student);
    expect(student.uid).toBeGreaterThan(0);
    expect(student.name).toBeTruthy();
    expect(student.rings).toBeInstanceOf(Array);
  });

  it('应该创建带自定义字段的学员', () => {
    const student = StudentFactory.build({
      name: '测试学员',
      age: 25,
      phone: '13800138000',
    });
    
    expect(student.name).toBe('测试学员');
    expect(student.age).toBe(25);
    expect(student.phone).toBe('13800138000');
  });

  it('应该使用链式API创建学员', () => {
    const student = StudentFactory.create()
      .withName('张三')
      .withAge(20)
      .withPhone('13800138000')
      .withClass(ClassType.MONTH)
      .withSubject(SubjectType.SHOOTING)
      .withRings([8, 9, 7, 9, 8])
      .withLessonLeft(10)
      .withMembership('2024-01-01', '2024-12-31', MembershipStatus.ACTIVE)
      .withNote('优秀学员')
      .build();
    
    expect(student.name).toBe('张三');
    expect(student.age).toBe(20);
    expect(student.rings).toEqual([8, 9, 7, 9, 8]);
    expect(student.membership_status).toBe(MembershipStatus.ACTIVE);
    assertDateFormat(student.membership_start_date);
  });

  it('应该批量创建学员', () => {
    const students = StudentFactory.buildMany(10);
    
    expect(students).toHaveLength(10);
    students.forEach(student => {
      assertStudentStructure(student);
    });
  });

  it('应该创建无会员学员', () => {
    const student = StudentFactory.create()
      .withName('李四')
      .withoutMembership()
      .build();
    
    expect(student.membership_start_date).toBeNull();
    expect(student.membership_end_date).toBeNull();
    expect(student.is_membership_active).toBe(false);
  });

  it('应该创建已过期会员学员', () => {
    const student = StudentFactory.create()
      .withName('王五')
      .withExpiredMembership()
      .build();
    
    expect(student.membership_status).toBe(MembershipStatus.EXPIRED);
    expect(student.is_membership_active).toBe(false);
  });
});

describe('TransactionFactory 使用示例', () => {
  it('应该创建收入交易', () => {
    const transaction = TransactionFactory.buildIncome(100.50, 1);
    
    assertTransactionStructure(transaction);
    expect(transaction.amount).toBe(100.50);
    expect(transaction.student_id).toBe(1);
    expect(transaction.is_income).toBe(true);
    assertAmountFormat(transaction.amount);
  });

  it('应该创建支出交易', () => {
    const transaction = TransactionFactory.buildExpense(50.00, '设备采购');
    
    expect(transaction.amount).toBeLessThan(0);
    expect(transaction.is_expense).toBe(true);
    expect(transaction.note).toBe('设备采购');
  });

  it('应该创建分期付款交易', () => {
    const transaction = TransactionFactory.buildInstallment(100, 1, 1, 2, 12);
    
    expect(transaction.amount).toBe(100);
    expect(transaction.student_id).toBe(1);
    expect(transaction.is_installment).toBe(true);
    expect(transaction.installment).toBeDefined();
    expect(transaction.installment?.plan_uid).toBe(1);
    expect(transaction.installment?.installment_number).toBe(2);
    expect(transaction.installment?.total_installments).toBe(12);
  });

  it('应该使用链式API创建交易', () => {
    const transaction = TransactionFactory.create()
      .withAmount(200)
      .withStudentId(5)
      .withNote('年费')
      .withoutInstallment()
      .build();
    
    expect(transaction.amount).toBe(200);
    expect(transaction.student_id).toBe(5);
    expect(transaction.note).toBe('年费');
    expect(transaction.is_installment).toBe(false);
  });
});

describe('InstallmentFactory 使用示例', () => {
  it('应该创建待支付分期', () => {
    const installment = InstallmentFactory.buildPending(1, 100, 3, 12);
    
    expect(installment.plan_id).toBe(1);
    expect(installment.installment_amount).toBe(100);
    expect(installment.current_installment).toBe(3);
    expect(installment.total_installments).toBe(12);
    expect(installment.status).toBe('Pending');
    expect(installment.paid_amount).toBe(0);
  });

  it('应该创建已支付分期', () => {
    const installment = InstallmentFactory.buildPaid(1, 100, 1, 12);
    
    expect(installment.status).toBe('Paid');
    expect(installment.paid_amount).toBe(100);
    expect(installment.paid_at).toBeTruthy();
  });

  it('应该创建逾期分期', () => {
    const installment = InstallmentFactory.buildOverdue(1, 100, 2, 12);
    
    expect(installment.status).toBe('Overdue');
    expect(installment.is_overdue).toBe(true);
    expect(installment.days_overdue).toBeGreaterThan(0);
  });
});

describe('InstallmentPlanFactory 使用示例', () => {
  it('应该创建月付计划', () => {
    const plan = InstallmentPlanFactory.buildMonthly(1, 12000, 12);
    
    expect(plan.student_id).toBe(1);
    expect(plan.total_amount).toBe(12000);
    expect(plan.total_installments).toBe(12);
    expect(plan.frequency).toBe('Monthly');
    expect(plan.status).toBe('Active');
  });

  it('应该创建周付计划', () => {
    const plan = InstallmentPlanFactory.buildWeekly(2, 1200, 4);
    
    expect(plan.frequency).toBe('Weekly');
    expect(plan.total_installments).toBe(4);
  });
});

describe('StatsFactory 使用示例', () => {
  it('应该创建仪表板统计', () => {
    const stats = DashboardStatsFactory.build({
      totalRevenue: 50000,
      activeStudents: 100,
      averageGrade: 85,
    });
    
    expect(stats.totalRevenue).toBe(50000);
    expect(stats.activeStudents).toBe(100);
    expect(stats.averageGrade).toBe(85);
  });
});

describe('工具函数使用示例', () => {
  it('应该转换金额单位', () => {
    expect(yuanToCents(100.50)).toBe(10050);
    expect(yuanToCents("100.50")).toBe(10050);
    expect(centsToYuan(10050)).toBe(100.50);
  });

  it('应该转换日期格式', () => {
    const isoDate = '2024-01-15T10:30:00Z';
    const ymd = isoToYYYYMMDD(isoDate);
    expect(ymd).toBe('2024-01-15');
    
    const backToIso = yyyymmddToISO(ymd);
    expect(backToIso).toContain('2024-01-15');
  });

  it('应该生成测试选择器', () => {
    const selector = testId('submit-button');
    expect(selector).toBe("[data-testid='submit-button']");
  });
});

describe('Fixture使用示例', () => {
  it('应该创建成功响应', () => {
    const response = createSuccessResponse({ id: 1, name: '测试' });
    
    assertSuccess(response);
    expect(response.data).toEqual({ id: 1, name: '测试' });
  });

  it('应该创建错误响应', () => {
    const response = createErrorResponse('Not Found', '资源不存在');
    
    assertError(response);
    expect(response.error).toBe('Not Found');
    expect(response.message).toBe('资源不存在');
  });

  it('应该创建分页响应', () => {
    const students = StudentFactory.buildMany(5);
    const response = createPaginatedResponse(students, 1, 10, 25);
    
    assertPaginatedResponse(response, 5, 25);
    expect(response.pagination.total_pages).toBe(3);
    expect(response.pagination.has_next).toBe(true);
  });

  it('应该使用标准错误响应', () => {
    const notFound = ErrorResponses.notFound('学员');
    assertError(notFound);
    expect(notFound.message).toContain('学员不存在');
    
    const unauthorized = ErrorResponses.unauthorized();
    assertError(unauthorized);
    expect(unauthorized.error).toBe('Unauthorized');
    
    const validationError = ErrorResponses.validationError({
      name: ['姓名不能为空'],
      phone: ['手机号格式不正确'],
    });
    expect(validationError.details).toBeDefined();
  });
});

describe('断言助手使用示例', () => {
  it('应该断言成功响应', () => {
    const response = createSuccessResponse({ id: 1 });
    assertSuccess(response);
    // TypeScript现在知道response.data存在
    expect(response.data.id).toBe(1);
  });

  it('应该断言错误响应', () => {
    const response = createErrorResponse('Error');
    assertError(response);
    // TypeScript现在知道response.error存在
    expect(response.error).toBe('Error');
  });

  it('应该断言数据结构', () => {
    const student = StudentFactory.build();
    assertStudentStructure(student);
    
    const transaction = TransactionFactory.build();
    assertTransactionStructure(transaction);
  });
});

describe('集成示例：完整的测试场景', () => {
  it('应该模拟创建学员并添加交易的完整流程', () => {
    // 1. 创建学员
    const student = StudentFactory.create()
      .withName('新学员')
      .withPhone('13800138000')
      .withMembership('2024-01-01', '2024-12-31')
      .build();
    
    assertStudentStructure(student);
    
    // 2. 模拟API成功响应
    const createResponse = createSuccessResponse(student);
    assertSuccess(createResponse);
    
    // 3. 创建关联交易
    const transaction = TransactionFactory.buildIncome(1200, student.uid);
    assertTransactionStructure(transaction);
    
    // 4. 模拟交易响应
    const transactionResponse = createSuccessResponse(transaction);
    assertSuccess(transactionResponse);
    
    // 5. 验证金额
    expect(transaction.amount).toBe(1200);
    assertAmountFormat(transaction.amount);
  });

  it('应该模拟分期付款的完整流程', () => {
    // 1. 创建学员
    const student = StudentFactory.build({ uid: 10 });
    
    // 2. 创建分期计划
    const plan = InstallmentPlanFactory.buildMonthly(student.uid, 12000, 12);
    
    // 3. 创建分期记录
    const installments = Array.from({ length: 12 }, (_, i) => 
      InstallmentFactory.buildPending(plan.uid, 1000, i + 1, 12)
    );
    
    expect(installments).toHaveLength(12);
    
    // 4. 支付第一期
    const firstInstallment = installments[0];
    const paidInstallment = InstallmentFactory.create()
      .withUid(firstInstallment.uid)
      .withPlanId(plan.uid)
      .withAmount(1000)
      .withInstallmentNumber(1, 12)
      .withStatus('Paid' as any)
      .withPaidAmount(1000)
      .withPaidAt(new Date().toISOString())
      .build();
    
    expect(paidInstallment.status).toBe('Paid');
    expect(paidInstallment.paid_amount).toBe(1000);
    
    // 5. 创建对应的交易记录
    const transaction = TransactionFactory.buildInstallment(
      1000,
      student.uid,
      plan.uid,
      1,
      12
    );
    
    expect(transaction.installment?.plan_uid).toBe(plan.uid);
  });

  it('应该模拟错误处理流程', () => {
    // 1. 尝试创建无效学员
    const invalidResponse = ErrorResponses.validationError({
      name: ['姓名不能为空'],
      phone: ['手机号格式不正确'],
    });
    
    assertError(invalidResponse);
    expect(invalidResponse.details).toBeDefined();
    
    // 2. 尝试访问不存在的资源
    const notFoundResponse = ErrorResponses.notFound('学员');
    assertError(notFoundResponse);
    
    // 3. 服务器错误
    const serverError = ErrorResponses.serverError();
    assertError(serverError);
  });
});
