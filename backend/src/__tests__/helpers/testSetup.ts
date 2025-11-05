import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Student, studentModel, type IStudentDoc } from '@/models/mongo';
import { Cash, type ICashDoc } from '@/models/CashMongo';
import { Installment, InstallmentModel, type IInstallmentDoc } from '@/models/InstallmentMongo';
import { InstallmentPlan, InstallmentPlanModel, type IInstallmentPlanDoc } from '@/models/InstallmentPlanMongo';
import { StudentBuilder } from '@/services/studentBuilder';
import { CashBuilder } from '@/services/cashBuilder';
import CounterModel, {
  resetSequence,
  STUDENT_SEQUENCE_NAME,
  CASH_SEQUENCE_NAME,
  INSTALLMENT_SEQUENCE_NAME,
  INSTALLMENT_PLAN_SEQUENCE_NAME,
} from '@/models/counter';
import { ClassType, SubjectType, PaymentFrequency, InstallmentStatus } from '@/types';

export interface TestContext {
  mongoServer: MongoMemoryServer;
}

export async function setupTestDatabase(dbName: string): Promise<MongoMemoryServer> {
  const mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { dbName });
  return mongoServer;
}

export async function cleanupTestDatabase(mongoServer: MongoMemoryServer): Promise<void> {
  await mongoose.disconnect();
  await mongoServer.stop();
}

export async function clearAllCollections(): Promise<void> {
  try {
    await Promise.all([
      studentModel.deleteMany({}).exec(),
      Cash.deleteMany({}).exec(),
      InstallmentModel.deleteMany({}).exec(),
      InstallmentPlanModel.deleteMany({}).exec(),
      CounterModel.deleteMany({}).exec(),
    ]);
  } catch (error) {
    console.warn('[testSetup] Failed to clear collections', error);
  }
}

export async function resetAllSequences(): Promise<void> {
  try {
    await Promise.all([
      resetSequence(STUDENT_SEQUENCE_NAME),
      resetSequence(CASH_SEQUENCE_NAME),
      resetSequence(INSTALLMENT_SEQUENCE_NAME),
      resetSequence(INSTALLMENT_PLAN_SEQUENCE_NAME),
    ]);
  } catch (error) {
    console.warn('[testSetup] Failed to reset counter sequences', error);
  }
}

export async function createTestStudent(
  overrides: {
    name?: string;
    phone?: string;
    class?: ClassType;
    subject?: SubjectType;
    rings?: number[];
    membership?: { startDate: Date; endDate: Date } | null;
  } = {}
): Promise<IStudentDoc> {
  const builder = StudentBuilder.create()
    .name(overrides.name || 'Test Student')
    .phone(overrides.phone || '13800138000')
    .class(overrides.class || ClassType.MONTH)
    .subject(overrides.subject || SubjectType.SHOOTING);

  if (overrides.rings) {
    builder.rings(overrides.rings);
  }

  if (overrides.membership) {
    builder.membership(overrides.membership);
  }

  return await builder.build();
}

export async function createTestCashTransaction(
  amount: number,
  studentId?: number | null,
  note?: string
): Promise<ICashDoc> {
  const builder = CashBuilder.create().amount(amount);

  if (studentId !== undefined) {
    builder.studentId(studentId);
  }

  if (note) {
    builder.note(note);
  }

  return await builder.build();
}

export async function createTestInstallmentPlan(
  totalAmount: number,
  totalInstallments: number,
  frequency: PaymentFrequency,
  startDate: Date,
  studentId?: number | null,
  customDays?: number
): Promise<IInstallmentPlanDoc> {
  const payload = {
    student_id: studentId ?? null,
    total_amount: totalAmount * 100,
    total_installments: totalInstallments,
    frequency,
    start_date: startDate,
    custom_days: customDays,
  };

  return await InstallmentPlan.create(payload);
}

export async function createTestInstallment(
  planId: number,
  studentId: number | null,
  installmentNumber: number,
  totalInstallments: number,
  amount: number,
  dueDate: Date,
  status: InstallmentStatus = InstallmentStatus.PENDING
): Promise<IInstallmentDoc> {
  return await Installment.create({
    plan_id: planId,
    student_id: studentId,
    current_installment: installmentNumber,
    total_installments: totalInstallments,
    installment_amount: amount * 100,
    due_date: dueDate,
    status,
  });
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
