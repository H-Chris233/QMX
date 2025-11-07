/**
 * 测试数据工厂统一导出
 * 提供快速访问所有工厂和工具函数
 */

export { StudentFactory } from './StudentFactory';
export { TransactionFactory } from './TransactionFactory';
export {
  InstallmentFactory,
  InstallmentPlanFactory,
} from './InstallmentFactory';
export {
  DashboardStatsFactory,
  StudentStatsFactory,
  FinancialStatsFactory,
} from './StatsFactory';

export * from './utils';
