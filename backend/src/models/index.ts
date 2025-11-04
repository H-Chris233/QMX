import mongoose from 'mongoose';
import { Student, IStudentDoc } from './mongo';
import { CashClass, ICashDoc, Cash as CashModel } from './CashMongo';
import { Installment, IInstallmentDoc, InstallmentModel } from './InstallmentMongo';
import { InstallmentPlan, IInstallmentPlanDoc, InstallmentPlanModel } from './InstallmentPlanMongo';
import SystemConfig, { ISystemConfigDoc } from './SystemConfig';

const Cash = CashClass;

export { Student, Cash, CashClass, Installment, InstallmentPlan, SystemConfig };

export type {
  IStudentDoc,
} from './mongo';
export type {
  ICashDoc,
} from './CashMongo';
export type {
  IInstallmentDoc,
} from './InstallmentMongo';
export type {
  IInstallmentPlanDoc,
} from './InstallmentPlanMongo';
export type {
  ISystemConfigDoc,
} from './SystemConfig';

export {
  COUNTER_SEQUENCES,
  STUDENT_SEQUENCE_NAME,
  CASH_SEQUENCE_NAME,
  INSTALLMENT_SEQUENCE_NAME,
  INSTALLMENT_PLAN_SEQUENCE_NAME,
  getNextSequence,
  resetSequence
} from './counter';
export type { SequenceName } from './counter';

export { ClassType, SubjectType } from '@/types';

export async function initMongoModels(): Promise<void> {
  try {
    if (typeof (Student as any).createIndexes === 'function') {
      await (Student as any).createIndexes();
    }
    if (typeof (CashModel as any).createIndexes === 'function') {
      await (CashModel as any).createIndexes();
    }
    if (typeof (Installment as any).createIndexes === 'function') {
      await (Installment as any).createIndexes();
    }
    if (typeof (InstallmentPlan as any).createIndexes === 'function') {
      await (InstallmentPlan as any).createIndexes();
    }
    if (typeof (SystemConfig as any).createIndexes === 'function') {
      await (SystemConfig as any).createIndexes();
    }

    console.log('✅ MongoDB模型初始化完成');
  } catch (error) {
    console.error('❌ MongoDB模型初始化失败:', error);
    throw error;
  }
}

export async function checkMongoHealth(): Promise<{ status: string; details: any }> {
  try {
    const dbState = mongoose.connection.readyState;
    const statusMap = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const status = statusMap[dbState] || 'unknown';

    if (status !== 'connected') {
      return { status: 'unhealthy', details: { connectionStatus: status } };
    }

    if (!mongoose.connection.db) {
      return { status: 'unhealthy', details: { connectionStatus: 'disconnected' } };
    }
    const collections = await mongoose.connection.db.listCollections().toArray();
    const requiredCollections = ['students', 'cash_transactions', 'installments', 'installment_plans'];
    const missingCollections = requiredCollections.filter(name =>
      !collections.some(col => col.name === name)
    );

    if (missingCollections.length > 0) {
      return {
        status: 'partial',
        details: {
          connectionStatus: status,
          missingCollections,
          existingCollections: collections.map(col => col.name)
        }
      };
    }

    const studentCount = await Student.count();
    const cashCount = typeof CashModel.countDocuments === 'function' ? await CashModel.countDocuments() : 0;
    const installmentCount = typeof InstallmentModel.countDocuments === 'function' ? await InstallmentModel.countDocuments() : 0;
    const planCount = typeof InstallmentPlanModel.countDocuments === 'function' ? await InstallmentPlanModel.countDocuments() : 0;

    const stats = {
      students: studentCount,
      cashTransactions: cashCount,
      installments: installmentCount,
      installmentPlans: planCount,
    };

    return {
      status: 'healthy',
      details: {
        connectionStatus: status,
        collections: collections.map(col => col.name),
        stats
      }
    };

  } catch (error) {
    return {
      status: 'error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

// 为了兼容adapterController而保留的假SQL模型（避免import错误）
export class SqlStudent {}
export class SqlCash {}
export class SqlInstallment {}
