// 数据转换与校验工具

import type { Student, Transaction, DashboardStats } from '../types/api';
import { isInstallmentStatus } from '../utils/typeGuards';

/**
 * 将后端返回的数据转换为 Student 对象
 * @param rawData 后端返回的数据
 * @returns 转换后的 Student 对象
 */
export function transformStudentData(rawData: unknown): Student {
  if (!rawData || typeof rawData !== 'object') {
    throw new Error('无效的学员数据');
  }
  
  const data = rawData as Record<string, unknown>;
  
  return {
    uid: typeof data.uid === 'number' ? data.uid : 0,
    name: typeof data.name === 'string' ? data.name : '',
    age: typeof data.age === 'number' ? data.age : 0,
    class: typeof data.class === 'string' ? data.class : '',
    phone: typeof data.phone === 'string' ? data.phone : '',
    rings: Array.isArray(data.rings) && data.rings.every(r => typeof r === 'number') 
      ? data.rings as number[] 
      : [],
    note: typeof data.note === 'string' ? data.note : '',
    cash: typeof data.cash === 'string' ? data.cash : '',
    subject: typeof data.subject === 'string' ? data.subject : 'Others',
    lesson_left: typeof data.lesson_left === 'number' ? data.lesson_left : undefined,
    membership_start_date: typeof data.membership_start_date === 'string' ? data.membership_start_date : null,
    membership_end_date: typeof data.membership_end_date === 'string' ? data.membership_end_date : null,
    is_membership_active: typeof data.is_membership_active === 'boolean' ? data.is_membership_active : false,
    membership_days_remaining: typeof data.membership_days_remaining === 'number' ? data.membership_days_remaining : null,
  };
}

/**
 * 将后端返回的数据转换为 Transaction 对象
 * @param rawData 后端返回的数据
 * @returns 转换后的 Transaction 对象
 */
export function transformTransactionData(rawData: unknown): Transaction {
  if (!rawData || typeof rawData !== 'object') {
    throw new Error('无效的交易数据');
  }
  
  const data = rawData as Record<string, unknown>;
  
  return {
    uid: typeof data.uid === 'number' ? data.uid : 0,
    student_id: typeof data.student_id === 'number' ? data.student_id : null,
    amount: typeof data.amount === 'number' ? data.amount : 0,
    description: typeof data.description === 'string' ? data.description : '',
    note: typeof data.note === 'string' ? data.note : null,
    is_installment: typeof data.is_installment === 'boolean' ? data.is_installment : false,
    installment_plan_id: typeof data.installment_plan_id === 'number' ? data.installment_plan_id : null,
    installment_current: typeof data.installment_current === 'number' ? data.installment_current : null,
    installment_total: typeof data.installment_total === 'number' ? data.installment_total : null,
    installment_due_date: typeof data.installment_due_date === 'string' ? data.installment_due_date : null,
    installment_status: isInstallmentStatus(data.installment_status) ? data.installment_status : null,
  };
}

/**
 * 将后端返回的数据转换为 DashboardStats 对象
 * @param rawData 后端返回的数据
 * @returns 转换后的 DashboardStats 对象
 */
export function transformDashboardStatsData(rawData: unknown): DashboardStats {
  if (!rawData || typeof rawData !== 'object') {
    throw new Error('无效的统计数据');
  }
  
  const data = rawData as Record<string, unknown>;
  
  return {
    total_students: typeof data.total_students === 'number' ? data.total_students : 0,
    total_revenue: typeof data.total_revenue === 'number' ? data.total_revenue : 0,
    total_expense: typeof data.total_expense === 'number' ? data.total_expense : 0,
    average_score: typeof data.average_score === 'number' ? data.average_score : 0,
    max_score: typeof data.max_score === 'number' ? data.max_score : 0,
    active_courses: typeof data.active_courses === 'number' ? data.active_courses : 0,
  };
}

/**
 * 批量转换 Student 数据
 * @param rawDataArray 后端返回的数据数组
 * @returns 转换后的 Student 对象数组
 */
