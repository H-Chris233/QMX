import { InstallmentPlanRepository, InstallmentRepository } from '@/db/repositories/installmentRepository';
import { PaymentFrequencyValues, InstallmentStatusValues, InstallmentPlanStatusValues } from '@/types';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllCollections,
  resetAllSequences,
  createTestStudent,
  createTestInstallmentPlan,
  createTestInstallment,
  addDays,
  addMonths,
} from './helpers/testSetup';

jest.setTimeout(30000);

describe('Installment Service', () => {
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

  describe('Installment Plan Creation', () => {
    it('creates monthly installment plan', async () => {
      const student = await createTestStudent({ name: 'Alice' });
      const startDate = new Date();
      const plan = await createTestInstallmentPlan(
        1000,
        4,
        'MONTHLY',
        startDate,
        student.uid
      );

      expect(plan.uid).toBeGreaterThan(0);
      expect(plan.studentId).toBe(student.uid);
      expect(plan.totalAmount).toBe(100000); // 转换为分
      expect(plan.totalInstallments).toBe(4);
      expect(plan.frequency).toBe(PaymentFrequencyValues.MONTHLY);
      expect(plan.status).toBe(InstallmentPlanStatusValues.ACTIVE);
    });

    it('creates weekly installment plan', async () => {
      const student = await createTestStudent({ name: 'Weekly Plan Student' });
      const startDate = new Date();
      const plan = await createTestInstallmentPlan(
        500,
        8,
        PaymentFrequencyValues.WEEKLY,
        startDate,
        student.uid
      );

      expect(plan.totalAmount).toBe(50000);
      expect(plan.totalInstallments).toBe(8);
      expect(plan.frequency).toBe(PaymentFrequencyValues.WEEKLY);
      expect(plan.studentId).toBe(student.uid);
    });

    it('creates custom frequency installment plan', async () => {
      const startDate = new Date();
      const plan = await createTestInstallmentPlan(
        2000,
        5,
        PaymentFrequencyValues.CUSTOM,
        startDate,
        null,
        15
      );

      expect(plan.frequency).toBe(PaymentFrequencyValues.CUSTOM);
      expect(plan.customDays).toBe(15);
    });

    it('calculates installment amount evenly', async () => {
      const plan = await createTestInstallmentPlan(
        1000,
        4,
        PaymentFrequencyValues.MONTHLY,
        new Date(),
        null
      );

      const installmentAmount = InstallmentPlanRepository.calculateInstallmentAmount(
        plan.totalAmount,
        plan.totalInstallments
      );
      expect(installmentAmount).toBe(25000);
    });
  });

  describe('Installment Generation', () => {
    it('generates installments for plan', async () => {
      const student = await createTestStudent();
      const startDate = new Date();
      const plan = await createTestInstallmentPlan(
        1200,
        3,
        PaymentFrequencyValues.MONTHLY,
        startDate,
        student.uid
      );

      const installment1 = await createTestInstallment(
        plan.uid,
        student.uid,
        1,
        3,
        400,
        startDate,
        InstallmentStatusValues.PENDING
      );

      const installment2 = await createTestInstallment(
        plan.uid,
        student.uid,
        2,
        3,
        400,
        addMonths(startDate, 1),
        InstallmentStatusValues.PENDING
      );

      const installment3 = await createTestInstallment(
        plan.uid,
        student.uid,
        3,
        3,
        400,
        addMonths(startDate, 2),
        InstallmentStatusValues.PENDING
      );

      expect(installment1.planId).toBe(plan.uid);
      expect(installment1.installmentNumber).toBe(1);
      expect(installment1.installmentAmount).toBe(40000);

      expect(installment2.installmentNumber).toBe(2);
      expect(installment3.installmentNumber).toBe(3);
    });

    it('finds installments by plan', async () => {
      const startDate = new Date();
      const plan = await createTestInstallmentPlan(
        600,
        2,
        PaymentFrequencyValues.MONTHLY,
        startDate,
        null
      );

      await createTestInstallment(
        plan.uid,
        null,
        1,
        2,
        300,
        startDate,
        InstallmentStatusValues.PENDING
      );
      await createTestInstallment(
        plan.uid,
        null,
        2,
        2,
        300,
        addMonths(startDate, 1),
        InstallmentStatusValues.PENDING
      );

      const installments = await InstallmentRepository.findByPlanId(plan.uid);

      expect(installments.length).toBe(2);
      expect(installments[0]?.installmentNumber).toBe(1);
      expect(installments[1]?.installmentNumber).toBe(2);
    });
  });

  describe('Overdue Detection', () => {
    it('detects overdue installment', async () => {
      const plan = await createTestInstallmentPlan(
        300,
        3,
        PaymentFrequencyValues.MONTHLY,
        new Date(),
        null
      );
      const overdueDueDate = addDays(new Date(), -10);
      const installment = await createTestInstallment(
        plan.uid,
        null,
        1,
        3,
        100,
        overdueDueDate,
        InstallmentStatusValues.PENDING
      );

      expect(InstallmentRepository.isOverdue(installment)).toBe(true);
      expect(InstallmentRepository.getDaysOverdue(installment)).toBeGreaterThanOrEqual(10);
    });

    it('does not mark future installment as overdue', async () => {
      const plan = await createTestInstallmentPlan(
        300,
        3,
        PaymentFrequencyValues.MONTHLY,
        new Date(),
        null
      );
      const futureDueDate = addDays(new Date(), 10);
      const installment = await createTestInstallment(
        plan.uid,
        null,
        1,
        3,
        100,
        futureDueDate,
        InstallmentStatusValues.PENDING
      );

      expect(InstallmentRepository.isOverdue(installment)).toBe(false);
      expect(InstallmentRepository.getDaysOverdue(installment)).toBe(0);
    });

    it('does not mark paid installment as overdue', async () => {
      const plan = await createTestInstallmentPlan(
        300,
        3,
        PaymentFrequencyValues.MONTHLY,
        new Date(),
        null
      );
      const overdueDueDate = addDays(new Date(), -10);
      const installment = await createTestInstallment(
        plan.uid,
        null,
        1,
        3,
        100,
        overdueDueDate,
        InstallmentStatusValues.PAID
      );

      expect(InstallmentRepository.isOverdue(installment)).toBe(false);
    });

    it('finds all overdue installments', async () => {
      const plan = await createTestInstallmentPlan(
        300,
        3,
        PaymentFrequencyValues.MONTHLY,
        new Date(),
        null
      );
      const today = new Date();
      const pastDate = addDays(today, -5);
      const futureDate = addDays(today, 5);

      await createTestInstallment(
        plan.uid,
        null,
        1,
        3,
        100,
        pastDate,
        InstallmentStatusValues.PENDING
      );
      await createTestInstallment(
        plan.uid,
        null,
        2,
        3,
        100,
        pastDate,
        InstallmentStatusValues.PENDING
      );
      await createTestInstallment(
        plan.uid,
        null,
        3,
        3,
        100,
        futureDate,
        InstallmentStatusValues.PENDING
      );

      const overdue = await InstallmentRepository.findOverdue();

      expect(overdue.length).toBe(2);
      overdue.forEach((inst) => {
        expect(InstallmentRepository.isOverdue(inst)).toBe(true);
      });
    });
  });

  describe('Payment Processing', () => {
    it('marks installment as paid and records amount', async () => {
      const plan = await createTestInstallmentPlan(
        300,
        3,
        PaymentFrequencyValues.MONTHLY,
        new Date(),
        null
      );
      const installment = await createTestInstallment(
        plan.uid,
        null,
        1,
        3,
        100,
        new Date(),
        InstallmentStatusValues.PENDING
      );

      const updatedInstallment = await InstallmentRepository.updateByUid(installment.uid, {
        status: InstallmentStatusValues.PAID,
        paidAmount: 10000,
        paidDate: new Date().toISOString().split('T')[0],
      });

      expect(updatedInstallment).not.toBeNull();
      expect(updatedInstallment?.status).toBe(InstallmentStatusValues.PAID);
      expect(updatedInstallment?.paidAmount).toBe(10000);
      expect(updatedInstallment?.paidDate).not.toBeNull();
      expect(InstallmentRepository.getRemainingAmount(updatedInstallment!)).toBe(0);
    });

    it('tracks paid amount', async () => {
      const plan = await createTestInstallmentPlan(
        300,
        3,
        PaymentFrequencyValues.MONTHLY,
        new Date(),
        null
      );
      const installment = await createTestInstallment(
        plan.uid,
        null,
        1,
        3,
        100,
        new Date(),
        InstallmentStatusValues.PENDING
      );

      await InstallmentRepository.updateByUid(installment.uid, {
        paidAmount: 5000,
      });

      const reloaded = await InstallmentRepository.findByUid(installment.uid);
      expect(reloaded?.paidAmount).toBe(5000);
      expect(InstallmentRepository.getRemainingAmount(reloaded!)).toBe(5000);
    });
  });

  describe('Installment Plan Status', () => {
    it('updates plan status to completed', async () => {
      const plan = await createTestInstallmentPlan(
        600,
        2,
        PaymentFrequencyValues.MONTHLY,
        new Date(),
        null
      );

      expect(plan.status).toBe(InstallmentPlanStatusValues.ACTIVE);

      const updated = await InstallmentPlanRepository.updateByUid(plan.uid, {
        status: InstallmentPlanStatusValues.COMPLETED,
      });

      expect(updated?.status).toBe(InstallmentPlanStatusValues.COMPLETED);
    });

    it('updates plan status to cancelled', async () => {
      const plan = await createTestInstallmentPlan(
        600,
        2,
        PaymentFrequencyValues.MONTHLY,
        new Date(),
        null
      );

      const updated = await InstallmentPlanRepository.updateByUid(plan.uid, {
        status: InstallmentPlanStatusValues.CANCELLED,
      });

      expect(updated?.status).toBe(InstallmentPlanStatusValues.CANCELLED);
    });
  });

  describe('Installment Plan Deletion', () => {
    it('deletes installment plan', async () => {
      const plan = await createTestInstallmentPlan(
        600,
        2,
        PaymentFrequencyValues.MONTHLY,
        new Date(),
        null
      );

      const deleted = await InstallmentPlanRepository.deleteByUid(plan.uid);
      expect(deleted).toBe(true);

      const found = await InstallmentPlanRepository.findByUid(plan.uid);
      expect(found).toBeNull();
    });

    it('returns false when deleting non-existent plan', async () => {
      const deleted = await InstallmentPlanRepository.deleteByUid(99999);
      expect(deleted).toBe(false);
    });
  });

  describe('Installment Deletion', () => {
    it('deletes installment', async () => {
      const plan = await createTestInstallmentPlan(
        300,
        3,
        PaymentFrequencyValues.MONTHLY,
        new Date(),
        null
      );
      const installment = await createTestInstallment(
        plan.uid,
        null,
        1,
        3,
        100,
        new Date(),
        InstallmentStatusValues.PENDING
      );

      const deleted = await InstallmentRepository.deleteByUid(installment.uid);
      expect(deleted).toBe(true);

      const found = await InstallmentRepository.findByUid(installment.uid);
      expect(found).toBeNull();
    });
  });

  describe('Installment Pagination', () => {
    it('paginates installment plans', async () => {
      const student = await createTestStudent();

      for (let i = 0; i < 5; i++) {
        await createTestInstallmentPlan(
          100 * (i + 1),
          3,
          PaymentFrequencyValues.MONTHLY,
          new Date(),
          student.uid
        );
      }

      const result = await InstallmentPlanRepository.findWithPagination({});

      expect(result.data.length).toBe(5);
      expect(result.pagination.total).toBe(5);
    });

    it('filters plans by student', async () => {
      const student1 = await createTestStudent({ name: 'Student 1' });
      const student2 = await createTestStudent({ name: 'Student 2' });

      await createTestInstallmentPlan(1000, 3, PaymentFrequencyValues.MONTHLY, new Date(), student1.uid);
      await createTestInstallmentPlan(2000, 3, PaymentFrequencyValues.MONTHLY, new Date(), student1.uid);
      await createTestInstallmentPlan(3000, 3, PaymentFrequencyValues.MONTHLY, new Date(), student2.uid);

      const result = await InstallmentPlanRepository.findWithPagination({
        studentId: student1.uid,
      });

      expect(result.data.length).toBe(2);
      result.data.forEach((plan) => {
        expect(plan.studentId).toBe(student1.uid);
      });
    });
  });
});
