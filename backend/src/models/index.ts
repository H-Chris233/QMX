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
    // 检查模型是否有createIndexes方法，如果没有则跳过
    if (typeof (Student as any).createIndexes === 'function') {
      await (Student as any).createIndexes();
    }
    if (typeof (Cash as any).createIndexes === 'function') {
      await (Cash as any).createIndexes();
    }
    if (typeof (Installment as any).createIndexes === 'function') {
      await (Installment as any).createIndexes();
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

    // 检查模型是否有countDocuments方法
    const studentCount = typeof (Student as any).countDocuments === 'function' ? await (Student as any).countDocuments() : 0;
    const cashCount = typeof (Cash as any).countDocuments === 'function' ? await (Cash as any).countDocuments() : 0;
    const installmentCount = typeof (Installment as any).countDocuments === 'function' ? await (Installment as any).countDocuments() : 0;
    const planCount = typeof (SystemConfig as any).countDocuments === 'function' ? await (SystemConfig as any).countDocuments() : 0;

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