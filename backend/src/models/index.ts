import { sequelize } from '@/config/database';
import Student from './Student';
import Cash from './Cash';
import InstallmentPlan from './InstallmentPlan';
import Installment from './Installment';
import SystemConfig from './SystemConfig';

// 设置模型关联
export function setupAssociations(): void {
  // 学生与交易记录的关联
  Student.hasMany(Cash, {
    foreignKey: 'student_id',
    sourceKey: 'uid',
    as: 'cashTransactions',
  });

  Cash.belongsTo(Student, {
    foreignKey: 'student_id',
    targetKey: 'uid',
    as: 'student',
  });

  // 分期付款计划与分期详情的关联
  InstallmentPlan.hasMany(Installment, {
    foreignKey: 'plan_id',
    sourceKey: 'plan_id',
    as: 'installments',
  });

  Installment.belongsTo(InstallmentPlan, {
    foreignKey: 'plan_id',
    targetKey: 'plan_id',
    as: 'plan',
  });

  // 学生与分期付款的间接关联（通过交易记录）
  // 这个关联会在后续的交易与分期付款关联中建立
}

// 初始化关联
setupAssociations();

// 数据库同步函数
export async function syncDatabase(): Promise<void> {
  try {
    // 按依赖顺序同步表结构
    await SystemConfig.sync({ alter: true });
    await Student.sync({ alter: true });
    await InstallmentPlan.sync({ alter: true });
    await Cash.sync({ alter: true });
    await Installment.sync({ alter: true });

    console.log('✅ 数据库表结构同步完成');
  } catch (error) {
    console.error('❌ 数据库表结构同步失败:', error);
    throw error;
  }
}

// 导出所有模型
export {
  sequelize,
  Student,
  Cash,
  InstallmentPlan,
  Installment,
  SystemConfig,
};

// 导出类型
export type {
  IStudent,
  IStudentCreationAttributes,
  ICash,
  ICashCreationAttributes,
  IInstallmentPlan,
  IInstallment,
  IInstallmentCreationAttributes,
  IApiResponse,
  IPaginatedResponse,
  ClassType,
  SubjectType,
  PaymentFrequency,
  InstallmentStatus,
} from '@/types';