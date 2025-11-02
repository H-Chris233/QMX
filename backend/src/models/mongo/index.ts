// MongoDB模型导出文件
export { default as Student } from './Student';
export { default as Cash } from './Cash'; 
export { default as InstallmentPlan, InstallmentModel as Installment } from './Installment';
export { default as SystemConfig } from './SystemConfig';

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