import { Student, IStudentDoc } from './mongo';
import { CashClass as Cash, ICashDoc } from './CashMongo';
import { Installment } from './InstallmentMongo';
import { InstallmentPlan as SystemConfig } from './InstallmentPlanMongo';
import mongoose from 'mongoose';

export { Student, Cash, Installment, SystemConfig };

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
  IInstallmentPlanDoc as ISystemConfigDoc,
} from './InstallmentPlanMongo';

export { ClassType, SubjectType } from '@/types';

export async function initMongoModels(): Promise<void> {
  try {
    await Student.createIndexes();
    await Cash.createIndexes();
    await Installment.createIndexes();
    await SystemConfig.createIndexes();

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

    const stats = {
      students: await Student.countDocuments(),
      cashTransactions: await Cash.countDocuments(),
      installments: await Installment.countDocuments(),
      installmentPlans: await SystemConfig.countDocuments(),
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