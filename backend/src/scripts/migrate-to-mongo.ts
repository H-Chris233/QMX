import { sequelize } from '@/config/database';
import { mongoManager } from '@/config/mongodb';
import { 
  Student, 
  Cash, 
  InstallmentPlan, 
  Installment, 
  SystemConfig 
} from '@/models'; // Sequelize模型
import {
  Student as MongoStudent,
  Cash as MongoCash,
  InstallmentPlan as MongoInstallmentPlan,
  Installment as MongoInstallment,
  SystemConfig as MongoSystemConfig
} from '@/models/mongo'; // MongoDB模型
import logger from '@/utils/logger';

// 数据迁移配置
interface MigrationConfig {
  batchSize: number;
  skipExisting: boolean;
  collections: {
    students: boolean;
    cash: boolean;
    installmentPlans: boolean;
    installments: boolean;
    systemConfigs: boolean;
  };
}

// 默认迁移配置
const defaultConfig: MigrationConfig = {
  batchSize: 100,
  skipExisting: true,
  collections: {
    students: true,
    cash: true,
    installmentPlans: true,
    installments: true,
    systemConfigs: true,
  },
};

// 数据迁移类
export class DataMigrator {
  private config: MigrationConfig;

  constructor(config: Partial<MigrationConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  // 执行完整迁移
  async migrateAll(): Promise<void> {
    logger.info('🚀 开始数据迁移从SQL到MongoDB...');
    
    try {
      // 连接到MongoDB
      await mongoManager.connect();
      
      const config = this.config;
      
      // 按依赖顺序迁移
      if (config.collections.systemConfigs) {
        await this.migrateSystemConfigs();
      }
      
      if (config.collections.students) {
        await this.migrateStudents();
      }
      
      if (config.collections.cash) {
        await this.migrateCash();
      }
      
      if (config.collections.installmentPlans) {
        await this.migrateInstallmentPlans();
      }
      
      if (config.collections.installments) {
        await this.migrateInstallments();
      }
      
      logger.info('✅ 数据迁移完成！');
      
    } catch (error) {
      logger.error('❌ 数据迁移失败:', error);
      throw error;
    }
  }

  // 迁移学生数据
  private async migrateStudents(): Promise<void> {
    logger.info('📚 迁移学生数据...');
    
    const totalStudents = await Student.count();
    let migratedCount = 0;
    
    for (let offset = 0; offset < totalStudents; offset += this.config.batchSize) {
      const students = await Student.findAll({
        limit: this.config.batchSize,
        offset,
        order: [['uid', 'ASC']],
      });
      
      for (const student of students) {
        try {
          if (this.config.skipExisting) {
            const existing = await MongoStudent.findOne({ uid: student.uid });
            if (existing) {
              logger.debug(`跳过已存在的学生 UID: ${student.uid}`);
              continue;
            }
          }
          
          const mongoStudent = new MongoStudent({
            uid: student.uid,
            name: student.name,
            phone: student.phone,
            class: student.class,
            subject: student.subject,
            lesson_left: student.lesson_left,
            rings: student.rings || [],
            membership_start_date: student.membership_start_date,
            membership_end_date: student.membership_end_date,
            created_at: student.createdAt,
            updated_at: student.updatedAt,
          });
          
          await mongoStudent.save();
          migratedCount++;
          
          logger.debug(`迁移学生: ${student.name} (UID: ${student.uid})`);
          
        } catch (error) {
          logger.error(`迁移学生失败 UID: ${student.uid}`, error);
        }
      }
    }
    
    logger.info(`✅ 学生数据迁移完成，共迁移 ${migratedCount}/${totalStudents} 个学生`);
  }

  // 迁移交易记录
  private async migrateCash(): Promise<void> {
    logger.info('💰 迁移交易记录...');
    
    const totalCash = await Cash.count();
    let migratedCount = 0;
    
    for (let offset = 0; offset < totalCash; offset += this.config.batchSize) {
      const cashRecords = await Cash.findAll({
        limit: this.config.batchSize,
        offset,
        order: [['uid', 'ASC']],
      });
      
      for (const cash of cashRecords) {
        try {
          if (this.config.skipExisting) {
            const existing = await MongoCash.findOne({ uid: cash.uid });
            if (existing) {
              logger.debug(`跳过已存在的交易记录 UID: ${cash.uid}`);
              continue;
            }
          }
          
          const mongoCash = new MongoCash({
            uid: cash.uid,
            student_id: cash.student_id,
            cash: cash.cash,
            note: cash.note,
            created_at: cash.createdAt,
            updated_at: cash.updatedAt,
          });
          
          await mongoCash.save();
          migratedCount++;
          
          logger.debug(`迁移交易记录 UID: ${cash.uid}, 金额: ${cash.cash}`);
          
        } catch (error) {
          logger.error(`迁移交易记录失败 UID: ${cash.uid}`, error);
        }
      }
    }
    
    logger.info(`✅ 交易记录迁移完成，共迁移 ${migratedCount}/${totalCash} 条记录`);
  }

  // 迁移分期付款计划
  private async migrateInstallmentPlans(): Promise<void> {
    logger.info('📋 迁移分期付款计划...');
    
    const totalPlans = await InstallmentPlan.count();
    let migratedCount = 0;
    
    for (let offset = 0; offset < totalPlans; offset += this.config.batchSize) {
      const plans = await InstallmentPlan.findAll({
        limit: this.config.batchSize,
        offset,
        order: [['plan_id', 'ASC']],
      });
      
      for (const plan of plans) {
        try {
          if (this.config.skipExisting) {
            const existing = await MongoInstallmentPlan.findOne({ plan_id: plan.plan_id });
            if (existing) {
              logger.debug(`跳过已存在的分期计划 ID: ${plan.plan_id}`);
              continue;
            }
          }
          
          const mongoPlan = new MongoInstallmentPlan({
            plan_id: plan.plan_id,
            student_id: plan.student_id,
            total_amount: plan.total_amount,
            frequency: plan.frequency,
            installment_count: plan.installment_count,
            installment_amount: plan.installment_amount,
            start_date: plan.start_date,
            status: plan.status,
            created_at: plan.createdAt,
            updated_at: plan.updatedAt,
          });
          
          await mongoPlan.save();
          migratedCount++;
          
          logger.debug(`迁移分期计划 ID: ${plan.plan_id}, 学生ID: ${plan.student_id}`);
          
        } catch (error) {
          logger.error(`迁移分期计划失败 ID: ${plan.plan_id}`, error);
        }
      }
    }
    
    logger.info(`✅ 分期付款计划迁移完成，共迁移 ${migratedCount}/${totalPlans} 个计划`);
  }

  // 迁移分期付款详情
  private async migrateInstallments(): Promise<void> {
    logger.info('📝 迁移分期付款详情...');
    
    const totalInstallments = await Installment.count();
    let migratedCount = 0;
    
    for (let offset = 0; offset < totalInstallments; offset += this.config.batchSize) {
      const installments = await Installment.findAll({
        limit: this.config.batchSize,
        offset,
        order: [['uid', 'ASC']],
      });
      
      for (const installment of installments) {
        try {
          if (this.config.skipExisting) {
            const existing = await MongoInstallment.findOne({ uid: installment.uid });
            if (existing) {
              logger.debug(`跳过已存在的分期详情 UID: ${installment.uid}`);
              continue;
            }
          }
          
          const mongoInstallment = new MongoInstallment({
            uid: installment.uid,
            plan_id: installment.plan_id,
            installment_number: installment.installment_number,
            amount: installment.amount,
            due_date: installment.due_date,
            status: installment.status,
            cash_uid: installment.cash_uid,
            created_at: installment.createdAt,
            updated_at: installment.updatedAt,
          });
          
          await mongoInstallment.save();
          migratedCount++;
          
          logger.debug(`迁移分期详情 UID: ${installment.uid}, 计划ID: ${installment.plan_id}`);
          
        } catch (error) {
          logger.error(`迁移分期详情失败 UID: ${installment.uid}`, error);
        }
      }
    }
    
    logger.info(`✅ 分期付款详情迁移完成，共迁移 ${migratedCount}/${totalInstallments} 条记录`);
  }

  // 迁移系统配置
  private async migrateSystemConfigs(): Promise<void> {
    logger.info('⚙️ 迁移系统配置...');
    
    const totalConfigs = await SystemConfig.count();
    let migratedCount = 0;
    
    for (let offset = 0; offset < totalConfigs; offset += this.config.batchSize) {
      const configs = await SystemConfig.findAll({
        limit: this.config.batchSize,
        offset,
        order: [['id', 'ASC']],
      });
      
      for (const config of configs) {
        try {
          if (this.config.skipExisting) {
            const existing = await MongoSystemConfig.findOne({ key: config.key });
            if (existing) {
              logger.debug(`跳过已存在的配置项: ${config.key}`);
              continue;
            }
          }
          
          const mongoConfig = new MongoSystemConfig({
            key: config.key,
            value: config.value,
            description: config.description,
            created_at: config.createdAt,
            updated_at: config.updatedAt,
          });
          
          await mongoConfig.save();
          migratedCount++;
          
          logger.debug(`迁移配置项: ${config.key} = ${config.value}`);
          
        } catch (error) {
          logger.error(`迁移配置项失败 ${config.key}`, error);
        }
      }
    }
    
    logger.info(`✅ 系统配置迁移完成，共迁移 ${migratedCount}/${totalConfigs} 个配置项`);
  }

  // 清空MongoDB数据（谨慎使用）
  async clearMongoData(): Promise<void> {
    logger.warn('⚠️ 清空MongoDB数据...');
    
    await MongoInstallment.deleteMany({});
    await MongoInstallmentPlan.deleteMany({});
    await MongoCash.deleteMany({});
    await MongoStudent.deleteMany({});
    await MongoSystemConfig.deleteMany({});
    
    logger.warn('✅ MongoDB数据已清空');
  }

  // 获取迁移统计信息
  async getMigrationStats(): Promise<any> {
    const mongoStats = {
      students: await MongoStudent.countDocuments(),
      cash: await MongoCash.countDocuments(),
      installmentPlans: await MongoInstallmentPlan.countDocuments(),
      installments: await MongoInstallment.countDocuments(),
      systemConfigs: await MongoSystemConfig.countDocuments(),
    };
    
    const sequelizeStats = {
      students: await Student.count(),
      cash: await Cash.count(),
      installmentPlans: await InstallmentPlan.count(),
      installments: await Installment.count(),
      systemConfigs: await SystemConfig.count(),
    };
    
    return {
      mongodb: mongoStats,
      sequelize: sequelizeStats,
      migrationProgress: Object.keys(mongoStats).reduce((acc, key) => {
        const mongoKey = key as keyof typeof mongoStats;
        const sequelizeKey = key as keyof typeof sequelizeStats;
        acc[mongoKey] = {
          source: sequelizeStats[sequelizeKey],
          target: mongoStats[mongoKey],
          progress: sequelizeStats[sequelizeKey] > 0 
            ? Number(((mongoStats[mongoKey] / sequelizeStats[sequelizeKey]) * 100).toFixed(1))
            : 100
        };
        return acc;
      }, {} as any)
    };
  }
}

// 默认迁移器实例
export const migrator = new DataMigrator();

// 命令行工具函数
export async function runMigration(config?: Partial<MigrationConfig>): Promise<void> {
  const instance = new DataMigrator(config);
  await instance.migrateAll();
}

export async function runClearMongo(): Promise<void> {
  await migrator.clearMongoData();
}

export async function showMigrationStats(): Promise<void> {
  const stats = await migrator.getMigrationStats();
  console.log('📊 迁移统计信息:');
  console.log(JSON.stringify(stats, null, 2));
}