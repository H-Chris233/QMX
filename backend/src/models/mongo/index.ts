// MongoDB模型导出文件
import { default as Student } from './Student';
import { default as Cash } from './Cash'; 
import { default as InstallmentPlan, InstallmentModel as Installment } from './Installment';
import { default as SystemConfig } from './SystemConfig';

// 重新导出所有模型和类型
export { Student, Cash, InstallmentPlan, Installment, SystemConfig };

// 导出MongoDB相关类型
export type {
  IStudentDoc,
  ICashDoc,
  IInstallmentPlanDoc,
  IInstallmentDoc,
  ISystemConfigDoc
} from './Student';

// 重新导出Installment模型相关的类型和枚举
export { InstallmentStatus, PaymentFrequency } from './Installment';

// 导出模型初始化函数
export async function initMongoModels(): Promise<void> {
  try {
    // 初始化默认系统配置
    await SystemConfig.initDefaults();
    
    // 创建必要的索引
    await Student.createIndexes();
    await Cash.createIndexes();
    await InstallmentPlan.createIndexes();
    await Installment.createIndexes();
    await SystemConfig.createIndexes();
    
    console.log('✅ MongoDB模型初始化完成');
  } catch (error) {
    console.error('❌ MongoDB模型初始化失败:', error);
    throw error;
  }
}

// 导出数据库健康检查函数
export async function checkMongoHealth(): Promise<{ status: string; details: any }> {
  try {
    // 检查连接状态
    const dbState = mongoose.connection.readyState;
    const statusMap = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const status = statusMap[dbState] || 'unknown';
    
    if (status !== 'connected') {
      return { status: 'unhealthy', details: { connectionStatus: status } };
    }
    
    // 检查集合存在性
    const collections = await mongoose.connection.db.listCollections().toArray();
    const requiredCollections = ['students', 'cash_transactions', 'installment_plans', 'installments', 'system_configs'];
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
    
    // 检查数据统计
    const stats = {
      students: await Student.countDocuments(),
      cashTransactions: await Cash.countDocuments(),
      installmentPlans: await InstallmentPlan.countDocuments(),
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