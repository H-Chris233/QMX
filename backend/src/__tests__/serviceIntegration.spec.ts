/**
 * Service层集成测试 - 复杂业务场景
 *
 * 测试多个服务协同工作的场景：
 * - 学员全生命周期
 * - 财务交易关联
 * - 分期付款流程
 * - 数据一致性
 */

import { StudentBuilder } from '@/services/studentBuilder';
import { StudentUpdater } from '@/services/studentUpdater';
import { StudentQuery } from '@/services/studentQuery';
import { presentStudent } from '@/services/studentPresenter';
import { CashBuilder } from '@/services/cashBuilder';
import { ClassType, SubjectType, MembershipStatus, PaymentFrequencyValues, InstallmentStatusValues } from '@/types';
import { StudentRepository } from '@/db/repositories/studentRepository';
import { CashRepository } from '@/db/repositories/cashRepository';
import { InstallmentPlanRepository, InstallmentRepository } from '@/db/repositories/installmentRepository';
import {
  setupTestDatabase,
  clearAllCollections,
  createTestStudent,
  createTestCashTransaction,
  createTestInstallmentPlan,
  createTestInstallment,
  addDays,
  addMonths,
} from './helpers/testSetup';

describe('Service Integration - 复杂业务场景', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await clearAllCollections();
  });

  describe('学员全生命周期', () => {
    it('创建 -> 更新 -> 查询 -> 展示', async () => {
      // 1. 创建学员
      const student = await StudentBuilder.create()
        .name('Lifecycle Test')
        .phone('13812345678')
        .classType(ClassType.TEN_TRY)
        .subject(SubjectType.SHOOTING)
        .membership(
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          new Date(Date.now() + 23 * 24 * 60 * 60 * 1000),
        )
        .build();

      expect(student.uid).toBeGreaterThan(0);
      expect(student.lessonLeft).toBe(10); // 试课班默认10节

      // 2. 更新 - 添加成绩
      const updater = StudentUpdater.fromDocument(student);
      updater.addRing(8.5).addRing(9);
      const updated = await updater.commit();

      expect(updated.rings).toEqual([8.5, 9]);

      // 3. 展示
      const presented = presentStudent(updated);
      expect(presented.name).toBe('Lifecycle Test');
      expect(presented.membership_status).toBe(MembershipStatus.ACTIVE);

      // 4. 查询 - 验证 averageScore 在查询结果中
      const queryResult = await StudentQuery.create()
        .nameContains('Lifecycle')
        .membershipStatus('ACTIVE')
        .scoreRange(8, 10)
        .execute();

      expect(queryResult.data.length).toBe(1);
      expect(queryResult.data[0].averageScore).toBeCloseTo(8.75, 1);
    });

    it('会员续费流程', async () => {
      const student = await createTestStudent({
        name: 'Extend Test',
        membership: {
          startDate: addDays(new Date(), -10),
          endDate: addDays(new Date(), 20),
        },
      });

      const originalEnd = student.membershipEndDate;

      // 续费30天
      const updater = StudentUpdater.fromDocument(student);
      const newEnd = new Date();
      newEnd.setDate(newEnd.getDate() + 60);
      updater.membership(student.membershipStartDate!, newEnd);
      const updated = await updater.commit();

      expect(updated.membershipEndDate).not.toEqual(originalEnd);
      expect(new Date(updated.membershipEndDate!).getTime()).toBeGreaterThan(
        new Date(originalEnd!).getTime(),
      );

      // 展示验证
      const presented = presentStudent(updated);
      expect(presented.membership_days_remaining).toBeGreaterThan(30);
    });

    it('多次更新数据一致性', async () => {
      const student = await StudentBuilder.create()
        .name('Consistency Test')
        .phone('13812345678')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .rings([8, 9])
        .build();

      // 多次更新
      for (let i = 0; i < 5; i++) {
        const updater = StudentUpdater.fromDocument(
          await StudentRepository.findByUid(student.uid)!,
        );
        updater.addRing(8 + i * 0.1);
        await updater.commit();
      }

      // 验证最终状态
      const final = await StudentRepository.findByUid(student.uid);
      expect(final?.rings?.length).toBe(7);

      // 展示和查询应该反映相同数据
      const presented = presentStudent(final!);
      expect(presented.rings.length).toBe(7);

      const queryResult = await StudentQuery.create()
        .nameContains('Consistency')
        .execute();

      expect(queryResult.data[0]?.rings.length).toBe(7);
    });
  });

  describe('财务交易与学员关联', () => {
    it('学员支付追踪', async () => {
      const student = await createTestStudent({ name: 'Payment Test' });

      // 多次支付
      await createTestCashTransaction(500, student.uid, 'First Payment');
      await createTestCashTransaction(300, student.uid, 'Second Payment');

      // 查询学员交易
      const transactions = await CashRepository.findByStudentId(student.uid);
      expect(transactions.length).toBe(2);
      expect(transactions.reduce((sum, t) => sum + t.amount, 0)).toBe(80000); // 800元 = 80000分
    });

    it('财务统计与交易一致', async () => {
      const student = await createTestStudent({ name: 'Stats Test' });

      await createTestCashTransaction(1000, student.uid, 'Income');
      await createTestCashTransaction(-200, null, 'Expense');

      const stats = await CashRepository.getFinancialStats();

      expect(stats.totalIncome).toBe(100000);
      expect(stats.totalExpense).toBe(20000);
      expect(stats.netIncome).toBe(80000);
    });
  });

  describe('分期付款流程', () => {
    it('分期计划生命周期', async () => {
      const student = await createTestStudent({ name: 'Installment Test' });

      // 1. 创建分期计划
      const plan = await createTestInstallmentPlan(
        1200, // 总金额
        3,    // 期数
        PaymentFrequencyValues.MONTHLY,
        new Date(),
        student.uid,
      );

      expect(plan.status).toBe('ACTIVE');

      // 2. 创建分期记录
      const inst1 = await createTestInstallment(
        plan.uid,
        student.uid,
        1,
        3,
        400, // 每期金额
        new Date(),
        InstallmentStatusValues.PAID,
      );

      const inst2 = await createTestInstallment(
        plan.uid,
        student.uid,
        2,
        3,
        400,
        addMonths(new Date(), 1),
        InstallmentStatusValues.PENDING,
      );

      // 3. 查询分期
      const installments = await InstallmentRepository.findByPlanId(plan.uid);
      expect(installments.length).toBe(2);

      // 4. 刷新计划状态
      await InstallmentRepository.refreshPlanStatus(plan.uid);

      const updatedPlan = await InstallmentPlanRepository.findByUid(plan.uid);
      expect(updatedPlan?.status).toBe('ACTIVE'); // 还有未付的分期
    });

    it('逾期检测', async () => {
      const student = await createTestStudent({ name: 'Overdue Test' });

      const plan = await createTestInstallmentPlan(
        800,
        4,
        PaymentFrequencyValues.MONTHLY,
        addMonths(new Date(), -1), // 一个月前开始
        student.uid,
      );

      // 创建已逾期分期（应还日期在10天前）
      await createTestInstallment(
        plan.uid,
        student.uid,
        1,
        4,
        200,
        new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        InstallmentStatusValues.PENDING,
      );

      // 查找逾期分期
      const overdue = await InstallmentRepository.findOverdue();
      expect(overdue.length).toBeGreaterThan(0);

      const overdueWithStatus = overdue.find((i) =>
        InstallmentRepository.isOverdue(i),
      );
      expect(overdueWithStatus).toBeDefined();
    });
  });

  describe('跨服务数据一致性', () => {
    it('Builder -> Updater -> Presenter 数据流', async () => {
      // 创建带会员的学员
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 30);

      const student = await StudentBuilder.create()
        .name('Data Flow Test')
        .phone('13812345678')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .rings([7, 8, 9])
        .membership(start, end)
        .build();

      // 使用 Updater 更新
      const updater = StudentUpdater.fromDocument(student);
      updater.addRing(10);
      const updated = await updater.commit();

      // 使用 Presenter 展示
      const presented = presentStudent(updated);

      // 验证数据流一致性
      expect(presented.name).toBe(student.name);
      expect(presented.phone).toBe(student.phone);
      expect(presented.membership_status).toBe(MembershipStatus.ACTIVE);
      expect(presented.rings.length).toBe(4); // 3 + 1 新成绩
      expect(presented.averageScore).toBeCloseTo(8.5, 1);
    });

    it('删除学员不影响其他学员', async () => {
      const student1 = await createTestStudent({ name: 'Student 1' });
      const student2 = await createTestStudent({ name: 'Student 2' });

      // 为两个学员创建交易
      await createTestCashTransaction(100, student1.uid, 'Pay 1');
      await createTestCashTransaction(200, student2.uid, 'Pay 2');

      // 删除 student1
      await StudentRepository.deleteByUid(student1.uid);

      // 验证 student2 仍然存在且交易正常
      const remaining = await StudentQuery.create()
        .nameContains('Student 2')
        .execute();

      expect(remaining.data.length).toBe(1);
      expect(remaining.data[0].name).toBe('Student 2');

      // 验证交易计数（应该只剩 student2 的交易）
      const transactions = await CashRepository.findByStudentId(student2.uid);
      expect(transactions.length).toBe(1);
      expect(transactions[0].amount).toBe(20000);
    });
  });

  describe('复杂查询场景', () => {
    it('多条件组合查询', async () => {
      // 准备测试数据
      await StudentBuilder.create()
        .name('Alice Active')
        .phone('13800000001')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .rings([9, 9.5])
        .age(25)
        .build();

      await StudentBuilder.create()
        .name('Bob Inactive')
        .phone('13800000002')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .rings([6, 7])
        .age(30)
        .build();

      await StudentBuilder.create()
        .name('Charlie Archery')
        .phone('13800000003')
        .classType(ClassType.YEAR)
        .subject(SubjectType.ARCHERY)
        .rings([8, 8.5])
        .age(20)
        .build();

      // 多条件查询：射击会员 + 高分
      const result = await StudentQuery.create()
        .subject(SubjectType.SHOOTING)
        .classType(ClassType.MONTH)
        .scoreRange(8, 10)
        .ageRange(20, 30)
        .sort('name', 'ASC')
        .execute();

      // 应该只找到 Alice
      expect(result.data.length).toBe(1);
      expect(result.data[0].name).toBe('Alice Active');
    });

    it('分页与过滤组合', async () => {
      // 创建20个学员
      for (let i = 0; i < 20; i++) {
        await StudentBuilder.create()
          .name(`Student ${i}`)
          .phone(`13800000${i.toString().padStart(2, '0')}`)
          .classType(ClassType.MONTH)
          .subject(SubjectType.SHOOTING)
          .rings([8 + (i % 3) * 0.5]) // 8, 8.5, 9
          .build();
      }

      // 查询高分学员，取前5个
      const result = await StudentQuery.create()
        .scoreRange(8, 10)
        .sort('name', 'ASC')
        .paginate(1, 5)
        .execute();

      expect(result.data.length).toBe(5);
      expect(result.pagination.total).toBe(20);
      expect(result.pagination.total_pages).toBe(4);
    });
  });
});
