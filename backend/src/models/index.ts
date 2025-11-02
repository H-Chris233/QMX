import { default as Student } from './Student';
import { default as Cash } from './Cash';
import { default as Installment } from './Installment';
import { default as SystemConfig } from './SystemConfig';
import mongoose from 'mongoose';

export { Student, Cash, Installment, SystemConfig };

export type {
  IStudentDoc,
  ICashDoc,
  IInstallmentDoc,
  ISystemConfigDoc
} from './Student';

export { InstallmentStatus, PaymentFrequency } from './Installment';

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

    const collections = await mongoose.connection.db.listCollections().toArray();
    const requiredCollections = ['students', 'cash_transactions', 'installments', 'system_configs'];
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
      systemConfigs: await SystemConfig.countDocuments(),
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