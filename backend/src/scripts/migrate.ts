import { 
  Student, 
  Cash, 
  InstallmentPlan, 
  Installment,
  syncDatabase 
} from '../models';
import { ClassType, SubjectType, PaymentFrequency, InstallmentStatus } from '../types';
import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger';

// 数据接口定义
interface LegacyStudent {
  uid: number;
  age?: number | null;
  name: string;
  phone: string;
  lesson_left?: number | null;
  class: string;
  subject: string;
  rings: number[];
  note: string;
  membership_start_date?: string | null;
  membership_end_date?: string | null;
}

interface LegacyCash {
  uid: number;
  student_id?: number | null;
  cash: number;
  note?: string | null;
  created_at: string;
  installment?: {
    plan_id: number;
    total_amount: number;
    total_installments: number;
    current_installment: number;
    frequency: string;
    due_date: string;
    status: string;
  } | null;
}

interface LegacyStudentDatabase {
  student_data: Record<string, LegacyStudent>;
}

interface LegacyCashDatabase {
  cash_data: Record<string, LegacyCash>;
}

// 类型转换函数
function convertClassType(classStr: string): ClassType {
  switch (classStr) {
    case 'TenTry': return ClassType.TEN_TRY;
    case 'Month': return ClassType.MONTH;
    case 'Year': return ClassType.YEAR;
    default: return ClassType.OTHERS;
  }
}

function convertSubjectType(subjectStr: string): SubjectType {
  switch (subjectStr) {
    case 'Shooting': return SubjectType.SHOOTING;
    case 'Archery': return SubjectType.ARCHERY;
    default: return SubjectType.OTHERS;
  }
}

function convertPaymentFrequency(frequency: string): PaymentFrequency {
  switch (frequency) {
    case 'Weekly': return PaymentFrequency.WEEKLY;
    case 'Monthly': return PaymentFrequency.MONTHLY;
    case 'Quarterly': return PaymentFrequency.QUARTERLY;
    default: return PaymentFrequency.CUSTOM;
  }
}

function convertInstallmentStatus(status: string): InstallmentStatus {
  switch (status) {
    case 'Pending': return InstallmentStatus.PENDING;
    case 'Paid': return InstallmentStatus.PAID;
    case 'Overdue': return InstallmentStatus.OVERDUE;
    case 'Cancelled': return InstallmentStatus.CANCELLED;
    default: return InstallmentStatus.PENDING;
  }
}

// 主迁移函数
export async function migrateFromLegacyData(): Promise<void> {
  try {
    logger.info('开始数据迁移...');

    // 确保数据库同步
    await syncDatabase();

    const dataDir = path.join(__dirname, '../../src-tauri/src/qmx_backend_lib/data');
    
    // 读取旧数据文件
    const studentDbPath = path.join(dataDir, 'student_database.json');
    const cashDbPath = path.join(dataDir, 'cash_database.json');

    let studentData: LegacyStudentDatabase = { student_data: {} };
    let cashData: LegacyCashDatabase = { cash_data: {} };

    try {
      const studentDbContent = await fs.readFile(studentDbPath, 'utf-8');
      studentData = JSON.parse(studentDbContent);
    } catch (error) {
      logger.warn('学生数据文件不存在或为空，跳过学生数据迁移');
    }

    try {
      const cashDbContent = await fs.readFile(cashDbPath, 'utf-8');
      cashData = JSON.parse(cashDbContent);
    } catch (error) {
      logger.warn('现金数据文件不存在或为空，跳过现金数据迁移');
    }

    // 迁移学生数据
    const studentEntries = Object.entries(studentData.student_data);
    if (studentEntries.length > 0) {
      logger.info(`开始迁移 ${studentEntries.length} 个学生记录...`);
      
      for (const [uid, studentData] of studentEntries) {
        try {
          await Student.upsert({
            name: studentData.name,
            age: studentData.age || null,
            class: convertClassType(studentData.class),
            subject: convertSubjectType(studentData.subject),
            phone: studentData.phone,
            rings: studentData.rings || [],
            note: studentData.note || '',
            lesson_left: studentData.lesson_left || null,
            membership_start_date: studentData.membership_start_date ? new Date(studentData.membership_start_date) : null,
            membership_end_date: studentData.membership_end_date ? new Date(studentData.membership_end_date) : null,
          });
        } catch (error) {
          logger.error(`迁移学生数据失败 (UID: ${uid}):`, error);
        }
      }
      
      logger.info(`学生数据迁移完成`);
    } else {
      logger.info('没有学生数据需要迁移');
    }

    // 迁移现金数据
    const cashEntries = Object.entries(cashData.cash_data);
    if (cashEntries.length > 0) {
      logger.info(`开始迁移 ${cashEntries.length} 个现金记录...`);
      
      for (const [uid, cashData] of cashEntries) {
        try {
          // 转换金额单位（假设旧数据以元为单位，新数据以分为单位）
          const amountInCents = Math.round(cashData.cash * 100);
          
          // 创建现金记录
          await Cash.upsert({
            student_id: cashData.student_id || null,
            cash: amountInCents,
            note: cashData.note || null,
          });

          // 如果有分期付款数据，创建分期记录
          if (cashData.installment) {
            const installment = cashData.installment;
            
            // 创建或更新分期计划
            await InstallmentPlan.upsert({
              plan_id: installment.plan_id,
              total_amount: Math.round(installment.total_amount * 100),
              total_installments: installment.total_installments,
              frequency: convertPaymentFrequency(installment.frequency),
              custom_days: installment.frequency === 'Custom' ? 30 : null, // 默认值
            });

            // 创建分期详情
            await Installment.upsert({
              plan_id: installment.plan_id,
              total_amount: Math.round(installment.total_amount * 100),
              total_installments: installment.total_installments,
              current_installment: installment.current_installment,
              frequency: convertPaymentFrequency(installment.frequency),
              custom_days: installment.frequency === 'Custom' ? 30 : null,
              due_date: new Date(installment.due_date),
              status: convertInstallmentStatus(installment.status),
            });
          }
        } catch (error) {
          logger.error(`迁移现金数据失败 (UID: ${uid}):`, error);
        }
      }
      
      logger.info(`现金数据迁移完成`);
    } else {
      logger.info('没有现金数据需要迁移');
    }

    logger.info('数据迁移完成！');

    // 统计迁移结果
    const studentCount = await Student.count();
    const cashCount = await Cash.count();
    const installmentPlanCount = await InstallmentPlan.count();
    const installmentCount = await Installment.count();

    logger.info(`迁移统计:
    - 学生记录: ${studentCount}
    - 现金记录: ${cashCount}
    - 分期计划: ${installmentPlanCount}
    - 分期详情: ${installmentCount}
    `);

  } catch (error) {
    logger.error('数据迁移失败:', error);
    throw error;
  }
}