export function transformStudentDataArray(rawDataArray: unknown[]): Student[] {
  if (!Array.isArray(rawDataArray)) {
    throw new Error('输入必须是数组');
  }
  return rawDataArray.map(transformStudentData);
}

/**
 * 批量转换 Transaction 数据
 * @param rawDataArray 后端返回的数据数组
 * @returns 转换后的 Transaction 对象数组
 */
export function transformTransactionDataArray(
  rawDataArray: unknown[],
): Transaction[] {
  if (!Array.isArray(rawDataArray)) {
    throw new Error('输入必须是数组');
  }
  return rawDataArray.map(transformTransactionData);
}

/**
 * 验证 Student 数据的完整性
 * @param student Student 对象
 * @returns 验证结果
 */
export function validateStudentData(student: any): boolean {
  return (
    typeof student.uid === 'number' &&
    typeof student.name === 'string' &&
    typeof student.age === 'number' &&
    typeof student.class === 'string' &&
    typeof student.phone === 'string' &&
    typeof student.subject === 'string' &&
    (student.lesson_left === undefined ||
      typeof student.lesson_left === 'number')
  );
}

/**
 * 验证 Transaction 数据的完整性
 * @param transaction Transaction 对象
 * @returns 验证结果
 */
export function validateTransactionData(transaction: any): boolean {
  const basicValidation =
    typeof transaction.uid === 'number' &&
    (typeof transaction.student_id === 'number' ||
      transaction.student_id === null) &&
    typeof transaction.amount === 'number' &&
    typeof transaction.description === 'string' &&
    (typeof transaction.note === 'string' || transaction.note === null) &&
    typeof transaction.is_installment === 'boolean';
  if (!basicValidation) return false;

  if (transaction.is_installment) {
    return (
      typeof transaction.installment_plan_id === 'number' &&
      typeof transaction.installment_current === 'number' &&
      typeof transaction.installment_total === 'number' &&
      (typeof transaction.installment_due_date === 'string' ||
        transaction.installment_due_date === null) &&
      (typeof transaction.installment_status === 'string' ||
        transaction.installment_status === null)
    );
  }
  return true;
}

/**
 * 验证 DashboardStats 数据的完整性
 * @param stats DashboardStats 对象
 * @returns 验证结果
 */
export function validateDashboardStatsData(stats: any): boolean {
  return (
    typeof stats.total_students === 'number' &&
    typeof stats.total_revenue === 'number' &&
    typeof stats.total_expense === 'number' &&
    typeof stats.average_score === 'number' &&
    typeof stats.max_score === 'number' &&
    typeof stats.active_courses === 'number'
  );
}

/**
 * 检查是否为分期付款交易
 * @param transaction 交易对象
 * @returns 是否为分期付款
 */
export function isInstallmentTransaction(transaction: Transaction): boolean {
  return (
    transaction.is_installment &&
    transaction.installment_plan_id !== null &&
    transaction.installment_current !== null &&
    transaction.installment_total !== null
  );
}

/**
 * 获取分期付款状态标签
 * @param status 状态字符串
 * @returns 对应的中文标签
 */
export function getInstallmentStatusLabel(status: string | null): string {
  if (!status) return '未知';
  switch (status) {
    case 'Pending':
      return '待处理';
    case 'Paid':
      return '已支付';
    case 'Overdue':
      return '逾期';
    case 'Cancelled':
      return '已取消';
    default:
      return status;
  }
}

/**
 * 格式化分期付款描述
 * @param transaction 交易对象
 * @returns 格式化后的描述
 */
export function formatInstallmentDescription(transaction: Transaction): string {
  if (!isInstallmentTransaction(transaction)) {
    return transaction.description;
  }
  const statusLabel = getInstallmentStatusLabel(transaction.installment_status);
  return `分期付款 ${transaction.installment_current}/${transaction.installment_total} (${statusLabel})`;
}
