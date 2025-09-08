// 数据转换工具 - 将后端返回的 BTreeMap 转换为前端期望的对象结构

import { Student, Transaction, DashboardStats } from './ApiService';

/**
 * 将 BTreeMap 数据转换为 Student 对象
 * @param rawData 后端返回的 BTreeMap 数据
 * @returns 转换后的 Student 对象
 */
export function transformStudentData(rawData: any): Student {
  return {
    uid: rawData.uid,
    name: rawData.name,
    age: rawData.age,
    class: rawData.class,
    phone: rawData.phone,
    rings: Array.isArray(rawData.rings) ? rawData.rings : [],
    note: rawData.note || '',
    cash: rawData.cash || ''
  };
}

/**
 * 将 BTreeMap 数据转换为 Transaction 对象
 * @param rawData 后端返回的 BTreeMap 数据
 * @returns 转换后的 Transaction 对象
 */
export function transformTransactionData(rawData: any): Transaction {
  return {
    uid: rawData.uid,
    student_id: rawData.student_id,
    amount: rawData.amount,
    description: rawData.description || '',
    note: rawData.note || '',
    is_installment: rawData.is_installment || false,
    installment_plan_id: rawData.installment_plan_id || null,
    installment_current: rawData.installment_current || null,
    installment_total: rawData.installment_total || null,
    installment_due_date: rawData.installment_due_date || null,
    installment_status: rawData.installment_status || null
  };
}

/**
 * 将 BTreeMap 数据转换为 DashboardStats 对象
 * @param rawData 后端返回的 BTreeMap 数据
 * @returns 转换后的 DashboardStats 对象
 */
export function transformDashboardStatsData(rawData: any): DashboardStats {
  return {
    total_students: rawData.total_students || 0,
    total_revenue: rawData.total_revenue || 0,
    total_expense: rawData.total_expense || 0,
    average_score: rawData.average_score || 0,
    max_score: rawData.max_score || 0,
    active_courses: rawData.active_courses || 0
  };
}

/**
 * 批量转换 Student 数据
 * @param rawDataArray 后端返回的 BTreeMap 数组
 * @returns 转换后的 Student 对象数组
 */
export function transformStudentDataArray(rawDataArray: any[]): Student[] {
  return rawDataArray.map(transformStudentData);
}

/**
 * 批量转换 Transaction 数据
 * @param rawDataArray 后端返回的 BTreeMap 数组
 * @returns 转换后的 Transaction 对象数组
 */
export function transformTransactionDataArray(rawDataArray: any[]): Transaction[] {
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
    typeof student.phone === 'string'
  );
}

/**
 * 验证 Transaction 数据的完整性
 * @param transaction Transaction 对象
 * @returns 验证结果
 */
export function validateTransactionData(transaction: any): boolean {
  // 基础验证
  const basicValidation = (
    typeof transaction.uid === 'number' &&
    (typeof transaction.student_id === 'number' || transaction.student_id === null) &&
    typeof transaction.amount === 'number' &&
    typeof transaction.description === 'string' &&
    (typeof transaction.note === 'string' || transaction.note === null) &&
    typeof transaction.is_installment === 'boolean'
  );
  
  if (!basicValidation) return false;
  
  // 如果是分期付款，验证相关字段
  if (transaction.is_installment) {
    return (
      typeof transaction.installment_plan_id === 'number' &&
      typeof transaction.installment_current === 'number' &&
      typeof transaction.installment_total === 'number' &&
      (typeof transaction.installment_due_date === 'string' || transaction.installment_due_date === null) &&
      (typeof transaction.installment_status === 'string' || transaction.installment_status === null)
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
  return transaction.is_installment && 
         transaction.installment_plan_id !== null &&
         transaction.installment_current !== null &&
         transaction.installment_total !== null;
}

/**
 * 获取分期付款状态标签
 * @param status 状态字符串
 * @returns 对应的中文标签
 */
export function getInstallmentStatusLabel(status: string | null): string {
  if (!status) return '未知';
  
  switch (status) {
    case 'Pending': return '待处理';
    case 'Paid': return '已支付';
    case 'Overdue': return '逾期';
    case 'Cancelled': return '已取消';
    default: return status;
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