// 创建示例数据函数
export async function createSampleData(): Promise<void> {
  try {
    logger.info('开始创建示例数据...');

    // 创建示例学生
    const sampleStudents = [
      {
        name: '张三',
        age: 18,
        class: ClassType.MONTH,
        subject: SubjectType.SHOOTING,
        phone: '13800138001',
        rings: [8.5, 9.0, 8.8],
        note: '进步很快',
        lesson_left: 10,
        membership_start_date: new Date(),
        membership_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后
      },
      {
        name: '李四',
        age: 20,
        class: ClassType.TEN_TRY,
        subject: SubjectType.ARCHERY,
        phone: '13800138002',
        rings: [7.5, 8.0],
        note: '需要练习稳定性',
        lesson_left: 5,
        membership_start_date: null,
        membership_end_date: null,
      },
      {
        name: '王五',
        age: 16,
        class: ClassType.YEAR,
        subject: SubjectType.SHOOTING,
        phone: '13800138003',
        rings: [9.2, 9.5, 9.3, 9.6],
        note: '优秀学员',
        lesson_left: 50,
        membership_start_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60天前
        membership_end_date: new Date(Date.now() + 305 * 24 * 60 * 60 * 1000), // 305天后
      },
    ];

    for (const student of sampleStudents) {
      await Student.upsert(student);
    }

    // 创建示例交易记录
    const sampleTransactions = [
      {
        student_id: 1,
        cash: 150000, // 1500.00元
        note: '月卡费用',
      },
      {
        student_id: 2,
        cash: 50000, // 500.00元
        note: '体验课费用',
      },
      {
        student_id: 3,
        cash: 365000, // 3650.00元
        note: '年卡费用',
      },
      {
        student_id: null,
        cash: -10000, // -100.00元
        note: '器材采购',
      },
    ];

    for (const transaction of sampleTransactions) {
      await Cash.upsert(transaction);
    }

    logger.info('示例数据创建完成！');

  } catch (error) {
    logger.error('创建示例数据失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const command = process.argv[2];
  
  (async () => {
    try {
      if (command === 'migrate') {
        await migrateFromLegacyData();
      } else if (command === 'sample') {
        await createSampleData();
      } else {
        console.log('用法: npm run migrate [migrate|sample]');
        console.log('  migrate - 从旧版JSON数据迁移');
        console.log('  sample   - 创建示例数据');
      }
    } catch (error) {
      console.error('脚本执行失败:', error);
      process.exit(1);
    }
  })();
}