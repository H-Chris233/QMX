import type { Student, Transaction, DashboardStats, InstallmentStatus, ValidationResult } from '../types/api';

export function isStudent(obj: unknown): obj is Student {
  if (!obj || typeof obj !== 'object') return false;
  const student = obj as Record<string, unknown>;
  
  return (
    typeof student.uid === 'number' &&
    typeof student.name === 'string' &&
    typeof student.age === 'number' &&
    typeof student.class === 'string' &&
    typeof student.phone === 'string' &&
    Array.isArray(student.rings) &&
    student.rings.every(ring => typeof ring === 'number') &&
    typeof student.note === 'string' &&
    typeof student.cash === 'string' &&
    typeof student.subject === 'string' &&
    (student.lesson_left === undefined || typeof student.lesson_left === 'number')
  );
}

export function isTransaction(obj: unknown): obj is Transaction {
  if (!obj || typeof obj !== 'object') return false;
  const transaction = obj as Record<string, unknown>;
  
  const basicValidation = (
    typeof transaction.uid === 'number' &&
    (typeof transaction.student_id === 'number' || transaction.student_id === null) &&
    typeof transaction.amount === 'number' &&
    typeof transaction.description === 'string' &&
    (typeof transaction.note === 'string' || transaction.note === null) &&
    typeof transaction.is_installment === 'boolean'
  );
  
  if (!basicValidation) return false;
  
  if (transaction.is_installment) {
    return (
      typeof transaction.installment_plan_id === 'number' &&
      typeof transaction.installment_current === 'number' &&
      typeof transaction.installment_total === 'number' &&
      (typeof transaction.installment_due_date === 'string' || transaction.installment_due_date === null) &&
      (isInstallmentStatus(transaction.installment_status) || transaction.installment_status === null)
    );
  }
  
  return true;
}

export function isDashboardStats(obj: unknown): obj is DashboardStats {
  if (!obj || typeof obj !== 'object') return false;
  const stats = obj as Record<string, unknown>;
  
  return (
    typeof stats.total_students === 'number' &&
    typeof stats.total_revenue === 'number' &&
    typeof stats.total_expense === 'number' &&
    typeof stats.average_score === 'number' &&
    typeof stats.max_score === 'number' &&
    typeof stats.active_courses === 'number'
  );
}

export function isInstallmentStatus(value: unknown): value is InstallmentStatus {
  return typeof value === 'string' && 
    ['Pending', 'Paid', 'Overdue', 'Cancelled'].includes(value);
}

export function validateStudent(obj: unknown): ValidationResult<Student> {
  const errors: string[] = [];
  
  if (!obj || typeof obj !== 'object') {
    return { isValid: false, errors: ['输入不是有效对象'] };
  }
  
  const student = obj as Record<string, unknown>;
  
  if (typeof student.uid !== 'number') errors.push('uid必须是数字');
  if (typeof student.name !== 'string' || !student.name.trim()) errors.push('姓名必须是非空字符串');
  if (typeof student.age !== 'number' || student.age < 0 || student.age > 150) errors.push('年龄必须是0-150之间的数字');
  if (typeof student.class !== 'string') errors.push('班级必须是字符串');
  if (typeof student.phone !== 'string') errors.push('电话必须是字符串');
  if (!Array.isArray(student.rings)) errors.push('成绩必须是数组');
  if (typeof student.note !== 'string') errors.push('备注必须是字符串');
  if (typeof student.cash !== 'string') errors.push('现金必须是字符串');
  if (typeof student.subject !== 'string') errors.push('科目必须是字符串');
  
  if (errors.length === 0) {
    return { isValid: true, data: student as unknown as Student, errors: [] };
  }
  
  return { isValid: false, errors };
}

export function validateTransaction(obj: unknown): ValidationResult<Transaction> {
  const errors: string[] = [];
  
  if (!obj || typeof obj !== 'object') {
    return { isValid: false, errors: ['输入不是有效对象'] };
  }
  
  const transaction = obj as Record<string, unknown>;
  
  if (typeof transaction.uid !== 'number') errors.push('uid必须是数字');
  if (typeof transaction.student_id !== 'number' && transaction.student_id !== null) {
    errors.push('student_id必须是数字或null');
  }
  if (typeof transaction.amount !== 'number') errors.push('金额必须是数字');
  if (typeof transaction.description !== 'string') errors.push('描述必须是字符串');
  if (typeof transaction.is_installment !== 'boolean') errors.push('is_installment必须是布尔值');
  
  if (transaction.is_installment) {
    if (typeof transaction.installment_plan_id !== 'number') {
      errors.push('分期计划ID必须是数字');
    }
    if (typeof transaction.installment_current !== 'number') {
      errors.push('当前分期必须是数字');
    }
    if (typeof transaction.installment_total !== 'number') {
      errors.push('总分期数必须是数字');
    }
  }
  
  if (errors.length === 0) {
    return { isValid: true, data: transaction as unknown as Transaction, errors: [] };
  }
  
  return { isValid: false, errors };
}

export function assertIsStudent(obj: unknown): asserts obj is Student {
  if (!isStudent(obj)) {
    throw new Error('对象不是有效的Student类型');
  }
}

export function assertIsTransaction(obj: unknown): asserts obj is Transaction {
  if (!isTransaction(obj)) {
    throw new Error('对象不是有效的Transaction类型');
  }
}

export function assertIsDashboardStats(obj: unknown): asserts obj is DashboardStats {
  if (!isDashboardStats(obj)) {
    throw new Error('对象不是有效的DashboardStats类型');
  }
}