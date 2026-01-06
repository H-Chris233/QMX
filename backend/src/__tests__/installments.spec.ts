import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { InstallmentPlan } from "@/models/InstallmentPlanMongo";
import { InstallmentPlanStatus } from "@/types";
import { Installment, InstallmentModel } from "@/models/InstallmentMongo";
import { Cash } from "@/models/CashMongo";
import { PaymentFrequency, InstallmentStatus } from "@/types";
import { AppError } from "@/utils/errors";
import {
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllCollections,
  resetAllSequences,
  TestDataFactory,
  dateUtils,
} from "../../test/setupBackend";

jest.setTimeout(30000);

describe("Installment Service", () => {
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

  describe("Installment Plan Creation", () => {
    it("creates monthly installment plan", async () => {
      const student = await TestDataFactory.createStudent({ name: "Alice" });
      const startDate = new Date();
      const plan = await TestDataFactory.createInstallmentPlan(
        1000,
        4,
        PaymentFrequency.MONTHLY,
        startDate,
        { studentId: student.uid }
      );

      expect(plan.uid).toBeGreaterThan(0);
      expect(plan.student_id).toBe(student.uid);
      expect(plan.total_amount).toBe(100000);
      expect(plan.total_installments).toBe(4);
      expect(plan.frequency).toBe(PaymentFrequency.MONTHLY);
      expect(plan.status).toBe(InstallmentPlanStatus.ACTIVE);
      expect(plan.isActive()).toBe(true);
    });

    it("creates weekly installment plan", async () => {
      const startDate = new Date();
      const plan = await TestDataFactory.createInstallmentPlan(
        500,
        8,
        PaymentFrequency.WEEKLY,
        startDate,
        { studentId: null }
      );

      expect(plan.total_amount).toBe(50000);
      expect(plan.total_installments).toBe(8);
      expect(plan.frequency).toBe(PaymentFrequency.WEEKLY);
      expect(plan.student_id).toBeNull();
    });

    it("creates custom frequency installment plan", async () => {
      const startDate = new Date();
      const plan = await TestDataFactory.createInstallmentPlan(
        2000,
        5,
        PaymentFrequency.CUSTOM,
        startDate,
        { studentId: null, customDays: 15 }
      );

      expect(plan.frequency).toBe(PaymentFrequency.CUSTOM);
      expect(plan.custom_days).toBe(15);
    });

    it("calculates installment amount evenly", async () => {
      const plan = await TestDataFactory.createInstallmentPlan(
        1000,
        4,
        PaymentFrequency.MONTHLY,
        new Date(),
        { studentId: null }
      );

      const installmentAmount = plan.getInstallmentAmount();
      expect(installmentAmount).toBe(25000);
    });

    it("validates minimum total amount", async () => {
      await expect(
        InstallmentPlan.create({
          total_amount: 0,
          total_installments: 4,
          frequency: PaymentFrequency.MONTHLY,
          start_date: new Date(),
        })
      ).rejects.toThrow();
    });

    it("validates minimum installment count", async () => {
      await expect(
        InstallmentPlan.create({
          total_amount: 100000,
          total_installments: 0,
          frequency: PaymentFrequency.MONTHLY,
          start_date: new Date(),
        })
      ).rejects.toThrow();
    });
  });

  describe("Installment Generation", () => {
    it("generates installments for plan", async () => {
      const student = await TestDataFactory.createStudent();
      const startDate = new Date();
      const plan = await TestDataFactory.createInstallmentPlan(
        1200,
        3,
        PaymentFrequency.MONTHLY,
        startDate,
        { studentId: student.uid }
      );

      const installment1 = await TestDataFactory.createInstallment(
        plan.uid,
        student.uid,
        1,
        3,
        400,
        startDate,
        InstallmentStatus.PENDING
      );

      const installment2 = await TestDataFactory.createInstallment(
        plan.uid,
        student.uid,
        2,
        3,
        400,
        dateUtils.addMonths(startDate, 1),
        InstallmentStatus.PENDING
      );

      const installment3 = await TestDataFactory.createInstallment(
        plan.uid,
        student.uid,
        3,
        3,
        400,
        dateUtils.addMonths(startDate, 2),
        InstallmentStatus.PENDING
      );

      expect(installment1.plan_id).toBe(plan.uid);
      expect(installment1.current_installment).toBe(1);
      expect(installment1.installment_amount).toBe(40000);

      expect(installment2.current_installment).toBe(2);
      expect(installment3.current_installment).toBe(3);
    });

    it("finds installments by plan", async () => {
      const startDate = new Date();
      const plan = await TestDataFactory.createInstallmentPlan(
        600,
        2,
        PaymentFrequency.MONTHLY,
        startDate,
        { studentId: null }
      );

      await TestDataFactory.createInstallment(
        plan.uid,
        null,
        1,
        2,
        300,
        startDate,
        InstallmentStatus.PENDING
      );
      await TestDataFactory.createInstallment(
        plan.uid,
        null,
        2,
        2,
        300,
        dateUtils.addMonths(startDate, 1),
        InstallmentStatus.PENDING
      );

      const installments = await Installment.findByPlanId(plan.uid);

      expect(installments.length).toBe(2);
      expect(installments[0]?.current_installment).toBe(1);
      expect(installments[1]?.current_installment).toBe(2);
    });
  });

  describe("Overdue Detection", () => {
    it("detects overdue installment", async () => {
      const overdueDueDate = dateUtils.addDays(new Date(), -10);
      const installment = await TestDataFactory.createInstallment(
        1,
        null,
        1,
        3,
        100,
        overdueDueDate,
        InstallmentStatus.PENDING
      );

      expect(installment.isOverdue()).toBe(true);
      expect(installment.getDaysOverdue()).toBeGreaterThan(9);
    });

    it("does not mark future installment as overdue", async () => {
      const futureDueDate = dateUtils.addDays(new Date(), 10);
      const installment = await TestDataFactory.createInstallment(
        1,
        null,
        1,
        3,
        100,
        futureDueDate,
        InstallmentStatus.PENDING
      );

      expect(installment.isOverdue()).toBe(false);
      expect(installment.getDaysOverdue()).toBe(0);
    });

    it("does not mark paid installment as overdue", async () => {
      const overdueDueDate = dateUtils.addDays(new Date(), -10);
      const installment = await TestDataFactory.createInstallment(
        1,
        null,
        1,
        3,
        100,
        overdueDueDate,
        InstallmentStatus.PAID
      );

      expect(installment.isOverdue()).toBe(false);
    });

    it("finds all overdue installments", async () => {
      const today = new Date();
      const pastDate = dateUtils.addDays(today, -5);
      const futureDate = dateUtils.addDays(today, 5);

      await TestDataFactory.createInstallment(
        1,
        null,
        1,
        3,
        100,
        pastDate,
        InstallmentStatus.PENDING
      );
      await TestDataFactory.createInstallment(
        1,
        null,
        2,
        3,
        100,
        pastDate,
        InstallmentStatus.PENDING
      );
      await TestDataFactory.createInstallment(
        1,
        null,
        3,
        3,
        100,
        futureDate,
        InstallmentStatus.PENDING
      );

      const overdue = await Installment.findOverdue();

      expect(overdue.length).toBe(2);
      overdue.forEach((inst) => {
        expect(inst.isOverdue()).toBe(true);
      });
    });
  });

  describe("Payment Processing", () => {
    it("marks installment as paid and records amount", async () => {
      const installment = await TestDataFactory.createInstallment(
        1,
        null,
        1,
        3,
        100,
        new Date(),
        InstallmentStatus.PENDING
      );

      const updatedInstallment = await Installment.findByUid(installment.uid);
      expect(updatedInstallment).not.toBeNull();

      updatedInstallment!.status = InstallmentStatus.PAID;
      updatedInstallment!.paid_amount = 10000;
      updatedInstallment!.paid_at = new Date();
      await updatedInstallment!.save();

      const reloaded = await Installment.findByUid(installment.uid);
      expect(reloaded!.status).toBe(InstallmentStatus.PAID);
      expect(reloaded!.paid_amount).toBe(10000);
      expect(reloaded!.paid_at).not.toBeNull();
      expect(reloaded!.getRemainingAmount()).toBe(0);
    });

    it("tracks paid amount", async () => {
      const installment = await TestDataFactory.createInstallment(
        1,
        null,
        1,
        3,
        100,
        new Date(),
        InstallmentStatus.PENDING
      );

      installment.paid_amount = 5000;
      await installment.save();

      const reloaded = await Installment.findByUid(installment.uid);
      expect(reloaded!.paid_amount).toBe(5000);
      expect(reloaded!.getRemainingAmount()).toBe(5000);
    });

    it("calculates remaining amount correctly", async () => {
      const installment = await TestDataFactory.createInstallment(
        1,
        null,
        1,
        3,
        100,
        new Date(),
        InstallmentStatus.PENDING
      );

      expect(installment.getRemainingAmount()).toBe(10000);

      installment.paid_amount = 3000;
      await installment.save();

      const reloaded = await Installment.findByUid(installment.uid);
      expect(reloaded!.getRemainingAmount()).toBe(7000);
    });
  });

  describe("Installment Plan Status", () => {
    it("updates plan status to completed", async () => {
      const plan = await TestDataFactory.createInstallmentPlan(
        600,
        2,
        PaymentFrequency.MONTHLY,
        new Date(),
        { studentId: null }
      );

      expect(plan.status).toBe(InstallmentPlanStatus.ACTIVE);
      expect(plan.isActive()).toBe(true);

      plan.status = InstallmentPlanStatus.COMPLETED;
      await plan.save();

      const reloaded = await InstallmentPlan.findByUid(plan.uid);
      expect(reloaded!.status).toBe(InstallmentPlanStatus.COMPLETED);
      expect(reloaded!.isActive()).toBe(false);
    });

    it("updates plan status to cancelled", async () => {
      const plan = await TestDataFactory.createInstallmentPlan(
        600,
        2,
        PaymentFrequency.MONTHLY,
        new Date(),
        { studentId: null }
      );

      plan.status = InstallmentPlanStatus.CANCELLED;
      await plan.save();

      const reloaded = await InstallmentPlan.findByUid(plan.uid);
      expect(reloaded!.status).toBe(InstallmentPlanStatus.CANCELLED);
      expect(reloaded!.isActive()).toBe(false);
    });
  });

  describe("Installment Plan Deletion", () => {
    it("deletes installment plan", async () => {
      const plan = await TestDataFactory.createInstallmentPlan(
        600,
        2,
        PaymentFrequency.MONTHLY,
        new Date(),
        { studentId: null }
      );

      const deleted = await InstallmentPlan.deleteByUid(plan.uid);
      expect(deleted).toBe(true);

      const found = await InstallmentPlan.findByUid(plan.uid);
      expect(found).toBeNull();
    });

    it("returns false when deleting non-existent plan", async () => {
      const deleted = await InstallmentPlan.deleteByUid(99999);
      expect(deleted).toBe(false);
    });
  });

  describe("Installment Deletion", () => {
    it("deletes installment", async () => {
      const installment = await TestDataFactory.createInstallment(
        1,
        null,
        1,
        3,
        100,
        new Date(),
        InstallmentStatus.PENDING
      );

      const deleted = await Installment.deleteByUid(installment.uid);
      expect(deleted).toBe(true);

      const found = await Installment.findByUid(installment.uid);
      expect(found).toBeNull();
    });
  });

  describe("Installment Pagination", () => {
    it("paginates installment plans", async () => {
      const student = await TestDataFactory.createStudent();

      for (let i = 0; i < 5; i++) {
        await TestDataFactory.createInstallmentPlan(
          100 * (i + 1),
          3,
          PaymentFrequency.MONTHLY,
          new Date(),
          { studentId: student.uid }
        );
      }

      const result = await InstallmentPlan.findWithPagination({}, 1, 3);

      expect(result.data.length).toBe(3);
      expect(result.total).toBe(5);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(3);
    });

    it("filters plans by student", async () => {
      const student1 = await TestDataFactory.createStudent({
        name: "Student 1",
      });
      const student2 = await TestDataFactory.createStudent({
        name: "Student 2",
      });

      await TestDataFactory.createInstallmentPlan(
        1000,
        3,
        PaymentFrequency.MONTHLY,
        new Date(),
        { studentId: student1.uid }
      );
      await TestDataFactory.createInstallmentPlan(
        2000,
        3,
        PaymentFrequency.MONTHLY,
        new Date(),
        { studentId: student1.uid }
      );
      await TestDataFactory.createInstallmentPlan(
        3000,
        3,
        PaymentFrequency.MONTHLY,
        new Date(),
        { studentId: student2.uid }
      );

      const result = await InstallmentPlan.findWithPagination({
        student_id: student1.uid,
      });

      expect(result.data.length).toBe(2);
      result.data.forEach((plan) => {
        expect(plan.student_id).toBe(student1.uid);
      });
    });

    it("filters plans by status", async () => {
      const startDate = new Date();

      const plan1 = await TestDataFactory.createInstallmentPlan(
        1000,
        3,
        PaymentFrequency.MONTHLY,
        startDate,
        { studentId: null }
      );
      const plan2 = await TestDataFactory.createInstallmentPlan(
        2000,
        3,
        PaymentFrequency.MONTHLY,
        startDate,
        { studentId: null }
      );

      plan2.status = InstallmentPlanStatus.COMPLETED;
      await plan2.save();

      const result = await InstallmentPlan.findWithPagination({
        status: InstallmentPlanStatus.ACTIVE,
      });

      expect(result.data.length).toBe(1);
      expect(result.data[0]?.uid).toBe(plan1.uid);
    });
  });

  describe("Installment Statistics", () => {
    it("aggregates total pending amount", async () => {
      const student = await TestDataFactory.createStudent();
      const plan = await TestDataFactory.createInstallmentPlan(
        900,
        3,
        PaymentFrequency.MONTHLY,
        new Date(),
        { studentId: student.uid }
      );

      await TestDataFactory.createInstallment(
        plan.uid,
        student.uid,
        1,
        3,
        300,
        new Date(),
        InstallmentStatus.PENDING
      );
      await TestDataFactory.createInstallment(
        plan.uid,
        student.uid,
        2,
        3,
        300,
        dateUtils.addMonths(new Date(), 1),
        InstallmentStatus.PENDING
      );
      await TestDataFactory.createInstallment(
        plan.uid,
        student.uid,
        3,
        3,
        300,
        dateUtils.addMonths(new Date(), 2),
        InstallmentStatus.PAID
      );

      const pendingInstallments = await InstallmentModel.find({
        status: InstallmentStatus.PENDING,
      }).exec();
      const totalPending = pendingInstallments.reduce(
        (sum: number, inst: any) => sum + inst.installment_amount,
        0
      );

      expect(pendingInstallments.length).toBe(2);
      expect(totalPending).toBe(60000);
    });
  });

  describe("JSON Serialization", () => {
    it("serializes installment plan correctly", async () => {
      const plan = await TestDataFactory.createInstallmentPlan(
        1000,
        4,
        PaymentFrequency.MONTHLY,
        new Date(),
        { studentId: null }
      );

      const json = plan.toJSON();

      expect(json.uid).toBe(plan.uid);
      expect(json.total_amount).toBe(100000);
      expect(json.totalAmount).toBe(100000);
      expect(json.total_installments).toBe(4);
      expect(json.totalInstallments).toBe(4);
      expect(json.frequency).toBe(PaymentFrequency.MONTHLY);
      expect(json.status).toBe(InstallmentPlanStatus.ACTIVE);
      expect(json.is_active).toBe(true);
      expect(json.isActive).toBe(true);
    });

    it("serializes installment correctly", async () => {
      const futureDate = dateUtils.addDays(new Date(), 7); // 7天后，确保不会过期

      const installment = await TestDataFactory.createInstallment(
        1,
        null,
        1,
        3,
        100,
        futureDate,
        InstallmentStatus.PENDING
      );

      const json = installment.toJSON();

      expect(json.uid).toBe(installment.uid);
      expect(json.plan_id).toBe(1);
      expect(json.planId).toBe(1);
      expect(json.installment_amount).toBe(10000);
      expect(json.installmentAmount).toBe(10000);
      expect(json.current_installment).toBe(1);
      expect(json.currentInstallment).toBe(1);
      expect(json.status).toBe(InstallmentStatus.PENDING);
      expect(json.is_overdue).toBe(false);
      expect(json.isOverdue).toBe(false);
    });
  });
});
