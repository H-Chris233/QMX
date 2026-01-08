/**
 * Service Layer Integration Tests
 *
 * Tests for service layer components - Query Builders, Presenters, and Complex Business Logic
 */

import { StudentQuery } from '@/services/studentQuery';
import { presentStudent } from '@/services/studentPresenter';
import { StudentBuilder } from '@/services/studentBuilder';
import { StudentUpdater } from '@/services/studentUpdater';
import { CashBuilder } from '@/services/cashBuilder';
import { StudentRepository } from '@/db/repositories/studentRepository';
import { CashRepository } from '@/db/repositories/cashRepository';
import { InstallmentPlanRepository, InstallmentRepository } from '@/db/repositories/installmentRepository';
import { ClassType, SubjectType, PaymentFrequency, InstallmentStatus, MembershipStatus } from '@/types';
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
  addMonths,
} from './helpers/testSetup';

jest.setTimeout(30000);

describe('StudentQuery', () => {
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

  describe('Fluent API', () => {
    it('creates new query instance', () => {
      const query = StudentQuery.create();
      expect(query).toBeInstanceOf(StudentQuery);
    });

    it('allows chaining all filter methods', async () => {
      const result = await StudentQuery.create()
        .nameContains('Test')
        .ageRange(18, 30)
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .hasMembership(true)
        .membershipStatus('ACTIVE')
        .scoreRange(8, 10)
        .sort('name', 'ASC')
        .paginate(1, 20)
        .execute();

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toHaveProperty('page', 1);
      expect(result.pagination).toHaveProperty('limit', 20);
      expect(result.pagination).toHaveProperty('total');
      expect(result.pagination).toHaveProperty('total_pages');
    });
  });

  describe('Name Filter', () => {
    it('filters by partial name match', async () => {
      await createTestStudent({ name: 'Alice Smith' });
      await createTestStudent({ name: 'Bob Johnson' });
      await createTestStudent({ name: 'Alice Williams' });

      const result = await StudentQuery.create()
        .nameContains('Alice')
        .execute();

      expect(result.data.length).toBe(2);
      result.data.forEach((student) => {
        expect(student.name).toContain('Alice');
      });
    });

    it('returns empty for non-matching name', async () => {
      await createTestStudent({ name: 'Alice' });
      await createTestStudent({ name: 'Bob' });

      const result = await StudentQuery.create()
        .nameContains('Charlie')
        .execute();

      expect(result.data.length).toBe(0);
    });
  });

  describe('Age Filter', () => {
    beforeEach(async () => {
      await StudentBuilder.create()
        .name('Young Student')
        .phone('13800000001')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .age(15)
        .build();

      await StudentBuilder.create()
        .name('Adult Student')
        .phone('13800000002')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .age(25)
        .build();

      await StudentBuilder.create()
        .name('Senior Student')
        .phone('13800000003')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .age(45)
        .build();
    });

    it('filters by minimum age', async () => {
      const result = await StudentQuery.create()
        .ageRange(20, null)
        .execute();

      expect(result.data.length).toBe(2);
      result.data.forEach((student) => {
        expect(student.age!).toBeGreaterThanOrEqual(20);
      });
    });

    it('filters by maximum age', async () => {
      const result = await StudentQuery.create()
        .ageRange(null, 30)
        .execute();

      expect(result.data.length).toBe(2);
      result.data.forEach((student) => {
        expect(student.age!).toBeLessThanOrEqual(30);
      });
    });

    it('filters by age range', async () => {
      const result = await StudentQuery.create()
        .ageRange(20, 30)
        .execute();

      expect(result.data.length).toBe(1);
      expect(result.data[0]?.name).toBe('Adult Student');
    });
  });

  describe('Class and Subject Filter', () => {
    beforeEach(async () => {
      await createTestStudent({ name: 'Month Shoot', class: ClassType.MONTH, subject: SubjectType.SHOOTING });
      await createTestStudent({ name: 'Month Archery', class: ClassType.MONTH, subject: SubjectType.ARCHERY });
      await createTestStudent({ name: 'Year Shoot', class: ClassType.YEAR, subject: SubjectType.SHOOTING });
    });

    it('filters by class type', async () => {
      const result = await StudentQuery.create()
        .classType(ClassType.MONTH)
        .execute();

      expect(result.data.length).toBe(2);
      result.data.forEach((student) => {
        expect(student.classType).toBe(ClassType.MONTH);
      });
    });

    it('filters by subject', async () => {
      const result = await StudentQuery.create()
        .subject(SubjectType.SHOOTING)
        .execute();

      expect(result.data.length).toBe(2);
      result.data.forEach((student) => {
        expect(student.subject).toBe(SubjectType.SHOOTING);
      });
    });

    it('combines class and subject filters', async () => {
      const result = await StudentQuery.create()
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .execute();

      expect(result.data.length).toBe(1);
      expect(result.data[0]?.name).toBe('Month Shoot');
    });
  });

  describe('Membership Filter', () => {
    beforeEach(async () => {
      const now = new Date();
      const activeStart = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      const activeEnd = new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000);
      await StudentBuilder.create()
        .name('Active Member')
        .phone('13800000001')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .membership(activeStart, activeEnd)
        .build();

      const expiredEnd = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      await StudentBuilder.create()
        .name('Expired Member')
        .phone('13800000002')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .membership(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), expiredEnd)
        .build();

      await StudentBuilder.create()
        .name('No Member')
        .phone('13800000003')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .build();
    });

    it('filters students with membership', async () => {
      const result = await StudentQuery.create()
        .hasMembership(true)
        .execute();

      expect(result.data.length).toBe(2);
    });

    it('filters students without membership', async () => {
      const result = await StudentQuery.create()
        .hasMembership(false)
        .execute();

      expect(result.data.length).toBe(1);
      expect(result.data[0]?.name).toBe('No Member');
    });

    it('filters by membership status', async () => {
      const result = await StudentQuery.create()
        .membershipStatus('ACTIVE')
        .execute();

      expect(result.data.length).toBe(1);
      expect(result.data[0]?.name).toBe('Active Member');
    });

    it('filters by membership active at date', async () => {
      const result = await StudentQuery.create()
        .membershipActiveAt(new Date())
        .execute();

      // Should find the active member
      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe('Score Filter', () => {
    beforeEach(async () => {
      await StudentBuilder.create()
        .name('High Scorer')
        .phone('13800000001')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .rings([9, 9.5, 10])
        .build();

      await StudentBuilder.create()
        .name('Low Scorer')
        .phone('13800000002')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .rings([5, 6, 7])
        .build();

      await StudentBuilder.create()
        .name('Average Scorer')
        .phone('13800000003')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .rings([7, 8, 7.5])
        .build();
    });

    it('filters by minimum average score', async () => {
      const result = await StudentQuery.create()
        .scoreRange(8, null)
        .execute();

      expect(result.data.length).toBe(2);
    });

    it('filters by maximum average score', async () => {
      const result = await StudentQuery.create()
        .scoreRange(null, 7.5)
        .execute();

      expect(result.data.length).toBe(2);
    });

    it('filters by score range', async () => {
      const result = await StudentQuery.create()
        .scoreRange(7, 9)
        .execute();

      expect(result.data.length).toBe(2);
    });

    it('handles students with no scores', async () => {
      await createTestStudent({ name: 'No Scores' });

      const result = await StudentQuery.create()
        .scoreRange(5, 10)
        .execute();

      // Students with no scores have average of 0, should not match
      const noScoreStudent = result.data.find((s) => s.name === 'No Scores');
      expect(noScoreStudent).toBeUndefined();
    });
  });

  describe('Sorting', () => {
    beforeEach(async () => {
      await StudentBuilder.create()
        .name('Charlie')
        .phone('13800000003')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .build();

      await StudentBuilder.create()
        .name('Alice')
        .phone('13800000001')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .build();

      await StudentBuilder.create()
        .name('Bob')
        .phone('13800000002')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .build();
    });

    it('sorts by name in ascending order', async () => {
      const result = await StudentQuery.create()
        .sort('name', 'ASC')
        .execute();

      expect(result.data.length).toBeGreaterThanOrEqual(3);
      const names = result.data.slice(0, 3).map((s) => s.name);
      expect(names).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('sorts by name in descending order', async () => {
      const result = await StudentQuery.create()
        .sort('name', 'DESC')
        .execute();

      expect(result.data.length).toBeGreaterThanOrEqual(3);
      const names = result.data.slice(0, 3).map((s) => s.name);
      expect(names).toEqual(['Charlie', 'Bob', 'Alice']);
    });

    it('sorts by created_at by default', async () => {
      const result = await StudentQuery.create()
        .sort('created_at', 'DESC')
        .execute();

      expect(result.data.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Pagination', () => {
    beforeEach(async () => {
      for (let i = 0; i < 15; i++) {
        await StudentBuilder.create()
          .name(`Student ${i}`)
          .phone(`13800000${i.toString().padStart(2, '0')}`)
          .classType(ClassType.MONTH)
          .subject(SubjectType.SHOOTING)
          .build();
      }
    });

    it('respects page and limit', async () => {
      const result = await StudentQuery.create()
        .paginate(1, 5)
        .execute();

      expect(result.data.length).toBe(5);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(5);
    });

    it('calculates total pages correctly', async () => {
      const result = await StudentQuery.create()
        .paginate(2, 5)
        .execute();

      expect(result.pagination.total).toBeGreaterThanOrEqual(15);
      expect(result.pagination.total_pages).toBeGreaterThanOrEqual(3);
    });

    it('limits max results to 100', async () => {
      const result = await StudentQuery.create()
        .paginate(1, 200)
        .execute();

      expect(result.pagination.limit).toBe(100);
    });
  });

  describe('Query Result', () => {
    beforeEach(async () => {
      const student = await createTestStudent({ name: 'Query Test Student' });
      const updater = StudentUpdater.fromDocument(student);
      updater.addRing(9.5).addRing(8);
      await updater.commit();
    });

    it('returns correct data structure', async () => {
      const result = await StudentQuery.create()
        .nameContains('Query Test')
        .execute();

      expect(result.data.length).toBe(1);
      const student = result.data[0];

      expect(student).toHaveProperty('uid');
      expect(student).toHaveProperty('name');
      expect(student).toHaveProperty('age');
      expect(student).toHaveProperty('phone');
      expect(student).toHaveProperty('classType');
      expect(student).toHaveProperty('subject');
      expect(student).toHaveProperty('rings');
      expect(student).toHaveProperty('averageScore');
      expect(student).toHaveProperty('membershipStatus');
      expect(student).toHaveProperty('membershipStartDate');
      expect(student).toHaveProperty('membershipEndDate');
      expect(student).toHaveProperty('lessonLeft');
      expect(student).toHaveProperty('createdAt');
    });

    it('calculates average score correctly', async () => {
      const result = await StudentQuery.create()
        .nameContains('Query Test')
        .execute();

      const student = result.data[0];
      expect(student.averageScore).toBeCloseTo(8.75, 1);
    });

    it('sets correct membership status for student without membership', async () => {
      const result = await StudentQuery.create()
        .nameContains('Query Test')
        .execute();

      const student = result.data[0];
      expect(student.membershipStatus).toBe('NONE');
    });
  });
});

describe('StudentPresenter', () => {
  describe('presentStudent', () => {
    it('transforms student data to presentation format', async () => {
      const student = await createTestStudent({
        name: 'Present Test',
        phone: '13812345678',
      });

      const presented = presentStudent(student);

      expect(presented.uid).toBe(student.uid);
      expect(presented.name).toBe('Present Test');
      expect(presented.phone).toBe('13812345678');
      expect(presented).toHaveProperty('class');
      expect(presented).toHaveProperty('subject');
      expect(presented).toHaveProperty('rings');
      expect(presented).toHaveProperty('lesson_left');
      expect(presented).toHaveProperty('membership_start_date');
      expect(presented).toHaveProperty('membership_end_date');
      expect(presented).toHaveProperty('membership_days_remaining');
      expect(presented).toHaveProperty('is_membership_active');
      expect(presented).toHaveProperty('membership_status');
      expect(presented).toHaveProperty('created_at');
      expect(presented).toHaveProperty('updated_at');
    });

    it('calculates membership days remaining', async () => {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 30);

      const student = await StudentBuilder.create()
        .name('Membership Test')
        .phone('13812345678')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .membership(start, end)
        .build();

      const presented = presentStudent(student);

      expect(presented.membership_days_remaining).toBeGreaterThan(0);
      expect(presented.membership_days_remaining).toBeLessThanOrEqual(31);
      expect(presented.is_membership_active).toBe(true);
      expect(presented.membership_status).toBe(MembershipStatus.ACTIVE);
    });

    it('handles expired membership', async () => {
      const end = new Date();
      end.setDate(end.getDate() - 5);

      const student = await StudentBuilder.create()
        .name('Expired Test')
        .phone('13812345678')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .membership(new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000), end)
        .build();

      const presented = presentStudent(student);

      expect(presented.is_membership_active).toBe(false);
      expect(presented.membership_status).toBe(MembershipStatus.EXPIRED);
      expect(presented.membership_days_remaining).toBe(0);
    });

    it('handles upcoming membership', async () => {
      const start = new Date();
      start.setDate(start.getDate() + 10);
      const end = new Date();
      end.setDate(end.getDate() + 40);

      const student = await StudentBuilder.create()
        .name('Upcoming Test')
        .phone('13812345678')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .membership(start, end)
        .build();

      const presented = presentStudent(student);

      expect(presented.membership_status).toBe(MembershipStatus.UPCOMING);
    });

    it('handles no membership', async () => {
      const student = await createTestStudent({ name: 'No Membership' });

      const presented = presentStudent(student);

      expect(presented.membership_status).toBe(MembershipStatus.NONE);
      expect(presented.membership_start_date).toBeNull();
      expect(presented.membership_end_date).toBeNull();
      expect(presented.membership_days_remaining).toBeNull();
      expect(presented.is_membership_active).toBe(false);
    });

    it('handles partial input data', () => {
      const partialData = {
        uid: 1,
        name: 'Partial',
        phone: '13812345678',
        class: ClassType.MONTH,
        subject: SubjectType.SHOOTING,
      };

      const presented = presentStudent(partialData);

      expect(presented.uid).toBe(1);
      expect(presented.name).toBe('Partial');
      expect(presented.rings).toEqual([]);
      expect(presented.lessonLeft).toBeNull();
    });

    it('normalizes date formats', async () => {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 30);

      const student = await StudentBuilder.create()
        .name('Date Format Test')
        .phone('13812345678')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .membership(start, end)
        .build();

      const presented = presentStudent(student);

      // Date should be in YYYY-MM-DD format
      expect(presented.membership_start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(presented.membership_end_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('handles array fields correctly', async () => {
      const student = await StudentBuilder.create()
        .name('Array Test')
        .phone('13812345678')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .rings([9, 8.5, 10, 7])
        .build();

      const presented = presentStudent(student);

      expect(presented.rings).toEqual([9, 8.5, 10, 7]);
    });

    it('supports snake_case input fields', async () => {
      const student = await createTestStudent({ name: 'Snake Test' });

      // Mock student with snake_case
      const snakeData = {
        uid: student.uid,
        name: 'Snake Test',
        phone: '13812345678',
        class: ClassType.MONTH,
        subject: SubjectType.SHOOTING,
        lesson_left: 15,
        membership_start_date: null,
        membership_end_date: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const presented = presentStudent(snakeData);

      expect(presented.lesson_left).toBe(15);
      expect(presented.lessonLeft).toBe(15);
    });
  });
});

describe('Complex Business Scenarios', () => {
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

  describe('Student Lifecycle', () => {
    it('handles full student lifecycle: create -> update -> present', async () => {
      // Create
      const student = await StudentBuilder.create()
        .name('Lifecycle Test')
        .phone('13812345678')
        .classType(ClassType.TEN_TRY)
        .subject(SubjectType.SHOOTING)
        .membership(
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          new Date(Date.now() + 23 * 24 * 60 * 60 * 1000)
        )
        .build();

      expect(student.uid).toBeGreaterThan(0);
      expect(student.lessonLeft).toBe(10);

      // Update - add scores
      const updater = StudentUpdater.fromDocument(student);
      updater.addRing(8.5).addRing(9);
      const updated = await updater.commit();

      expect(updated.rings).toEqual([8.5, 9]);

      // Present
      const presented = presentStudent(updated);
      expect(presented.name).toBe('Lifecycle Test');
      expect(presented.averageScore).toBeCloseTo(8.75, 1);
      expect(presented.membership_status).toBe(MembershipStatus.ACTIVE);

      // Query
      const queryResult = await StudentQuery.create()
        .nameContains('Lifecycle')
        .membershipStatus('ACTIVE')
        .scoreRange(8, 10)
        .execute();

      expect(queryResult.data.length).toBe(1);
    });

    it('handles membership extension', async () => {
      const student = await createTestStudent({ name: 'Extend Test' });

      const originalEnd = student.membershipEndDate;

      const updater = StudentUpdater.fromDocument(student);
      const newEnd = new Date();
      newEnd.setDate(newEnd.getDate() + 60);
      updater.membership(student.membershipStartDate!, newEnd);
      const updated = await updater.commit();

      expect(updated.membershipEndDate).not.toEqual(originalEnd);
      expect(updated.membershipEndDate!.getTime()).toBeGreaterThan(originalEnd!.getTime());

      const presented = presentStudent(updated);
      expect(presented.membership_days_remaining).toBeGreaterThan(30);
    });
  });

  describe('Financial Transactions with Students', () => {
    it('tracks student payments correctly', async () => {
      const student = await createTestStudent({ name: 'Payment Test' });

      await CashBuilder.create()
        .amount(500)
        .studentId(student.uid)
        .note('First Payment')
        .build();

      await CashBuilder.create()
        .amount(300)
        .studentId(student.uid)
        .note('Second Payment')
        .build();

      const transactions = await CashRepository.findByStudentId(student.uid);
      expect(transactions.length).toBe(2);
      expect(transactions.reduce((sum, t) => sum + t.amount, 0)).toBe(80000);
    });

    it('calculates correct financial stats with mixed transactions', async () => {
      const student = await createTestStudent({ name: 'Stats Test' });

      await CashBuilder.create()
        .amount(1000)
        .studentId(student.uid)
        .note('Income')
        .build();

      await CashBuilder.create()
        .amount(-200)
        .note('Expense')
        .build();

      const stats = await CashRepository.getFinancialStats();

      expect(stats.totalIncome).toBe(100000);
      expect(stats.totalExpense).toBe(20000);
      expect(stats.netIncome).toBe(80000);
    });
  });

  describe('Installment Plans with Payments', () => {
    it('handles installment plan lifecycle', async () => {
      const student = await createTestStudent({ name: 'Installment Test' });

      // Create plan
      const plan = await createTestInstallmentPlan(
        1200,
        3,
        PaymentFrequency.MONTHLY,
        new Date(),
        student.uid
      );

      expect(plan.status).toBe('ACTIVE');

      // Create installments
      const inst1 = await createTestInstallment(
        plan.uid,
        student.uid,
        1,
        3,
        400,
        new Date(),
        InstallmentStatus.PAID
      );

      const inst2 = await createTestInstallment(
        plan.uid,
        student.uid,
        2,
        3,
        400,
        addMonths(new Date(), 1),
        InstallmentStatus.PENDING
      );

      // Query installments by plan
      const installments = await InstallmentRepository.findByPlanId(plan.uid);
      expect(installments.length).toBe(2);

      // Refresh plan status
      await InstallmentRepository.refreshPlanStatus(plan.uid);

      const updatedPlan = await InstallmentPlanRepository.findByUid(plan.uid);
      expect(updatedPlan?.status).toBe('ACTIVE'); // Still active, not all paid
    });

    it('detects overdue installments correctly', async () => {
      const student = await createTestStudent({ name: 'Overdue Test' });

      const plan = await createTestInstallmentPlan(
        800,
        4,
        PaymentFrequency.MONTHLY,
        addDays(new Date(), -20), // Started 20 days ago
        student.uid
      );

      // Create overdue installment
      await createTestInstallment(
        plan.uid,
        student.uid,
        1,
        4,
        200,
        addDays(new Date(), -5), // Due 5 days ago
        InstallmentStatus.PENDING
      );

      const overdue = await InstallmentRepository.findOverdue();
      expect(overdue.length).toBeGreaterThan(0);

      const overdueWithStatus = overdue.find(
        (i) => InstallmentRepository.isOverdue(i)
      );
      expect(overdueWithStatus).toBeDefined();
    });
  });

  describe('Data Consistency', () => {
    it('maintains consistency after multiple operations', async () => {
      const student = await StudentBuilder.create()
        .name('Consistency Test')
        .phone('13812345678')
        .classType(ClassType.MONTH)
        .subject(SubjectType.SHOOTING)
        .rings([8, 9])
        .build();

      // Perform multiple updates
      for (let i = 0; i < 5; i++) {
        const updater = StudentUpdater.fromDocument(
          await StudentRepository.findByUid(student.uid)!
        );
        updater.addRing(8 + i * 0.1);
        await updater.commit();
      }

      // Verify final state
      const final = await StudentRepository.findByUid(student.uid);
      expect(final?.rings?.length).toBe(7);

      // Present and query should reflect same data
      const presented = presentStudent(final!);
      expect(presented.rings.length).toBe(7);

      const queryResult = await StudentQuery.create()
        .nameContains('Consistency')
        .execute();

      expect(queryResult.data[0]?.rings.length).toBe(7);
    });
  });
});
