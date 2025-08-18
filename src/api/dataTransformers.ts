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
    description: rawData.description
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
  return (
    typeof transaction.uid === 'number' &&
    typeof transaction.student_id === 'string' &&
    typeof transaction.amount === 'number' &&
    typeof transaction.description === 'string'
  );
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