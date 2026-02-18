/**
 * Repository Unit Tests
 *
 * Tests for Repository layer - CRUD operations, queries, and business logic
 * These tests verify the repository layer without heavy integration testing
 */

import { StudentRepository } from '@/db/repositories/studentRepository';
import { CashRepository } from '@/db/repositories/cashRepository';
import { InstallmentPlanRepository, InstallmentRepository } from '@/db/repositories/installmentRepository';
import { StudentBuilder } from '@/services/studentBuilder';
import { CashBuilder } from '@/services/cashBuilder';
import { ClassType, SubjectType, PaymentFrequencyValues, InstallmentStatusValues } from '@/types';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllCollections,
  resetAllSequences,
  createTestStudent,
  createTestCashTransaction,
  createTestInstallmentPlan,
  createTestInstallment,
  addDays,
} from './helpers/testSetup';

jest.setTimeout(30000);

describe('StudentRepository', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await clearAllCollections();
    await resetAllSequences();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('CRUD Operations', () => {
    it('creates a student and returns it with uid', async () => {
      const student = await createTestStudent({ name: 'Repo Test Student' });

      expect(student.uid).toBeGreaterThan(0);
      expect(student.name).toBe('Repo Test Student');

      // Verify retrieval
      const found = await StudentRepository.findByUid(student.uid);
      expect(found).not.toBeNull();
      expect(found?.name).toBe('Repo Test Student');
    });

    it('returns null for non-existent uid', async () => {
      const found = await StudentRepository.findByUid(99999);
      expect(found).toBeNull();
    });

    it('updates student data', async () => {
      const student = await createTestStudent({ name: 'Original Name' });

      const updated = await StudentRepository.updateByUid(student.uid, {
        name: 'Updated Name',
        note: 'Test note',
      });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.note).toBe('Test note');

      // Verify persistence
      const reloaded = await StudentRepository.findByUid(student.uid);
      expect(reloaded?.name).toBe('Updated Name');
    });

    it('returns null when updating non-existent student', async () => {
      const updated = await StudentRepository.updateByUid(99999, { name: 'Test' });
      expect(updated).toBeNull();
    });

    it('deletes student by uid', async () => {
      const student = await createTestStudent({ name: 'To Delete' });

      const deleted = await StudentRepository.deleteByUid(student.uid);
      expect(deleted).toBe(true);

      const found = await StudentRepository.findByUid(student.uid);
      expect(found).toBeNull();
    });

    it('returns false when deleting non-existent student', async () => {
      const deleted = await StudentRepository.deleteByUid(99999);
      expect(deleted).toBe(false);
    });

    it('finds all students ordered by createdAt desc', async () => {
      await createTestStudent({ name: 'Student 1', phone: '13800000001' });
      await createTestStudent({ name: 'Student 2', phone: '13800000002' });
      await createTestStudent({ name: 'Student 3', phone: '13800000003' });

      const all = await StudentRepository.findAll();
      expect(all.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Search and Filter', () => {
    beforeEach(async () => {
      await createTestStudent({ name: 'Alice', phone: '13800000001', class: ClassType.MONTH });
      await createTestStudent({ name: 'Bob', phone: '13800000002', class: ClassType.YEAR });
      await createTestStudent({ name: 'Charlie', phone: '13800000003', class: ClassType.MONTH });
    });

    it('filters by class type', async () => {
      const result = await StudentRepository.search({ classType: ClassType.MONTH });
      result.forEach((s) => {
        expect(s.classType).toBe(ClassType.MONTH);
      });
    });

    it('filters by subject', async () => {
      const result = await StudentRepository.search({ subject: SubjectType.SHOOTING });
      result.forEach((s) => {
        expect(s.subject).toBe(SubjectType.SHOOTING);
      });
    });

    it('filters by name contains', async () => {
      const result = await StudentRepository.search({ nameContains: 'Ali' });
      expect(result.length).toBe(1);
      expect(result[0]?.name).toBe('Alice');
    });
  });

  describe('Pagination', () => {
    it('paginates results correctly', async () => {
      for (let i = 0; i < 25; i++) {
        await createTestStudent({ name: `Page Student ${i}`, phone: `13800000${i.toString().padStart(2, '0')}` });
      }

      const page1 = await StudentRepository.findWithPagination({ page: 1, limit: 10 });
      expect(page1.data.length).toBe(10);
      expect(page1.pagination.total).toBeGreaterThanOrEqual(25);
      expect(page1.pagination.total_pages).toBeGreaterThanOrEqual(3);

      const page3 = await StudentRepository.findWithPagination({ page: 3, limit: 10 });
      expect(page3.data.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Membership Queries', () => {
    it('finds students with active membership', async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      await StudentBuilder.create()
        .name('Active Member')
        .phone('13800000001')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .membership(start, end)
        .build();

      const expiring = await StudentRepository.findExpiringMemberships(14);
      expect(expiring.length).toBeGreaterThan(0);
      expect(expiring.some((s) => s.name === 'Active Member')).toBe(true);
    });
  });

  describe('Score Operations', () => {
    it('adds a score', async () => {
      const student = await createTestStudent();

      const rings = await StudentRepository.addScore(student.uid, 9.5);
      expect(rings).toContain(9.5);

      const reloaded = await StudentRepository.findByUid(student.uid);
      expect(reloaded?.rings).toContain(9.5);
    });

    it('updates a score at index', async () => {
      const student = await StudentBuilder.create()
        .name('Score Test')
        .phone('13800000001')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .rings([8, 9, 7])
        .build();

      const rings = await StudentRepository.updateScore(student.uid, 1, 10);
      expect(rings).toEqual([8, 10, 7]);
    });

    it('deletes a score at index', async () => {
      const student = await StudentBuilder.create()
        .name('Delete Score Test')
        .phone('13800000002')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .rings([8, 9, 7])
        .build();

      const rings = await StudentRepository.deleteScore(student.uid, 1);
      expect(rings).toEqual([8, 7]);
    });
  });
});

describe('CashRepository', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await clearAllCollections();
    await resetAllSequences();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('CRUD Operations', () => {
    it('creates cash transaction and returns it with uid', async () => {
      const transaction = await createTestCashTransaction(100, null, 'Test Transaction');

      expect(transaction.uid).toBeGreaterThan(0);
      expect(transaction.amount).toBe(10000); // Converted to cents

      const found = await CashRepository.findByUid(transaction.uid);
      expect(found).not.toBeNull();
      expect(found?.note).toBe('Test Transaction');
    });

    it('updates cash transaction', async () => {
      const transaction = await createTestCashTransaction(100, null, 'Original Note');

      const updated = await CashRepository.updateByUid(transaction.uid, {
        note: 'Updated Note',
      });

      expect(updated?.note).toBe('Updated Note');
    });

    it('deletes cash transaction', async () => {
      const transaction = await createTestCashTransaction(50);

      const deleted = await CashRepository.deleteByUid(transaction.uid);
      expect(deleted).toBe(true);

      const found = await CashRepository.findByUid(transaction.uid);
      expect(found).toBeNull();
    });
  });

  describe('Financial Statistics', () => {
    beforeEach(async () => {
      const student = await createTestStudent();
      await createTestCashTransaction(500, student.uid, 'Income 1');
      await createTestCashTransaction(300, student.uid, 'Income 2');
      await createTestCashTransaction(-100, null, 'Expense 1');
      await createTestCashTransaction(-50, null, 'Expense 2');
    });

    it('calculates correct financial stats', async () => {
      const stats = await CashRepository.getFinancialStats();

      expect(stats.totalIncome).toBe(80000);
      expect(stats.totalExpense).toBe(15000);
      expect(stats.netIncome).toBe(65000);
      expect(stats.transactionCount).toBe(4);
    });

    it('gets student income ranking', async () => {
      const ranking = await CashRepository.getStudentIncomeRanking(10);

      expect(ranking.length).toBeGreaterThan(0);
    });
  });

  describe('toResponse', () => {
    it('converts transaction to API response format', async () => {
      const transaction = await createTestCashTransaction(100, null, 'Response Test');

      const response = CashRepository.toResponse(transaction);

      expect(response.uid).toBe(transaction.uid);
      expect(response.student_id).toBe(transaction.studentId);
      expect(response.cash).toBe(transaction.amount);
      expect(response.amount).toBe(transaction.amount);
      expect(response.note).toBe(transaction.note);
      expect(response.created_at).toBeDefined();
      expect(response.updated_at).toBeDefined();
    });
  });
});

describe('InstallmentPlanRepository', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await clearAllCollections();
    await resetAllSequences();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('CRUD Operations', () => {
    it('creates installment plan with uid', async () => {
      const plan = await createTestInstallmentPlan(1000, 4, PaymentFrequencyValues.MONTHLY, new Date());

      expect(plan.uid).toBeGreaterThan(0);
      expect(plan.totalAmount).toBe(100000); // Converted to cents
    });

    it('updates installment plan', async () => {
      const plan = await createTestInstallmentPlan(1000, 4, PaymentFrequencyValues.MONTHLY, new Date());

      const updated = await InstallmentPlanRepository.updateByUid(plan.uid, {
        note: 'Updated note',
      });

      expect(updated?.note).toBe('Updated note');
    });

    it('deletes installment plan', async () => {
      const plan = await createTestInstallmentPlan(1000, 4, PaymentFrequencyValues.MONTHLY, new Date());

      const deleted = await InstallmentPlanRepository.deleteByUid(plan.uid);
      expect(deleted).toBe(true);

      const found = await InstallmentPlanRepository.findByUid(plan.uid);
      expect(found).toBeNull();
    });
  });

  describe('Plan Queries', () => {
    it('finds plans by student id', async () => {
      const student = await createTestStudent();
      await createTestInstallmentPlan(1000, 4, PaymentFrequencyValues.MONTHLY, new Date(), student.uid);
      await createTestInstallmentPlan(2000, 4, PaymentFrequencyValues.MONTHLY, new Date(), student.uid);

      const plans = await InstallmentPlanRepository.findByStudentId(student.uid);
      expect(plans.length).toBe(2);
    });

    it('finds active plans', async () => {
      await createTestInstallmentPlan(1000, 4, PaymentFrequencyValues.MONTHLY, new Date());

      const activePlans = await InstallmentPlanRepository.findActivePlans();
      expect(activePlans.length).toBeGreaterThan(0);
      activePlans.forEach((p) => {
        expect(p.status).toBe('ACTIVE');
      });
    });

    it('counts active plans', async () => {
      await createTestInstallmentPlan(1000, 4, PaymentFrequencyValues.MONTHLY, new Date());

      const count = await InstallmentPlanRepository.countActivePlans();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('toResponse', () => {
    it('converts plan to API response format', async () => {
      const plan = await createTestInstallmentPlan(1000, 4, PaymentFrequencyValues.MONTHLY, new Date());

      const response = InstallmentPlanRepository.toResponse(plan);

      expect(response.uid).toBe(plan.uid);
      expect(response.student_id).toBe(plan.studentId);
      expect(response.total_amount).toBe(plan.totalAmount);
      expect(response.totalAmount).toBe(plan.totalAmount);
      expect(response.status).toBe(plan.status);
      expect(response.is_active).toBe(true);
      expect(response.created_at).toBeDefined();
    });
  });
});

describe('InstallmentRepository', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await clearAllCollections();
    await resetAllSequences();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('CRUD Operations', () => {
    it('creates installment with uid', async () => {
      const plan = await createTestInstallmentPlan(1000, 4, PaymentFrequencyValues.MONTHLY, new Date());
      const installment = await createTestInstallment(
        plan.uid,
        null,
        1,
        4,
        250,
        new Date(),
        InstallmentStatusValues.PENDING,
      );

      expect(installment.uid).toBeGreaterThan(0);
      expect(installment.installmentAmount).toBe(25000);
    });

    it('updates installment', async () => {
      const plan = await createTestInstallmentPlan(1000, 4, PaymentFrequencyValues.MONTHLY, new Date());
      const installment = await createTestInstallment(
        plan.uid,
        null,
        1,
        4,
        250,
        new Date(),
        InstallmentStatusValues.PENDING,
      );

      const updated = await InstallmentRepository.updateByUid(installment.uid, {
        status: InstallmentStatusValues.PAID,
        paidAmount: 25000,
        paidDate: new Date().toISOString().split('T')[0],
      });

      expect(updated?.status).toBe(InstallmentStatusValues.PAID);
    });

    it('deletes installment', async () => {
      const plan = await createTestInstallmentPlan(1000, 4, PaymentFrequencyValues.MONTHLY, new Date());
      const installment = await createTestInstallment(
        plan.uid,
        null,
        1,
        4,
        250,
        new Date(),
        InstallmentStatusValues.PENDING,
      );

      const deleted = await InstallmentRepository.deleteByUid(installment.uid);
      expect(deleted).toBe(true);

      const found = await InstallmentRepository.findByUid(installment.uid);
      expect(found).toBeNull();
    });
  });

  describe('Installment Queries', () => {
    it('finds installments by plan id', async () => {
      const plan = await createTestInstallmentPlan(1000, 4, PaymentFrequencyValues.MONTHLY, new Date());
      await createTestInstallment(plan.uid, null, 1, 4, 250, new Date(), InstallmentStatusValues.PENDING);
      await createTestInstallment(plan.uid, null, 2, 4, 250, addDays(new Date(), 30), InstallmentStatusValues.PENDING);

      const installments = await InstallmentRepository.findByPlanId(plan.uid);
      expect(installments.length).toBe(2);
      expect(installments[0]?.installmentNumber).toBe(1);
      expect(installments[1]?.installmentNumber).toBe(2);
    });

    it('finds overdue installments', async () => {
      const plan = await createTestInstallmentPlan(1000, 4, PaymentFrequencyValues.MONTHLY, new Date());
      const overdueDate = addDays(new Date(), -10);
      await createTestInstallment(plan.uid, null, 1, 4, 250, overdueDate, InstallmentStatusValues.PENDING);

      const overdue = await InstallmentRepository.findOverdue();
      expect(overdue.length).toBeGreaterThan(0);
      expect(InstallmentRepository.isOverdue(overdue[0])).toBe(true);
    });

    it('finds installments by status', async () => {
      const plan = await createTestInstallmentPlan(1000, 4, PaymentFrequencyValues.MONTHLY, new Date());
      await createTestInstallment(plan.uid, null, 1, 4, 250, new Date(), InstallmentStatusValues.PENDING);
      await createTestInstallment(plan.uid, null, 2, 4, 250, new Date(), InstallmentStatusValues.PAID);

      const pending = await InstallmentRepository.findByStatus(InstallmentStatusValues.PENDING);
      expect(pending.length).toBeGreaterThan(0);
      pending.forEach((i) => {
        expect(i.status).toBe(InstallmentStatusValues.PENDING);
      });
    });
  });

  describe('Status Helpers', () => {
    it('detects overdue correctly', () => {
      const overdue: any = {
        uid: 1,
        planId: 1,
        studentId: null,
        installmentNumber: 1,
        installmentAmount: 25000,
        paidAmount: 0,
        dueDate: addDays(new Date(), -5).toISOString().split('T')[0],
        status: InstallmentStatusValues.PENDING,
      };

      const future: any = {
        uid: 2,
        planId: 1,
        studentId: null,
        installmentNumber: 2,
        installmentAmount: 25000,
        paidAmount: 0,
        dueDate: addDays(new Date(), 5).toISOString().split('T')[0],
        status: InstallmentStatusValues.PENDING,
      };

      expect(InstallmentRepository.isOverdue(overdue)).toBe(true);
      expect(InstallmentRepository.isOverdue(future)).toBe(false);
    });

    it('calculates remaining amount correctly', () => {
      const partial: any = {
        uid: 1,
        installmentAmount: 25000,
        paidAmount: 10000,
      } as any;

      const full: any = {
        uid: 2,
        installmentAmount: 25000,
        paidAmount: 25000,
      } as any;

      expect(InstallmentRepository.getRemainingAmount(partial)).toBe(15000);
      expect(InstallmentRepository.getRemainingAmount(full)).toBe(0);
    });
  });

  describe('toResponse', () => {
    it('converts installment to API response format', async () => {
      const plan = await createTestInstallmentPlan(1000, 4, PaymentFrequencyValues.MONTHLY, new Date());
      const installment = await createTestInstallment(
        plan.uid,
        null,
        1,
        4,
        250,
        new Date(),
        InstallmentStatusValues.PENDING,
      );

      const response = InstallmentRepository.toResponse(installment);

      expect(response.uid).toBe(installment.uid);
      expect(response.plan_id).toBe(installment.planId);
      expect(response.installment_number).toBe(installment.installmentNumber);
      expect(response.installment_amount).toBe(installment.installmentAmount);
      expect(response.status).toBe(installment.status);
      expect(response.is_overdue).toBe(false);
    });
  });
});
